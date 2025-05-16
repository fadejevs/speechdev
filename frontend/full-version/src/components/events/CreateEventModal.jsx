import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Select,
  MenuItem,
  Switch,
  IconButton,
  Chip,
  OutlinedInput,
  FormControl,
  Checkbox,
  ListItemText,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import CancelIcon from '@mui/icons-material/Cancel';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import PlantDoodle from '@/images/illustration/PlantDoodle';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { DemoContainer } from '@mui/x-date-pickers/internals/demo';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import { generateUniqueId } from '@/utils/idGenerator';
import Autocomplete from '@mui/material/Autocomplete';
import { DEEPL_LANGUAGES } from '@/utils/deeplLanguages';

const LANGUAGES = DEEPL_LANGUAGES.map(l => ({
  value: l.azure || l.deepl, // Use Azure code if available, fallback to DeepL code
  name: l.name,
  deepl: l.deepl,
  azure: l.azure,
}));

const EVENT_TYPES = [
  { value: 'online', label: 'Online' },
  { value: 'onsite', label: 'On-site' },
  { value: 'hybrid', label: 'Hybrid' }
];

const EVENT_STATUSES = [
  { value: 'Draft event', label: 'Draft event' },
  { value: 'Scheduled', label: 'Scheduled' },
  { value: 'Completed', label: 'Completed' }
];

const LOCATIONS = [
  { value: 'Riga', label: 'Riga' },
  { value: 'Vilnius', label: 'Vilnius' },
  { value: 'Tallinn', label: 'Tallinn' },
  { value: 'Berlin', label: 'Berlin' },
  { value: 'London', label: 'London' },
  { value: 'Online', label: 'Online' },
  // ...add more cities as needed...
];

const getLanguageName = (code) => {
  const found = DEEPL_LANGUAGES.find(
    l => l.azure === code || l.deepl === code || l.deepl === code?.toUpperCase()
  );
  return found ? found.name : code;
};

const GEOAPIFY_API_KEY = "a108fe26f510452dae47978e1619c895";

