"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
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
  const audioChunksRef = useRef([]);

  const [liveTranscription, setLiveTranscription] = useState('');
  const [liveTranscriptionLang, setLiveTranscriptionLang] = useState('');
  const [liveTranslations, setLiveTranslations] = useState({});
  const [socketConnected, setSocketConnected] = useState(false);
  const [processingAudio, setProcessingAudio] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const storedEvents = localStorage.getItem('eventData');
    if (storedEvents) {
      const parsedEvents = JSON.parse(storedEvents);
      const event = parsedEvents.find(event => event.id === id);
      if (event) {
        setEventData(event);
        if (event.sourceLanguages && event.sourceLanguages.length > 0) {
          setLiveTranscriptionLang(event.sourceLanguages[0]);
        }
        const initialTranslations = {};
        event.targetLanguages?.forEach(lang => {
          initialTranslations[lang] = '';
        });
        setLiveTranslations(initialTranslations);
      } else {
        setError("Event not found.");
      }
    } else {
      setError("Event data not available.");
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
    socketRef.current = io(socketUrl, {
        transports: ['polling'],
        reconnectionAttempts: 5,
        timeout: 10000
    });

    socketRef.current.on('connect', () => {
      console.log('Admin WebSocket connected:', socketRef.current.id);
      setSocketConnected(true);
      setError(null);
      if (eventData?.sourceLanguages?.[0]) {
          socketRef.current.emit('join', {
              room: id,
              source_language: eventData.sourceLanguages[0],
              target_languages: eventData.targetLanguages || []
          });
          console.log(`Admin page joining room: ${id} with Langs: ${eventData.sourceLanguages[0]} -> ${eventData.targetLanguages}`);
      } else {
          console.error("Cannot join room: Event data with source language not loaded yet.");
          setError("Event data not loaded, cannot start session.");
      }
      
      // Test ping-pong to verify two-way communication
      socketRef.current.emit('ping_test', { message: 'Testing connection' });
    });

    socketRef.current.on('pong_test', (data) => {
      console.log('Received pong from server:', data);
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('Admin WebSocket disconnected:', reason);
      setSocketConnected(false);
      if (reason !== 'io client disconnect' && reason !== 'io server disconnect') {
         setError('WebSocket disconnected. Trying to reconnect...');
      }
      if (isRecording && reason !== 'io client disconnect') {
          stopRecording();
          console.warn("Stopped recording due to WebSocket disconnection.");
      }
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Admin WebSocket connection error:', error);
      setSocketConnected(false);
      setError(`WebSocket connection failed: ${error.message}. Please check the server.`);
    });

    socketRef.current.on('live_transcription', (data) => {
      console.log('Admin received live transcription:', data);
      if (data.text !== undefined) {
        setLiveTranscription(prev => prev ? `${prev} ${data.text}` : data.text);
      }
      if (data.language) {
        setLiveTranscriptionLang(data.language);
      }
      setProcessingAudio(false);
    });

    socketRef.current.on('live_translation', (data) => {
      console.log('Admin received live translation:', data);
      if (data.target_language && data.translated_text !== undefined) {
        setLiveTranslations(prev => ({
          ...prev,
          [data.target_language]: prev[data.target_language]
            ? `${prev[data.target_language]} ${data.translated_text}`
            : data.translated_text
        }));
      }
       setProcessingAudio(false);
    });

    socketRef.current.on('transcription_error', (data) => {
      console.error('Transcription error from backend:', data);
      setError(`Transcription Error: ${data.error || 'Unknown error'}`);
      setProcessingAudio(false);
    });
    socketRef.current.on('translation_error', (data) => {
      console.error('Translation error from backend:', data);
      setProcessingAudio(false);
    });

    return () => {
      if (socketRef.current) {
        console.log('Disconnecting admin WebSocket...');
        if (isRecording) {
            stopRecording();
        }
        socketRef.current.emit('leave', { room: id });
        socketRef.current.disconnect();
        setSocketConnected(false);
      }
    };
  }, [id, eventData]);

  const startRecording = useCallback(async () => {
    if (!selectedDevice || !socketRef.current || !socketConnected || !eventData?.sourceLanguages?.[0]) {
      setError("Cannot start recording. Check microphone selection, WebSocket connection, and event configuration.");
      console.error("Prerequisites not met for starting recording:", { selectedDevice, socketConnected, eventData });
      return;
    }

    setError(null);
    setLiveTranscription('');
    setLiveTranslations(prev => {
        const reset = {};
        Object.keys(prev).forEach(lang => { reset[lang] = ''; });
        return reset;
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: selectedDevice } },
      });
      streamRef.current = stream;

      const options = { 
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000 // Lower bitrate for better compatibility
      };
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0 && socketRef.current && socketConnected) {
          audioChunksRef.current.push(event.data);
          console.log(`Sending audio chunk: ${event.data.size} bytes`);
          
          const payload = {
            room: id,
            audio_chunk: event.data,
            source_language: eventData.sourceLanguages[0].includes('-') 
              ? eventData.sourceLanguages[0] 
              : eventData.sourceLanguages[0] === 'lv' ? 'lv-LV' : eventData.sourceLanguages[0],
            target_languages: eventData.targetLanguages || []
          };
          console.log('Sending payload:', {
            room: payload.room,
            source_language: payload.source_language,
            target_languages: payload.target_languages,
            audio_chunk_size: event.data.size
          });
          
          socketRef.current.emit('audio_chunk', payload);
          setProcessingAudio(true);
        } else {
          console.warn('Cannot send audio chunk:', {
            dataSize: event.data.size,
            socketExists: !!socketRef.current,
            socketConnected
          });
        }
      };

      recorder.onstop = () => {
        console.log('MediaRecorder stopped.');
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        setProcessingAudio(false);
      };

      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        setError(`Recording error: ${event.error.name} - ${event.error.message}`);
        stopRecording();
      };

      recorder.start(1000);
      setIsRecording(true);
      console.log('Recording started with device:', selectedDevice);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError(`Failed to start recording: ${err.message}. Check microphone permissions and selection.`);
      setIsRecording(false);
    }
  }, [selectedDevice, socketConnected, id, eventData]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setProcessingAudio(false);
    console.log('Recording stopped.');
  }, []);

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
    
    // Set a timeout to check if we get a response
    setTimeout(() => {
      if (!liveTranscription) {
        console.warn("No response received from test transcription after 3 seconds");
        setError("Backend test failed: No response received. Please check server logs.");
      }
    }, 3000);
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
          disabled={!selectedDevice || !socketConnected || !eventData?.sourceLanguages?.length}
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
        variant="outlined"
        onClick={testBackendConnection}
        disabled={!socketConnected}
        sx={{ ml: 2 }}
      >
        Test Backend
      </Button>
    </Box>
  );
};

export default EventLivePage; 