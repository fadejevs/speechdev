"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import IconButton from '@mui/material/IconButton';
import SelfieDoodle from '@/images/illustration/SelfieDoodle';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import io from 'socket.io-client';
import Card from '@mui/material/Card';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { CardContent, List, ListItem, ListItemText, Alert } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import Chip from '@mui/material/Chip';

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

const getFullLanguageName = (code) => {
  const lang = languages.find(l => l.code === code);
  return lang ? lang.name : code;
};

const EventLivePage = () => {
  const { id } = useParams();
  const router = useRouter();
  const [eventData, setEventData] = useState(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const [isRecording, setIsRecording] = useState(false);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const socketRef = useRef(null);

  const [liveTranscription, setLiveTranscription] = useState('');
  const [liveTranscriptionLang, setLiveTranscriptionLang] = useState('');
  const [liveTranslations, setLiveTranslations] = useState({});
  const [socketConnected, setSocketConnected] = useState(false);
  const [processingAudio, setProcessingAudio] = useState(false);
  const [error, setError] = useState(null);
  const [transcripts, setTranscripts] = useState([]);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://speechdev.onrender.com';

  const languageNameMap = {
    'en-US': 'English (US)',
    'es-ES': 'Spanish (Spain)',
    'lv-LV': 'Latvian',
    'de-DE': 'German',
    'fr-FR': 'French',
    'ru-RU': 'Russian',
    'zh-CN': 'Chinese (Mandarin)',
    'ja-JP': 'Japanese',
    'it-IT': 'Italian',
    'pt-PT': 'Portuguese'
  };
  const languageCodeMap = Object.fromEntries(Object.entries(languageNameMap).map(([code, name]) => [name, code]));

  const audioChunksRef = useRef([]);

  useEffect(() => {
    const fetchEventDataFromLocal = () => {
      setLoading(true);
      setError(null);
      console.log(`Attempting to load event data for ID: ${id} from localStorage`);
      try {
        const savedEvents = localStorage.getItem('eventData'); // Key used in other components
        if (!savedEvents) {
          throw new Error('No event data found in localStorage.');
        }

        const events = JSON.parse(savedEvents);
        // Find the specific event by ID. Ensure type consistency if needed (e.g., toString()).
        const currentEvent = events.find(e => e.id.toString() === id.toString());

        if (!currentEvent) {
          throw new Error(`Event with ID ${id} not found in localStorage.`);
        }

        // --- Map localStorage structure to expected state structure ---
        // Adjust these keys based on how data is actually stored in localStorage
        // by your event creation/editing components.
        const fetchedData = {
            id: currentEvent.id,
            name: currentEvent.title || `Event ${currentEvent.id}`, // Use 'title' or 'name' as appropriate
            description: currentEvent.description,
            location: currentEvent.location,
            date: currentEvent.timestamp, // Use 'timestamp' or 'date'
            type: currentEvent.type,
            // CRITICAL: Ensure these keys match exactly what's in localStorage
            sourceLanguage: currentEvent.sourceLanguages?.[0] || currentEvent.sourceLanguage, // Handle array vs single value
            targetLanguages: currentEvent.targetLanguages || [], // Ensure it's an array
            recordEvent: currentEvent.recordEvent
        };
        // --- End Mapping ---


        if (!fetchedData.sourceLanguage || !fetchedData.targetLanguages) {
            console.error('Loaded data is missing required language fields:', fetchedData);
            throw new Error('Loaded event data from localStorage is incomplete (missing languages).');
        }

        setEventData(fetchedData);
        console.log('Loaded Event Data from localStorage:', fetchedData);

        // Set display states based on fetched data
        setLiveTranscriptionLang(fetchedData.sourceLanguage || '');
        const initialTranslations = {};
        (fetchedData.targetLanguages || []).forEach(lang => {
          initialTranslations[lang] = '';
        });
        setLiveTranslations(initialTranslations);

        // After setting the event data, update the status to "Live"
        const storedEvents = JSON.parse(localStorage.getItem('eventData') || '[]');
        const updatedEvents = storedEvents.map(event => {
          if (event.id === id) {
            return {
              ...event,
              status: 'Live'
            };
          }
          return event;
        });
        
        localStorage.setItem('eventData', JSON.stringify(updatedEvents));
        console.log('Event marked as Live in localStorage');

      } catch (err) {
        console.error('Failed to load event details from localStorage:', err);
        const errorMsg = err.message || 'Failed to load event details from local storage.';
        setError(errorMsg);
        toast.error(`Failed to load event details: ${errorMsg}`);
        setEventData(null); // Clear data on error
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchEventDataFromLocal();
    }
    // API_BASE_URL is no longer needed as a dependency
  }, [id]); // Dependency is just the ID now

  useEffect(() => {
    const getDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        setAudioDevices(audioInputs);
        if (audioInputs.length > 0 && !selectedDevice) {
          setSelectedDevice(audioInputs[0].deviceId);
        }
      } catch (err) {
        console.error('Error accessing audio devices:', err);
        setError('Microphone access denied or no microphone found. Please check permissions.');
      }
    };
    getDevices();

    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getDevices);
    };
  }, []);

  useEffect(() => {
    if (!id || !eventData) return;

    const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'https://speechdev.onrender.com';
    
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    socketRef.current = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket'],
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socketRef.current.on('connect', () => {
      console.log('Admin WebSocket connected:', socketRef.current.id);
      setSocketConnected(true);
      
      // Join room with all necessary language data
      const roomData = {
        room_id: id,
        source_language: eventData.sourceLanguage,
        target_languages: eventData.targetLanguages
      };
      socketRef.current.emit('join_room', roomData);
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('Admin WebSocket disconnected:', reason);
      setSocketConnected(false);
      if (reason !== 'io client disconnect') {
          setError('WebSocket disconnected. Attempting to reconnect...');
          toast.error('WebSocket disconnected.');
      }
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Admin WebSocket connection error:', error);
      setSocketConnected(false);
      setError(`WebSocket connection failed: ${error.message}. Please check the server.`);
      toast.error(`WebSocket connection failed: ${error.message}`);
    });

    socketRef.current.on('translation_result', (data) => {
        if (data.is_manual) {
            console.log('Manual Translation Result Received: ', data);
            setTranscripts(prev => [...prev, {
                original: data.original,
                translated: data.translated,
                sourceLanguage: data.source_language,
                targetLanguage: data.target_language,
                timestamp: new Date().toISOString()
            }]);
        } else {
            console.log('Received non-manual translation result:', data);
            if (data.original) setLiveTranscription(data.original);
            if (data.source_language) setLiveTranscriptionLang(data.source_language);
            if (data.translations) {
                setLiveTranslations(prev => ({ ...prev, ...data.translations }));
            }
        }
    });

    socketRef.current.on('error', (data) => {
      console.error('Socket Error:', data.message);
      toast.error(`Error: ${data.message}`);
    });

    socketRef.current.on('realtime_recognition_started', (data) => {
      console.log('Real-time recognition started:', data);
      toast.success('Real-time recognition started');
    });

    socketRef.current.on('realtime_transcription', (data) => {
      console.log('Real-time transcription:', data);
      
      if (data.text) {
        setLiveTranscription(data.text);
        
        if (data.source_language) {
          setLiveTranscriptionLang(data.source_language);
        }
        
        // If this is a final result, add it to the transcripts
        if (data.is_final) {
          setTranscripts(prev => [...prev, {
            original: data.text,
            sourceLanguage: data.source_language,
            timestamp: new Date().toISOString(),
            translations: {} // This will be filled by the translation event
          }]);
        }
      }
    });

    socketRef.current.on('realtime_translation', (data) => {
      console.log('Real-time translation:', data);
      
      if (data.translations) {
        setLiveTranslations(prev => ({ ...prev, ...data.translations }));
        
        // Update the latest transcript with translations
        setTranscripts(prev => {
          if (prev.length === 0) return prev;
          
          const updated = [...prev];
          const latest = updated[updated.length - 1];
          
          // Only update if this translation is for the latest transcript
          if (latest.original === data.original) {
            updated[updated.length - 1] = {
              ...latest,
              translations: { ...latest.translations, ...data.translations }
            };
          }
          
          return updated;
        });
      }
    });

    socketRef.current.on('realtime_recognition_stopped', (data) => {
      console.log('Real-time recognition stopped:', data);
      toast.info('Real-time recognition stopped');
    });

    return () => {
      if (socketRef.current) {
        console.log('Disconnecting Admin WebSocket');
        socketRef.current.disconnect();
      }
    };
  }, [id, eventData]);

  // Replace the startRecording function with this real-time version
  const startRecording = useCallback(async () => {
    if (isRecording || !eventData) return;

    // Check prerequisites
    if (!selectedDevice || !socketRef.current?.connected || !eventData?.sourceLanguage) {
      toast.error('Cannot start recording: Missing device, socket connection, or source language.');
      return;
    }

    audioChunksRef.current = [];
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: selectedDevice } }
      });
      streamRef.current = stream;

      const options = { mimeType: 'audio/webm;codecs=opus' };
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      // Set a shorter timeslice (e.g., 500ms) for more frequent chunks
      const TIMESLICE_MS = 500; // Send audio chunks every 500ms

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0 && socketRef.current?.connected && eventData) {
          audioChunksRef.current.push(event.data);

          const reader = new FileReader();
          reader.onload = () => {
            const base64Audio = reader.result.split(',')[1];
            if (socketRef.current?.connected) {
              console.log(`Sending real-time audio chunk to room: ${id}`);
              
              socketRef.current.emit('realtime_audio_chunk', {
                room_id: id,
                audio_data: base64Audio,
                language: eventData.sourceLanguage,
                target_languages: eventData.targetLanguages
              });
            }
          };
          reader.readAsDataURL(event.data);
        }
      };

      // Handle recording stop
      mediaRecorderRef.current.onstop = () => {
        console.log('MediaRecorder stopped.');
        setIsRecording(false);
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        setIsRecording(false);
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      };

      // Start recording with the specified timeslice
      mediaRecorderRef.current.start(TIMESLICE_MS);
      setIsRecording(true);
      
      // Notify the server that we're starting a real-time session
      socketRef.current.emit('start_realtime_recognition', {
        room_id: id,
        language: eventData.sourceLanguage,
        target_languages: eventData.targetLanguages
      });
      
    } catch (err) {
      console.error('Error starting recording:', err);
      setError(`Failed to start recording: ${err.message}`);
    }
  }, [id, selectedDevice, eventData, socketRef]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('Calling mediaRecorderRef.current.stop()');
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log('Recording stopped by user, waiting for onstop processing.');
    } else {
      console.log('Stop recording called but recorder not active or found.');
      setIsRecording(false);
      setProcessingAudio(false);
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      audioChunksRef.current = [];
    }
  }, [isRecording, mediaRecorderRef, streamRef]);

  const handleBackToEvents = () => {
    router.push('/dashboard/analytics');
  };

  const handleOpenShareDialog = () => {
    setShareDialogOpen(true);
  };

  const handleCloseShareDialog = () => {
    setShareDialogOpen(false);
    setCopied(false);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/broadcast/${id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCompleteEvent = () => {
    if (isRecording) {
      stopRecording();
    }
    
    // Update event status in localStorage
    const storedEvents = JSON.parse(localStorage.getItem('eventData') || '[]');
    const updatedEvents = storedEvents.map(event => {
      if (event.id === id) {
        return {
          ...event,
          status: 'Completed'
        };
      }
      return event;
    });
    
    localStorage.setItem('eventData', JSON.stringify(updatedEvents));
    console.log('Event marked as completed in localStorage');
    
    router.push(`/events/${id}/complete`);
  };

  const handlePauseEvent = () => {
    alert('Pause functionality not implemented yet.');
  };

  const handleDeviceChange = (event) => {
    if (isRecording) {
        stopRecording();
    }
    setSelectedDevice(event.target.value);
  };

  const testBackendConnection = () => {
    if (!socketRef.current || !socketConnected) {
      setError("WebSocket not connected. Cannot test backend.");
      return;
    }
    
    console.log("Sending test request to backend...");
    socketRef.current.emit('test_transcription', {
      room: id,
      text: "This is a test message",
      source_language: eventData?.sourceLanguages?.[0] || 'lv-LV'
    });
    
    setTimeout(() => {
      if (!liveTranscription) {
        console.warn("No response received from test transcription after 3 seconds");
        setError("Backend test failed: No response received. Please check server logs.");
      }
    }, 3000);
  };

  const testAzureSpeech = () => {
    if (socketRef.current && socketRef.current.connected) {
      console.log('Testing Azure Speech recognition...');
      socketRef.current.emit('test_azure_speech', {
        room_id: id
      });
    }
  };

  const testServices = () => {
    if (socketRef.current && socketRef.current.connected) {
      console.log('Testing translation and speech services...');
      socketRef.current.emit('test_services', {
        room_id: id
      });
    } else {
      console.error('WebSocket not connected');
    }
  };

  const testTextTranslation = () => {
    if (socketRef.current && socketRef.current.connected) {
      console.log('Testing text translation (English to Spanish)...');
      const testText = "Hello, this is a test message.";
      
      socketRef.current.emit('manual_text', {
        room_id: id,
        text: testText,
        source_language: 'en-US',
        target_languages: ['es-ES']
      });
    }
  };

  const simpleTest = () => {
    if (socketRef.current && socketRef.current.connected) {
      console.log('Running simple test...');
      socketRef.current.emit('simple_test', {
        room_id: id
      });
    }
  };

  const testEndpoints = async () => {
    const endpoints = [
      '/speech-to-text',
      '/translate',
      '/text-to-speech',
      '/speech/transcribe-and-translate',
      '/api/speech/recognize',
      '/api/speech/transcribe-and-translate'
    ];
    
    console.log("Testing endpoints on base URL:", API_BASE_URL);
    
    for (const endpoint of endpoints) {
      try {
        // Try a GET request first to see if the endpoint exists
        const response = await axios.get(`${API_BASE_URL}${endpoint}`);
        console.log(`✅ Endpoint ${endpoint} exists (GET):`, response.status);
      } catch (error) {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          if (error.response.status === 404) {
            console.log(`❌ Endpoint ${endpoint} not found (GET)`);
          } else if (error.response.status === 405) {
            console.log(`⚠️ Endpoint ${endpoint} exists but doesn't accept GET`);
          } else {
            console.log(`⚠️ Endpoint ${endpoint} error:`, error.response.status);
          }
        } else {
          console.log(`❌ Network error testing ${endpoint}:`, error.message);
        }
      }
    }
  };

  // Add a function to stop real-time recognition
  const stopRealTimeRecording = useCallback(() => {
    if (!isRecording || !socketRef.current?.connected) return;
    
    // Stop the MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // Stop the real-time recognition on the server
    socketRef.current.emit('stop_realtime_recognition', {
      room_id: id
    });
    
    // Stop the audio tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsRecording(false);
    setProcessingAudio(false);
  }, [id, isRecording]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading Event Details...</Typography>
      </Box>
    );
  }

  if (error) {
     return (
       <Box sx={{ p: 3 }}>
         <Alert severity="error">
           Error loading event details: {error}
           <Button onClick={() => router.back()} sx={{ ml: 2 }}>Go Back</Button>
         </Alert>
       </Box>
     );
  }

  if (!eventData) {
      return (
          <Box sx={{ p: 3 }}>
              <Alert severity="warning">Event data could not be loaded or is incomplete.</Alert>
              <Button onClick={() => router.back()} sx={{ ml: 2 }}>Go Back</Button>
          </Box>
      );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: '100vh' }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 4
      }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBackToEvents}
          sx={{ 
            color: '#212B36',
            textTransform: 'none',
            '&:hover': { bgcolor: 'rgba(33, 43, 54, 0.08)' }
          }}
        >
          Back To Events
        </Button>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={handlePauseEvent}
            disabled={true}
            sx={{
              borderColor: '#E5E8EB',
              color: '#A3ACB9',
              textTransform: 'none',
              px: 3,
              py: 1,
              borderRadius: '8px',
              '&:hover': { bgcolor: 'rgba(99, 115, 129, 0.08)' },
              '&.Mui-disabled': {
                borderColor: '#E5E8EB',
                color: '#A3ACB9',
              }
            }}
          >
            Pause Event
          </Button>
          
          <Button
            variant="contained"
            onClick={handleCompleteEvent}
            disabled={isRecording}
            sx={{
              bgcolor: '#6366F1',
              color: 'white',
              textTransform: 'none',
              px: 3,
              py: 1,
              borderRadius: '8px',
              '&:hover': { bgcolor: '#4338CA' },
              '&.Mui-disabled': { bgcolor: '#cbd5e1', color: '#94a3b8' }
            }}
          >
            Complete Event
          </Button>
        </Box>
      </Box>

      <Box sx={{ 
        bgcolor: 'white',
        borderRadius: 2,
        p: 4,
        mb: 4,
        textAlign: 'center',
        boxShadow: '0px 2px 4px rgba(145, 158, 171, 0.16)'
      }}>
        <Box sx={{ 
          mb: 2,
          display: 'flex',
          justifyContent: 'center'
        }}>
          <Box sx={{ 
            mb: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: 172,
            width: 230,
            position: 'relative'
          }}>
            <SelfieDoodle sx={{ 
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              maxWidth: '100%',
              maxHeight: '100%'
            }} />
          </Box>
        </Box>

        <Typography variant="h5" sx={{ 
          fontWeight: 600, 
          color: '#212B36',
          mb: 1
        }}>
          Your Event Is Live
        </Typography>

        <Typography variant="body2" sx={{ 
          color: '#637381',
          mb: 2
        }}>
          Start speaking into your selected microphone to begin transcription.
        </Typography>

        <Button
          variant="contained"
          onClick={handleOpenShareDialog}
          sx={{
            bgcolor: '#6366F1',
            color: 'white',
            textTransform: 'none',
            px: 3,
            py: 1,
            borderRadius: '8px',
            '&:hover': { bgcolor: '#4338CA' },
            mt: 1
          }}
        >
          Share Event
        </Button>
      </Box>

      <Box sx={{ 
        bgcolor: 'white', borderRadius: 2, p: 3, mb: 4,
        boxShadow: '0px 2px 4px rgba(145, 158, 171, 0.16)',
        display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap'
      }}>
        <FormControl sx={{ minWidth: 200, flexGrow: 1 }}>
          <InputLabel id="audio-device-select-label">Microphone Input</InputLabel>
          <Select
            labelId="audio-device-select-label"
            value={selectedDevice}
            label="Microphone Input"
            onChange={handleDeviceChange}
            disabled={isRecording}
            size="small"
          >
            {audioDevices.length === 0 && <MenuItem value="" disabled>No microphones found</MenuItem>}
            {audioDevices.map(device => (
              <MenuItem key={device.deviceId} value={device.deviceId}>
                {device.label || `Microphone ${audioDevices.indexOf(device) + 1}`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          color={isRecording ? "error" : "primary"}
          onClick={isRecording ? stopRealTimeRecording : startRecording}
          disabled={!selectedDevice || processingAudio || !socketConnected}
          startIcon={isRecording ? <StopIcon /> : <MicIcon />}
          sx={{
             px: 3, py: 1, borderRadius: '8px', height: '40px',
             bgcolor: isRecording ? '#F04438' : '#6366F1',
             '&:hover': { bgcolor: isRecording ? '#D92D20' : '#4338CA' },
             '&.Mui-disabled': { bgcolor: '#cbd5e1', color: '#94a3b8' }
          }}
        >
          {isRecording ? "Stop Recording" : "Start Recording"}
        </Button>
         {processingAudio && <CircularProgress size={24} />}
         {!socketConnected && <Typography variant="caption" color="error">Connecting...</Typography>}
      </Box>

      {error && (
         <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'error.lighter', color: 'error.darker', border: '1px solid', borderColor: 'error.light' }}>
           <Typography variant="body2">{error}</Typography>
         </Paper>
       )}

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Live Transcription</Typography>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            bgcolor: '#F9FAFB', 
            borderRadius: '8px',
            minHeight: '100px',
            position: 'relative'
          }}
        >
          {processingAudio && (
            <Box sx={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <CircularProgress size={24} sx={{ mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Processing audio...
              </Typography>
            </Box>
          )}
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {liveTranscription || (isRecording ? 'Waiting for transcription...' : 'No transcription available')}
          </Typography>
        </Paper>
      </Box>

      <Box sx={{
        mb: 3, borderRadius: 2, bgcolor: 'white',
        boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.06)',
        border: '1px solid #F2F3F5', overflow: 'hidden'
      }}>
        <Box sx={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          px: { xs: 2, sm: 3 }, py: 2, borderBottom: '1px solid #F2F3F5'
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#212B36' }}>
            Live Translations
          </Typography>
        </Box>
        <Box sx={{ px: { xs: 2, sm: 3 }, py: 3, minHeight: '150px' }}>
          {eventData?.targetLanguages?.length > 0 ? (
            eventData.targetLanguages.map(langCode => (
              <Box key={langCode} sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 500 }}>
                  {getFullLanguageName(langCode)}
                </Typography>
                <Paper elevation={0} sx={{ p: 2, minHeight: '80px', maxHeight: '250px', overflowY: 'auto', bgcolor: '#F9FAFB', borderRadius: '8px' }}>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {liveTranslations[langCode] || (isRecording ? 'Waiting for translation...' : '')}
                  </Typography>
                </Paper>
              </Box>
            ))
          ) : (
            <Typography sx={{ color: '#637381', fontStyle: 'italic' }}>
              No target languages configured for this event. Add target languages in the event settings to enable translation.
            </Typography>
          )}
        </Box>
      </Box>

      <Box sx={{
        mb: 4, bgcolor: 'white', borderRadius: 2, p: 3,
        boxShadow: '0px 2px 4px rgba(145, 158, 171, 0.16)'
      }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#212B36', mb: 1 }}>
          Published Languages
        </Typography>
        <Typography variant="body2" sx={{ color: '#637381', mb: 3 }}>
          These are the languages configured for the event. Transcription uses the source language.
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {eventData?.sourceLanguages?.map(langCode => (
            <Box key={langCode} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, borderBottom: '1px solid #F2F3F5' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle1">{getFullLanguageName(langCode)}</Typography>
                <Box sx={{ bgcolor: '#EEF2FF', color: '#6366F1', px: 1, py: 0.5, borderRadius: 1, fontSize: '12px' }}>Source</Box>
              </Box>
            </Box>
          ))}
          {eventData?.targetLanguages?.map(langCode => (
            <Box key={langCode} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, borderBottom: '1px solid #F2F3F5' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle1">{getFullLanguageName(langCode)}</Typography>
                <Box sx={{ bgcolor: '#E5F7FF', color: '#0EA5E9', px: 1, py: 0.5, borderRadius: 1, fontSize: '12px' }}>Translation</Box>
              </Box>
            </Box>
          ))}
          {(!eventData?.sourceLanguages?.length && !eventData?.targetLanguages?.length) && (
            <Typography sx={{ color: '#637381', py: 2 }}>No languages configured.</Typography>
          )}
        </Box>
      </Box>

  

      <Dialog 
        open={shareDialogOpen} 
        onClose={handleCloseShareDialog}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            width: '400px',
            margin: '0 auto',
            boxShadow: '0px 20px 40px rgba(0, 0, 0, 0.1)',
            overflow: 'visible'
          }
        }}
      >
        <Box sx={{ p: '24px' }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 2
          }}>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '18px', color: '#212B36' }}>
              Share Event Access
            </Typography>
            <IconButton 
              onClick={handleCloseShareDialog} 
              size="small"
              sx={{ 
                color: '#637381',
                p: '4px',
                '&:hover': { bgcolor: 'rgba(99, 115, 129, 0.08)' }
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          
          <Typography variant="body1" sx={{ mb: 1.5, color: '#212B36', fontSize: '14px' }}>
            Here is the unique event access link
          </Typography>
          
          <TextField
            fullWidth
            variant="outlined"
            value={`${window.location.origin}/broadcast/${id}`}
            InputProps={{
              readOnly: true,
              sx: { 
                borderRadius: '8px',
                fontSize: '14px',
                bgcolor: '#F9FAFB',
                height: '40px',
                '& .MuiOutlinedInput-input': {
                  p: '10px 14px'
                }
              }
            }}
            sx={{ mb: 1 }}
          />
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontSize: '12px' }}>
            Anyone with this link can view the live transcription and translations.
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Button
              variant="contained"
              startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
              onClick={handleCopyLink}
              sx={{
                bgcolor: '#6366f1',
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 500,
                px: 3,
                py: 1,
                height: '40px',
                fontSize: '14px',
                '&:hover': { bgcolor: '#4338ca' }
              }}
            >
              {copied ? 'Copied!' : 'Copy Event Link'}
            </Button>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
};

export default EventLivePage; 