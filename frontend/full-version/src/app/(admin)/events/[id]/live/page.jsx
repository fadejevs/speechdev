'use client';

import React, { useState, useEffect, useRef } from 'react';
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

import io from 'socket.io-client';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import { DEEPL_LANGUAGES } from '@/utils/deeplLanguages';

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

const updateEventStatus = async (id, status) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/events?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify({ status })
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error);
  }
  const data = await res.json();
  return data[0];
};

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

  // Add this state to track the media recorder and stream
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioStream, setAudioStream] = useState(null);

  const socketRef = useRef(null);
  const recognizerRef = useRef(null);

  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);

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

  useEffect(() => {
    // Use the first source language if available
    const sourceLanguage =
      eventData?.sourceLanguage || (Array.isArray(eventData?.sourceLanguages) ? eventData.sourceLanguages[0] : undefined);

    if (!eventData || !sourceLanguage) return;

    // Connecting to socket server
    const socket = io('https://speechdev.onrender.com', { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      // Socket connected

      const startRecognizer = () => {
        if (!process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY || !process.env.NEXT_PUBLIC_AZURE_REGION) {
          alert('Azure Speech key/region not set');
          return;
        }

        // Azure Speech SDK language mapping and validation
        const azureSpeechLanguageMap = {
          en: 'en-US',
          es: 'es-ES',
          fr: 'fr-FR',
          de: 'de-DE',
          it: 'it-IT',
          pt: 'pt-PT',
          ru: 'ru-RU',
          ja: 'ja-JP',
          ko: 'ko-KR',
          zh: 'zh-CN',
          ar: 'ar-SA',
          hi: 'hi-IN',
          tr: 'tr-TR',
          nl: 'nl-NL',
          pl: 'pl-PL',
          sv: 'sv-SE',
          no: 'nb-NO',
          da: 'da-DK',
          fi: 'fi-FI',
          cs: 'cs-CZ',
          hu: 'hu-HU',
          ro: 'ro-RO',
          sk: 'sk-SK',
          bg: 'bg-BG',
          hr: 'hr-HR',
          sl: 'sl-SI',
          et: 'et-EE',
          lv: 'lv-LV', // Latvian
          lt: 'lt-LT', // Lithuanian
          uk: 'uk-UA',
          he: 'he-IL',
          th: 'th-TH',
          vi: 'vi-VN',
          id: 'id-ID',
          ms: 'ms-MY',
          fa: 'fa-IR',
          Latvian: 'lv-LV',
          English: 'en-US',
          Spanish: 'es-ES',
          French: 'fr-FR',
          German: 'de-DE'
        };

        // DEBUGGING: Show exactly what we received
        console.log('[Azure] Raw sourceLanguage from event data:', sourceLanguage);
        console.log('[Azure] Event sourceLanguages array:', eventData?.sourceLanguages);

        // Map to proper Azure language code
        let azureLanguageCode = sourceLanguage;

        // Try direct mapping first
        if (azureSpeechLanguageMap[sourceLanguage]) {
          azureLanguageCode = azureSpeechLanguageMap[sourceLanguage];
          console.log('[Azure] Direct mapping found:', sourceLanguage, '→', azureLanguageCode);
        }
        // If it's already in xx-XX format, use it
        else if (sourceLanguage && sourceLanguage.includes('-')) {
          azureLanguageCode = sourceLanguage;
          console.log('[Azure] Using language code as-is:', azureLanguageCode);
        }
        // If it's just a base code, map it
        else if (sourceLanguage) {
          const baseCode = sourceLanguage.split('-')[0].toLowerCase();
          if (azureSpeechLanguageMap[baseCode]) {
            azureLanguageCode = azureSpeechLanguageMap[baseCode];
            console.log('[Azure] Base code mapping:', baseCode, '→', azureLanguageCode);
          }
        }

        // Final validation - NO FALLBACK TO ENGLISH!
        if (!azureLanguageCode || (!azureLanguageCode.includes('-') && azureLanguageCode === sourceLanguage)) {
          console.error('[Azure] Could not map language:', sourceLanguage);
          console.error('[Azure] Available mappings:', Object.keys(azureSpeechLanguageMap));
          // Don't fall back to English - that defeats the purpose!
          // Use whatever we have and let Azure tell us if it's wrong
          azureLanguageCode = sourceLanguage;
        }

        console.log('[Azure] Final language code for Azure Speech SDK:', azureLanguageCode);
        console.log('[Azure] Region:', process.env.NEXT_PUBLIC_AZURE_REGION);
        console.log('[Azure] Key exists:', !!process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY);

        // Test Azure service connectivity
        try {
          const testConfig = SpeechSDK.SpeechConfig.fromSubscription(
            process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY,
            process.env.NEXT_PUBLIC_AZURE_REGION
          );
          console.log('[Azure] Basic config created successfully');
        } catch (configError) {
          console.error('[Azure] Failed to create basic config:', configError);
        }

        const speechConfig = SpeechSDK.SpeechTranslationConfig.fromSubscription(
          process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY,
          process.env.NEXT_PUBLIC_AZURE_REGION
        );

        // Configure speech settings
        console.log(`[Azure] Using language code: ${azureLanguageCode}`);
        speechConfig.speechRecognitionLanguage = azureLanguageCode;
        speechConfig.enableDictation(); // Enable dictation mode for better continuous recognition
        speechConfig.setProfanity(SpeechSDK.ProfanityOption.Raw); // Don't filter any speech

        // AGGRESSIVE TIMEOUT SETTINGS for faster TTS response (like mobile Web Speech API)
        // Make Azure send final results much faster instead of waiting for long pauses
        speechConfig.setProperty(SpeechSDK.PropertyId.Speech_SegmentationSilenceTimeoutMs, '200'); // Default: 2000ms -> 300ms
        speechConfig.setProperty(SpeechSDK.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs, '100'); // Default: 5000ms -> 300ms
        speechConfig.setProperty(SpeechSDK.PropertyId.Speech_SegmentationMaximumSilenceTimeoutMs, '300'); // Default: 15000ms -> 800ms

        // Add target languages
        (eventData.targetLanguages || []).forEach((lang) => {
          speechConfig.addTargetLanguage(lang);
        });

        const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
        const recognizer = new SpeechSDK.TranslationRecognizer(speechConfig, audioConfig);

        recognizerRef.current = recognizer;

        // Handle recognition errors - NO FALLBACK, just fail gracefully
        recognizer.canceled = (s, e) => {
          console.log('[Live] Recognition canceled. Reason:', e.reason);
          if (e.reason === SpeechSDK.CancellationReason.Error) {
            console.error(`[Live] Recognition error: ${e.errorDetails}`);

            // Check if this is a language support error (1007)
            if (e.errorDetails.includes('1007') || e.errorDetails.includes('not supported')) {
              console.error(`[Azure] ❌ Language ${azureLanguageCode} is not supported in region ${process.env.NEXT_PUBLIC_AZURE_REGION}`);
              console.error('[Azure] 💡 Try changing your Azure region to West Europe or North Europe');
              console.error('[Azure] 💡 Or contact your Azure administrator to verify language support in your region');
            }

            console.error('[Live] Recognition failed - stopping without retry');

            if (recognizerRef.current) {
              recognizerRef.current.stopContinuousRecognitionAsync(
                () => {
                  console.log('[Live] Recognition stopped due to error');
                },
                (err) => console.error('[Live] Error stopping recognition:', err)
              );
            }
          }
        };

        recognizer.recognizing = (_s, evt) => {
          const text = evt.result.text;
          if (text && socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('realtime_transcription', {
              text,
              is_final: false,
              source_language: sourceLanguage,
              room_id: eventData.id
            });
          }
        };

        recognizer.recognized = (_s, evt) => {
          const text = evt.result.text;
          const translations = evt.result.translations ? Object.fromEntries(Object.entries(evt.result.translations)) : {};
          if (text && socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('realtime_transcription', {
              text,
              is_final: true,
              source_language: sourceLanguage,
              room_id: eventData.id,
              translations
            });
          }
          handleNewTranscription({
            text,
            source_language: sourceLanguage,
            translations
          });
        };

        // Start recognition with proper error handling
        recognizer.startContinuousRecognitionAsync(
          () => console.log('[Live] Recognition started successfully'),
          (err) => {
            console.error('[Live] Failed to start recognition:', err);
            // If start fails, try to restart after a short delay
            setTimeout(() => {
              if (recognizerRef.current) {
                recognizerRef.current.stopContinuousRecognitionAsync(
                  () => {
                    startRecognizer();
                  },
                  (stopErr) => console.error('[Live] Error stopping failed recognition:', stopErr)
                );
              }
            }, 1000);
          }
        );
      };

      if (eventData.status === 'Live') {
        startRecognizer();
      }
    });

    return () => {
      if (recognizerRef.current) {
        recognizerRef.current.stopContinuousRecognitionAsync(
          () => (recognizerRef.current = null),
          (err) => {
            console.error('Stop recognition error:', err);
            recognizerRef.current = null;
          }
        );
      }
      socket.close();
    };
    // Add sourceLanguages to dependencies
  }, [eventData?.id, eventData?.sourceLanguage, eventData?.sourceLanguages, eventData?.status]);

  // Fetch audio input devices on mount
  useEffect(() => {
    async function getAudioDevices() {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter((device) => device.kind === 'audioinput');
        setAudioInputDevices(audioInputs);
        if (!selectedAudioInput && audioInputs.length > 0) {
          setSelectedAudioInput(audioInputs[0].deviceId);
        }
      } catch (err) {
        console.error('Error accessing audio devices:', err);
      }
    }
    getAudioDevices();
  }, []);

  const handleBackToEvents = () => router.push('/dashboard/analytics');
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
  const handleCompleteEvent = async () => {
    try {
      await updateEventStatus(eventData.id, 'Completed');
      setEventData((prev) => ({ ...prev, status: 'Completed' }));
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('update_event_status', {
          room_id: eventData.id,
          status: 'Completed'
        });
      }
      // Redirect to the complete page
      router.push(`/events/${eventData.id}/complete`);
    } catch (e) {
      console.error('Failed to complete event:', e);
    }
  };
  const handlePauseResumeEvent = async () => {
    try {
      const newStatus = eventData.status === 'Paused' ? 'Live' : 'Paused';

      // Update in Supabase
      await updateEventStatus(eventData.id, newStatus);
      setEventData((prev) => ({ ...prev, status: newStatus }));

      if (newStatus === 'Paused' && recognizerRef.current) {
        recognizerRef.current.stopContinuousRecognitionAsync(
          () => {
            recognizerRef.current = null;
          },
          (err) => {
            console.error('Stop recognition error:', err);
            recognizerRef.current = null;
          }
        );
      }
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('update_event_status', {
          room_id: eventData.id,
          status: newStatus
        });
      }
    } catch (e) {
      console.error('Failed to update event status:', e);
    }
  };

  const handleNewTranscription = (data) => {
    // Only record if enabled
    if (eventData.recordEvent) {
      const key = `transcripts_${String(eventData.id)}`;
      const transcripts = JSON.parse(localStorage.getItem(key) || '{}');
      // Save source transcription
      if (data.text && data.source_language) {
        const lang = data.source_language.split('-')[0].toLowerCase();
        transcripts[lang] = transcripts[lang] || [];
        transcripts[lang].push(data.text);
      }
      // Save translations
      if (data.translations) {
        Object.entries(data.translations).forEach(([lang, txt]) => {
          const baseLang = lang.split('-')[0].toLowerCase();
          transcripts[baseLang] = transcripts[baseLang] || [];
          transcripts[baseLang].push(txt);
        });
      }
      localStorage.setItem(key, JSON.stringify(transcripts));
    }
    // ... your existing UI update logic ...
  };

  // Handler for opening/closing the menu
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Handler for selecting a device
  const handleSelectInput = (deviceId) => {
    setSelectedAudioInput(deviceId);
    handleMenuClose();
    // TODO: If you want to re-initialize the recognizer with the new input, do it here
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
          onClick={handleBackToEvents}
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
            width: { xs: '100%', sm: 'auto' }
          }}
        >
          <Button
            variant="outlined"
            onClick={handlePauseResumeEvent}
            sx={{
              textTransform: 'none',
              px: { xs: 2, sm: 3 },
              py: 1,
              borderRadius: '8px',
              flex: { xs: 1, sm: 'initial' },
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            {eventData?.status === 'Paused' ? 'Resume Event' : 'Pause Event'}
          </Button>
          <Button
            variant="contained"
            onClick={handleCompleteEvent}
            sx={{
              textTransform: 'none',
              px: { xs: 2, sm: 3 },
              py: 1,
              borderRadius: '8px',
              flex: { xs: 1, sm: 'initial' },
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            Complete Event
          </Button>
        </Box>
      </Box>

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
              onClick={handleMenuOpen}
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
              Change Input
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              PaperProps={{
                sx: {
                  mt: 1,
                  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
                  borderRadius: '8px'
                }
              }}
            >
              {audioInputDevices.length === 0 ? (
                <MenuItem disabled>No audio inputs found</MenuItem>
              ) : (
                audioInputDevices.map((device) => (
                  <MenuItem
                    key={device.deviceId}
                    selected={device.deviceId === selectedAudioInput}
                    onClick={() => handleSelectInput(device.deviceId)}
                  >
                    {device.label || `Microphone (${device.deviceId})`}
                  </MenuItem>
                ))
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
