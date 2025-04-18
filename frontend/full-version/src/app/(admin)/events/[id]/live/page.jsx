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
  const [selectedSourceLang, setSelectedSourceLang] = useState('en-US');
  const [selectedTargetLangs, setSelectedTargetLangs] = useState([]);

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
    const fetchEvent = async () => {
      try {
        console.log(`Fetching event data for ID: ${id}`);
        const mockData = {
          id: id,
          name: `Event ${id}`,
          sourceLanguage: 'en-US',
          targetLanguages: ['es-ES']
        };
        console.log("Fetched Event Data:", mockData);
        setEventData(mockData);
        setSelectedSourceLang(mockData.sourceLanguage || 'en-US');
        setSelectedTargetLangs(mockData.targetLanguages || ['es-ES']);
      } catch (err) {
        console.error("Error fetching event data:", err);
        setError(`Failed to load event details: ${err.message}`);
        toast.error(`Failed to load event details: ${err.message}`);
      }
    };

    if (id) {
      fetchEvent();
    }
  }, [id]);

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
    console.log(`Attempting to connect WebSocket to: ${socketUrl}`);

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
      setError(null);
      toast.success('WebSocket Connected');
      const roomData = {
          room_id: id,
          source_language: selectedSourceLang,
          target_languages: selectedTargetLangs
      };
      console.log(`Admin page joining room: ${id} with Langs: ${selectedSourceLang} -> ${selectedTargetLangs.join(', ')}`);
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
        }
    });

    socketRef.current.on('error', (data) => {
      console.error('Socket Error:', data.message);
      toast.error(`Error: ${data.message}`);
    });

    return () => {
      if (socketRef.current) {
        console.log('Disconnecting Admin WebSocket');
        socketRef.current.disconnect();
      }
    };
  }, [id, eventData, selectedSourceLang, selectedTargetLangs]);

  const startRecording = useCallback(async () => {
    if (isRecording) return;

    if (!selectedDevice || !socketRef.current?.connected || !eventData?.sourceLanguages?.[0]) {
        console.error('Cannot start recording: Missing device, socket connection, or source language.');
        return;
    }

    console.log(`Attempting to start recording with deviceId: ${selectedDevice}`);
    setProcessingAudio(true);

    audioChunksRef.current = [];
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: selectedDevice } }
      });
      streamRef.current = stream;

      const options = { mimeType: 'audio/webm;codecs=opus', timeslice: 1000 };
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log(`Storing audio chunk, size: ${event.data.size}`);
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        console.log(`MediaRecorder stopped. Collected ${audioChunksRef.current.length} chunks.`);
        setProcessingAudio(true);
        setError(null);

        if (audioChunksRef.current.length === 0) {
            console.warn("No audio chunks recorded.");
            setProcessingAudio(false);
            setIsRecording(false);
            streamRef.current?.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            return;
        }

        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = [];

        const formData = new FormData();
        const fileExtension = mimeType.split('/')[1].split(';')[0];
        formData.append('audio', audioBlob, `recording-${Date.now()}.${fileExtension}`);
        formData.append('source_language', selectedSourceLang);
        formData.append('target_languages', JSON.stringify(selectedTargetLangs));

        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        console.log('Stream tracks stopped in onstop.');

        try {
            console.log(`Uploading audio blob (${(audioBlob.size / 1024).toFixed(2)} KB) type: ${mimeType} for ${selectedSourceLang} -> ${selectedTargetLangs.join(', ')}`);
            const endpoint = `${API_BASE_URL}/speech/transcribe-and-translate`;
            console.log(`Sending POST request to: ${endpoint}`);

            const response = await axios.post(endpoint, formData, {
                timeout: 60000
            });

            console.log('Transcription/Translation Response:', response.data);

            if (response.data && response.data.original) {
                 setLiveTranscription(response.data.original);
                 setLiveTranscriptionLang(response.data.source_language || selectedSourceLang);
                 
                 const translations = response.data.translations || {};
                 setLiveTranslations(translations);
                 
                 const newTranscriptEntry = {
                     original: response.data.original,
                     translated: translations,
                     sourceLanguage: response.data.source_language || selectedSourceLang,
                     targetLanguages: selectedTargetLangs,
                     timestamp: new Date().toISOString()
                 };
                 setTranscripts(prev => [...prev, newTranscriptEntry]);
                 
                 toast.success('Transcription successful.');
            } else if (response.data && response.data.error) {
                 throw new Error(response.data.error);
            } else if (!response.data?.original && !response.data?.error) {
                console.log("Transcription returned no match.");
                toast.info("Could not recognize speech in the audio.");
                setLiveTranscription("[No speech recognized]");
                setLiveTranslations({});
                setTranscripts(prev => [...prev, {
                    original: "[No speech recognized]",
                    translated: {},
                    sourceLanguage: selectedSourceLang,
                    targetLanguages: selectedTargetLangs,
                    timestamp: new Date().toISOString()
                }]);
            } else {
                 throw new Error('Invalid response structure from server.');
            }

        } catch (uploadError) {
            console.error('Error uploading/processing audio:', uploadError);
            const errorMsg = uploadError.response?.data?.error || uploadError.message || 'Failed to process audio.';
            setError(`Processing failed: ${errorMsg}`);
            toast.error(`Processing failed: ${errorMsg}`);
            setLiveTranscription('');
            setLiveTranslations({});
        } finally {
            setProcessingAudio(false);
        }
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        setIsRecording(false);
        setProcessingAudio(false);
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      };

      mediaRecorderRef.current.start(options.timeslice);
      setIsRecording(true);
      console.log('MediaRecorder started successfully.');

    } catch (err) {
      console.error('Error starting recording:', err);
      setProcessingAudio(false);
      setError(`Could not start recording: ${err.message}. Check microphone permissions.`);
      toast.error(`Could not start recording: ${err.message}`);
      setIsRecording(false);
    }
  }, [selectedDevice, id, eventData, socketRef, streamRef, selectedSourceLang, selectedTargetLangs, API_BASE_URL]);

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

  if (!eventData && !error) {
      return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
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
          startIcon={isRecording ? <StopIcon /> : <MicIcon />}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!selectedDevice || processingAudio || !eventData}
          sx={{
             px: 3, py: 1, borderRadius: '8px', height: '40px',
             bgcolor: isRecording ? '#F04438' : '#6366F1',
             '&:hover': { bgcolor: isRecording ? '#D92D20' : '#4338CA' },
             '&.Mui-disabled': { bgcolor: '#cbd5e1', color: '#94a3b8' }
          }}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
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

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6">Transcripts</Typography>
        {transcripts.length === 0 ? (
          <Typography color="text.secondary">No transcripts yet</Typography>
        ) : (
          transcripts.map((transcript, index) => (
            <Card key={index} sx={{ mb: 2, p: 2 }}>
              <Typography variant="subtitle1">Original ({transcript.sourceLanguage}):</Typography>
              <Typography paragraph>{transcript.original}</Typography>
              <Typography variant="subtitle1">Translated ({transcript.targetLanguage}):</Typography>
              <Typography paragraph>{transcript.translated}</Typography>
            </Card>
          ))
        )}
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

      <Button 
        variant="contained" 
        color="info" 
        onClick={testEndpoints}
        sx={{ mt: 2 }}
      >
        Test API Endpoints
      </Button>
    </Box>
  );
};

export default EventLivePage; 