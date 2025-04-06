"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  CircularProgress,
  Card,
  CardHeader,
  CardContent
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import MicIcon from '@mui/icons-material/Mic';
import SettingsIcon from '@mui/icons-material/Settings';
import StopIcon from '@mui/icons-material/Stop';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import Image from 'next/image';
import SelfieDoodle from '@/images/illustration/SelfieDoodle';
import PlantDoodle from '@/images/illustration/PlantDoodle';
import apiService from '@/services/apiService';
import transcriptionService from '@/services/transcriptionService';
import io from 'socket.io-client';

const languages = [
  { code: 'en', name: 'English' },
  { code: 'lv', name: 'Latvian' },
  { code: 'lt', name: 'Lithuanian' },
  { code: 'et', name: 'Estonian' },
  { code: 'ru', name: 'Russian' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'es', name: 'Spanish' }
];

// Helper function to get language code
const getLanguageCode = (languageName) => {
  const languageMap = {
    'English': 'en',
    'Latvian': 'lv',
    'Lithuanian': 'lt',
    'Estonian': 'et',
    'German': 'de',
    'Spanish': 'es',
    'Russian': 'ru',
    'French': 'fr'
  };
  return languageMap[languageName] || 'en';
};

// Helper function to get full language name
const getLanguageName = (code) => {
  const languageMap = {
    'en-US': 'English (US)',
    'es-ES': 'Spanish (Spain)',
    'fr-FR': 'French (France)',
    'lv': 'Latvian',
    'de-DE': 'German',
  };
  return languageMap[code] || code;
};

