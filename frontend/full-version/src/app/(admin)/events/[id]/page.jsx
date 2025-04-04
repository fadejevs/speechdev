'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Paper,
  Divider,
  Select,
  MenuItem,
  Chip,
  Switch,
  FormControl,
  InputLabel,
  OutlinedInput,
  Popover,
  List,
  ListItem,
  ListItemText,
  InputBase,
  InputAdornment
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import dayjs from 'dayjs';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import RefreshIcon from '@mui/icons-material/Refresh';

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

const EditEventPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [eventData, setEventData] = useState({
    name: '',
    description: '',
    location: '',
    date: null,
    type: 'Online',
    sourceLanguages: [],
    targetLanguages: [],
    recordEvent: false
  });
  const [sourceMenuAnchorEl, setSourceMenuAnchorEl] = useState(null);
  const [targetAnchorEl, setTargetAnchorEl] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedAudioInputs, setSelectedAudioInputs] = useState({});
  const [selectedAudioOutputs, setSelectedAudioOutputs] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [languageSearch, setLanguageSearch] = useState('');
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState('');

  useEffect(() => {
    // Fetch event data from localStorage
    try {
      const savedEvents = localStorage.getItem('eventData');
      if (savedEvents) {
        const events = JSON.parse(savedEvents);
        const event = events.find(e => e.id.toString() === id);
        if (event) {
          setEventData({
            name: event.title === 'Not specified' ? '' : event.title,
            description: event.description === 'Not specified' ? '' : event.description,
            location: event.location === 'Not specified' ? '' : event.location,
            date: event.timestamp && event.timestamp !== 'Not specified' ? dayjs(event.timestamp, 'DD.MM.YYYY') : null,
            type: event.type === 'Not specified' ? '' : event.type,
            sourceLanguages: event.sourceLanguages || [],
            targetLanguages: event.targetLanguages || [],
            recordEvent: event.recordEvent || false
          });
        }
      }
    } catch (error) {
      console.error('Error fetching event data:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Function to get audio devices after ensuring we have microphone permission
  const getAudioDevices = async () => {
    try {
      // First request microphone access - this is necessary to see all devices
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Then enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      setAudioInputDevices(audioInputs);
      
      // Set default device if none selected
      if (!selectedAudioInput && audioInputs.length > 0) {
        setSelectedAudioInput(audioInputs[0].deviceId);
      }
    } catch (err) {
      console.error('Error accessing audio devices:', err);
    }
  };

  // Listen for device changes
  useEffect(() => {
    if (startDialogOpen) {
      // Get initial devices
      getAudioDevices();

      // Add device change listener
      const handleDeviceChange = () => {
        getAudioDevices();
      };

      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

      // Cleanup
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      };
    }
  }, [startDialogOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEventData(prev => ({ ...prev, [name]: value }));
  };

  const handleLanguageChange = (field, language, action) => {
    setEventData(prev => {
      if (action === 'add') {
        if (field === 'sourceLanguages') {
          return { 
            ...prev, 
            [field]: [language]
          };
        } else {
          return { 
            ...prev, 
            [field]: [...prev[field], language] 
          };
        }
      } else if (action === 'remove') {
        return { 
          ...prev, 
          [field]: prev[field].filter(lang => lang !== language) 
        };
      }
      return prev;
    });
  };

  const handleSaveChanges = () => {
    setIsSaving(true);
    
    // Save changes to localStorage
    try {
      const savedEvents = localStorage.getItem('eventData');
      const events = savedEvents ? JSON.parse(savedEvents) : [];
      
      const updatedEvents = events.map(event => {
        if (event.id.toString() === id) {
          return {
            ...event,
            title: eventData.name,
            description: eventData.description,
            location: eventData.location,
            timestamp: eventData.date ? eventData.date.format('DD.MM.YYYY') : event.timestamp,
            type: eventData.type || event.type,
            sourceLanguages: eventData.sourceLanguages,
            targetLanguages: eventData.targetLanguages,
            recordEvent: eventData.recordEvent
          };
        }
        return event;
      });
      
      localStorage.setItem('eventData', JSON.stringify(updatedEvents));
      setSaveSuccess(true);
      
      // Reset success message after 2 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Error saving event data:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSourceLanguage = (language) => {
    setEventData(prev => ({
      ...prev,
      sourceLanguages: [language]
    }));
    
    setSourceMenuAnchorEl(null);
  };

  useEffect(() => {
    if (eventData && eventData.sourceLanguages && eventData.sourceLanguages.length > 1) {
      setEventData(prev => ({
        ...prev,
        sourceLanguages: [prev.sourceLanguages[prev.sourceLanguages.length - 1]]
      }));
    }
  }, [eventData?.sourceLanguages]);

  const handleOpenTargetMenu = (event) => {
    setTargetAnchorEl(event.currentTarget);
    setSearchTerm('');
  };

  const handleCloseTargetMenu = () => {
    setTargetAnchorEl(null);
  };

  const handleAddLanguage = (field, language) => {
    setEventData(prev => ({
      ...prev,
      [field]: [...prev[field], language]
    }));
    if (field === 'sourceLanguages') {
      handleCloseSourceMenu();
    } else {
      handleCloseTargetMenu();
    }
  };

  const filteredLanguages = (term) => {
    return languages.filter(lang => 
      lang.name.toLowerCase().includes(term.toLowerCase())
    );
  };

  const handleOpenShareDialog = () => {
    setShareDialogOpen(true);
  };

  const handleCloseShareDialog = () => {
    setShareDialogOpen(false);
    setCopied(false);
  };

  const handleOpenStartDialog = () => {
    setStartDialogOpen(true);
  };

  const handleCloseStartDialog = () => {
    setStartDialogOpen(false);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/broadcast/${id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAudioInputChange = (language, device) => {
    setSelectedAudioInputs(prev => ({
      ...prev,
      [language]: device
    }));
  };

  const handleAudioOutputChange = (language, device) => {
    setSelectedAudioOutputs(prev => ({
      ...prev,
      [language]: device
    }));
  };

  if (loading) {
    return <Box sx={{ p: 4 }}>Loading...</Box>;
  }

  return (
    <Box sx={{ bgcolor: '#F9FAFB', minHeight: '100vh' }}>
      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: '1200px', mx: 'auto' }}>
        {/* Header with back button and action buttons */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 3,
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 0 }
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/dashboard/analytics')}
              sx={{ 
                color: '#637381',
                textTransform: 'none',
                fontWeight: 500,
                '&:hover': { bgcolor: 'rgba(99, 115, 129, 0.08)' }
              }}
            >
              Back To Events
            </Button>
          </Box>
          
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'flex-end',
            gap: 2
          }}>
            <Button
              variant="outlined"
              onClick={handleOpenShareDialog}
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
              Share Event
            </Button>
            
            <Button
              variant="outlined"
              onClick={handleSaveChanges}
              disabled={isSaving}
              startIcon={saveSuccess ? <CheckIcon /> : null}
              sx={{ 
                borderColor: saveSuccess ? '#36B37E' : '#6366f1',
                color: saveSuccess ? '#36B37E' : '#6366f1',
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 500,
                px: 3,
                py: 0,
                height: '40px',
                fontSize: '14px',
                '&:hover': { 
                  borderColor: saveSuccess ? '#36B37E' : '#4338ca', 
                  bgcolor: saveSuccess ? 'rgba(54, 179, 126, 0.08)' : 'rgba(99, 102, 241, 0.08)'
                },
                '&.Mui-disabled': {
                  borderColor: '#E5E8EB',
                  color: '#B0B7C3'
                }
              }}
            >
              {isSaving ? 'Saving...' : (saveSuccess ? 'Saved!' : 'Save Changes')}
            </Button>
            
            <Button
              variant="contained"
              onClick={handleOpenStartDialog}
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
              Start Event
            </Button>
          </Box>
        </Box>
        
        {/* Content Sections */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* General Settings Section */}
          <Paper sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: '0px 2px 4px rgba(0,0,0,0.05)' }}>
            <Box sx={{ p: 3 }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, color: '#212B36' }}>
                  General Settings
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Debitis consequatur et facilis consequatur fugiat fugit nulla quo.
                </Typography>
              </Box>
              
              <Divider sx={{ mx: -3, mb: 3 }} />
              
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: '#637381', fontWeight: 500 }}>
                    Event Name
                  </Typography>
                  <TextField
                    fullWidth
                    name="name"
                    value={eventData.name}
                    onChange={handleChange}
                    placeholder="Demo Event"
                    variant="outlined"
                    size="small"
                    sx={{ 
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '8px',
                        height: '40px'
                      }
                    }}
                  />
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: '#637381', fontWeight: 500 }}>
                    Event Description
                  </Typography>
                  <TextField
                    fullWidth
                    name="description"
                    value={eventData.description}
                    onChange={handleChange}
                    placeholder="My first Demo Event with Real time AI Speech to Speech Translation"
                    variant="outlined"
                    multiline
                    rows={1}
                    size="small"
                    sx={{ 
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '8px',
                        minHeight: '40px'
                      }
                    }}
                  />
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: '#637381', fontWeight: 500 }}>
                    Event Location
                  </Typography>
                  <TextField
                    fullWidth
                    name="location"
                    value={eventData.location}
                    onChange={handleChange}
                    placeholder="G. Zemgala gatve 78, Riga, LV-1039"
                    variant="outlined"
                    size="small"
                    sx={{ 
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '8px',
                        height: '40px'
                      }
                    }}
                  />
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: '#637381', fontWeight: 500 }}>
                    Event Date
                  </Typography>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      value={eventData.date}
                      onChange={(newDate) => setEventData(prev => ({ ...prev, date: newDate }))}
                      format="DD.MM.YYYY"
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: "small",
                          sx: { 
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '8px',
                              height: '40px'
                            }
                          }
                        }
                      }}
                    />
                  </LocalizationProvider>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: '#637381', fontWeight: 500 }}>
                    Event Type
                  </Typography>
                  <Select
                    fullWidth
                    name="type"
                    value={eventData.type}
                    onChange={handleChange}
                    size="small"
                    sx={{ 
                      borderRadius: '8px',
                      height: '40px',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderRadius: '8px',
                      }
                    }}
                    IconComponent={KeyboardArrowDownIcon}
                  >
                    <MenuItem value="Online">Online</MenuItem>
                    <MenuItem value="In-person">In-person</MenuItem>
                    <MenuItem value="Hybrid">Hybrid</MenuItem>
                  </Select>
                </Box>
              </Box>
            </Box>
          </Paper>
          
          {/* Language Settings Section */}
          <Paper sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: '0px 2px 4px rgba(0,0,0,0.05)' }}>
            <Box sx={{ p: 3 }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, color: '#212B36' }}>
                  Language Settings
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Debitis consequatur et facilis consequatur fugiat fugit nulla quo.
                </Typography>
              </Box>
              
              <Divider sx={{ mx: -3, mb: 3 }} />
              
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: '#637381', fontWeight: 500 }}>
                    Selected Source Language
                  </Typography>
                  <Box sx={{ 
                    border: '1px solid #e0e0e0', 
                    borderRadius: '8px', 
                    p: 1.5, 
                    minHeight: '40px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 0.75,
                    position: 'relative'
                  }}>
                    {eventData.sourceLanguages.map(lang => (
                      <Chip
                        key={lang}
                        label={languages.find(l => l.code === lang)?.name || lang}
                        onDelete={() => handleLanguageChange('sourceLanguages', lang, 'remove')}
                        deleteIcon={<CloseIcon style={{ fontSize: '16px' }} />}
                        size="small"
                        sx={{
                          borderRadius: '6px',
                          height: '28px',
                          bgcolor: 'rgba(99, 102, 241, 0.08)',
                          color: '#6366f1',
                          border: 'none',
                          '& .MuiChip-label': {
                            px: 1,
                            py: 0.25,
                            fontSize: '13px',
                            fontWeight: 500
                          },
                          '& .MuiChip-deleteIcon': {
                            color: '#6366f1',
                            '&:hover': {
                              color: '#4338ca'
                            }
                          }
                        }}
                      />
                    ))}
                    {eventData.sourceLanguages.length === 0 && (
                      <Typography sx={{ color: '#637381', fontSize: '14px' }}>
                        No source languages selected
                      </Typography>
                    )}
                    <IconButton 
                      size="small" 
                      onClick={(event) => setSourceMenuAnchorEl(event.currentTarget)}
                      sx={{ 
                        ml: 'auto', 
                        color: '#6366f1',
                        '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.08)' }
                      }}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  
                  <Popover
                    open={Boolean(sourceMenuAnchorEl)}
                    anchorEl={sourceMenuAnchorEl}
                    onClose={() => setSourceMenuAnchorEl(null)}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'left',
                    }}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'left',
                    }}
                  >
                    <Box sx={{ p: 2, width: 250 }}>
                      <Box sx={{ mb: 2 }}>
                        <TextField
                          placeholder="Search language"
                          size="small"
                          fullWidth
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                              </InputAdornment>
                            ),
                          }}
                          onChange={(e) => setLanguageSearch(e.target.value)}
                          value={languageSearch}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '8px',
                            }
                          }}
                        />
                      </Box>
                      
                      <List sx={{ pt: 0 }}>
                        {languages
                          .filter(lang => !eventData.sourceLanguages.includes(lang.code) && 
                            lang.name.toLowerCase().includes(languageSearch.toLowerCase()))
                          .map(lang => (
                            <ListItem 
                              button 
                              key={lang.code} 
                              onClick={() => handleAddSourceLanguage(lang.code)}
                              sx={{ borderRadius: 1 }}
                            >
                              <ListItemText primary={lang.name} />
                            </ListItem>
                          ))}
                      </List>
                    </Box>
                  </Popover>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: '#637381', fontWeight: 500 }}>
                    Selected Target Language
                  </Typography>
                  <Box sx={{ 
                    border: '1px solid #e0e0e0', 
                    borderRadius: '8px', 
                    p: 1.5, 
                    minHeight: '40px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 0.75,
                    position: 'relative'
                  }}>
                    {eventData.targetLanguages.map(lang => (
                      <Chip
                        key={lang}
                        label={languages.find(l => l.code === lang)?.name || lang}
                        onDelete={() => handleLanguageChange('targetLanguages', lang, 'remove')}
                        deleteIcon={<CloseIcon style={{ fontSize: '16px' }} />}
                        size="small"
                        sx={{
                          borderRadius: '6px',
                          height: '28px',
                          bgcolor: 'rgba(99, 102, 241, 0.08)',
                          color: '#6366f1',
                          border: 'none',
                          '& .MuiChip-label': {
                            px: 1,
                            py: 0.25,
                            fontSize: '13px',
                            fontWeight: 500
                          },
                          '& .MuiChip-deleteIcon': {
                            color: '#6366f1',
                            '&:hover': {
                              color: '#4338ca'
                            }
                          }
                        }}
                      />
                    ))}
                    {eventData.targetLanguages.length === 0 && (
                      <Typography sx={{ color: '#637381', fontSize: '14px' }}>
                        No target languages selected
                      </Typography>
                    )}
                    <IconButton 
                      size="small" 
                      onClick={handleOpenTargetMenu}
                      sx={{ 
                        ml: 'auto', 
                        color: '#6366f1',
                        '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.08)' }
                      }}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  
                  <Popover
                    open={Boolean(targetAnchorEl)}
                    anchorEl={targetAnchorEl}
                    onClose={handleCloseTargetMenu}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'left',
                    }}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'left',
                    }}
                    PaperProps={{
                      sx: { 
                        width: 250, 
                        mt: 1, 
                        boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.15)',
                        borderRadius: '8px'
                      }
                    }}
                  >
                    <Box sx={{ p: 2 }}>
                      <InputBase
                        placeholder="Search languages..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        fullWidth
                        startAdornment={
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" sx={{ color: '#637381' }} />
                          </InputAdornment>
                        }
                        sx={{ 
                          mb: 1, 
                          p: 1, 
                          bgcolor: '#F4F6F8', 
                          borderRadius: '8px',
                          '& .MuiInputBase-input': {
                            fontSize: '14px'
                          }
                        }}
                      />
                      <List sx={{ maxHeight: 250, overflow: 'auto', py: 0 }}>
                        {filteredLanguages(searchTerm).map(lang => {
                          const isSelected = eventData.targetLanguages.includes(lang.code);
                          const isSourceLanguage = eventData.sourceLanguages.includes(lang.code);
                          
                          return (
                            <ListItem 
                              key={lang.code} 
                              button 
                              onClick={() => !isSelected && !isSourceLanguage && handleAddLanguage('targetLanguages', lang.code)}
                              sx={{ 
                                borderRadius: '6px',
                                py: 0.75,
                                opacity: isSelected || isSourceLanguage ? 0.5 : 1,
                                pointerEvents: isSelected || isSourceLanguage ? 'none' : 'auto',
                                bgcolor: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                                '&:hover': { 
                                  bgcolor: isSelected || isSourceLanguage ? 
                                    (isSelected ? 'rgba(99, 102, 241, 0.08)' : 'transparent') : 
                                    'rgba(99, 102, 241, 0.08)' 
                                }
                              }}
                            >
                              <ListItemText 
                                primary={lang.name} 
                                primaryTypographyProps={{ 
                                  fontSize: '14px',
                                  fontWeight: 500,
                                  color: isSelected ? '#6366f1' : (isSourceLanguage ? '#637381' : '#212B36')
                                }}
                              />
                              {isSelected && (
                                <Box 
                                  component="span" 
                                  sx={{ 
                                    ml: 1, 
                                    color: '#6366f1',
                                    fontSize: '12px',
                                    fontWeight: 500
                                  }}
                                >
                                  (Target)
                                </Box>
                              )}
                              {isSourceLanguage && (
                                <Box 
                                  component="span" 
                                  sx={{ 
                                    ml: 1, 
                                    color: '#637381',
                                    fontSize: '12px',
                                    fontWeight: 500
                                  }}
                                >
                                  (Source)
                                </Box>
                              )}
                            </ListItem>
                          );
                        })}
                        {filteredLanguages(searchTerm).length === 0 && (
                          <ListItem sx={{ py: 1 }}>
                            <ListItemText 
                              primary="No languages found" 
                              primaryTypographyProps={{ 
                                fontSize: '14px',
                                color: '#637381',
                                textAlign: 'center'
                              }}
                            />
                          </ListItem>
                        )}
                      </List>
                    </Box>
                  </Popover>
                </Box>
              </Box>
            </Box>
          </Paper>
          
          {/* Features Section */}
          <Paper sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: '0px 2px 4px rgba(0,0,0,0.05)' }}>
            <Box sx={{ p: 3 }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, color: '#212B36' }}>
                  Features
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Debitis consequatur et facilis consequatur fugiat fugit nulla quo.
                </Typography>
              </Box>
              
              <Divider sx={{ mx: -3, mb: 3 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 500, color: '#212B36', mb: 0.5 }}>
                    Record Event
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#637381' }}>
                    Enable recording for this event
                  </Typography>
                </Box>
                <Switch
                  checked={eventData.recordEvent}
                  onChange={(e) => setEventData(prev => ({ ...prev, recordEvent: e.target.checked }))}
                  disabled={true}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#6366f1',
                      '&:hover': {
                        backgroundColor: 'rgba(99, 102, 241, 0.08)',
                      },
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#6366f1',
                    },
                    '& .Mui-disabled': {
                      opacity: 0.5,
                    }
                  }}
                />
              </Box>
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Share Event Dialog */}
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
            This is a hint text to help user.
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

      {/* Start Event Dialog */}
      <Dialog 
        open={startDialogOpen} 
        onClose={handleCloseStartDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            p: 3
          }
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#212B36', mb: 0.5 }}>
              Start Event
            </Typography>
            <Typography variant="body2" sx={{ color: '#637381' }}>
              Tempora ut inventore accusamus sed sed deleniti.
            </Typography>
          </Box>
          <IconButton onClick={handleCloseStartDialog} sx={{ color: '#637381' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Typography variant="body2" sx={{ color: '#637381', mb: 1, fontSize: '12px' }}>
          This is a hint text to help user.
        </Typography>

        {/* Audio Input Selection */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 1 
          }}>
            <Typography variant="subtitle2" sx={{ color: '#212B36' }}>
              Select Source You Would Like to Record
            </Typography>
            {/* Add refresh button */}
            <IconButton 
              onClick={getAudioDevices}
              size="small"
              sx={{ 
                color: '#637381',
                '&:hover': { bgcolor: 'rgba(99, 115, 129, 0.08)' }
              }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Box>
          <Select
            fullWidth
            value={selectedAudioInput}
            onChange={(e) => setSelectedAudioInput(e.target.value)}
            displayEmpty
            sx={{ 
              borderRadius: '8px',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#E5E8EB'
              }
            }}
          >
            <MenuItem disabled value="">
              <Typography sx={{ color: '#637381' }}>Select audio input</Typography>
            </MenuItem>
            {audioInputDevices.map(device => (
              <MenuItem 
                key={device.deviceId} 
                value={device.deviceId}
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  py: 1.5
                }}
              >
                <span>{device.label || `Microphone ${device.deviceId.slice(0, 5)}...`}</span>
                <Typography variant="body2" sx={{ color: '#637381' }}>
                  {device.label.toLowerCase().includes('built-in') ? 'Built-in' : 'External'}
                </Typography>
              </MenuItem>
            ))}
          </Select>
        </Box>

        {/* Meeting Link Input - Grayed out */}
        <Box sx={{ mb: 3, opacity: 0.5, pointerEvents: 'none' }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: '#212B36' }}>
            Or Paste Your Meeting Link
          </Typography>
          <TextField
            fullWidth
            placeholder="Enter feature name e.g. API"
            disabled
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
              }
            }}
          />
          <Typography variant="caption" sx={{ color: '#637381', mt: 0.5, display: 'block' }}>
            Supports Google Meets, Zoom, MS Teams, Youtube, Cisco...
          </Typography>
        </Box>

        <Button
          fullWidth
          variant="contained"
          onClick={() => {
            handleCloseStartDialog();
            router.push(`/events/${id}/live`);
          }}
          sx={{
            bgcolor: '#6366f1',
            color: 'white',
            borderRadius: '8px',
            textTransform: 'none',
            py: 1,
            '&:hover': {
              bgcolor: '#4338ca'
            }
          }}
        >
          Start Broadcast
        </Button>
      </Dialog>
    </Box>
  );
};

export default EditEventPage;