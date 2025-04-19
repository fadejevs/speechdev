"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { 
  Box, 
  Typography, 
  CircularProgress,
  Paper, 
  Switch, 
  Button,
  KeyboardArrowDownIcon,
  Menu,
  MenuItem,
  Link
} from '@mui/material';
import io from 'socket.io-client';

// Language mapping for full names
const languageMap = {
  'en': 'English',
  'lv': 'Latvian',
  'lt': 'Lithuanian',
  'ru': 'Russian',
  'de': 'German',
  'fr': 'French',
  'es': 'Spanish',
  'it': 'Italian',
  'zh': 'Chinese',
  'ja': 'Japanese',
  'ko': 'Korean',
  'ar': 'Arabic',
  'hi': 'Hindi',
  'pt': 'Portuguese',
  'nl': 'Dutch',
  'sv': 'Swedish',
  'fi': 'Finnish',
  'da': 'Danish',
  'no': 'Norwegian',
  'pl': 'Polish',
  'tr': 'Turkish',
  'cs': 'Czech',
  'hu': 'Hungarian',
  'ro': 'Romanian',
  'bg': 'Bulgarian',
  'el': 'Greek',
  'he': 'Hebrew',
  'th': 'Thai',
  'vi': 'Vietnamese',
  'id': 'Indonesian',
  'ms': 'Malay',
  'uk': 'Ukrainian',
  'sk': 'Slovak',
  'sl': 'Slovenian',
  'sr': 'Serbian',
  'hr': 'Croatian',
  'et': 'Estonian',
  'lv': 'Latvian',
  'lt': 'Lithuanian'
};

// Get full language name
const getFullLanguageName = (code) => {
  // If it's already a full name, return it
  if (code.length > 2) return code;
  
  // Otherwise look up the code
  return languageMap[code.toLowerCase()] || code;
};