const CreateEventModal = ({ 
  open, 
  handleClose, 
  handleCreate, 
  initialData = null,
  isEditing = false 
}) => {
  const [eventData, setEventData] = useState({
    name: '',
    description: '',
    location: '',
    date: dayjs(),
    startTime: null,
    endTime: null,
    sourceLanguages: [],
    targetLanguages: [],
    eventType: '',
    recordEvent: false,
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredLanguages, setFilteredLanguages] = useState(LANGUAGES);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarRef = useRef(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [locationOptions, setLocationOptions] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    if (open && initialData) {
      setEventData({
        name: initialData.name || '',
        description: initialData.description || '',
        location: initialData.location || '',
        date: initialData.date ? dayjs(initialData.date) : null,
        startTime: initialData.startTime ? dayjs(initialData.startTime, 'HH:mm') : null,
        endTime: initialData.endTime ? dayjs(initialData.endTime, 'HH:mm') : null,
        sourceLanguages: initialData.sourceLanguages || [],
        targetLanguages: initialData.targetLanguages || [],
        eventType: initialData.eventType || '',
        recordEvent: initialData.recordEvent || false,
        status: initialData.status || 'Draft event'
      });
    } else if (!open) {
      setEventData({
        name: '',
        description: '',
        location: '',
        date: dayjs(),
        startTime: null,
        endTime: null,
        sourceLanguages: [],
        targetLanguages: [],
        eventType: '',
        recordEvent: false,
      });
      setSearchTerm('');
    }
  }, [open, initialData]);

  useEffect(() => {
    setFilteredLanguages(
      LANGUAGES.filter(lang => 
        lang.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [searchTerm]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setEventData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleDateChange = useCallback((newDate) => {
    setEventData(prev => ({ ...prev, date: newDate }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Create a properly formatted event object
    const newEvent = {
      title: eventData.name || 'Not specified',
      description: eventData.description || 'Not specified',
      location: eventData.location || 'Not specified',
      timestamp: eventData.date ? eventData.date.format('DD.MM.YYYY') : 'Not specified',
      type: eventData.eventType || 'Not specified',
      sourceLanguages: eventData.sourceLanguages || [],
      targetLanguages: eventData.targetLanguages || [],
      recordEvent: eventData.recordEvent,
      status: eventData.status || "Scheduled", // Use the status from eventData, fallback to "Scheduled"
      startTime: eventData.startTime ? eventData.startTime.format('HH:mm') : null,
      endTime: eventData.endTime ? eventData.endTime.format('HH:mm') : null
    };

    // Call the parent handler (which will save to Supabase)
    handleCreate(newEvent);
    handleClose();
  };

  const handleLanguageToggle = (language, field) => {
    setEventData(prev => {
      // For source languages, replace existing selection with the new language
      if (field === 'sourceLanguages') {
        return { ...prev, [field]: [language.value] };
      } 
      // For target languages, keep the existing toggle behavior
      else {
        const currentLanguages = [...prev[field]];
        const languageIndex = currentLanguages.indexOf(language.value);
        
        if (languageIndex === -1) {
          currentLanguages.push(language.value);
        } else {
          currentLanguages.splice(languageIndex, 1);
        }
        
        return { ...prev, [field]: currentLanguages };
      }
    });
  };

  const handleDeleteLanguage = (language, field) => {
    setEventData(prev => {
      // For source languages, only remove if more than one (which shouldn't happen)
      // or allow complete removal if needed
      if (field === 'sourceLanguages' && prev[field].length <= 1) {
        return { ...prev, [field]: [] };
      } else {
        const currentLanguages = [...prev[field]];
        const languageIndex = currentLanguages.indexOf(language.value);
        
        if (languageIndex !== -1) {
          currentLanguages.splice(languageIndex, 1);
        }
        
        return { ...prev, [field]: currentLanguages };
      }
    });
  };

  const handleCloseWithConfirmation = () => {
    const isFormModified = 
      eventData.name !== '' || 
      eventData.description !== '' || 
      eventData.location !== '' || 
      eventData.date !== null || 
      eventData.sourceLanguages.length > 0 || 
      eventData.targetLanguages.length > 0 || 
      eventData.eventType !== '' || 
      eventData.recordEvent !== false ||
      eventData.status !== 'Draft event';
    
    if (isFormModified) {
      setConfirmDialogOpen(true);
    } else {
      handleClose();
    }
  };
  
  const handleDiscard = () => {
    setConfirmDialogOpen(false);
    handleClose();
  };
  
  const handleSaveAsDraft = () => {
    const draftEvent = {
      title: eventData.name || '',
      description: eventData.description || '',
      location: eventData.location || '',
      timestamp: eventData.date ? eventData.date.format('DD.MM.YYYY') : '',
      type: eventData.eventType || '',
      sourceLanguages: eventData.sourceLanguages || [],
      targetLanguages: eventData.targetLanguages || [],
      recordEvent: eventData.recordEvent || false,
      status: 'Draft event',
      startTime: eventData.startTime ? eventData.startTime.format('HH:mm') : null,
      endTime: eventData.endTime ? eventData.endTime.format('HH:mm') : null
    };
    handleCreate(draftEvent);
    setConfirmDialogOpen(false);
    handleClose();
  };

  const renderLanguageSelector = (field, label, dropdownKey) => {
    const dropdownOpen = openDropdown === dropdownKey;
    
    return (
      <Box sx={{ mb: 2, position: 'relative' }}>
        <Typography variant="body2" sx={{ mb: 1, color: '#637381' }}>{label}<span style={{ color: 'red' }}>*</span></Typography>
        
        <Box 
          onClick={() => setOpenDropdown(dropdownOpen ? null : dropdownKey)}
          sx={{ 
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            px: 1.5,
            py: 0.75,
            minHeight: '38px',
            height: '38px',
            cursor: 'pointer',
            display: 'flex',
            flexWrap: 'nowrap',
            gap: 0.5,
            alignItems: 'center',
            overflow: 'hidden'
          }}
        >
          {eventData[field].length === 0 ? (
            <Typography sx={{ color: '#637381', fontSize: '14px' }}>Select {label}</Typography>
          ) : (
            <Box sx={{ 
              display: 'flex', 
              flexWrap: 'nowrap', 
              gap: 0.5, 
              alignItems: 'center',
              maxWidth: 'calc(100% - 30px)',
              overflow: 'hidden'
            }}>
              {eventData[field].map((lang, index) => (
                <Chip
                  key={lang}
                  label={getLanguageName(lang)}
                  {...(field === 'targetLanguages'
                    ? {
                        deleteIcon: <CloseIcon style={{ fontSize: '16px' }} />,
                        onDelete: () => {
                          const languageObj = LANGUAGES.find(l => l.value === lang);
                          if (languageObj) handleDeleteLanguage(languageObj, field);
                        }
                      }
                    : {})}
                  size="small"
                  sx={{
                    borderRadius: '4px',
                    height: '24px',
                    bgcolor: 'transparent',
                    border: field === 'sourceLanguages' ? 'none' : '1px solid #e0e0e0',
                    color: '#333',
                    '& .MuiChip-label': {
                      px: 1,
                      py: 0.25,
                      fontSize: '13px'
                    },
                    '& .MuiChip-deleteIcon': {
                      color: '#666',
                      marginRight: '4px',
                      '&:hover': {
                        color: '#333'
                      }
                    }
                  }}
                />
              ))}
            </Box>
          )}
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
            <IconButton 
              size="small" 
              onClick={(e) => {
                e.stopPropagation();
                setOpenDropdown(dropdownOpen ? null : dropdownKey);
              }}
              sx={{ padding: 0 }}
            >
              {dropdownOpen ? 
                <KeyboardArrowUpIcon fontSize="small" /> : 
                <KeyboardArrowDownIcon fontSize="small" />
              }
            </IconButton>
          </Box>
        </Box>
        
        {dropdownOpen && (
          <Box
            sx={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              mt: 0.5,
              bgcolor: 'white',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              zIndex: 1000,
              maxHeight: '250px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Box sx={{ p: 1, borderBottom: '1px solid #f0f0f0' }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search Language"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: '#637381' }} />
                    </InputAdornment>
                  ),
                  sx: {
                    borderRadius: '4px',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#e0e0e0'
                    }
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </Box>
            
            <Box sx={{ overflow: 'auto', maxHeight: '200px' }}>
              {filteredLanguages.map((language) => (
                <Box
                  key={language.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLanguageToggle(language, field);
                    setOpenDropdown(false);
                  }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    px: 2,
                    py: 1,
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: '#f5f5f5'
                    }
                  }}
                >
                  <Checkbox
                    checked={eventData[field].includes(language.value)}
                    onChange={(event) => {
                      event.stopPropagation();
                      handleLanguageToggle(language, field);
                      setOpenDropdown(false);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    sx={{ 
                      color: '#4f46e5',
                      '&.Mui-checked': {
                        color: '#4f46e5'
                      },
                      padding: '4px',
                      marginRight: '8px'
                    }}
                  />
                  <Typography variant="body2">{language.name}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    );
  };

  const renderEventTypeSelector = (dropdownKey) => {
    const dropdownOpen = openDropdown === dropdownKey;
    
    return (
      <Box sx={{ mb: 2, position: 'relative' }}>
        <Typography variant="body2" sx={{ mb: 1, color: '#637381' }}>Select Event Type<span style={{ color: 'red' }}>*</span></Typography>
        
        <Box 
          onClick={() => setOpenDropdown(dropdownOpen ? null : dropdownKey)}
          sx={{ 
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            px: 1.5,
            py: 0.75,
            minHeight: '38px',
            height: '38px',
            cursor: 'pointer',
            display: 'flex',
            flexWrap: 'nowrap',
            gap: 0.5,
            alignItems: 'center',
            overflow: 'hidden'
          }}
        >
          {!eventData.eventType ? (
            <Typography sx={{ color: '#637381', fontSize: '14px' }}>Select Event Type</Typography>
          ) : (
            <Box sx={{ 
              display: 'flex', 
              flexWrap: 'nowrap', 
              gap: 0.5, 
              alignItems: 'center',
              maxWidth: 'calc(100% - 30px)',
              overflow: 'hidden'
            }}>
              <Chip
                label={EVENT_TYPES.find(type => type.value === eventData.eventType)?.label}
                deleteIcon={<CloseIcon style={{ fontSize: '16px' }} />}
                onDelete={() => setEventData(prev => ({ ...prev, eventType: '' }))}
                size="small"
                sx={{
                  borderRadius: '4px',
                  height: '24px',
                  bgcolor: 'transparent',
                  border: '1px solid #e0e0e0',
                  color: '#333',
                  '& .MuiChip-label': {
                    px: 1,
                    py: 0.25,
                    fontSize: '13px'
                  },
                  '& .MuiChip-deleteIcon': {
                    color: '#666',
                    marginRight: '4px',
                    '&:hover': {
                      color: '#333'
                    }
                  }
                }}
              />
            </Box>
          )}
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
            <IconButton 
              size="small" 
              onClick={(e) => {
                e.stopPropagation();
                setOpenDropdown(dropdownOpen ? null : dropdownKey);
              }}
              sx={{ padding: 0 }}
            >
              {dropdownOpen ? 
                <KeyboardArrowUpIcon fontSize="small" /> : 
                <KeyboardArrowDownIcon fontSize="small" />
              }
            </IconButton>
          </Box>
        </Box>
        
        {dropdownOpen && (
          <Box
            sx={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              mt: 0.5,
              bgcolor: 'white',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              zIndex: 1000,
              maxHeight: '250px',
              overflow: 'auto'
            }}
          >
            {EVENT_TYPES.map((type) => (
              <Box
                key={type.value}
                onClick={(e) => {
                  e.stopPropagation();
                  setEventData(prev => ({ ...prev, eventType: type.value }));
                  setOpenDropdown(false);
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 2,
                  py: 1,
                  cursor: 'pointer',
                  bgcolor: eventData.eventType === type.value ? '#f5f5ff' : 'transparent',
                  '&:hover': {
                    bgcolor: '#f5f5f5'
                  }
                }}
              >
                <Checkbox
                  checked={eventData.eventType === type.value}
                  onChange={(event) => {
                    event.stopPropagation();
                    setEventData(prev => ({ ...prev, eventType: type.value }));
                  }}
                  onClick={(e) => e.stopPropagation()}
                  sx={{ 
                    color: '#4f46e5',
                    '&.Mui-checked': {
                      color: '#4f46e5'
                    },
                    padding: '4px',
                    marginRight: '8px'
                  }}
                />
                <Typography variant="body2">{type.label}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  const isFormValid = () => {
    return (
      eventData.name.trim() !== '' &&
      eventData.date !== null &&
      eventData.startTime !== null &&
      eventData.endTime !== null &&
      eventData.eventType !== '' &&
      eventData.sourceLanguages.length > 0 &&
      eventData.targetLanguages.length > 0
    );
  };

  const daysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getMonthName = (month) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month];
  };

  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDateSelect = (day) => {
    const selectedDate = `${day < 10 ? '0' + day : day}.${(currentMonth + 1) < 10 ? '0' + (currentMonth + 1) : (currentMonth + 1)}.${currentYear}`;
    setEventData(prev => ({ ...prev, date: dayjs(selectedDate) }));
    setShowCalendar(false);
  };

  // Fetch city/country suggestions from Geoapify
  const fetchLocationSuggestions = useCallback(async (input) => {
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
  }, []);

  return (
    <>
      <Dialog 
        open={open} 
        onClose={handleCloseWithConfirmation}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '8px',
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
            width: '550px',
            maxWidth: '100%'
          }
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          p: 2, 
          borderBottom: '1px solid #f0f0f0',
          position: 'relative'
        }}>
          <Typography variant="h6" sx={{ fontWeight: 500, fontSize: '1rem' }}>
            {isEditing ? 'Edit Event' : 'Create New Event'}
          </Typography>
          <IconButton 
            onClick={handleCloseWithConfirmation} 
            size="small"
            sx={{ position: 'absolute', right: 16 }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
        
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="500" sx={{ mb: 2 }}>
              General Information
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, color: '#637381' }}>Event Name<span style={{ color: 'red' }}>*</span></Typography>
              <TextField
                fullWidth
                name="name"
                value={eventData.name}
                onChange={handleInputChange}
                placeholder="Demo Event"
                size="small"
                variant="outlined"
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    '& fieldset': {
                      borderColor: '#e0e0e0'
                    }
                  }
                }}
              />
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, color: '#637381' }}>Description</Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                name="description"
                value={eventData.description}
                onChange={handleInputChange}
                placeholder="My first Demo Event with Real time AI Speech to Speech Translation"
                size="small"
                variant="outlined"
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    '& fieldset': {
                      borderColor: '#e0e0e0'
                    }
                  }
                }}
              />
            </Box>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, color: '#637381' }}>
                Event Location<span style={{ color: 'red' }}>*</span>
              </Typography>
              <Autocomplete
                freeSolo
                filterOptions={(x) => x} // Don't filter client-side
                options={locationOptions}
                loading={locationLoading}
                value={eventData.location}
                onInputChange={(_, newInputValue) => {
                  setEventData((prev) => ({
                    ...prev,
                    location: newInputValue
                  }));
                  fetchLocationSuggestions(newInputValue);
                }}
                onChange={(_, newValue) => {
                  setEventData((prev) => ({
                    ...prev,
                    location: typeof newValue === "string" ? newValue : (newValue?.value || "")
                  }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    name="location"
                    placeholder="Start typing your city..."
                    size="small"
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '8px',
                        '& fieldset': {
                          borderColor: '#e0e0e0'
                        }
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
            
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <Box sx={{ mb: 2 }}>
                <DatePicker
                  label="Event Date"
                  value={eventData.date}
                  onChange={(newDate) => setEventData(prev => ({ ...prev, date: newDate }))}
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
                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                  <TimePicker
                    label="Start Time"
                    value={eventData.startTime}
                    onChange={(newValue) => setEventData(prev => ({ ...prev, startTime: newValue }))}
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
                  <TimePicker
                    label="End Time"
                    value={eventData.endTime}
                    onChange={(newValue) => setEventData(prev => ({ ...prev, endTime: newValue }))}
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
                </Box>
              </Box>
            </LocalizationProvider>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="500" sx={{ mb: 2 }}>
              Language Settings
            </Typography>
            
            {renderLanguageSelector('sourceLanguages', 'Source Language', 'sourceLanguages')}
            {renderLanguageSelector('targetLanguages', 'Target Language', 'targetLanguages')}
          </Box>
          
          <Box>
            <Typography variant="subtitle1" fontWeight="500" sx={{ mb: 2 }}>
              Event Settings
            </Typography>
            
            {renderEventTypeSelector('eventType')}
            
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 2, borderTop: '1px solid #f0f0f0', justifyContent: 'space-between' }}>
          <Button 
            onClick={handleCloseWithConfirmation} 
            variant="text"
            sx={{ color: '#637381' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            sx={{ 
              bgcolor: '#6366f1', 
              '&:hover': { bgcolor: '#4338ca' },
              borderRadius: '8px',
              textTransform: 'none'
            }}
            disabled={!isFormValid()}
          >
            {isEditing ? 'Save Changes' : 'Create Event'}
          </Button>
        </DialogActions>
      </Dialog>
      
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: '8px',
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
            width: '400px',
            maxWidth: '100%',
            textAlign: 'center'
          }
        }}
      >
        <DialogContent sx={{ pt: 4, pb: 3 }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
            <Box sx={{ height: 172, width: 230 }}>
              <PlantDoodle />
            </Box>
          </Box>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Are you sure you want to cancel event creation?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'center', gap: 2 }}>
          <Button 
            onClick={handleDiscard} 
            variant="outlined"
            sx={{ 
              color: '#d32f2f',
              borderColor: '#d32f2f',
              '&:hover': { borderColor: '#b71c1c', bgcolor: 'rgba(211, 47, 47, 0.04)' },
              borderRadius: '8px',
              textTransform: 'none',
              px: 3
            }}
          >
            Discard
          </Button>
          <Button 
            onClick={handleSaveAsDraft} 
            variant="contained" 
            sx={{ 
              bgcolor: '#6366f1', 
              '&:hover': { bgcolor: '#4338ca' },
              borderRadius: '8px',
              textTransform: 'none',
              px: 3
            }}
          >
            Save as Draft & Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CreateEventModal; 