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
    const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'https://speechdev.onrender.com';
    socketRef.current = io(socketUrl, {
        transports: ['polling'], // Match server config
        reconnectionAttempts: 5,
        timeout: 10000
    });

    socketRef.current.on('connect', () => {
      console.log('Broadcast WebSocket connected:', socketRef.current.id);
      setSocketConnected(true);
      socketRef.current.emit('join_room', { room_id: id });
      console.log(`Broadcast page attempting to join room: ${id}`);
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('Broadcast WebSocket disconnected:', reason);
      setSocketConnected(false);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Broadcast WebSocket connection error:', error);
      setSocketConnected(false);
    });

    // Add the correct listener
    socketRef.current.on('translation_result', (data) => {
      console.log('Broadcast received translation result:', data);
      
      // Update Live Transcription display
      if (data.original !== undefined) {
        setLiveTranscription(prev => prev ? `${prev} ${data.original}` : data.original);
      }
      if (data.source_language) {
        // Optionally update displayed source language if it changes dynamically
        // setLiveTranscriptionLang(data.source_language); // Uncomment if needed
      }

      // Update Live Translation display
      if (data.translations && data.target_language && data.translations[data.target_language] !== undefined) {
        const translatedText = data.translations[data.target_language];
        setLiveTranslations(prev => ({
          ...prev,
          [data.target_language]: prev[data.target_language]
            ? `${prev[data.target_language]} ${translatedText}`
            : translatedText
        }));
      }
    });

    // Add error listeners too for robustness
    socketRef.current.on('translation_error', (error) => {
        console.error('Broadcast received translation error:', error);
        // Optionally display an error indicator on the broadcast page
    });

    // Add listener for room join confirmation/error
    socketRef.current.on('room_joined', (data) => {
        console.log(`Successfully joined room: ${data.room_id}`);
    });
    socketRef.current.on('error', (error) => { // Listen for generic errors from backend emits
        console.error('Broadcast received server error:', error);
        if (error.message && error.message.includes('Room ID is required')) {
            // Handle specific error if needed
        }
    });

    // Cleanup on component unmount
    return () => {
      if (socketRef.current) {
        console.log('Disconnecting broadcast WebSocket...');
        socketRef.current.disconnect();
      }
    };
  }, [id]);

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
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {liveTranscription || 'Waiting for live transcription...'}
              </Typography>
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
              eventData.targetLanguages.map(langCode => (
                <Box key={langCode} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 500 }}>
                    {getFullLanguageName(langCode)}
                  </Typography>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 2, 
                      minHeight: '100px', 
                      maxHeight: '250px',
                      overflowY: 'auto',
                      bgcolor: '#F9FAFB', 
                      borderRadius: '8px' 
                    }}
                  >
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {liveTranslations[langCode] || 'Waiting for live translation...'}
                    </Typography>
                  </Paper>
                </Box>
              ))
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