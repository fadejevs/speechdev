"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Link from 'next/link';

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
      }
    }
    setLoading(false);
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
    return <Box sx={{ p: 4, textAlign: 'center' }}>Loading event...</Box>;
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
                {transcriptionLanguage}
              </Box>
              
              <Button
                endIcon={<KeyboardArrowDownIcon />}
                onClick={handleTranscriptionMenuOpen}
                sx={{ 
                  color: '#637381',
                  textTransform: 'none',
                  '&:hover': { bgcolor: 'rgba(99, 115, 129, 0.08)' }
                }}
              >
                Change Language
              </Button>
              
              <Menu
                anchorEl={transcriptionMenuAnchor}
                open={Boolean(transcriptionMenuAnchor)}
                onClose={handleTranscriptionMenuClose}
                PaperProps={{
                  sx: { 
                    borderRadius: '8px',
                    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
                    mt: 1
                  }
                }}
              >
                {availableSourceLanguages.map((language) => (
                  <MenuItem 
                    key={language} 
                    onClick={() => handleChangeTranscriptionLanguage(language)}
                    sx={{ 
                      py: 1.5, 
                      px: 2,
                      minWidth: '180px',
                      '&:hover': { bgcolor: 'rgba(99, 115, 129, 0.08)' }
                    }}
                  >
                    {language}
                  </MenuItem>
                ))}
              </Menu>
            </Box>
          </Box>
          
          <Box sx={{ px: { xs: 2, sm: 3 }, py: 3, minHeight: '200px' }}>
            <Typography variant="body1" sx={{ color: '#637381' }}>
              Debitis consequatur et facilis consequatur fugiat fugit nulla quo.
            </Typography>
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
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ 
                bgcolor: '#E5F7FF', 
                color: '#0EA5E9', 
                px: 1.5, 
                py: 0.5, 
                borderRadius: 1,
                fontSize: '14px',
                fontWeight: 500
              }}>
                {translationLanguage}
              </Box>
              
              <Button
                endIcon={<KeyboardArrowDownIcon />}
                onClick={handleTranslationMenuOpen}
                sx={{ 
                  color: '#637381',
                  textTransform: 'none',
                  '&:hover': { bgcolor: 'rgba(99, 115, 129, 0.08)' }
                }}
              >
                Change Language
              </Button>
              
              <Menu
                anchorEl={translationMenuAnchor}
                open={Boolean(translationMenuAnchor)}
                onClose={handleTranslationMenuClose}
                PaperProps={{
                  sx: { 
                    borderRadius: '8px',
                    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
                    mt: 1
                  }
                }}
              >
                {availableTargetLanguages.map((language) => (
                  <MenuItem 
                    key={language} 
                    onClick={() => handleChangeTranslationLanguage(language)}
                    sx={{ 
                      py: 1.5, 
                      px: 2,
                      minWidth: '180px',
                      '&:hover': { bgcolor: 'rgba(99, 115, 129, 0.08)' }
                    }}
                  >
                    {language}
                  </MenuItem>
                ))}
              </Menu>
            </Box>
          </Box>
          
          <Box sx={{ px: { xs: 2, sm: 3 }, py: 3, minHeight: '200px' }}>
            <Typography variant="body1" sx={{ color: '#637381' }}>
              Debitis consequatur et facilis consequatur fugiat fugit nulla quo.
            </Typography>
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