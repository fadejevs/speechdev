import React, { useState, useEffect, useRef } from 'react';
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
  InputAdornment
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
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

const LANGUAGES = [
  'Latvian',
  'Lithuanian',
  'Estonian',
  'German',
  'Spanish',
  'English',
  'Russian',
  'French',
  'Italian',
  'Chinese',
  'Japanese'
];

const EVENT_TYPES = [
  { value: 'online', label: 'Online' },
  { value: 'onsite', label: 'On-site' },
  { value: 'hybrid', label: 'Hybrid' }
];

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
    date: null,
    sourceLanguages: [],
    targetLanguages: [],
    eventType: '',
    recordEvent: false
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredLanguages, setFilteredLanguages] = useState(LANGUAGES);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarRef = useRef(null);

  useEffect(() => {
    if (open && initialData) {
      setEventData({
        name: initialData.name || '',
        description: initialData.description || '',
        location: initialData.location || '',
        date: initialData.date ? dayjs(initialData.date) : null,
        sourceLanguages: initialData.sourceLanguages || [],
        targetLanguages: initialData.targetLanguages || [],
        eventType: initialData.eventType || '',
        recordEvent: initialData.recordEvent || false
      });
    } else if (!open) {
      setEventData({
        name: '',
        description: '',
        location: '',
        date: null,
        sourceLanguages: [],
        targetLanguages: [],
        eventType: '',
        recordEvent: false
      });
      setSearchTerm('');
    }
  }, [open, initialData]);

  useEffect(() => {
    setFilteredLanguages(
      LANGUAGES.filter(lang => 
        lang.toLowerCase().includes(searchTerm.toLowerCase())
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEventData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (e) => {
    setEventData(prev => ({ ...prev, recordEvent: e.target.checked }));
  };

  const handleDateChange = (newDate) => {
    setEventData(prev => ({ ...prev, date: newDate }));
  };

  const handleSubmit = () => {
    const formattedData = {
      ...eventData,
      date: eventData.date ? eventData.date.format('DD.MM.YYYY') : ''
    };
    handleCreate(formattedData);
    handleClose();
  };

  const handleLanguageToggle = (language, field) => {
    setEventData(prev => {
      const currentLanguages = [...prev[field]];
      const languageIndex = currentLanguages.indexOf(language);
      
      if (languageIndex === -1) {
        currentLanguages.push(language);
      } else {
        currentLanguages.splice(languageIndex, 1);
      }
      
      return { ...prev, [field]: currentLanguages };
    });
  };

  const handleDeleteLanguage = (language, field) => {
    setEventData(prev => {
      const currentLanguages = [...prev[field]];
      const languageIndex = currentLanguages.indexOf(language);
      
      if (languageIndex !== -1) {
        currentLanguages.splice(languageIndex, 1);
      }
      
      return { ...prev, [field]: currentLanguages };
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
      eventData.recordEvent !== false;
    
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
    handleCreate({...eventData, status: 'draft'});
    setConfirmDialogOpen(false);
    handleClose();
  };

  const renderLanguageSelector = (field, label) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    
    return (
      <Box sx={{ mb: 2, position: 'relative' }}>
        <Typography variant="body2" sx={{ mb: 1, color: '#637381' }}>{label}<span style={{ color: 'red' }}>*</span></Typography>
        
        <Box 
          onClick={() => setDropdownOpen(!dropdownOpen)}
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
                  label={lang}
                  deleteIcon={<CloseIcon style={{ fontSize: '16px' }} />}
                  onDelete={() => handleDeleteLanguage(lang, field)}
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
              ))}
            </Box>
          )}
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
            <IconButton 
              size="small" 
              onClick={(e) => {
                e.stopPropagation();
                setDropdownOpen(!dropdownOpen);
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
                  key={language}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLanguageToggle(language, field);
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
                    checked={eventData[field].includes(language)}
                    onChange={() => {}}
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
                  <Typography variant="body2">{language}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    );
  };

  const renderEventTypeSelector = () => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    
    return (
      <Box sx={{ mb: 2, position: 'relative' }}>
        <Typography variant="body2" sx={{ mb: 1, color: '#637381' }}>Select Event Type<span style={{ color: 'red' }}>*</span></Typography>
        
        <Box 
          onClick={() => setDropdownOpen(!dropdownOpen)}
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
                setDropdownOpen(!dropdownOpen);
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
                  setDropdownOpen(false);
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
                  onChange={() => {}}
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
                onChange={handleChange}
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
                onChange={handleChange}
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
              <Typography variant="body2" sx={{ mb: 1, color: '#637381' }}>Event Location<span style={{ color: 'red' }}>*</span></Typography>
              <TextField
                fullWidth
                name="location"
                value={eventData.location}
                onChange={handleChange}
                placeholder="G. Zemgala gatve 78, Riga, LV-1039"
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
              <Typography variant="body2" sx={{ mb: 1, color: '#637381' }}>Event Date<span style={{ color: 'red' }}>*</span></Typography>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  value={eventData.date}
                  onChange={handleDateChange}
                  format="DD.MM.YYYY"
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: "small",
                      placeholder: "DD.MM.YYYY",
                      sx: {
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '8px',
                          '& fieldset': {
                            borderColor: '#e0e0e0'
                          }
                        }
                      }
                    }
                  }}
                  sx={{
                    '& .MuiPickersDay-root.Mui-selected': {
                      backgroundColor: '#6366f1',
                      '&:hover': {
                        backgroundColor: '#4338ca'
                      }
                    }
                  }}
                />
              </LocalizationProvider>
            </Box>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="500" sx={{ mb: 2 }}>
              Language Settings
            </Typography>
            
            {renderLanguageSelector('sourceLanguages', 'Source Language')}
            {renderLanguageSelector('targetLanguages', 'Target Language')}
          </Box>
          
          <Box>
            <Typography variant="subtitle1" fontWeight="500" sx={{ mb: 2 }}>
              Event Settings
            </Typography>
            
            {renderEventTypeSelector()}
            
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
              <Switch 
                checked={eventData.recordEvent} 
                onChange={handleSwitchChange}
                color="primary"
                size="small"
              />
              <Typography variant="body2" sx={{ ml: 1, color: '#637381' }}>Record Event</Typography>
            </Box>
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