const BroadcastPage = () => {
  const { id } = useParams();
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [listenAudio, setListenAudio] = useState(false);
  const [transcriptionLanguage, setTranscriptionLanguage] = useState('Latvian');
  const [translationLanguage, setTranslationLanguage] = useState('English');
  const [transcriptionMenuAnchor, setTranscriptionMenuAnchor] = useState(null);
  const [translationMenuAnchor, setTranslationMenuAnchor] = useState(null);
  const [availableSourceLanguages, setAvailableSourceLanguages] = useState(['Latvian']);
  const [availableTargetLanguages, setAvailableTargetLanguages] = useState(['English', 'Lithuanian']);

  // State for live data from WebSocket
  const [liveTranscription, setLiveTranscription] = useState('');
  const [liveTranscriptionLang, setLiveTranscriptionLang] = useState('');
  const [liveTranslations, setLiveTranslations] = useState({});
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    // Fetch event data from localStorage (in production this would be an API call)
    const storedEvents = localStorage.getItem('eventData');
    if (storedEvents) {
      const parsedEvents = JSON.parse(storedEvents);
      const event = parsedEvents.find(event => event.id === id);
      if (event) {
        setEventData(event);
        
        // Set source languages
        if (event.sourceLanguages && event.sourceLanguages.length > 0) {
          const fullSourceLanguages = event.sourceLanguages.map(lang => getFullLanguageName(lang));
          setAvailableSourceLanguages(fullSourceLanguages);
          setTranscriptionLanguage(fullSourceLanguages[0]);
        }
        
        // Set target languages
        if (event.targetLanguages && event.targetLanguages.length > 0) {
          const fullTargetLanguages = event.targetLanguages.map(lang => getFullLanguageName(lang));
          setAvailableTargetLanguages(fullTargetLanguages);
          setTranslationLanguage(fullTargetLanguages[0]);
        }

        // Set initial display languages based on event data if needed
        if (event.sourceLanguages && event.sourceLanguages.length > 0) {
          setLiveTranscriptionLang(event.sourceLanguages[0]); 
        }
      }
    }
    setLoading(false);
  }, [id]);

  // WebSocket Connection useEffect
  useEffect(() => {
    const broadcastId = id;
    const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'https://speechdev.onrender.com';
    socketRef.current = io(socketUrl, {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log(`Socket connected: ${socket.id}`);
      if (broadcastId) {
        console.log(`Attempting to join room: ${broadcastId}`);
        socket.emit('join_room', { room: broadcastId });
      } else {
        console.error('Broadcast ID is missing from URL, cannot join room.');
      }
      setSocketConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('Broadcast WebSocket disconnected:', reason);
      setSocketConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Broadcast WebSocket connection error:', error);
      setSocketConnected(false);
    });

    socket.on('room_joined', (data) => {
      console.log('Successfully joined room:', data.room_id);
    });

    socket.on('translation_result', (data) => {
      console.log('Received translation result:', data);
      
      // Update transcription if original text exists
      if (data.original) {
        console.log(`Setting liveTranscription to: "${data.original}"`);
        setLiveTranscription(data.original);
        
        if (data.source_language) {
          console.log(`Setting liveTranscriptionLang to: "${data.source_language}"`);
          setLiveTranscriptionLang(data.source_language);
        }
      }
      
      // Update translations if they exist
      if (data.translations) {
        console.log('Setting liveTranslations to:', data.translations);
        setLiveTranslations(prev => {
          const updated = { ...prev, ...data.translations };
          console.log('Updated liveTranslations state:', updated);
          return updated;
        });
      }
      
      // Log the current state after updates
      setTimeout(() => {
        console.log('State after update:', {
          liveTranscription,
          liveTranscriptionLang,
          liveTranslations
        });
      }, 100);
    });

    socket.on('translation_error', (error) => {
        console.error('Translation error:', error);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    socket.onAny((event, ...args) => {
      console.log(`[Socket Debug] Event: ${event}`, args);
    });

    return () => {
      console.log('Disconnecting socket...');
      socket.disconnect();
    };
  }, [id]);

  // Add this somewhere in your component to help debug
  useEffect(() => {
    console.log('Current transcription state:', {
      liveTranscription,
      liveTranscriptionLang,
      liveTranslations,
      socketConnected
    });
  }, [liveTranscription, liveTranscriptionLang, liveTranslations, socketConnected]);

  const handleTranscriptionMenuOpen = (event) => {
    setTranscriptionMenuAnchor(event.currentTarget);
  };

  const handleTranscriptionMenuClose = () => {
    setTranscriptionMenuAnchor(null);
  };

  const handleTranslationMenuOpen = (event) => {
    setTranslationMenuAnchor(event.currentTarget);
  };

  const handleTranslationMenuClose = () => {
    setTranslationMenuAnchor(null);
  };

  const handleChangeTranscriptionLanguage = (language) => {
    setTranscriptionLanguage(language);
    handleTranscriptionMenuClose();
  };

  const handleChangeTranslationLanguage = (language) => {
    setTranslationLanguage(language);
    handleTranslationMenuClose();
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  }

  if (!eventData) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Event not found</Typography>
        <Typography variant="body1">The event you're looking for doesn't exist or has ended.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header - Exactly like admin dashboard */}
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
        <Link href="/" style={{ textDecoration: 'none' }}>
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 600, 
              color: '#6366F1',
              letterSpacing: '-0.5px'
            }}
          >
            interpretd
          </Typography>
        </Link>
      </Box>
      
      {/* Main Content */}
      <Box sx={{ 
        flex: 1, 
        maxWidth: '1200px', 
        width: '100%', 
        mx: 'auto', 
        p: { xs: 2, sm: 3 } 
      }}>
        {/* Event Header */}
        <Box sx={{ 
          mb: 3, 
          p: { xs: 2, sm: 3 }, 
          borderRadius: 2, 
          bgcolor: 'white',
          boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.06)',
          border: '1px solid #F2F3F5'
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#212B36', mb: 1 }}>
            {eventData.title || 'Demo Event'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#637381' }}>
            {eventData.description || 'Debitis consequatur et facilis consequatur fugiat fugit nulla quo.'}
          </Typography>
        </Box>

        {/* Live Transcription */}
        <Box sx={{ 
          mb: 3, 
          borderRadius: 2, 
          bgcolor: 'white',
          boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.06)',
          border: '1px solid #F2F3F5',
          overflow: 'hidden'
        }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            px: { xs: 2, sm: 3 },
            py: 2,
            borderBottom: '1px solid #F2F3F5'
          }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#212B36' }}>
              Live Transcription
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ 
                bgcolor: '#EEF2FF', 
                color: '#6366F1', 
                px: 1.5, 
                py: 0.5, 
                borderRadius: 1,
                fontSize: '14px',
                fontWeight: 500
              }}>
                {getFullLanguageName(liveTranscriptionLang || eventData?.sourceLanguages?.[0] || '')}
              </Box>
            </Box>
          </Box>
          
          <Box sx={{ px: { xs: 2, sm: 3 }, py: 3, minHeight: '200px' }}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                minHeight: '150px', 
                maxHeight: '300px',
                overflowY: 'auto',
                bgcolor: '#F9FAFB', 
                borderRadius: '0 0 8px 8px'
              }}
            >
              <Box sx={{ p: 3 }}>
                {liveTranscription ? (
                  <Typography variant="body1">{liveTranscription}</Typography>
                ) : (
                  <Typography variant="body1" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                    Waiting for live transcription...
                  </Typography>
                )}
              </Box>
            </Paper>
          </Box>
        </Box>

        {/* Live Translation */}
        <Box sx={{ 
          mb: 3, 
          borderRadius: 2, 
          bgcolor: 'white',
          boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.06)',
          border: '1px solid #F2F3F5',
          overflow: 'hidden'
        }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            px: { xs: 2, sm: 3 },
            py: 2,
            borderBottom: '1px solid #F2F3F5'
          }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#212B36' }}>
              Live Translation
            </Typography>
          </Box>
          
          <Box sx={{ px: { xs: 2, sm: 3 }, py: 3, minHeight: '200px' }}>
            {eventData?.targetLanguages?.length > 0 ? (
              Object.keys(liveTranslations).length > 0 ? (
                Object.entries(liveTranslations).map(([lang, text]) => (
                  <Box key={lang} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {getFullLanguageName(lang)}:
                    </Typography>
                    <Typography variant="body1">{text}</Typography>
                  </Box>
                ))
              ) : (
                <Typography variant="body1" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                  Waiting for live translation...
                </Typography>
              )
            ) : (
              <Typography sx={{ color: '#637381', fontStyle: 'italic' }}>
                No target languages configured for this event.
              </Typography>
            )}
          </Box>
        </Box>

        {/* Audio Interpretation Toggle */}
        <Box sx={{ 
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          mb: 3,
          ml: { xs: 1, sm: 2 }
        }}>
          <Switch 
            checked={listenAudio}
            onChange={(e) => setListenAudio(e.target.checked)}
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: '#6366f1',
              },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                backgroundColor: '#6366f1',
              },
            }}
          />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 500, color: '#212B36' }}>
              Listen Audio Interpretation
            </Typography>
            <Typography variant="body2" sx={{ color: '#637381' }}>
              Please make sure your headphones are plugged in
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default BroadcastPage; 