const LiveEventPage = () => {
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [languageMenuAnchorEl, setLanguageMenuAnchorEl] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [eventStatus, setEventStatus] = useState('');
  
  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [translations, setTranslations] = useState({});
  const [processingAudio, setProcessingAudio] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const socketRef = useRef(null);

  // Make sure your language selection dropdown/options use valid codes
  // Example options:
  const languageOptions = [
    { value: 'en-US', label: 'English (US)' },
    { value: 'es-ES', label: 'Spanish (Spain)' },
    { value: 'fr-FR', label: 'French (France)' },
    // Add other languages supported by Azure Speech
  ];

  useEffect(() => {
    // Fetch event data from localStorage
    console.log('Fetching event data from localStorage...');
    const storedEvents = localStorage.getItem('eventData');
    if (storedEvents) {
      const parsedEvents = JSON.parse(storedEvents);
      const currentEvent = parsedEvents.find(event => event.id === id);
      if (currentEvent) {
        console.log('Fetched eventData:', currentEvent); // Log fetched data
        setEventData(currentEvent);
        setEventStatus(currentEvent.status || 'Draft event');
      } else {
        console.error('Event not found in localStorage');
        router.push('/dashboard/analytics');
      }
    } else {
      console.error('No event data found in localStorage');
      router.push('/dashboard/analytics');
    }
    setLoading(false);
  }, [id, router]);

  // Effect to set initial language from eventData
  useEffect(() => {
    // Log when this effect runs and what eventData is
    console.log('Language setting effect running. EventData:', eventData);
    if (eventData && eventData.sourceLanguages && eventData.sourceLanguages.length > 0) {
      const initialLang = eventData.sourceLanguages[0];
      // Log the language being set
      console.log(`Attempting to set initial selectedLanguage from eventData: ${initialLang}`);
      // Make sure the value from localStorage is a valid BCP-47 code!
      setSelectedLanguage(initialLang);
    } else if (eventData) {
      console.warn("Event data loaded, but no source languages found. Check event creation/edit.");
    }
  }, [eventData]); // Dependency: run when eventData changes

  // WebSocket setup effect
  useEffect(() => {
    // --- CHECK THIS URL ---
    const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001';
    console.log(`Attempting to connect WebSocket to: ${socketUrl}`); // Log the URL being used

    socketRef.current = io(socketUrl, {
        // Optional: Add transports if needed, e.g., ['websocket', 'polling']
        // Optional: Add query parameters if your backend expects them for auth/room joining
    });

    socketRef.current.on('connect', () => {
      // --- LOOK FOR THIS LOG ---
      console.log('WebSocket connected:', socketRef.current.id);
      // Optional: Join a room specific to this event if your backend uses rooms
      // socketRef.current.emit('join_event', { event_id: id });
    });

    socketRef.current.on('disconnect', (reason) => {
      // --- LOOK FOR THIS LOG ---
      console.log('WebSocket disconnected:', reason);
    });

    socketRef.current.on('connect_error', (error) => {
      // --- LOOK FOR THIS LOG ---
      console.error('WebSocket connection error:', error);
    });

    // Listener for Translation Results
    socketRef.current.on('translation_result', (data) => {
      console.log('Received translation result:', data);
      if (data.target_language && data.translated_text) {
        setTranslations(prev => ({
          ...prev,
          [data.target_language]: data.translated_text
        }));
      }
    });

    // Cleanup on component unmount
    return () => {
      if (socketRef.current) {
        console.log('Disconnecting WebSocket...');
        socketRef.current.disconnect();
      }
    };
  }, [id]); // Dependency array

  // Start recording function
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = { mimeType: 'audio/wav' };
      let recorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e1) {
        console.warn('audio/wav not supported, trying default:', e1);
        try {
          recorder = new MediaRecorder(stream);
        } catch (e2) {
          console.error('MediaRecorder creation failed:', e2);
          setEventStatus('Error: Recording not supported');
          return;
        }
      }
      mediaRecorderRef.current = recorder;

      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('Audio chunk added, size:', event.data.size);
        }
      };
      
      mediaRecorderRef.current.onstop = async () => {
        console.log('Recording stopped. Chunks collected:', audioChunksRef.current.length);
        if (audioChunksRef.current.length === 0) {
          console.warn("No audio chunks recorded.");
          setEventStatus('Ready');
          setIsRecording(false);
          return;
        }
        const actualMimeType = mediaRecorderRef.current?.mimeType || 'audio/wav';
        console.log('Creating blob with MIME type:', actualMimeType);

        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
        audioChunksRef.current = [];

        console.log('Audio blob created, size:', audioBlob.size);
        if (audioBlob.size === 0) {
          console.warn("Created audio blob has size 0.");
          setEventStatus('Ready');
          setIsRecording(false);
          return;
        }

        await processAudio(audioBlob);
        setIsRecording(false);
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  // Stop recording function
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Updated processAudio function
  const processAudio = useCallback(async (audioBlob) => {
    if (!audioBlob || audioBlob.size === 0) {
      console.error('processAudio called with invalid blob');
      return;
    }
    setProcessingAudio(true);
    setTranscription(''); // Clear previous transcription
    setTranslations({}); // Clear previous translations

    console.log(`processAudio: Using selectedLanguage state: ${selectedLanguage}`);
    if (!selectedLanguage) {
        console.error("processAudio: selectedLanguage is empty! Cannot send request.");
        setProcessingAudio(false);
        return;
    }

    try {
      console.log('Sending audio blob to backend, size:', audioBlob.size, 'type:', audioBlob.type);
      const result = await transcriptionService.speechToText(
          audioBlob,
          'recording.wav',
          selectedLanguage
      );
      console.log('Raw transcription result object:', result);

      // --- Detailed logging before the check ---
      if (result) {
          console.log('Result object exists.');
          console.log('Value of result.transcription:', result.transcription);
          console.log('Type of result.transcription:', typeof result.transcription);
          console.log('Is result.transcription truthy?', !!result.transcription);
      } else {
          console.log('Result object is null or undefined.');
      }
      // --- End detailed logging ---

      // --- THE CHECK ---
      if (result && result.transcription) {
        const newTranscription = result.transcription;
        console.log('IF block entered. Setting transcription state.');
        setTranscription(newTranscription); // Update transcription state

        // --- Trigger Translation via WebSocket ---
        // Ensure socket exists and is connected
        if (socketRef.current && socketRef.current.connected) {
          // Ensure there are target languages defined in eventData
          if (eventData?.targetLanguages?.length > 0) {
            const payload = {
              text: newTranscription,
              source_language: selectedLanguage, // e.g., 'en-US'
              target_languages: eventData.targetLanguages // e.g., ['lv-LV']
            };
            // --- EMIT THE CORRECT EVENT ---
            console.log('Emitting translate_text via WebSocket with payload:', payload); // Log the payload
            socketRef.current.emit('translate_text', payload);
            // --- END EMIT ---
          } else {
            console.log('No target languages defined in eventData, skipping translation emit.');
          }
        } else {
          // Log the error if socket is not ready
          console.error('WebSocket not connected or available, cannot send transcription for translation.');
        }
        // --- End Translation Trigger ---

      } else {
         console.warn("ELSE block entered. Transcription not set. Full result:", result);
         setTranscription(''); // Ensure it's cleared
      }
      // --- END CHECK ---

    } catch (error) {
      console.error('Error processing audio:', error);
      setTranscription(''); // Clear on error
      setEventStatus(`Error: ${error.response?.data?.error || error.message || 'Processing failed'}`);
    } finally {
      setProcessingAudio(false);
    }
  }, [selectedLanguage, id, eventData, socketRef]); // Added socketRef to dependencies

  // Play synthesized speech
  const playSynthesizedSpeech = async (text, language) => {
    try {
      // Map language code to voice name if needed
      const voiceMap = {
        'en': 'en-US-JennyNeural',
        'lv': 'lv-LV-EveritaNeural',
        'lt': 'lt-LT-OnaNeural',
        'et': 'et-EE-AnuNeural',
        'de': 'de-DE-KatjaNeural',
        'es': 'es-ES-ElviraNeural',
        'ru': 'ru-RU-SvetlanaNeural',
        'fr': 'fr-FR-DeniseNeural'
      };
      
      const voice = voiceMap[language] || 'en-US-JennyNeural';
      
      const audioBlob = await transcriptionService.textToSpeech(text, voice);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (error) {
      console.error('Error playing synthesized speech:', error);
      alert('Error playing audio. Please try again.');
    }
  };

  const handleOpenMenu = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
  };

  const handleOpenLanguageMenu = (event) => {
    setLanguageMenuAnchorEl(event.currentTarget);
  };

  const handleCloseLanguageMenu = () => {
    setLanguageMenuAnchorEl(null);
  };

  const handleChangeInput = (language) => {
    setSelectedLanguage(language);
    handleCloseLanguageMenu();
  };

  const handleBackToEvents = () => {
    router.push('/dashboard/analytics');
  };

  const handleOpenPauseDialog = () => {
    setPauseDialogOpen(true);
  };

  const handleClosePauseDialog = () => {
    setPauseDialogOpen(false);
  };

  const handleConfirmPause = () => {
    console.log('Event paused');
    setPauseDialogOpen(false);
  };

  const handleOpenCompleteDialog = () => {
    setCompleteDialogOpen(true);
  };

  const handleCloseCompleteDialog = () => {
    setCompleteDialogOpen(false);
  };

  const handleCompleteEvent = () => {
    // Update event status to completed in localStorage
    const storedEvents = localStorage.getItem('eventData');
    if (storedEvents) {
      const parsedEvents = JSON.parse(storedEvents);
      const updatedEvents = parsedEvents.map(event => 
        event.id === id ? { ...event, status: 'Completed' } : event
      );
      localStorage.setItem('eventData', JSON.stringify(updatedEvents));
    }
    
    // Redirect to completion page
    router.push(`/events/${id}/complete`);
  };

  if (loading || !eventData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        p: 2, 
        borderBottom: '1px solid #E5E8EB' 
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={handleBackToEvents} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {eventData.title || 'Live Event'}
          </Typography>
        </Box>
        
        <Box>
          <Button 
            variant="outlined" 
            color="error" 
            onClick={handleOpenPauseDialog}
            sx={{ mr: 1 }}
          >
            Pause
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleOpenCompleteDialog}
          >
            Complete
          </Button>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* Left Panel - Transcription */}
        <Box sx={{ width: '60%', p: 3, borderRight: '1px solid #E5E8EB', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Source: {getLanguageName(selectedLanguage)}
            </Typography>
            
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                minHeight: '200px', 
                bgcolor: '#F9FAFB', 
                borderRadius: '8px',
                mb: 2
              }}
            >
              {transcription ? (
                <Typography variant="body1">{transcription}</Typography>
              ) : (
                <Typography variant="body2" sx={{ color: '#637381', fontStyle: 'italic' }}>
                  Transcription will appear here...
                </Typography>
              )}
            </Paper>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              {isRecording ? (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<StopIcon />}
                  onClick={stopRecording}
                  sx={{ borderRadius: '24px', px: 3 }}
                >
                  Stop Recording
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<MicIcon />}
                  onClick={startRecording}
                  sx={{ borderRadius: '24px', px: 3 }}
                  disabled={processingAudio}
                >
                  Start Recording
                </Button>
              )}
            </Box>
            
            {processingAudio && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <CircularProgress size={24} sx={{ mr: 1 }} />
                <Typography>Processing audio...</Typography>
              </Box>
            )}
          </Box>
          
          <Divider sx={{ my: 3 }} />
          
          {/* Translations */}
          <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Translations
            </Typography>
            
            {eventData.targetLanguages && eventData.targetLanguages.length > 0 ? (
              eventData.targetLanguages.map((targetLang) => (
                <Paper
                  key={targetLang}
                  elevation={0}
                  sx={{
                    p: 2,
                    mb: 2,
                    bgcolor: '#F9FAFB',
                    borderRadius: '8px',
                    position: 'relative'
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {getLanguageName(targetLang)}
                    </Typography>
                    
                    <IconButton 
                      size="small" 
                      onClick={() => playSynthesizedSpeech(translations[targetLang], targetLang)}
                      disabled={!translations[targetLang]}
                    >
                      <VolumeUpIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  
                  {translations[targetLang] ? (
                    <Typography variant="body1">{translations[targetLang]}</Typography>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#637381', fontStyle: 'italic' }}>
                      Translation will appear here...
                    </Typography>
                  )}
                </Paper>
              ))
            ) : (
              <Typography variant="body2" sx={{ color: '#637381' }}>
                No target languages selected for this event.
              </Typography>
            )}
          </Box>
        </Box>
        
        {/* Right Panel - Settings */}
        <Box sx={{ width: '40%', p: 3, bgcolor: '#F9FAFB' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
            Event Settings
          </Typography>
          
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
              Event Details
            </Typography>
            
            <Paper elevation={0} sx={{ p: 2, borderRadius: '8px' }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ color: '#637381', mb: 0.5 }}>
                  Name
                </Typography>
                <Typography variant="body1">
                  {eventData.title}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ color: '#637381', mb: 0.5 }}>
                  Description
                </Typography>
                <Typography variant="body1">
                  {eventData.description || 'No description provided'}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ color: '#637381', mb: 0.5 }}>
                  Location
                </Typography>
                <Typography variant="body1">
                  {eventData.location || 'Online'}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="body2" sx={{ color: '#637381', mb: 0.5 }}>
                  Date
                </Typography>
                <Typography variant="body1">
                  {eventData.timestamp || 'Not specified'}
                </Typography>
              </Box>
            </Paper>
          </Box>
          
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
              Language Settings
            </Typography>
            
            <Card>
              <CardHeader title='Language Settings' />
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Box>
                  <Typography variant='body2' sx={{ mb: 1 }}>Source Language</Typography>
                  <Chip
                    label={eventData?.sourceLanguages?.length ? getLanguageName(eventData.sourceLanguages[0]) : 'Unknown'}
                    variant='outlined'
                    sx={{ borderRadius: '16px' }}
                  />
                </Box>
                <Box>
                  <Typography variant='body2' sx={{ mb: 1 }}>Target Languages</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {eventData?.targetLanguages?.length ? (
                      eventData.targetLanguages.map((langCode) => (
                        <Chip
                          key={langCode}
                          label={getLanguageName(langCode)}
                          variant='outlined'
                          sx={{ borderRadius: '16px' }}
                        />
                      ))
                    ) : (
                      <Chip label='Unknown' variant='outlined' sx={{ borderRadius: '16px' }} />
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>

      {/* Pause Dialog */}
      <Dialog open={pauseDialogOpen} onClose={handleClosePauseDialog}>
        <DialogTitle>Pause Event</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to pause this event? You can resume it later.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePauseDialog}>Cancel</Button>
          <Button onClick={handleConfirmPause} color="primary">Pause</Button>
        </DialogActions>
      </Dialog>

      {/* Complete Dialog */}
      <Dialog open={completeDialogOpen} onClose={handleCloseCompleteDialog}>
        <DialogTitle>Complete Event</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to complete this event? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCompleteDialog}>Cancel</Button>
          <Button onClick={handleCompleteEvent} color="primary">Complete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LiveEventPage; 