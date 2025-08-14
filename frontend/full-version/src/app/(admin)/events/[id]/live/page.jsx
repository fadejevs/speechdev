'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Chip from '@mui/material/Chip';

import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

import SelfieDoodle from '@/images/illustration/SelfieDoodle';

import { DEEPL_LANGUAGES } from '@/utils/deeplLanguages';
import { useLLMProcessor } from './hooks/useLLMProcessor';
import { useAudioDevices } from './hooks/useAudioDevices';
import { useAutoPause } from './hooks/useAutoPause';
import { useEventStatus } from './hooks/useEventStatus';
import { useAzureSpeechRecognition } from './hooks/useAzureSpeechRecognition';
import { useEventWebSocket } from './hooks/useEventWebSocket';

// language lookup
const languages = DEEPL_LANGUAGES.map((l) => ({
  code: l.azure || l.deepl,
  name: l.name,
  deepl: l.deepl,
  azure: l.azure
}));

const deepLCodesToNames = {
  EN: 'English',
  DE: 'German',
  ES: 'Spanish',
  FR: 'French',
  IT: 'Italian',
  JA: 'Japanese',
  KO: 'Korean',
  PT: 'Portuguese',
  RU: 'Russian',
  ZH: 'Chinese',
  LV: 'Latvian',
  LT: 'Lithuanian',
  ET: 'Estonian',
  PL: 'Polish',
  NL: 'Dutch',
  CS: 'Czech',
  DA: 'Danish',
  FI: 'Finnish',
  HU: 'Hungarian',
  NB: 'Norwegian',
  RO: 'Romanian',
  SK: 'Slovak',
  SV: 'Swedish',
  TR: 'Turkish',
  UK: 'Ukrainian'
};

const getLanguageName = (code) => {
  if (!code) return '';
  // Try full code first (case-insensitive)
  let found = languages.find((l) => l.code.toLowerCase() === code.toLowerCase());
  if (found) return found.name;
  // Try base code (e.g., "en" from "en-US")
  const base = code.split(/[-_]/)[0].toLowerCase();
  found = languages.find((l) => l.code.toLowerCase() === base);
  if (found) return found.name;
  // Try DeepL mapping
  if (deepLCodesToNames[code.toUpperCase()]) return deepLCodesToNames[code.toUpperCase()];
  if (deepLCodesToNames[base.toUpperCase()]) return deepLCodesToNames[base.toUpperCase()];
  return code;
};

const getBaseLangCode = (code) => code?.split('-')[0]?.toLowerCase() || code;

