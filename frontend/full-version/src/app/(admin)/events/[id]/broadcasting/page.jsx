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

const BroadcastingPage = () => {
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  // Remove menuAnchorEl, languageMenuAnchorEl, selectedLanguage if not needed
  // Remove pauseDialogOpen, completeDialogOpen, eventStatus
  
  // Audio recording states - KEEP THESE
  const [isRecording, setIsRecording] = useState(false);
  // Remove audioBlob (we'll stream chunks)
  const [transcription, setTranscription] = useState(''); // Keep to show source transcription
  // Remove translations state
  const [processingAudio, setProcessingAudio] = useState(false); // Keep
  const mediaRecorderRef = useRef(null); // Keep
  const audioChunksRef = useRef([]); // Keep
  const socketRef = useRef(null); // Keep for sending audio

  // WebSocket connection status - KEEP
  const [socketConnected, setSocketConnected] = useState(false);

  // Selected device ID - KEEP
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);

  // Remove languageOptions if not used

  // Fetch event data - KEEP
  useEffect(() => {
    // ... existing code ...
    // Remove setEventStatus line
  }, [id, router]);

  // Effect to set initial language - REMOVE (or adapt if needed for source language display)
  // useEffect(() => { ... });

  // Effect to load selected device ID - KEEP
  useEffect(() => {
    const deviceId = localStorage.getItem(`selectedAudioInput_${id}`);
    if (deviceId) {
      setSelectedDeviceId(deviceId);
      console.log(`Retrieved deviceId ${deviceId} for event ${id} from localStorage.`);
      // Automatically start recording once device ID is loaded
      startRecording(deviceId);
    } else {
      console.error('No selected audio input device found in localStorage.');
      // Handle error - maybe redirect back or show an error message
      alert('Error: No audio input device selected. Please go back and start the event again.');
      router.push(`/events/${id}`);
    }
    // Cleanup function to stop recording if component unmounts
    return () => {
      stopRecording();
      // Remove item from localStorage? Optional.
      // localStorage.removeItem(`selectedAudioInput_${id}`);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // Run only once when component mounts and id is available

  // WebSocket setup - KEEP (modify later for sending audio)
  useEffect(() => {
    // Ensure we have the event ID before connecting
    if (!id) return;

    const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'https://speechdev.onrender.com'; // Use your backend URL
    console.log(`Broadcasting page connecting WebSocket to: ${socketUrl}`);
    socketRef.current = io(socketUrl, {
        transports: ['polling'], // Match server config
        reconnectionAttempts: 5,
        timeout: 10000
    });

    socketRef.current.on('connect', () => {
      console.log('Broadcasting WebSocket connected:', socketRef.current.id);
      setSocketConnected(true);
      // Optional: Join a specific admin room if needed, or just connect
      // socketRef.current.emit('join_admin', { room: id });
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('Broadcasting WebSocket disconnected:', reason);
      setSocketConnected(false);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Broadcasting WebSocket connection error:', error);
      setSocketConnected(false);
    });

    // Optional: Listen for source transcription feedback if backend sends it
    socketRef.current.on('source_transcription_feedback', (data) => {
        if (data.text !== undefined) {
            setTranscription(prev => prev ? `${prev} ${data.text}` : data.text);
        }
    });

    // Cleanup on component unmount
    return () => {
      if (socketRef.current) {
        console.log('Disconnecting broadcasting WebSocket...');
        socketRef.current.disconnect();
        setSocketConnected(false);
      }
    };
  }, [id]); // Dependency array includes id

  // startRecording function - KEEP (modify later for streaming)
  const startRecording = useCallback(async (deviceId) => {
    if (!deviceId) {
      console.error("No audio device selected.");
      alert("Error: No audio input device selected.");
      return;
    }
    if (isRecording) return;

    console.log(`Attempting to start recording with deviceId: ${deviceId}`);
    setProcessingAudio(true); // Indicate processing start

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } }
      });

      // --- Create MediaRecorder FIRST ---
      const options = { mimeType: 'audio/webm;codecs=opus' }; // Or other supported mimeType
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder; // Assign the instance to the ref
      audioChunksRef.current = []; // Reset chunks

      // --- THEN set event handlers ---
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          // Send chunk via WebSocket if connected
          if (socketRef.current && socketRef.current.connected) {
             console.log('Sending audio chunk via WebSocket...');
             socketRef.current.emit('audio_chunk', {
               room: id,
               audio: event.data,
               language: eventData?.sourceLanguages?.[0] || 'en',
               target_languages: eventData?.targetLanguages || []
             });
          } else {
            console.warn('WebSocket not connected, cannot send audio chunk.');
          }
        }
      };

      mediaRecorderRef.current.onstop = () => {
        console.log('MediaRecorder stopped.');
        setIsRecording(false);
        setProcessingAudio(false);
        // Clean up the stream tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        setIsRecording(false);
        setProcessingAudio(false);
        stream.getTracks().forEach(track => track.stop());
      };

      // --- Start recording ---
      mediaRecorderRef.current.start(1000); // Start recording and collect data every 1000ms (1 second)
      setIsRecording(true);
      console.log('MediaRecorder started successfully.');

    } catch (error) {
      console.error('Error starting recording:', error);
      alert(`Error starting recording: ${error.message}. Please ensure microphone permissions are granted and the device is available.`);
      setIsRecording(false); // Ensure state is reset on error
    } finally {
      setProcessingAudio(false); // Indicate processing end (even if error)
    }
  }, [id, eventData, isRecording]); // Dependencies

  // stopRecording function - KEEP
  const stopRecording = useCallback(() => {
    // ... existing code ...
    // Remove processAudio call
  }, []);

  // processAudio function - REMOVE (audio is streamed)
  // const processAudio = useCallback(async (blob) => { ... });

  // sendForTranslation function - REMOVE
  // const sendForTranslation = useCallback(async (text, sourceLang, targetLangs) => { ... });

  // handlePlayTranslation function - REMOVE
  // const handlePlayTranslation = async (text, langCode) => { ... };

  // Pause/Complete handlers - REMOVE
  // const handleOpenPauseDialog = () => { ... };
  // const handleClosePauseDialog = () => { ... };
  // const handleConfirmPause = () => { ... };
  // const handleOpenCompleteDialog = () => { ... };
  // const handleCloseCompleteDialog = () => { ... };
  // const handleCompleteEvent = () => { ... };

  // Menu handlers - REMOVE
  // const handleMenuOpen = (event) => { ... };
  // const handleMenuClose = () => { ... };
  // const handleLanguageMenuOpen = (event) => { ... };
  // const handleLanguageMenuClose = () => { ... };
  // const handleLanguageSelect = (langCode) => { ... };

  if (loading || !eventData) {
    return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          p: 2, 
          borderBottom: '1px solid #e0e0e0',
          bgcolor: 'white' 
        }}
      >
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => router.push('/events')} // Or back to event edit page: `/events/${id}`
        >
          Back to Events 
        </Button>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Broadcasting: {eventData.title}
        </Typography>
        {/* Remove Pause/Complete buttons */}
        <Box>
           {/* Placeholder for potential future controls if needed */}
        </Box>
      </Box>

      {/* Main Content Area */}
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* Left Panel - Recording Status & Transcription */}
        <Box sx={{ width: '100%', p: 3, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
            Live Transcription ({getLanguageName(eventData.sourceLanguages?.[0]) || 'Source'})
          </Typography>
          
          {/* Recording Controls */}
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={isRecording ? <StopIcon /> : <MicIcon />}
              onClick={isRecording ? stopRecording : () => startRecording(selectedDeviceId)}
              disabled={processingAudio || !selectedDeviceId} // Disable if processing or no device
              sx={{ 
                bgcolor: isRecording ? '#f44336' : '#6366f1', // Red when recording
                '&:hover': { bgcolor: isRecording ? '#d32f2f' : '#4338ca' }
              }}
            >
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </Button>
            {processingAudio && <CircularProgress size={24} />}
            {isRecording && <Typography variant="body2" sx={{ color: 'green' }}>● Recording...</Typography>}
            {!isRecording && !processingAudio && <Typography variant="body2" sx={{ color: 'red' }}>● Recording Stopped</Typography>}
          </Box>

          {/* Transcription Display */}
          <Paper 
            elevation={2} 
            sx={{ 
              p: 3, 
              flexGrow: 1, 
              overflowY: 'auto', 
              bgcolor: '#F9FAFB', 
              borderRadius: '8px',
              minHeight: '300px' // Ensure it takes up space
            }}
          >
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', color: '#333' }}>
              {transcription || 'Waiting for transcription...'}
            </Typography>
          </Paper>
          
          {/* Remove Translations Display Section */}
          {/* <Box sx={{ mt: 4 }}> ... </Box> */}
        </Box>
        
        {/* Remove Right Panel - Settings */}
        {/* <Box sx={{ width: '40%', p: 3, bgcolor: '#F9FAFB' }}> ... </Box> */}
      </Box>

      {/* Remove Pause Dialog */}
      {/* <Dialog open={pauseDialogOpen} onClose={handleClosePauseDialog}> ... </Dialog> */}

      {/* Remove Complete Dialog */}
      {/* <Dialog open={completeDialogOpen} onClose={handleCloseCompleteDialog}> ... </Dialog> */}
    </Box>
  );
};

export default BroadcastingPage;