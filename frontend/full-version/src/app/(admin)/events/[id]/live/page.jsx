"use client";

import React, { useState, useEffect, useRef } from 'react';
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
  CircularProgress
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
const getLanguageName = (languageCode) => {
  const languageMap = {
    'en': 'English',
    'lv': 'Latvian',
    'lt': 'Lithuanian',
    'et': 'Estonian',
    'de': 'German',
    'es': 'Spanish',
    'ru': 'Russian',
    'fr': 'French'
  };
  return languageMap[languageCode] || 'Unknown';
};

const LiveEventPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [languageMenuAnchorEl, setLanguageMenuAnchorEl] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState(null);
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

  useEffect(() => {
    if (id) {
      const storedEvents = localStorage.getItem('eventData');
      if (storedEvents) {
        const parsedEvents = JSON.parse(storedEvents);
        const event = parsedEvents.find(event => event.id === id);
        if (event) {
          setEventData(event);
          setEventStatus(event.status || 'Draft event');
          setLoading(false);
          // Set the first source language as selected by default
          if (event.sourceLanguages && event.sourceLanguages.length > 0) {
            setSelectedLanguage(event.sourceLanguages[0]);
          }
        } else {
          router.push('/dashboard/analytics');
        }
      }
    }
  }, [id, router]);

  // Start recording function
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        await processAudio(audioBlob);
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

  // Process audio for transcription and translation
  const processAudio = async (blob) => {
    try {
      setProcessingAudio(true);
      
      // Get source language code
      const sourceLanguageCode = selectedLanguage;
      
      // Step 1: Speech-to-text using your existing backend
      const recognitionResult = await transcriptionService.speechToText(blob, sourceLanguageCode);
      setTranscription(recognitionResult.text);
      
      // Step 2: Translate to all target languages
      const translationPromises = eventData.targetLanguages.map(async (targetLang) => {
        const translationResult = await transcriptionService.translateText(
          recognitionResult.text,
          targetLang
        );
        
        return { language: targetLang, text: translationResult.translated_text };
      });
      
      const translationResults = await Promise.all(translationPromises);
      
      // Update translations state
      const newTranslations = {};
      translationResults.forEach(result => {
        newTranslations[result.language] = result.text;
      });
      setTranslations(newTranslations);
      
      // Step 3: Store transcript
      await transcriptionService.storeTranscript(
        recognitionResult.text,
        JSON.stringify(newTranslations),
        sourceLanguageCode,
        eventData.targetLanguages.join(',')
      );
      
    } catch (error) {
      console.error('Error processing audio:', error);
      alert('Error processing audio. Please try again.');
    } finally {
      setProcessingAudio(false);
    }
  };

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
            
            <Paper elevation={0} sx={{ p: 2, borderRadius: '8px' }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ color: '#637381', mb: 1 }}>
                  Source Language
                </Typography>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {eventData.sourceLanguages && eventData.sourceLanguages.map((lang) => (
                    <Chip
                      key={lang}
                      label={getLanguageName(lang)}
                      color={selectedLanguage === lang ? "primary" : "default"}
                      onClick={() => setSelectedLanguage(lang)}
                      sx={{ borderRadius: '16px' }}
                    />
                  ))}
                </Box>
              </Box>
              
              <Box>
                <Typography variant="body2" sx={{ color: '#637381', mb: 1 }}>
                  Target Languages
                </Typography>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {eventData.targetLanguages && eventData.targetLanguages.map((lang) => (
                    <Chip
                      key={lang}
                      label={getLanguageName(lang)}
                      sx={{ borderRadius: '16px' }}
                    />
                  ))}
                </Box>
              </Box>
            </Paper>
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