export default function EventLivePage() {
  const { id } = useParams();
  const router = useRouter();

  // event data
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // share‐link dialog
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Connection state tracking
  const [isRecognizerConnecting, setIsRecognizerConnecting] = useState(false);
  const [recognizerReady, setRecognizerReady] = useState(false);

  // Initialize hooks in proper order to avoid circular dependencies
  // WebSocket and LLM first
  const webSocket = useEventWebSocket(eventData);
  const llmProcessor = useLLMProcessor(eventData, webSocket.socketRef);
  
  // Audio Devices Hook (independent initialization)
  const audioDevices = useAudioDevices();
  
  // Speech Recognition Hook (uses selected audio device)
  const speechRecognition = useAzureSpeechRecognition(
    eventData,
    llmProcessor,
    setIsRecognizerConnecting,
    setRecognizerReady,
    audioDevices
  );
  
  // Auto-pause Hook
  const autoPause = useAutoPause(eventData, setEventData, webSocket.socketRef);

  // Event Status Hook
  const eventStatus = useEventStatus(
    eventData,
    setEventData,
    webSocket.socketRef,
    llmProcessor,
    speechRecognition.recognizerRef,
    setIsRecognizerConnecting,
    setRecognizerReady,
    autoPause.setWasAutoPaused,
    { hasError: webSocket.hasError, retry: webSocket.retry } // WebSocket retry functionality
  );

  // Cleanup on unmount to prevent memory leaks and multiple instances
  useEffect(() => {
    return () => {
      if (speechRecognition.recognizerRef.current) {
        speechRecognition.recognizerRef.current.stopContinuousRecognitionAsync(
          () => {
            speechRecognition.recognizerRef.current = null;
          },
          (err) => {
            console.error('[Page] ❌ Error cleaning up recognizer on unmount:', err);
            speechRecognition.recognizerRef.current = null;
          }
        );
      }
      llmProcessor.stopProcessing();
      webSocket.cleanup();
    };
  }, []); // Empty dependency array for unmount only

  // Fetch event data
  useEffect(() => {
    setLoading(true);
    setError(null);

    const fetchEvent = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/events?id=eq.${id}&select=*`, {
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
          }
        });
        const data = await res.json();
        if (!data || data.length === 0) throw new Error(`Event ${id} not found`);
        setEventData(data[0]);
      } catch (e) {
        console.error(e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  // Initialize speech recognizer when websocket is ready
  useEffect(() => {
    if (!webSocket.socketRef.current) return;

    // Always (re)bind the start function so it captures the latest device selection
    const startRecognizer = speechRecognition.createStartRecognizer(webSocket.socketRef);
    speechRecognition.startRecognizerRef.current = startRecognizer;
  }, [webSocket.socketRef.current, speechRecognition.createStartRecognizer, audioDevices.selectedAudioInput]);

  // Start/stop recognition based on event status
  useEffect(() => {
    if (!eventData) return;

    // Always stop any existing recognizer first to prevent doubling
    if (speechRecognition.recognizerRef.current) {
      speechRecognition.recognizerRef.current.stopContinuousRecognitionAsync(
        () => {
          speechRecognition.recognizerRef.current = null;
        },
        (err) => {
          console.error('[Page] Error stopping previous recognizer:', err);
          speechRecognition.recognizerRef.current = null;
        }
      );
    }

    // Start recognition when event is live
    if (eventData.status === 'Live') {
      llmProcessor.startProcessing();
      
      // Add a small delay to ensure previous recognizer is fully stopped
      setTimeout(() => {
        if (speechRecognition.startRecognizerRef.current) {
          speechRecognition.startRecognizerRef.current();
        }
      }, 100);
    } else {
      // Stop processing when not live
      llmProcessor.stopProcessing();
    }
  }, [eventData?.id, eventData?.status]);

  // Handler for switching audio devices
  const handleSwitchAudioDevice = async (deviceId) => {
    // console.log('[Live] Switching to device:', deviceId);
    
    // If deviceId is 'default', find the actual default device
    let actualDeviceId = deviceId;
    if (deviceId === 'default') {
      const defaultDevice = audioDevices.audioInputDevices.find(device => 
        device.label.toLowerCase().includes('airpods') || 
        device.label.toLowerCase().includes('default')
      );
      if (defaultDevice) {
        actualDeviceId = defaultDevice.deviceId;
        // console.log('[Live] Mapped default to actual device:', defaultDevice.label, 'ID:', actualDeviceId);
      } else {
        // console.log('[Live] Could not find default device, using first available');
        actualDeviceId = audioDevices.audioInputDevices[0]?.deviceId || deviceId;
      }
    }
    
    // Update the selected device
    // console.log('[Live] Setting selected audio input to:', actualDeviceId);
    audioDevices.setSelectedAudioInput(actualDeviceId);
          // console.log('[Live] Device state updated, current selection:', audioDevices.selectedAudioInput);
    
    // Restart recognition with new device if currently live
    if (eventData?.status === 'Live' && speechRecognition.recognizerRef.current) {
      // console.log('[Live] Restarting recognition with new device');
      try {
        // Stop current recognition
        speechRecognition.recognizerRef.current.stopContinuousRecognitionAsync(
          () => {
            // console.log('[Live] Recognition stopped, starting with new device');
            speechRecognition.recognizerRef.current = null;
            // Start recognition with new device immediately
            if (speechRecognition.startRecognizerRef.current) {
              speechRecognition.startRecognizerRef.current();
            }
          },
          (err) => {
            console.error('[Live] Error stopping recognition:', err);
            speechRecognition.recognizerRef.current = null;
            // Still try to start with new device
            if (speechRecognition.startRecognizerRef.current) {
              speechRecognition.startRecognizerRef.current();
            }
          }
        );
      } catch (err) {
        console.error('[Live] Error switching audio device:', err);
      }
    } else {
      console.log('[Live] Not live or no recognizer, device will be used on next start');
    }
  };

  // Share dialog handlers
  const handleOpenShareDialog = () => setShareDialogOpen(true);
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




  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '80vh'
        }}
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading Event...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={() => router.back()} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Box>
    );
  }

  if (!eventData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Event data could not be loaded.</Alert>
        <Button onClick={() => router.back()} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Box>
    );
  }

  // console.log('eventData:', eventData);

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: '100vh' }}>
      {/* Header with Back, Pause, Complete */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 0 },
          mb: { xs: 3, sm: 4 }
        }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/dashboard/analytics')}
          sx={{
            color: '#212B36',
            textTransform: 'none',
            '&:hover': { bgcolor: 'rgba(33, 43, 54, 0.08)' },
            fontSize: { xs: '0.875rem', sm: '1rem' }
          }}
        >
          Back To Events
        </Button>

        <Box
          sx={{
            display: 'flex',
            gap: { xs: 1, sm: 2 },
            width: { xs: '100%', sm: 'auto' },
            alignItems: 'center'
          }}
        >

          <Button
            variant="outlined"
            onClick={eventStatus.handlePauseResumeEvent}
            disabled={webSocket.isConnecting}
            sx={{
              textTransform: 'none',
              px: { xs: 2, sm: 3 },
              py: 1,
              borderRadius: '8px',
              flex: { xs: 1, sm: 'initial' },
              fontSize: { xs: '0.875rem', sm: '1rem' },
              opacity: webSocket.isConnecting ? 0.6 : 1,
            }}
          >
            {webSocket.isConnecting
              ? 'Connecting...'
              : eventData?.status === 'Paused' 
                ? 'Resume Event' 
                : 'Pause Event'
            }
          </Button>
          <Button
            variant="contained"
            onClick={eventStatus.handleCompleteEvent}
            disabled={webSocket.isConnecting}
            sx={{
              textTransform: 'none',
              px: { xs: 2, sm: 3 },
              py: 1,
              borderRadius: '8px',
              flex: { xs: 1, sm: 'initial' },
              fontSize: { xs: '0.875rem', sm: '1rem' },
              opacity: webSocket.isConnecting ? 0.6 : 1,
            }}
          >
            {webSocket.isConnecting ? 'Connecting...' : 'Complete Event'}
          </Button>
        </Box>
      </Box>

      {/* Auto-pause notification */}
      {autoPause.wasAutoPaused && eventData?.status === 'Paused' && (
        <Alert 
          severity="info" 
          sx={{ 
            mb: { xs: 3, sm: 4 },
            '& .MuiAlert-message': {
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }
          }}
          onClose={() => autoPause.setWasAutoPaused(false)}
        >
          <strong>Event Auto-Paused:</strong> The event was automatically paused due to a browser refresh. 
          Click "Resume Event" to start transcription.
        </Alert>
      )}

      {/* Live indicator card */}
      <Box
        sx={{
          bgcolor: 'white',
          borderRadius: 2,
          p: { xs: 2.5, sm: 4 },
          mb: { xs: 3, sm: 4 },
          textAlign: 'center',
          boxShadow: '0px 2px 4px rgba(145, 158, 171, 0.16)'
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            mb: { xs: 1.5, sm: 2 }
          }}
        >
          <Box
            sx={{
              width: { xs: 180, sm: 230 },
              height: { xs: 135, sm: 172 },
              overflow: 'hidden'
            }}
          >
            <SelfieDoodle
              sx={{
                width: '100%',
                height: '100%',
                fontSize: 0
              }}
            />
          </Box>
        </Box>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 600,
            color: '#212B36',
            mb: 1,
            fontSize: { xs: '1.25rem', sm: '1.5rem' }
          }}
        >
          Your Event Is Live
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: '#637381',
            mb: 2,
            fontSize: { xs: '0.875rem', sm: '1rem' },
            px: { xs: 1, sm: 2 }
          }}
        >
          {eventData.description || 'Share this link to let people watch the broadcast live.'}
        </Typography>
        <Button
          variant="contained"
          onClick={handleOpenShareDialog}
          sx={{
            textTransform: 'none',
            borderRadius: '8px',
            px: { xs: 2, sm: 3 },
            py: 1,
            fontSize: { xs: '0.875rem', sm: '1rem' }
          }}
        >
          Share Event
        </Button>
      </Box>

      {/* Published languages card */}
      <Box
        sx={{
          bgcolor: 'white',
          borderRadius: 2,
          border: '1px solid #F2F3F5',
          boxShadow: '0px 2px 4px rgba(145, 158, 171, 0.16)',
          mb: { xs: 3, sm: 4 },
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: { xs: 2, sm: 3 },
            py: { xs: 1.5, sm: 2 },
            borderBottom: '1px solid #F2F3F5'
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              fontSize: { xs: '1.125rem', sm: '1.25rem' }
            }}
          >
            Published languages
          </Typography>
          {eventData.description && (
            <Typography
              variant="body2"
              sx={{
                color: '#637381',
                mt: 0.5,
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}
            >
              {eventData.description}
            </Typography>
          )}
        </Box>

        {/* Source Language Row */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: { xs: 2, sm: 3 },
            py: { xs: 2, sm: 2.5 },
            borderBottom: '1px solid #F2F3F5'
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: '0.9375rem', sm: '1rem' },
                color: '#212B36',
                fontWeight: 500
              }}
            >
              {getLanguageName(eventData.sourceLanguage || (Array.isArray(eventData.sourceLanguages) ? eventData.sourceLanguages[0] : ''))}
            </Typography>
            <Chip
              label="Source"
              color="primary"
              size="small"
              sx={{
                fontSize: '0.75rem',
                height: '24px',
                bgcolor: '#EEF2FF',
                color: '#6366F1',
                border: 'none',
                '& .MuiChip-label': {
                  px: 1.5,
                  py: 0.5
                }
              }}
            />

          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <Button
              size="small"
              endIcon={<ArrowDropDownIcon />}
              onClick={audioDevices.handleMenuOpen}
              sx={{
                textTransform: 'none',
                fontSize: { xs: '0.875rem', sm: '0.875rem' },
                color: '#6366F1',
                px: 1,
                minWidth: 0,
                '&:hover': {
                  bgcolor: 'transparent'
                }
              }}
            >
              {(() => {
                const currentDevice = audioDevices.audioInputDevices.find(d => d.deviceId === audioDevices.selectedAudioInput);
                if (currentDevice) {
                  if (currentDevice.label.includes('AirPods')) return 'AirPods';
                  if (currentDevice.label.includes('Built-in')) return 'MacBook Mic';
                  if (currentDevice.label.includes('iPhone')) return 'iPhone Mic';
                  return 'Change Input';
                }
                return 'Change Input';
              })()}
            </Button>
            <Menu
              anchorEl={audioDevices.anchorEl}
              open={Boolean(audioDevices.anchorEl)}
              onClose={audioDevices.handleMenuClose}
              PaperProps={{
                sx: {
                  mt: 1,
                  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
                  borderRadius: '8px'
                }
              }}
            >
              {audioDevices.audioInputDevices.length === 0 ? (
                <MenuItem disabled>No audio inputs found</MenuItem>
              ) : (
                audioDevices.audioInputDevices
                  .filter(device => device.deviceId !== 'default') // Filter out the confusing 'default' option
                  .map((device) => {
                    // Create a better display name
                    let displayName = device.label;
                    if (displayName.includes('Built-in')) {
                      displayName = 'MacBook Microphone';
                    } else if (displayName.includes('AirPods')) {
                      displayName = 'AirPods';
                    } else if (displayName.includes('iPhone')) {
                      displayName = 'iPhone Microphone';
                    }
                    
                    return (
                  <MenuItem
                    key={device.deviceId}
                    selected={device.deviceId === audioDevices.selectedAudioInput}
                        onClick={async () => {
                          try {
                            await handleSwitchAudioDevice(device.deviceId);
                          } catch (err) {
                            console.error('Error switching audio device:', err);
                          }
                      audioDevices.handleMenuClose();
                    }}
                  >
                        {displayName}
                  </MenuItem>
                    );
                  })
              )}
            </Menu>
            <IconButton
              size="small"
              sx={{
                color: '#637381'
              }}
            >
              <MoreVertIcon sx={{ fontSize: '20px' }} />
            </IconButton>
          </Box>
        </Box>

        {/* Target Languages Rows */}
        {eventData.targetLanguages.map((lang) => (
          <Box
            key={lang}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              px: { xs: 2, sm: 3 },
              py: { xs: 2, sm: 2.5 },
              borderBottom: '1px solid #F2F3F5'
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <Typography
                sx={{
                  fontSize: { xs: '0.9375rem', sm: '1rem' },
                  color: '#212B36',
                  fontWeight: 500
                }}
              >
                {getLanguageName(getBaseLangCode(lang))}
              </Typography>
              <Chip
                label="Translation"
                color="info"
                size="small"
                sx={{
                  fontSize: '0.75rem',
                  height: '24px',
                  bgcolor: '#E5F7FF',
                  color: '#0089D7',
                  border: 'none',
                  '& .MuiChip-label': {
                    px: 1.5,
                    py: 0.5
                  }
                }}
              />
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <IconButton
                size="small"
                sx={{
                  color: '#637381'
                }}
              >
                <MoreVertIcon sx={{ fontSize: '20px' }} />
              </IconButton>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Share‐link dialog */}
      <Dialog
        open={shareDialogOpen}
        onClose={handleCloseShareDialog}
        PaperProps={{
          sx: {
            borderRadius: { xs: '12px', sm: '16px' },
            width: { xs: '95%', sm: '400px' },
            maxWidth: '95%',
            margin: '0 auto',
            boxShadow: '0px 20px 40px rgba(0, 0, 0, 0.1)',
            overflow: 'visible'
          }
        }}
      >
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                fontSize: { xs: '1.125rem', sm: '1.25rem' }
              }}
            >
              Share Event Access
            </Typography>
            <IconButton onClick={handleCloseShareDialog} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <TextField
            fullWidth
            variant="outlined"
            value={`${window.location.origin}/broadcast/${id}`}
            InputProps={{
              readOnly: true,
              sx: {
                borderRadius: '8px',
                bgcolor: '#F9FAFB',
                height: { xs: '36px', sm: '40px' },
                '& .MuiOutlinedInput-input': {
                  p: { xs: '8px 12px', sm: '10px 14px' },
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                }
              }
            }}
            sx={{ mb: 1 }}
          />
          <Typography
            variant="body2"
            sx={{
              color: '#637381',
              mb: { xs: 2, sm: 3 },
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            Anyone with this link can view the live broadcast.
          </Typography>
          <Button
            variant="contained"
            fullWidth
            startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
            onClick={handleCopyLink}
            sx={{
              textTransform: 'none',
              borderRadius: '8px',
              px: { xs: 2, sm: 3 },
              py: 1,
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            {copied ? 'Copied!' : 'Copy Event Link'}
          </Button>
        </Box>
      </Dialog>
    </Box>
  );
}