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
import { formatForSpeechRecognition, formatForTranslationTarget } from '@/utils/languageUtils';
import ListItemButton from '@mui/material/ListItemButton';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import { DEEPL_LANGUAGES } from '@/utils/deeplLanguages';

const languages = DEEPL_LANGUAGES.map(l => ({
  code: l.deepl, // Use DeepL code as primary for consistency
  name: l.name,
  deepl: l.deepl,
  azure: l.azure,
}));

const getLanguageName = (code) => {
  // First try to find by exact code match
  const found = languages.find(
    l => l.code === code || l.deepl === code || l.azure === code
  );
  if (found) return found.name;
  
  // If not found and it's a formatted code, try to reverse-map it
  if (code) {
    // Handle DeepL formatted codes
    const deeplLanguage = DEEPL_LANGUAGES.find(l => l.deepl === code);
    if (deeplLanguage) return deeplLanguage.name;
    
    // Handle Azure formatted codes
    const azureLanguage = DEEPL_LANGUAGES.find(l => l.azure === code);
    if (azureLanguage) return azureLanguage.name;
    
    // Handle common cases where formatted codes need mapping back
    const codeMap = {
      'EN': 'English',
      'EN-US': 'English (American)',
      'EN-GB': 'English (British)',
      'DE': 'German',
      'FR': 'French',
      'ES': 'Spanish',
      'IT': 'Italian',
      'NL': 'Dutch',
      'PL': 'Polish',
      'PT': 'Portuguese',
      'PT-BR': 'Portuguese (Brazilian)', 
      'PT-PT': 'Portuguese (European)',
      'RU': 'Russian',
      'JA': 'Japanese',
      'ZH': 'Chinese',
      'BG': 'Bulgarian',
      'CS': 'Czech',
      'DA': 'Danish',
      'EL': 'Greek',
      'ET': 'Estonian',
      'FI': 'Finnish',
      'HU': 'Hungarian',
      'ID': 'Indonesian',
      'KO': 'Korean',
      'LT': 'Lithuanian',
      'LV': 'Latvian',
      'NB': 'Norwegian Bokmål',
      'RO': 'Romanian',
      'SK': 'Slovak',
      'SL': 'Slovenian',
      'SV': 'Swedish',
      'TR': 'Turkish',
      'UK': 'Ukrainian'
    };
    
    if (codeMap[code]) return codeMap[code];
  }
  
  return code; // fallback to showing the code
};

const GEOAPIFY_API_KEY = "a108fe26f510452dae47978e1619c895"; // <-- Use your real Geoapify API key

