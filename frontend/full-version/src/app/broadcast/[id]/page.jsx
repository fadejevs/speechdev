'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Box, Typography, CircularProgress, Paper, Button, Menu, MenuItem, IconButton, useMediaQuery, useTheme, Fab, keyframes, Chip } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';

import MenuIcon from '@mui/icons-material/Menu';
import PauseIcon from '@mui/icons-material/Pause';
import SelfieDoodle from '@/images/illustration/SelfieDoodle';
import io from 'socket.io-client';
import branding from '@/branding.json';
import { getFullLanguageName, getBaseLangCode, getLanguageCode, getPlaceholderText, isMobile, isTablet } from './utils';
import { useTts } from './useTts';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'https://speechdev.onrender.com';

const fetchEventById = async (id) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/events?id=eq.${id}&select=*`, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
    }
  });
  const data = await res.json();
  return data && data.length > 0 ? data[0] : null;
};

// This is a simplified fetchTranslations function. In a real app, this would also be extracted.
const fetchTranslations = async (text, lang) => {
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, target_lang: lang.toUpperCase() })
    });
    if (!res.ok) return {};
    const { translation } = await res.json();
    return { [lang]: translation };
  } catch (e) {
    return {};
  }
};

// Define a more sophisticated shimmer animation
const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

// Define a pulse animation for the interim text
const pulse = keyframes`
  0% {
    transform: scale(0.95);
    opacity: 0.7;
  }
  50% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(0.95);
    opacity: 0.7;
  }
