import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  FormControl,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  IconButton,
  InputLabel,
  Grid
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

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
    date: '',
    sourceLanguage: '',
    targetLanguage: '',
    eventType: '',
    recordEvent: false
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open && initialData) {
      setEventData({
        name: initialData.name || '',
        description: initialData.description || '',
        location: initialData.location || '',
        date: initialData.date || '',
        sourceLanguage: initialData.sourceLanguage || '',
        targetLanguage: initialData.targetLanguage || '',
        eventType: initialData.eventType || '',
        recordEvent: initialData.recordEvent || false
      });
    } else if (!open) {
      setEventData({
        name: '',
        description: '',
        location: '',
        date: '',
        sourceLanguage: '',
        targetLanguage: '',
        eventType: '',
        recordEvent: false
      });
    }
  }, [open, initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEventData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (e) => {
    setEventData(prev => ({ ...prev, recordEvent: e.target.checked }));
  };

  const handleSubmit = () => {
    handleCreate(eventData);
    handleClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '8px',
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
          width: '600px',
          maxWidth: '100%'
        }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid #f0f0f0' }}>
        <Typography variant="h6">{isEditing ? 'Edit Event' : 'Create New Event'}</Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>
      
      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
            General Information
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>Event Name</Typography>
            <TextField
              fullWidth
              name="name"
              value={eventData.name}
              onChange={handleChange}
              placeholder="Enter event name ex. Super Cool Event"
              variant="outlined"
              size="small"
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px'
                }
              }}
            />
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>Description</Typography>
            <TextField
              fullWidth
              name="description"
              value={eventData.description}
              onChange={handleChange}
              placeholder="Enter a description of Event..."
              variant="outlined"
              multiline
              rows={4}
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px'
                }
              }}
            />
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>Event Location</Typography>
            <TextField
              fullWidth
              name="location"
              value={eventData.location}
              onChange={handleChange}
              placeholder="Enter event location ex. ATTA Center, Krasta iela 60, Latgales priekšpilsēta, Rīga, LV-1003, Latvia"
              variant="outlined"
              size="small"
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px'
                }
              }}
            />
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>Event Date</Typography>
            <TextField
              fullWidth
              name="date"
              value={eventData.date}
              onChange={handleChange}
              placeholder="Enter event date ex. 26.03.2025"
              variant="outlined"
              size="small"
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px'
                }
              }}
            />
          </Box>
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
            Language Settings
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>Select Source Language</Typography>
            <Select
              fullWidth
              name="sourceLanguage"
              value={eventData.sourceLanguage}
              onChange={handleChange}
              displayEmpty
              renderValue={selected => selected || "Select Source Language"}
              size="small"
              sx={{ 
                borderRadius: '8px',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#e0e0e0'
                }
              }}
            >
              <MenuItem value="english">English</MenuItem>
              <MenuItem value="latvian">Latvian</MenuItem>
              <MenuItem value="russian">Russian</MenuItem>
              <MenuItem value="german">German</MenuItem>
              <MenuItem value="french">French</MenuItem>
            </Select>
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>Select Target Language</Typography>
            <Select
              fullWidth
              name="targetLanguage"
              value={eventData.targetLanguage}
              onChange={handleChange}
              displayEmpty
              renderValue={selected => selected || "Select Target Language"}
              size="small"
              sx={{ 
                borderRadius: '8px',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#e0e0e0'
                }
              }}
            >
              <MenuItem value="english">English</MenuItem>
              <MenuItem value="latvian">Latvian</MenuItem>
              <MenuItem value="russian">Russian</MenuItem>
              <MenuItem value="german">German</MenuItem>
              <MenuItem value="french">French</MenuItem>
            </Select>
          </Box>
        </Box>
        
        <Box>
          <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
            Event Settings
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>Select Event Type</Typography>
            <Select
              fullWidth
              name="eventType"
              value={eventData.eventType}
              onChange={handleChange}
              displayEmpty
              renderValue={selected => selected || "Select a Event Type"}
              size="small"
              sx={{ 
                borderRadius: '8px',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#e0e0e0'
                }
              }}
            >
              <MenuItem value="online">Online</MenuItem>
              <MenuItem value="onsite">On-site</MenuItem>
              <MenuItem value="hybrid">Hybrid</MenuItem>
            </Select>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            <Switch 
              checked={eventData.recordEvent} 
              onChange={handleSwitchChange}
              color="primary"
              size="small"
            />
            <Typography variant="body2" sx={{ ml: 1 }}>Record Event</Typography>
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 2, borderTop: '1px solid #f0f0f0', justifyContent: 'space-between' }}>
        <Button 
          onClick={handleClose} 
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
  );
};

export default CreateEventModal; 