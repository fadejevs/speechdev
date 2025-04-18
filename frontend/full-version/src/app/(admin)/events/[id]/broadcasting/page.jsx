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
import Link from 'next/link';

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
  
  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [processingAudio, setProcessingAudio] = useState(false); 
  const mediaRecorderRef = useRef(null); 
  const audioChunksRef = useRef([]); 
  const socketRef = useRef(null); 

  // WebSocket connection status
  const [socketConnected, setSocketConnected] = useState(false);

  // Selected device ID
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);

  // Fetch event data
  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await apiService.get(`/events/${id}`);
        setEventData(data);
        console.log('Event data fetched for broadcasting:', data);
      } catch (error) {
        console.error('Failed to fetch event data:', error);
        // Handle error appropriately, maybe redirect or show message
        router.push('/events'); // Example: redirect if event fetch fails
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id, router]);

  // Effect to load selected device ID and start recording
  useEffect(() => {
    const deviceId = localStorage.getItem(`selectedAudioInput_${id}`);
    if (deviceId) {
      setSelectedDeviceId(deviceId);
      console.log(`Retrieved deviceId ${deviceId} for event ${id} from localStorage.`);
      // Automatically start recording once device ID is loaded
      // Ensure eventData is loaded before starting recording to get languages
      if (eventData) {
          startRecording(deviceId);
      }
    } else {
      console.error('No selected audio input device found in localStorage.');
      alert('Error: No audio input device selected. Please go back and start the event again.');
      router.push(`/events/${id}/live`); // Redirect to live page to select device
    }
    // Cleanup function
    return () => {
      stopRecording();
    };
    // Add eventData as a dependency to ensure it's available when starting
  }, [id, eventData]); // Run when id or eventData changes

  // WebSocket setup
  useEffect(() => {
    if (!id) return;

    const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'https://speechdev.onrender.com'; 
    console.log(`Broadcasting page connecting WebSocket to: ${socketUrl}`);
    socketRef.current = io(socketUrl, {
        transports: ['polling'], 
        reconnectionAttempts: 5,
        timeout: 10000
    });

    socketRef.current.on('connect', () => {
      console.log('Broadcasting WebSocket connected:', socketRef.current.id);
      setSocketConnected(true);
      // Optional: Join a specific admin room if needed
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

    // REMOVE: Listener for transcription feedback
    // socketRef.current.on('source_transcription_feedback', (data) => { ... });

    // Cleanup on component unmount
    return () => {
      if (socketRef.current) {
        console.log('Disconnecting broadcasting WebSocket...');
        socketRef.current.disconnect();
        setSocketConnected(false);
      }
    };
  }, [id]); 

  // startRecording function (KEEP AS IS - it sends chunks)
  const startRecording = useCallback(async (deviceId) => {
    if (!deviceId) {
      console.error("No audio device selected.");
      alert("Error: No audio input device selected.");
      return;
    }
    if (isRecording || !eventData) return; // Also check if eventData is loaded

    console.log(`Attempting to start recording with deviceId: ${deviceId}`);
    setProcessingAudio(true); 

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } }
      });

      const options = { mimeType: 'audio/webm;codecs=opus', timeslice: 1000 }; // Add timeslice
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder; 
      audioChunksRef.current = []; 

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          if (socketRef.current && socketRef.current.connected) {
             console.log('Sending audio chunk via WebSocket...');
             socketRef.current.emit('audio_chunk', {
               room: id,
               audio: event.data,
               language: eventData?.sourceLanguages?.[0] || 'en', // Use actual source language
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
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        setIsRecording(false);
        setProcessingAudio(false);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start(options.timeslice); // Use timeslice value
      setIsRecording(true);
      console.log('MediaRecorder started successfully.');

    } catch (error) {
      console.error('Error starting recording:', error);
      alert(`Error starting recording: ${error.message}. Please ensure microphone permissions are granted and the device is available.`);
      setIsRecording(false); 
    } finally {
      setProcessingAudio(false); 
    }
  }, [id, eventData, isRecording]); 

  // stopRecording function (KEEP AS IS)
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
        console.log('Stopping MediaRecorder...');
        mediaRecorderRef.current.stop();
        // The onstop handler will set isRecording to false and stop tracks
    } else if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
        // If not recording but stream exists, stop tracks
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  }, [isRecording]);

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
          onClick={() => router.push(`/events/${id}/live`)} // Go back to live page
        >
          Back to Event Control
        </Button>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Broadcasting: {eventData.title}
        </Typography>
        <Box>
           {/* Placeholder */}
        </Box>
      </Box>

      {/* Main Content Area */}
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* Simplified Panel */}
        <Box sx={{ width: '100%', p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
             Broadcasting Live
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
            Source Language: {getLanguageName(eventData.sourceLanguages?.[0]) || 'N/A'}
          </Typography>
          
          {/* Recording Controls */}
          <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={isRecording ? <StopIcon /> : <MicIcon />}
              onClick={isRecording ? stopRecording : () => startRecording(selectedDeviceId)}
              disabled={processingAudio || !selectedDeviceId || !socketConnected} // Also disable if socket not connected
              sx={{ 
                minWidth: '200px',
                padding: '10px 20px',
                bgcolor: isRecording ? '#f44336' : '#6366f1', 
                '&:hover': { bgcolor: isRecording ? '#d32f2f' : '#4338ca' }
              }}
            >
              {isRecording ? 'Stop Broadcasting' : 'Start Broadcasting'}
            </Button>
            {processingAudio && <CircularProgress size={24} />}
            {isRecording && <Typography variant="body2" sx={{ color: 'green' }}>● Broadcasting...</Typography>}
            {!isRecording && !processingAudio && <Typography variant="body2" sx={{ color: 'red' }}>● Broadcasting Stopped</Typography>}
             {!socketConnected && <Typography variant="caption" color="error">Connecting to server...</Typography>}
          </Box>

          {/* REMOVE: Transcription Display Paper */}
          {/* <Paper elevation={2} sx={{ ... }}> ... </Paper> */}
           <Typography variant="body2" sx={{ mt: 4, color: 'text.secondary' }}>
             View the live results on the public broadcast page.
           </Typography>
           <Link href={`/broadcast/${id}`} target="_blank" rel="noopener noreferrer" sx={{ mt: 1 }}>
             Open Broadcast Page
           </Link>

        </Box>
      </Box>
    </Box>
  );
};

export default BroadcastingPage;