const updateEventStatus = async (id, status) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/events?id=eq.${id}`,
    {
      method: "PATCH",
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ status }),
    }
  );
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error);
  }
  const data = await res.json();
  return data[0];
};

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
  const [originalEventData, setOriginalEventData] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [unsavedChangesDialogOpen, setUnsavedChangesDialogOpen] = useState(false);
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
  const [locationOptions, setLocationOptions] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);

  console.log('Event id:', id);

  // Function to compare if event data has changed
  const hasDataChanged = (current, original) => {
    if (!original) return false;
    
    // Helper function to safely format dates
    const formatDate = (date) => {
      if (!date) return null;
      if (typeof date === 'string') return date;
      if (dayjs.isDayjs(date)) return date.format('DD.MM.YYYY');
      return null;
    };

    // Helper function to safely format times
    const formatTime = (time) => {
      if (!time) return null;
      if (typeof time === 'string') return time;
      if (dayjs.isDayjs(time)) return time.format('HH:mm');
      return null;
    };
    
    // Compare all fields that can be edited
    return (
      current.name !== original.name ||
      current.description !== original.description ||
      current.location !== original.location ||
      current.type !== original.type ||
      current.recordEvent !== original.recordEvent ||
      formatDate(current.date) !== original.date ||
      formatTime(current.startTime) !== original.startTime ||
      formatTime(current.endTime) !== original.endTime ||
      JSON.stringify(current.sourceLanguages) !== JSON.stringify(original.sourceLanguages) ||
      JSON.stringify(current.targetLanguages) !== JSON.stringify(original.targetLanguages)
    );
  };

  // Check for unsaved changes whenever eventData changes
  useEffect(() => {
    if (originalEventData) {
      setHasUnsavedChanges(hasDataChanged(eventData, originalEventData));
    }
  }, [eventData, originalEventData]);

  useEffect(() => {
    // Fetch event data from Supabase
    const fetchEvent = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/events?id=eq.${id}&select=*`,
          {
            headers: {
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            },
          }
        );
        const data = await res.json();
        // console.log('Fetched event data:', data);
        if (data && data.length > 0) {
          const event = data[0];
          console.log('Event object:', event);

          // --- Fix type mapping to match Select options ---
          let type = event.type === 'Not specified' ? '' : event.type;
          if (type) {
            if (type.toLowerCase() === 'online') type = 'Online';
            else if (type.toLowerCase() === 'in-person') type = 'In-person';
            else if (type.toLowerCase() === 'hybrid') type = 'Hybrid';
          }

          // --- Fix date parsing for DatePicker ---
          let date = null;
          if (event.timestamp && event.timestamp !== 'Not specified') {
            date = dayjs(event.timestamp);
            if (!date.isValid()) {
              date = dayjs(event.timestamp, 'DD.MM.YYYY');
            }
          }

          const fetchedEventData = {
            name: event.title === 'Not specified' ? '' : event.title,
            description: event.description === 'Not specified' ? '' : event.description,
            location: event.location === 'Not specified' ? '' : event.location,
            date,
            type,
            sourceLanguages: event.sourceLanguages || [],
            targetLanguages: event.targetLanguages || [],
            recordEvent: event.recordEvent ?? false,
            startTime: event.startTime ? dayjs(event.startTime, 'HH:mm') : null,
            endTime: event.endTime ? dayjs(event.endTime, 'HH:mm') : null,
            status: event.status || 'Draft event'
          };

          setEventData(fetchedEventData);
          // Store original data for comparison - convert dayjs to strings for consistent comparison
          const originalData = {
            ...fetchedEventData,
            date: fetchedEventData.date ? fetchedEventData.date.format('DD.MM.YYYY') : null,
            startTime: fetchedEventData.startTime ? fetchedEventData.startTime.format('HH:mm') : null,
            endTime: fetchedEventData.endTime ? fetchedEventData.endTime.format('HH:mm') : null
          };
          setOriginalEventData(originalData);

          console.log('Fetched event:', event);
        }
      } catch (error) {
        console.error('Error fetching event data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
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
    if (action === 'remove') {
      setEventData(prev => ({
        ...prev,
        [field]: prev[field].filter(lang => lang !== language)
      }));
    } else if (action === 'add') {
      // Format the language based on the field
      let formattedLanguage = language;
      if (field === 'sourceLanguages') {
        formattedLanguage = formatForSpeechRecognition(language);
      } else if (field === 'targetLanguages') {
        formattedLanguage = formatForTranslationTarget(language);
      }
      
      setEventData(prev => ({
        ...prev,
        [field]: [...prev[field], formattedLanguage]
      }));
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);

    try {
      // Format all source and target languages as needed
      const formattedSourceLanguages = eventData.sourceLanguages.map(lang =>
        formatForSpeechRecognition(lang)
      );
      const formattedTargetLanguages = eventData.targetLanguages.map(lang =>
        formatForTranslationTarget(lang)
      );

      // --- Fix: Validate startTime and endTime before formatting ---
      const validStartTime =
        eventData.startTime && dayjs(eventData.startTime).isValid()
          ? dayjs(eventData.startTime).format('HH:mm')
          : null;
      const validEndTime =
        eventData.endTime && dayjs(eventData.endTime).isValid()
          ? dayjs(eventData.endTime).format('HH:mm')
          : null;

      // Prepare the update object with snake_case keys for Supabase
      const updateData = {
        title: eventData.name || 'Not specified',
        description: eventData.description || 'Not specified',
        location: eventData.location || 'Not specified',
        timestamp: eventData.date ? eventData.date.format('DD.MM.YYYY') : 'Not specified',
        type: eventData.type || 'Not specified',
        sourceLanguages: formattedSourceLanguages,
        targetLanguages: formattedTargetLanguages,
        recordEvent: eventData.recordEvent ?? false,
        startTime: validStartTime,
        endTime: validEndTime,
        status: eventData.status || 'Draft event'
      };

      // Update the event in Supabase
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/events?id=eq.${id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            Prefer: 'return=representation',
          },
          body: JSON.stringify(updateData),
        }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to update event');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      
      // Update the original data after successful save - convert to same format
      const updatedOriginalData = {
        ...eventData,
        date: eventData.date ? eventData.date.format('DD.MM.YYYY') : null,
        startTime: eventData.startTime ? eventData.startTime.format('HH:mm') : null,
        endTime: eventData.endTime ? eventData.endTime.format('HH:mm') : null
      };
      setOriginalEventData(updatedOriginalData);
      setHasUnsavedChanges(false);
      
    } catch (error) {
      console.error('Error saving event data:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSourceLanguage = (language) => {
    console.log(`Adding source language: ${language}`);
    // Format the language code for speech recognition
    const formattedLanguage = formatForSpeechRecognition(language);
    console.log(`Formatted source language: ${formattedLanguage}`);
    
    setEventData(prev => ({
      ...prev,
      sourceLanguages: [formattedLanguage]
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
    console.log(`Adding language to ${field}: ${language}`);
    
    // Format the language based on the field
    let formattedLanguage = language;
    if (field === 'sourceLanguages') {
      formattedLanguage = formatForSpeechRecognition(language);
      console.log(`Formatted source language: ${formattedLanguage}`);
    } else if (field === 'targetLanguages') {
      formattedLanguage = formatForTranslationTarget(language);
      console.log(`Formatted target language: ${formattedLanguage}`);
    }
    
    setEventData(prev => ({
      ...prev,
      [field]: [...prev[field], formattedLanguage]
    }));
    
    if (field === 'sourceLanguages') {
      handleCloseSourceMenu();
    } else {
      handleCloseTargetMenu();
    }
  };

  const filteredSourceLanguages = languages.filter(lang => 
    lang.name.toLowerCase().includes(languageSearch.toLowerCase())
  );

  const handleOpenShareDialog = () => {
    setShareDialogOpen(true);
  };

  const handleCloseShareDialog = () => {
    setShareDialogOpen(false);
    setCopied(false);
  };

  const handleOpenStartDialog = () => {
    // Check if there are unsaved changes
    if (hasUnsavedChanges) {
      setUnsavedChangesDialogOpen(true);
      return;
    }

    // Format languages before opening the start dialog
    const formattedSourceLanguages = eventData.sourceLanguages.map(lang => 
      formatForSpeechRecognition(lang)
    );
    
    const formattedTargetLanguages = eventData.targetLanguages.map(lang => 
      formatForTranslationTarget(lang)
    );
    
    // Update the event data with formatted languages
    setEventData(prev => ({
      ...prev,
      sourceLanguages: formattedSourceLanguages,
      targetLanguages: formattedTargetLanguages
    }));
    
    setStartDialogOpen(true);
  };

  const handleCloseStartDialog = () => {
    setStartDialogOpen(false);
  };

  const handleSaveAndStart = async () => {
    setUnsavedChangesDialogOpen(false);
    await handleSaveChanges();
    
    // After saving, directly open the start dialog without checking for unsaved changes
    // Format languages before opening the start dialog
    const formattedSourceLanguages = eventData.sourceLanguages.map(lang => 
      formatForSpeechRecognition(lang)
    );
    
    const formattedTargetLanguages = eventData.targetLanguages.map(lang => 
      formatForTranslationTarget(lang)
    );
    
    // Update the event data with formatted languages
    setEventData(prev => ({
      ...prev,
      sourceLanguages: formattedSourceLanguages,
      targetLanguages: formattedTargetLanguages
    }));
    
    // Small delay to ensure save completes and state updates
    setTimeout(() => {
      setStartDialogOpen(true);
    }, 500);
  };

  const handleDiscardAndStart = () => {
    setUnsavedChangesDialogOpen(false);
    // Reset to original data
    setEventData(JSON.parse(JSON.stringify(originalEventData)));
    setHasUnsavedChanges(false);
    // Small delay to ensure state updates
    setTimeout(() => {
      handleOpenStartDialog();
    }, 100);
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

  // Fetch city/country suggestions from Geoapify
  const fetchLocationSuggestions = async (input) => {
    if (!input) {
      setLocationOptions([]);
      return;
    }
    setLocationLoading(true);
    try {
      const res = await fetch(
        `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(input)}&limit=5&type=city&format=json&apiKey=${GEOAPIFY_API_KEY}`
      );
      const data = await res.json();
      setLocationOptions(
        (data.results || []).map((item) => ({
          label: `${item.city || item.name}, ${item.country}`,
          value: `${item.city || item.name}, ${item.country}`,
        }))
      );
    } catch (e) {
      setLocationOptions([]);
    }
    setLocationLoading(false);
  };

  if (loading) {
    return <Box sx={{ p: 4 }}>Loading...</Box>;
  }

  return (
    <Box sx={{ bgcolor: '#', minHeight: '100vh' }}>
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
              variant="contained"
              onClick={handleOpenStartDialog}
              sx={{ 
                bgcolor: hasUnsavedChanges ? '#ff9800' : '#6366f1',
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 500,
                px: 3,
                py: 0,
                height: '40px',
                fontSize: '14px',
                position: 'relative',
                '&:hover': { 
                  bgcolor: hasUnsavedChanges ? '#f57c00' : '#4338ca' 
                },
                ...(hasUnsavedChanges && {
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: '#ff4842',
                    border: '2px solid white',
                    zIndex: 1
                  }
                })
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
                    value={eventData.name || ""}
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
                    value={eventData.description || ""}
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
                  <Autocomplete
                    freeSolo
                    filterOptions={(x) => x}
                    options={locationOptions}
                    loading={locationLoading}
                    value={eventData.location || ""}
                    onInputChange={(_, value) => {
                      setEventData((prev) => ({ ...prev, location: value }));
                      fetchLocationSuggestions(value);
                    }}
                    onChange={(_, value) => {
                      setEventData((prev) => ({
                        ...prev,
                        location: typeof value === "string" ? value : value?.value || "",
                      }));
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        placeholder="Start typing your city..."
                        variant="outlined"
                        size="small"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '8px',
                            height: '40px'
                          }
                        }}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {locationLoading ? <CircularProgress color="inherit" size={16} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: '#637381', fontWeight: 500 }}>
                    Event Date
                  </Typography>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      value={
                        eventData.date && eventData.date !== 'Not specified' && dayjs(eventData.date).isValid()
                          ? dayjs(eventData.date)
                          : null
                      }
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
                        label={getLanguageName(lang)}
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
                        {filteredSourceLanguages.map((language) => (
                          <ListItemButton
                            key={language.code}
                            onClick={() => handleAddSourceLanguage(language.code)}
                            sx={{ 
                              py: 1,
                              '&:hover': { bgcolor: 'rgba(99, 115, 129, 0.08)' }
                            }}
                          >
                            <ListItemText 
                              primary={language.name}
                              sx={{ 
                                '& .MuiListItemText-primary': { 
                                  fontSize: '0.875rem',
                                  fontWeight: 400,
                                  color: '#212B36'
                                }
                              }}
                            />
                          </ListItemButton>
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
                        label={getLanguageName(lang)}
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
                        {languages.filter(lang => 
                          lang.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                          !eventData.targetLanguages.includes(lang.code)
                        ).map((language) => (
                          <ListItemButton
                            key={language.code}
                            onClick={() => handleAddLanguage('targetLanguages', language.code)}
                            sx={{ 
                              py: 1,
                              '&:hover': { bgcolor: 'rgba(99, 115, 129, 0.08)' }
                            }}
                          >
                            <ListItemText 
                              primary={language.name}
                              sx={{ 
                                '& .MuiListItemText-primary': { 
                                  fontSize: '0.875rem',
                                  fontWeight: 400,
                                  color: '#212B36'
                                }
                              }}
                            />
                          </ListItemButton>
                        ))}
                        {languages.filter(lang => 
                          lang.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                          !eventData.targetLanguages.includes(lang.code)
                        ).length === 0 && (
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
                    Record Event Transcripts
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#637381' }}>
                    Enable recording for this event
                  </Typography>
                </Box>
                <Switch
                  checked={eventData.recordEvent}
                  onChange={(e) => setEventData(prev => ({ ...prev, recordEvent: e.target.checked }))}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#fff',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#6366f1',
                      opacity: 1,
                    },
                    '& .MuiSwitch-track': {
                      backgroundColor: '#E5E8EB',
                      opacity: 1,
                    },
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
          onClick={async () => {
            try {
              await updateEventStatus(id, "Live");
              handleCloseStartDialog();
              router.push(`/events/${id}/live`);
            } catch (e) {
              alert("Failed to start event. Please try again.");
              console.error(e);
            }
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

      {/* Unsaved Changes Dialog */}
      <Dialog
        open={unsavedChangesDialogOpen}
        onClose={() => setUnsavedChangesDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            width: '420px',
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
            alignItems: 'flex-start',
            mb: 2
          }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '18px', color: '#212B36', mb: 0.5 }}>
                Unsaved Changes
              </Typography>
              <Typography variant="body2" sx={{ color: '#637381', fontSize: '14px' }}>
                You have unsaved changes to your event settings.
              </Typography>
            </Box>
            <IconButton 
              onClick={() => setUnsavedChangesDialogOpen(false)} 
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
          
          <Typography variant="body2" sx={{ mb: 3, color: '#637381', fontSize: '14px', lineHeight: 1.5 }}>
            Would you like to save your changes before starting the event, or discard them and continue?
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleSaveAndStart}
              disabled={isSaving}
              sx={{
                bgcolor: '#6366f1',
                color: 'white',
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 500,
                py: 1.5,
                fontSize: '14px',
                '&:hover': {
                  bgcolor: '#4338ca'
                },
                '&.Mui-disabled': {
                  bgcolor: '#B0B7C3',
                  color: 'white'
                }
              }}
            >
              {isSaving ? 'Saving...' : 'Save Changes & Start Event'}
            </Button>
            
            <Button
              fullWidth
              variant="outlined"
              onClick={handleDiscardAndStart}
              sx={{
                borderColor: '#E5E8EB',
                color: '#637381',
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 500,
                py: 1.5,
                fontSize: '14px',
                '&:hover': {
                  borderColor: '#B0B7C3',
                  bgcolor: 'rgba(99, 115, 129, 0.08)',
                  color: '#212B36'
                }
              }}
            >
              Discard Changes & Start Event
            </Button>
            
            <Button
              fullWidth
              variant="text"
              onClick={() => setUnsavedChangesDialogOpen(false)}
              sx={{
                color: '#637381',
                textTransform: 'none',
                fontWeight: 500,
                py: 1,
                fontSize: '14px',
                '&:hover': {
                  bgcolor: 'rgba(99, 115, 129, 0.08)',
                  color: '#212B36'
                }
              }}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
};

export default EditEventPage;