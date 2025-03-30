'use client';

import React, { useState, useEffect } from 'react';
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
  ListItemText
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import MicIcon from '@mui/icons-material/Mic';
import SettingsIcon from '@mui/icons-material/Settings';
import Image from 'next/image';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import SelfieDoodle from '@/images/illustration/SelfieDoodle';
import PlantDoodle from '@/images/illustration/PlantDoodle';

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

const LiveEventPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [languageMenuAnchorEl, setLanguageMenuAnchorEl] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);

  useEffect(() => {
    // Fetch event data from localStorage
    try {
      const savedEvents = localStorage.getItem('eventData');
      if (savedEvents) {
        const events = JSON.parse(savedEvents);
        const event = events.find(e => e.id.toString() === id);
        if (event) {
          setEventData(event);
          // Set the first source language as selected by default
          if (event.sourceLanguages && event.sourceLanguages.length > 0) {
            setSelectedLanguage(event.sourceLanguages[0]);
          }
        } else {
          router.push('/dashboard/analytics');
        }
      }
    } catch (error) {
      console.error('Error fetching event data:', error);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  const handleOpenMenu = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
  };

  const handleOpenLanguageMenu = (event) => {
    setLanguageMenuAnchorEl(event.currentTarget);
  };

  const handleCloseLanguageMenu = () => {
    setLanguageMenuAnchorEl(null);
  };

  const handleChangeInput = (language) => {
    // Logic to change input
    console.log('Changing input for', language);
  };

  const handleBackToEvents = () => {
    router.push('/dashboard/analytics');
  };

  const handleOpenPauseDialog = () => {
    setPauseDialogOpen(true);
  };

  const handleClosePauseDialog = () => {
    setPauseDialogOpen(false);
  };

  const handleConfirmPause = () => {
    // Logic to actually pause the event
    console.log('Event paused');
    setPauseDialogOpen(false);
    // You might want to update the event status in localStorage here
    // and/or redirect to another page
  };

  const handleCompleteEvent = () => {
    // Logic to complete event
    console.log('Completing event');
    router.push('/dashboard/analytics');
  };

  const handleShareEvent = () => {
    // Logic to share event
    console.log('Sharing event');
  };

  if (loading || !eventData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#F9FAFB', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        p: 3,
        borderBottom: '1px solid #E5E8EB'
      }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBackToEvents}
          sx={{ 
            color: '#212B36',
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '14px',
            '&:hover': { bgcolor: 'rgba(33, 43, 54, 0.08)' }
          }}
        >
          Back To Events
        </Button>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={handleOpenPauseDialog}
            sx={{ 
              borderColor: '#E5E8EB',
              color: '#637381',
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 500,
              px: 3,
              py: 0,
              height: '40px',
              fontSize: '14px',
              '&:hover': { 
                borderColor: '#B0B7C3', 
                bgcolor: 'rgba(99, 115, 129, 0.08)',
                color: '#212B36'
              }
            }}
          >
            Pause Event
          </Button>
          
          <Button
            variant="contained"
            onClick={handleCompleteEvent}
            sx={{ 
              bgcolor: '#6366f1',
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 500,
              px: 3,
              py: 0,
              height: '40px',
              fontSize: '14px',
              '&:hover': { bgcolor: '#4338ca' }
            }}
          >
            Complete Event
          </Button>
        </Box>
      </Box>
      
      {/* Main Content */}
      <Box sx={{ maxWidth: '1200px', mx: 'auto', p: 3 }}>
        {/* Event Status Card */}
        <Paper sx={{ 
          borderRadius: '16px', 
          overflow: 'hidden', 
          mb: 3,
          boxShadow: '0px 2px 4px rgba(0,0,0,0.05)'
        }}>
          <Box sx={{ 
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center'
          }}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              mb: 3,
              mt: 4
            }}>
              <Box sx={{ 
                mb: 4,
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
              
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#212B36', mb: 1 }}>
                Your Event Is Live
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mb: 3, maxWidth: '80%' }}>
                Debitis consequatur et facilis consequatur fugiat fugit nulla quo.
              </Typography>
              <Button
                variant="contained"
                onClick={handleShareEvent}
                sx={{
                  bgcolor: '#6366f1',
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 500,
                  px: 3,
                  py: 1,
                  fontSize: '14px',
                  '&:hover': { bgcolor: '#4338ca' }
                }}
              >
                Share Event
              </Button>
            </Box>
          </Box>
        </Paper>
        
        {/* Published Languages Section */}
        <Paper sx={{ 
          borderRadius: '16px', 
          overflow: 'hidden',
          boxShadow: '0px 2px 4px rgba(0,0,0,0.05)'
        }}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#212B36' }}>
              Published languages
            </Typography>
            
            <Typography variant="body2" sx={{ color: '#637381', mb: 3 }}>
              Debitis consequatur et facilis consequatur fugiat fugit nulla quo.
            </Typography>
            
            {/* Language List */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Source Language */}
              {eventData.sourceLanguages.map(langCode => {
                const language = languages.find(l => l.code === langCode)?.name || langCode;
                return (
                  <Box 
                    key={langCode}
                    sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      py: 2,
                      borderBottom: '1px solid #E5E8EB'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 500, color: '#212B36' }}>
                        {language}
                      </Typography>
                      <Chip 
                        label="Source" 
                        size="small"
                        sx={{
                          bgcolor: 'rgba(99, 102, 241, 0.08)',
                          color: '#6366f1',
                          fontWeight: 500,
                          fontSize: '12px',
                          height: '24px',
                          borderRadius: '6px'
                        }}
                      />
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Button
                        variant="text"
                        endIcon={<KeyboardArrowDownIcon />}
                        onClick={handleOpenLanguageMenu}
                        sx={{ 
                          color: '#6366f1',
                          textTransform: 'none',
                          fontWeight: 500,
                          fontSize: '14px',
                          '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.08)' }
                        }}
                      >
                        Change Input
                      </Button>
                      
                      <IconButton
                        onClick={handleOpenMenu}
                        sx={{ ml: 1, color: '#637381' }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Box>
                  </Box>
                );
              })}
              
              {/* Target Languages */}
              {eventData.targetLanguages.map(langCode => {
                const language = languages.find(l => l.code === langCode)?.name || langCode;
                return (
                  <Box 
                    key={langCode}
                    sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      py: 2,
                      borderBottom: '1px solid #E5E8EB'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 500, color: '#212B36' }}>
                        {language}
                      </Typography>
                      <Chip 
                        label="Translation" 
                        size="small"
                        sx={{
                          bgcolor: 'rgba(0, 184, 217, 0.08)',
                          color: '#00B8D9',
                          fontWeight: 500,
                          fontSize: '12px',
                          height: '24px',
                          borderRadius: '6px'
                        }}
                      />
                    </Box>
                    
                    <Box>
                      <IconButton
                        onClick={handleOpenMenu}
                        sx={{ color: '#637381' }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Paper>
      </Box>
      
      {/* Language Menu */}
      <Menu
        anchorEl={languageMenuAnchorEl}
        open={Boolean(languageMenuAnchorEl)}
        onClose={handleCloseLanguageMenu}
        PaperProps={{
          sx: { 
            width: 200, 
            mt: 1, 
            boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.15)',
            borderRadius: '8px'
          }
        }}
      >
        <MenuItem onClick={() => {
          handleChangeInput('microphone');
          handleCloseLanguageMenu();
        }}>
          <ListItemIcon>
            <MicIcon fontSize="small" sx={{ color: '#637381' }} />
          </ListItemIcon>
          <ListItemText 
            primary="Microphone" 
            primaryTypographyProps={{ 
              fontSize: '14px',
              fontWeight: 500
            }}
          />
        </MenuItem>
        <MenuItem onClick={() => {
          handleChangeInput('settings');
          handleCloseLanguageMenu();
        }}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" sx={{ color: '#637381' }} />
          </ListItemIcon>
          <ListItemText 
            primary="Audio Settings" 
            primaryTypographyProps={{ 
              fontSize: '14px',
              fontWeight: 500
            }}
          />
        </MenuItem>
      </Menu>
      
      {/* More Options Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleCloseMenu}
        PaperProps={{
          sx: { 
            width: 200, 
            mt: 1, 
            boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.15)',
            borderRadius: '8px'
          }
        }}
      >
        <MenuItem onClick={handleCloseMenu}>
          <ListItemText 
            primary="Copy Link" 
            primaryTypographyProps={{ 
              fontSize: '14px',
              fontWeight: 500
            }}
          />
        </MenuItem>
        <MenuItem onClick={handleCloseMenu}>
          <ListItemText 
            primary="Settings" 
            primaryTypographyProps={{ 
              fontSize: '14px',
              fontWeight: 500
            }}
          />
        </MenuItem>
      </Menu>
      
      {/* Pause Confirmation Dialog */}
      <Dialog
        open={pauseDialogOpen}
        onClose={handleClosePauseDialog}
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
            flexDirection: 'column',
            alignItems: 'center',
            mb: 2
          }}>
            <Box sx={{ 
              mb: 3,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: 172,
              width: 230,
              position: 'relative'
            }}>
              <PlantDoodle sx={{ 
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                maxWidth: '100%',
                maxHeight: '100%'
              }} />
            </Box>
            
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '18px', color: '#212B36', mb: 1 }}>
              Are you sure you want to pause event?
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={handleClosePauseDialog}
              fullWidth
              sx={{ 
                borderColor: '#E5E8EB',
                color: '#637381',
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 500,
                py: 1,
                height: '40px',
                fontSize: '14px',
                '&:hover': { 
                  borderColor: '#B0B7C3', 
                  bgcolor: 'rgba(99, 115, 129, 0.08)',
                  color: '#212B36'
                }
              }}
            >
              Discard
            </Button>
            
            <Button
              variant="contained"
              onClick={handleConfirmPause}
              fullWidth
              sx={{ 
                bgcolor: '#6366f1',
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 500,
                py: 1,
                height: '40px',
                fontSize: '14px',
                '&:hover': { bgcolor: '#4338ca' }
              }}
            >
              Pause
            </Button>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
};

export default LiveEventPage; 