`;

export default function BroadcastPage() {
  const { id } = useParams();
  const theme = useTheme();
  const isMobileView = useMediaQuery(theme.breakpoints.down('md'));

  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  const [availableSourceLanguages, setAvailableSourceLanguages] = useState([]);
  const [availableTargetLanguages, setAvailableTargetLanguages] = useState([]);

  const [transcriptionLanguage, setTranscriptionLanguage] = useState('');
  const [translationLanguage, setTranslationLanguage] = useState('');

  const [transcriptionMenuAnchor, setTranscriptionMenuAnchor] = useState(null);
  const [translationMenuAnchor, setTranslationMenuAnchor] = useState(null);

  const [persistedCaptions, setPersistedCaptions] = useState([]);
  const [persistedTranslations, setPersistedTranslations] = useState([]);
  const [currentInterimCaption, setCurrentInterimCaption] = useState('');
  const [liveTranscriptionLang, setLiveTranscriptionLang] = useState('');
  const [liveTranslations, setLiveTranslations] = useState({});
  const [realtimeTranslations, setRealtimeTranslations] = useState({});

    const {
    ttsLoading, 
    autoSpeakLang, 
    setAutoSpeakLang, 
    queueForTTS, 
    handleMobilePlayToggle, 
    spokenSentences, 
    stopTts
  } = useTts(eventData);

  const translationLanguageRef = useRef(translationLanguage);
  useEffect(() => {
    translationLanguageRef.current = translationLanguage;
  }, [translationLanguage]);

  const autoSpeakLangRef = useRef(autoSpeakLang);
  useEffect(() => {
    autoSpeakLangRef.current = autoSpeakLang;
  }, [autoSpeakLang]);

  const socketRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    fetchEventById(id).then((ev) => {
      if (ev) {
        setEventData(ev);
        if (ev.sourceLanguages?.length) {
          setAvailableSourceLanguages(ev.sourceLanguages);
          setTranscriptionLanguage(ev.sourceLanguages[0]);
          setLiveTranscriptionLang(ev.sourceLanguages[0]);
        }
        if (ev.targetLanguages?.length) {
          setAvailableTargetLanguages(ev.targetLanguages);
          setTranslationLanguage(ev.targetLanguages[0]);
        }
      }
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (socketRef.current) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'], // Add polling fallback
      reconnection: true,
      reconnectionDelay: 500, // Faster reconnection
      reconnectionDelayMax: 5000, // Max 5s delay
      reconnectionAttempts: Infinity, // Never give up
      timeout: 10000, // 10s connection timeout
      forceNew: true, // Force new connection
      autoConnect: true,
      upgrade: true // Allow transport upgrades
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[WebSocket] Connected successfully to', SOCKET_URL);
      setSocketConnected(true);
      setConnectionStatus('connected');
      socket.emit('join_room', { room: id });
    });

    socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      setSocketConnected(false);
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error.message || error);
      setSocketConnected(false);
      setConnectionStatus('error');
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('[WebSocket] Reconnected after', attemptNumber, 'attempts');
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('[WebSocket] Reconnection attempt', attemptNumber);
    });

    socket.on('realtime_transcription', async (data) => {
      setLiveTranscriptionLang(data.source_language || '');

      const handleFinalTranscription = async (text, adminTranslations = {}) => {
        if (!text || !translationLanguageRef.current) return;

        const targetLang = getLanguageCode(translationLanguageRef.current);
        const langCode = getBaseLangCode(targetLang);
        
        // 🚀 SMART FIX: Use admin's processed translations first
        let translatedText = null;
        const startTime = Date.now(); // Performance tracking
        
        // Try to get translation from admin's smart processing
        if (adminTranslations && Object.keys(adminTranslations).length > 0) {
          // Check various possible language code formats
          translatedText = adminTranslations[langCode] || 
                          adminTranslations[targetLang] || 
                          adminTranslations[langCode.toUpperCase()] ||
                          adminTranslations[targetLang.toUpperCase()];
          
          if (translatedText) {
            console.log(`[Mobile Optimized] ✅ Using admin's smart translation for ${langCode} (${Date.now() - startTime}ms):`, translatedText);
          }
        }
        
        // Fallback to individual API call only if admin translation unavailable
        if (!translatedText) {
          console.log(`[Mobile Fallback] 🔄 Admin translation not available for ${langCode}, fetching individually...`);
          const fallbackTranslations = await fetchTranslations(text, langCode);
          translatedText = fallbackTranslations[langCode];
          console.log(`[Mobile Fallback] ⚠️ Individual API call completed in ${Date.now() - startTime}ms`);
        }

        if (translatedText?.trim()) {
          if (autoSpeakLangRef.current === langCode) {
            queueForTTS(translatedText.trim(), langCode);
          }
          const newTranslation = {
            id: Date.now() + Math.random(),
            text: translatedText.trim(),
            language: targetLang,
            timestamp: Date.now(),
            source: adminTranslations && Object.keys(adminTranslations).length > 0 ? 'admin_smart' : 'mobile_fallback',
            processingTimeMs: Date.now() - startTime
          };
          setPersistedTranslations((prev) => [...prev, newTranslation]);
        }
      };

      if (data.is_final) {
        // When a final text arrives, clear BOTH interim states
        setCurrentInterimCaption('');
        setRealtimeTranslations({}); // Clear the interim translation state

        if (data.text?.trim()) {
          const newCaption = {
            id: data.chunk_ids ? data.chunk_ids[0] : crypto.randomUUID(), // Use first ID for simplicity
            text: data.text.trim(),
            timestamp: Date.now(),
            isContextEnhanced: data.is_context_enhanced || false,
            chunkIds: data.chunk_ids || [],
            replacesChunkIds: data.replaces_chunk_ids || []
          };

          setPersistedCaptions((prev) => {
            let captions = [...prev];
            // If this is an enhanced replacement, remove the old chunks first
            if (newCaption.isContextEnhanced && newCaption.replacesChunkIds.length > 0) {
              captions = captions.filter(c => !newCaption.replacesChunkIds.includes(c.id));
            }
            // Add the new caption
            captions.push(newCaption);
            return captions;
          });

          // 🚀 OPTIMIZED: Pass admin's smart translations to avoid duplicate processing
          if (!data.is_context_enhanced) {
            handleFinalTranscription(data.text.trim(), data.translations || {});
          }
        }
      } else {
        // This is an interim update
        // PRODUCTION FIX: Only show interim text, don't translate it (expensive!)
        if (data.text?.trim()) {
          setCurrentInterimCaption(data.text);
          
          // Only use admin translations if available, NO API calls for interim
          if (data.translations && translationLanguageRef.current) {
            const targetLang = getLanguageCode(translationLanguageRef.current);
            const langCode = getBaseLangCode(targetLang);
            const adminTranslation = data.translations[langCode] || 
                                   data.translations[targetLang];
            
            if (adminTranslation) {
              setRealtimeTranslations({ [langCode]: adminTranslation });
            } else {
              // Clear interim translation if no admin translation
              setRealtimeTranslations({});
            }
          }
        }
      }
    });

    socket.on('event_status_update', (data) => {
      if (data.room_id === id) {
        setEventData((prev) => (prev ? { ...prev, status: data.status } : null));
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [id, queueForTTS]);

  useEffect(() => {
    // Only clear translations when the translation language changes
    // Don't clear when just toggling TTS on/off (autoSpeakLang)
    setPersistedTranslations([]);
    spokenSentences.current.clear();
  }, [translationLanguage, spokenSentences]); // Removed autoSpeakLang from dependencies

  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = Date.now();
      setPersistedCaptions((prevCaptions) => prevCaptions.filter((caption) => now - caption.timestamp < 30000));
      setPersistedTranslations((prevTranslations) => prevTranslations.filter((translation) => now - translation.timestamp < 30000));
    }, 10000); // Check every 10 seconds

    return () => clearInterval(intervalId);
  }, []);

  // Define currentInterimTranslation from the realtimeTranslations state
  const currentInterimTranslation = useMemo(() => {
    if (translationLanguage && realtimeTranslations) {
      const targetLang = getLanguageCode(translationLanguage);
      const langCode = getBaseLangCode(targetLang);
      return realtimeTranslations[langCode] || '';
    }
    return '';
  }, [realtimeTranslations, translationLanguage]);

  const displayedCaption = useMemo(() => {
    // Combine final, persisted captions into a single block
    const final_text = persistedCaptions
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((c) => c.text)
      .join(' ')
      .trim();

    // The full caption starts with the final text
    let fullCaption = final_text;

    // Append the interim text, but only if it's new information
    if (currentInterimCaption) {
      const interimTrimmed = currentInterimCaption.trim();
      // A simple check to see if the final text already contains the start of the interim text
      if (interimTrimmed && !final_text.endsWith(interimTrimmed.substring(0, 10))) {
        fullCaption = fullCaption ? `${fullCaption} ${interimTrimmed}` : interimTrimmed;
      }
    }
    
    return fullCaption;
  }, [persistedCaptions, currentInterimCaption]);

  const displayedTranslation = useMemo(() => {
    const finalTranslations = persistedTranslations.map((t) => t.text).join(' ');
    let fullTranslation = finalTranslations;
    if (translationLanguage && realtimeTranslations) {
      const targetLang = getLanguageCode(translationLanguage);
      const currentInterimTranslation = realtimeTranslations[getBaseLangCode(targetLang)];
      if (currentInterimTranslation?.trim() && !finalTranslations.includes(currentInterimTranslation.trim())) {
        fullTranslation = finalTranslations ? `${finalTranslations} ${currentInterimTranslation.trim()}` : currentInterimTranslation.trim();
      }
    }
    return fullTranslation.trim();
  }, [persistedTranslations, realtimeTranslations, translationLanguage]);

  if (loading) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!eventData) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5">Event not found</Typography>
        <Typography>The event you're looking for doesn't exist.</Typography>
      </Box>
    );
  }

  if (eventData.status === 'Paused' || eventData.status === 'Completed' || eventData.status === 'Scheduled') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Box
          component="header"
          sx={{
            display: 'flex',
            alignItems: 'center',
            height: 64,
            px: 2,
            borderBottom: '1px solid #f0f0f0',
            backgroundColor: 'background.default'
          }}
        >
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-block' }}>
            <img src={branding.logo.main} alt="interpretd logo" style={{ height: 40, display: 'block' }} />
          </Link>
        </Box>
        <Box sx={{ flex: 1, maxWidth: '1200px', width: '100%', mx: 'auto', p: { xs: 2, sm: 3 } }}>
          <Box
            sx={{
              mb: 3,
              p: { xs: 2, sm: 3 },
              borderRadius: 2,
              bgcolor: 'white',
              boxShadow: '0px 1px 2px rgba(0,0,0,0.06)',
              border: '1px solid #F2F3F5'
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#212B36', mb: 1 }}>
              {eventData.title}
            </Typography>
            <Typography variant="body2" sx={{ color: '#637381' }}>
              {eventData.description}
            </Typography>
          </Box>
          <Box
            sx={{
              bgcolor: 'white',
              border: '1px solid #F2F3F5',
              borderRadius: 2,
              minHeight: 300,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: 6
            }}
          >
            <Box sx={{ width: 180, height: 180, objectFit: 'contain' }}>
              <SelfieDoodle sx={{ width: '100%', height: '100%', fontSize: 0 }} />
            </Box>
            <Typography variant="h6" sx={{ mb: 1, textAlign: 'center' }}>
              The event hasn't started yet or has been paused. It will resume shortly.
            </Typography>
            <Typography variant="body2" sx={{ color: '#888', textAlign: 'center' }}>
              If you have any questions, feel free to reach out to the event organiser.
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }



  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Box
        component="header"
        sx={{
          display: 'flex',
          alignItems: 'center',
          height: 64,
          px: 2,
          borderBottom: '1px solid #f0f0f0',
          backgroundColor: 'background.default'
        }}
      >
        <Link href="/" style={{ textDecoration: 'none', display: 'inline-block' }}>
          <img src={branding.logo.main} alt="interpretd logo" style={{ height: 40, display: 'block' }} />
        </Link>
      </Box>

      {isMobileView ? (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#f8f9fa', pb: { xs: 10, sm: 12 } }}>
          <Box sx={{ p: { xs: 3, sm: 4 }, bgcolor: 'white' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#212B36', mb: 1, fontSize: { xs: '1.5rem', sm: '1.75rem' } }}>
              {eventData.title}
            </Typography>
            <Typography variant="body2" sx={{ color: '#637381', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              {eventData.description}
            </Typography>
          </Box>
          <Box sx={{ flex: 1, p: { xs: 3, sm: 4 }, bgcolor: 'white', mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 3, sm: 4 } }}>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#212B36', fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                Live Interpretation
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    bgcolor: '#8B5CF6',
                    color: 'white',
                    px: { xs: 2, sm: 2.5 },
                    py: { xs: 0.75, sm: 1 },
                    borderRadius: 3,
                    fontSize: { xs: '14px', sm: '16px' },
                    fontWeight: 600
                  }}
                >
                  {translationLanguage ? getFullLanguageName(getBaseLangCode(translationLanguage)) : 'No Language'}
                </Box>
                <Button
                  size="small"
                  endIcon={<ArrowDropDownIcon />}
                  onClick={(e) => setTranslationMenuAnchor(e.currentTarget)}
                  sx={{ textTransform: 'none', fontSize: { xs: '14px', sm: '16px' }, color: '#637381', fontWeight: 500 }}
                >
                  Change Language
                </Button>
                <Menu anchorEl={translationMenuAnchor} open={Boolean(translationMenuAnchor)} onClose={() => setTranslationMenuAnchor(null)}>
                  {availableTargetLanguages.map((lang) => (
                    <MenuItem
                      key={lang}
                      onClick={() => {
                        setTranslationLanguage(lang);
                        setTranslationMenuAnchor(null);
                      }}
                    >
                      {getFullLanguageName(getBaseLangCode(lang))}
                    </MenuItem>
                  ))}
                </Menu>
              </Box>
            </Box>
            <Box sx={{ minHeight: { xs: '300px', sm: '400px' }, display: 'flex', alignItems: 'flex-start', pt: { xs: 2, sm: 3 } }}>
              {!socketConnected ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CircularProgress size={24} />
                  <Typography variant="body1" sx={{ color: 'text.secondary', fontSize: { xs: '1rem', sm: '1.125rem' } }}>
                    {connectionStatus === 'connecting'
                      ? 'Connecting...'
                      : connectionStatus === 'error'
                        ? 'Connection failed, retrying...'
                        : 'Waiting for connection...'}
                  </Typography>
                </Box>
              ) : persistedTranslations.length === 0 && !currentInterimTranslation ? (
                <Typography variant="body1" sx={{ color: 'text.secondary', fontSize: { xs: '1rem', sm: '1.125rem' } }}>
                  {getPlaceholderText(translationLanguage)}
                </Typography>
              ) : (
                <Typography
                  variant="body1"
                  sx={{
                    color: 'text.primary',
                    fontSize: { xs: '1.1rem', sm: '1.25rem' },
                    lineHeight: 1.6,
                    fontWeight: 400,
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {persistedTranslations.map(t => t.text).join(' ')}
                  <Typography
                    component="span"
                    sx={{
                      color: 'text.secondary',
                      animation: `${pulse} 1.5s infinite ease-in-out`,
                      fontSize: 'inherit' // FIX: Inherit font size from parent
                    }}
                  >
                    {` ${currentInterimTranslation}`}
                  </Typography>
                </Typography>
              )}
            </Box>
          </Box>
          <Fab
            onClick={() => handleMobilePlayToggle(translationLanguage)}
            disabled={ttsLoading}
            sx={{
              position: 'fixed',
              bottom: { xs: 50, sm: 50 },
              left: '50%',
              transform: 'translateX(-50%)',
              bgcolor: ttsLoading ? '#f5f5f5' : 'white',
              color: ttsLoading ? '#8B5CF6' : '#8B5CF6',
              width: { xs: 74, sm: 84 },
              height: { xs: 74, sm: 84 },
              border: '2px solid #8B5CF6',
              zIndex: 1001,
              boxShadow: '0px 4px 20px rgba(139, 92, 246, 0.3)'
            }}
          >
            {ttsLoading ? (
              <CircularProgress size={28} sx={{ color: '#8B5CF6' }} />
            ) : autoSpeakLang ? (
              <PauseIcon sx={{ fontSize: { xs: 28, sm: 32 } }} />
            ) : (
              <VolumeUpIcon sx={{ fontSize: { xs: 28, sm: 32 } }} />
            )}
          </Fab>

          {/* Mobile/Tablet Bottom Control Bar */}
          <Box
            sx={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              bgcolor: '#8B5CF6',
              height: { xs: 80, sm: 90 }, // Slightly taller on tablets
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: { xs: 4, sm: 6 }, // More padding on tablets
              zIndex: 1000,
              borderRadius: '20px 20px 0 0'
            }}
          >
            <Box sx={{ width: { xs: 64, sm: 72 } }} />
          </Box>
        </Box>
      ) : (
        <Box sx={{ flex: 1, maxWidth: '1200px', width: '100%', mx: 'auto', p: { xs: 1.5, sm: 2, md: 3 } }}>
          <Box
            sx={{
              mb: { xs: 2, sm: 3 },
              p: { xs: 2, sm: 3 },
              borderRadius: 2,
              bgcolor: 'white',
              boxShadow: '0px 1px 2px rgba(0,0,0,0.06)',
              border: '1px solid #F2F3F5'
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#212B36', mb: 1 }}>
              {eventData.title}
            </Typography>
            <Typography variant="body2" sx={{ color: '#637381' }}>
              {eventData.description}
            </Typography>
          </Box>
          <Box
            sx={{
              mb: { xs: 2, sm: 3 },
              borderRadius: 2,
              bgcolor: 'white',
              boxShadow: '0px 1px 2px rgba(0,0,0,0.06)',
              border: '1px solid #F2F3F5',
              overflow: 'hidden'
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                px: 3,
                py: 2,
                borderBottom: '1px solid #F2F3F5'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#212B36' }}>
                  Live Transcription
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: socketConnected ? '#4CAF50' : '#F44336' }} />
                  <Typography variant="caption" sx={{ color: socketConnected ? '#4CAF50' : '#F44336', fontWeight: 500 }}>
                    {socketConnected ? 'Connected' : 'Connecting...'}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ bgcolor: '#EEF2FF', color: '#6366F1', px: 1.5, py: 0.5, borderRadius: 1, fontWeight: 500, fontSize: '14px' }}>
                {transcriptionLanguage ? getFullLanguageName(getBaseLangCode(transcriptionLanguage)) : 'N/A'}
              </Box>
            </Box>
            <Box sx={{ p: 3, minHeight: '200px' }}>
              {persistedCaptions.length === 0 && !currentInterimCaption ? (
                <Typography variant="body1" sx={{ color: 'text.secondary', pl: 2, pt: 2 }}>
                  Waiting for live transcription...
                </Typography>
              ) : (
                <Typography variant="body1" sx={{ color: 'text.primary', pl: 2, pt: 2, whiteSpace: 'pre-wrap' }}>
                  {persistedCaptions.map(c => c.text).join(' ')}
                  <Typography
                    component="span"
                    sx={{
                      backgroundImage: 'linear-gradient(90deg, #9e9e9e,rgb(65, 65, 65),rgb(136, 136, 136))',
                      backgroundSize: '200% auto',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      textFillColor: 'transparent',
                      WebkitTextFillColor: 'transparent',
                      animation: `${shimmer} 2s linear infinite`,
                    }}
                  >
                    {` ${currentInterimCaption}`}
                  </Typography>
              </Typography>
              )}
            </Box>
          </Box>
          <Box
            sx={{
              borderRadius: 2,
              bgcolor: 'white',
              boxShadow: '0px 1px 2px rgba(0,0,0,0.06)',
              border: '1px solid #F2F3F5',
              overflow: 'hidden'
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                px: 3,
                py: 2,
                borderBottom: '1px solid #F2F3F5'
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#212B36' }}>
                Live Translation
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ bgcolor: '#EEF2FF', color: '#6366F1', px: 1.5, py: 0.5, borderRadius: 1, fontWeight: 500 }}>
                  {translationLanguage ? getFullLanguageName(getBaseLangCode(translationLanguage)) : '[No language]'}
                </Box>
                <Button
                  size="small"
                  endIcon={<ArrowDropDownIcon />}
                  onClick={(e) => setTranslationMenuAnchor(e.currentTarget)}
                  sx={{ textTransform: 'none', color: '#6366F1' }}
                >
                  Change Language
                </Button>
                <Menu anchorEl={translationMenuAnchor} open={Boolean(translationMenuAnchor)} onClose={() => setTranslationMenuAnchor(null)}>
                  {availableTargetLanguages.map((lang) => (
                    <MenuItem
                      key={lang}
                      onClick={() => {
                        setTranslationLanguage(lang);
                        setTranslationMenuAnchor(null);
                      }}
                    >
                      {getFullLanguageName(getBaseLangCode(lang))}
                    </MenuItem>
                  ))}
                </Menu>
              </Box>
            </Box>
            <Box sx={{ p: 3, minHeight: '200px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {persistedTranslations.length === 0 && !currentInterimTranslation ? (
                  <Typography variant="body1" sx={{ color: 'text.secondary', flex: 1, pl: 2, pt: 2 }}>
                    {getPlaceholderText(translationLanguage)}
                  </Typography>
                ) : (
                  <Typography variant="body1" sx={{ color: 'text.primary', flex: 1, pl: 2, pt: 2, whiteSpace: 'pre-wrap' }}>
                    {persistedTranslations.map(t => t.text).join(' ')}
                    <Typography
                      component="span"
                      sx={{
                        backgroundImage: 'linear-gradient(90deg, #9e9e9e, #eeeeee, #9e9e9e)',
                        backgroundSize: '200% auto',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        textFillColor: 'transparent',
                        WebkitTextFillColor: 'transparent',
                        animation: `${shimmer} 2s linear infinite`,
                      }}
                    >
                      {` ${currentInterimTranslation}`}
                    </Typography>
                </Typography>
                )}
                {/* Smart TTS Button */}
                {(persistedTranslations.length > 0 || !!currentInterimTranslation) && (
                  <Box sx={{ position: 'relative' }}>
                    {/* Mobile TTS Active Indicator */}
                    {isMobileView && autoSpeakLang && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: -4,
                          right: -4,
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: '#6366F1',
                          animation: `${pulse} 2s ease-in-out infinite`,
                          zIndex: 1
                        }}
                      />
                    )}
                    <IconButton
                      onClick={() => {
                        if (isMobile()) {
                          handleMobilePlayToggle(translationLanguage);
                        } else {
                          // Desktop unchanged
                          const fullTranslationText = persistedTranslations.map(t => t.text).join(' ').trim();
                          if (!fullTranslationText) return;
                          
                          const targetLang = getLanguageCode(translationLanguage);
                          const langCode = getBaseLangCode(targetLang);

                          if (autoSpeakLang) {
                            setAutoSpeakLang(null);
                            stopTts();
                          } else {
                            spokenSentences.current.clear();
                            setAutoSpeakLang(langCode);
                            queueForTTS(fullTranslationText, langCode);
                          }
                        }
                      }}
                      disabled={ttsLoading}
                      sx={{
                        position: 'relative',
                        '&:hover': {
                          bgcolor: 'rgba(0, 0, 0, 0.04)'
                        }
                      }}
                    >
                      {ttsLoading ? (
                        <CircularProgress size={24} sx={{ color: '#6366F1' }} />
                      ) : (
                        <VolumeUpIcon 
                          color={autoSpeakLang ? 'primary' : 'inherit'} 
                        />
                      )}
                    </IconButton>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
