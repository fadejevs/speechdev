'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  Chip,
  Button,
  TextField,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import CreateEventModal from '@/components/events/CreateEventModal';
import { useRouter } from 'next/navigation';
import { generateUniqueId } from '@/utils/idGenerator';

// API service

// const getTranscriptHistory = async () => {
//   try {
//     const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/transcripts`);
//     return response.data;
//   } catch (error) {
//     console.error('Error fetching transcripts:', error);
//     return [];
//   }
// };

// Mock data
const initialMockData = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  title: `Demo Event ${i + 1}`,
  timestamp: new Date(2024, i % 12, (i + 1) * 2).toLocaleDateString(),
  location: i % 2 === 0 ? 'Online' : 'Riga, Latvia',
  type: i % 3 === 0 ? 'stt' : i % 3 === 1 ? 'translation' : 'tts',
  status: i % 2 === 0 ? 'Scheduled' : 'Completed'
}));

const formatDate = (dateString) => {
  if (!dateString || dateString === 'Not specified') return dateString;
  const date = new Date(dateString);
  if (isNaN(date)) return dateString;
  return date.toLocaleDateString();
};

const AnalyticsDashboard = () => {
  const [transcripts, setTranscripts] = useState(initialMockData);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const itemsPerPage = 10;
  const [editingEvent, setEditingEvent] = useState(null);
  const router = useRouter();

  // Calculate pagination
  const totalPages = Math.ceil(transcripts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTranscripts = transcripts.slice(startIndex, startIndex + itemsPerPage);

  const handleRowClick = (eventId) => {
    router.push(`/events/${eventId}`);
  };

  const handleMenuOpen = (event, eventId) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedEventId(eventId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedEventId(null);
  };

  const handleDelete = () => {
    if (!selectedEventId) return;

    // 1) Remove from state
    setTranscripts(prev => prev.filter(t => t.id !== selectedEventId));

    // 2) ALSO remove from localStorage
    try {
      const stored = JSON.parse(localStorage.getItem('eventData') || '[]');
      const filtered = stored.filter(evt => evt.id !== selectedEventId);
      localStorage.setItem('eventData', JSON.stringify(filtered));
    } catch (e) {
      console.error('Error deleting from localStorage:', e);
    }

    handleMenuClose();
  };

  const handleEditEvent = (event) => {
    const eventDataForEdit = {
      name: event.title,
      description: event.description || '',
      location: event.location || '',
      date: event.timestamp || '',
      sourceLanguages: event.sourceLanguages || [],
      targetLanguages: event.targetLanguages || [],
      eventType: event.type || '',
      recordEvent: event.recordEvent || false,
      status: event.status
    };
    
    setEditingEvent({ ...event, formData: eventDataForEdit });
    setIsEditModalOpen(true);
  };

  const handleUpdateEvent = (updatedData) => {
    const updatedEvent = {
      ...editingEvent,
      title: updatedData.name,
      description: updatedData.description,
      location: updatedData.location,
      timestamp: updatedData.date,
      sourceLanguages: updatedData.sourceLanguages,
      targetLanguages: updatedData.targetLanguages,
      type: updatedData.eventType,
      recordEvent: updatedData.recordEvent,
      status: updatedData.status || editingEvent.status
    };
    
    setTranscripts(transcripts.map(event => 
      event.id === editingEvent.id ? updatedEvent : event
    ));
    
    setIsEditModalOpen(false);
    setEditingEvent(null);
  };

  const handleCreateEvent = (eventData) => {
    const newEvent = {
      id: generateUniqueId(),
      title: eventData.name || 'Not specified',
      timestamp: eventData.date ? eventData.date : 'Not specified',
      location: eventData.location || 'Not specified',
      type: eventData.eventType || 'Not specified',
      sourceLanguages: eventData.sourceLanguages || [],
      targetLanguages: eventData.targetLanguages || [],
      status: "Scheduled",
      description: eventData.description || 'Not specified'
    };
    
    setTranscripts([newEvent, ...transcripts]);
  };

  // Add this useEffect to refresh event data from localStorage
  useEffect(() => {
    const loadEventsFromLocalStorage = () => {
      try {
        const storedEvents = localStorage.getItem('eventData');
        if (storedEvents) {
          const parsedEvents = JSON.parse(storedEvents);
          
          // Map the stored events to the format expected by the dashboard
          const formattedEvents = parsedEvents.map(event => ({
            id: event.id,
            title: event.name,
            timestamp: event.date,
            location: event.location,
            type: event.type,
            status: event.status,
            description: event.description
          }));
          
          setTranscripts(formattedEvents);
        }
      } catch (error) {
        console.error('Error loading events from localStorage:', error);
      }
    };
    
    // Load events when the component mounts
    loadEventsFromLocalStorage();
    
    // Also set up an interval to refresh the data periodically
    const intervalId = setInterval(loadEventsFromLocalStorage, 5000);
    
    // Clean up the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, []);

  const getStatusChip = (status) => {
    switch(status) {
      case 'Draft event':
        return <Chip 
          label="Draft event" 
          size="small" 
          sx={{ 
            bgcolor: '#fff5f5', // Light red background
            color: '#ff4842',   // Red text
            borderRadius: '16px' 
          }} 
        />;
      case 'Completed':
        return <Chip 
          label="Completed" 
          size="small" 
          sx={{ 
            bgcolor: '#e8f5e9', 
            color: '#4caf50', 
            borderRadius: '16px' 
          }} 
        />;
      default:
        return <Chip 
          label={status} 
          size="small" 
          sx={{ 
            bgcolor: '#fff8e1', 
            color: '#ff9800', 
            borderRadius: '16px' 
          }} 
        />;
    }
  };

  // Make sure any data transformations preserve the "Not specified" values
  // For example, if you're filtering or sorting the events before display:

  const processedEvents = transcripts.map(event => ({
    ...event,
    title: event.title || 'Not specified',
    timestamp: event.timestamp || 'Not specified',
    location: event.location || 'Not specified',
    type: event.type || 'Not specified'
  }));

  // Add a helper function to render cell values with appropriate styling
  const renderCellValue = (value, isDefault = false) => {
    if (isDefault) {
      return (
        <Typography 
          variant="body2" 
          sx={{ 
            color: '#9e9e9e', // Light gray color for "Not specified" text
          }}
        >
          {value}
        </Typography>
      );
    }
    return <Typography variant="body2">{value}</Typography>;
  };

  const renderEventRow = (event) => {
    return (
      <TableRow
        key={event.id}
        hover
        onClick={() => handleRowClick(event.id)}
        sx={{ cursor: 'pointer' }}
      >
        <TableCell component="th" scope="row">
          {renderCellValue(event.title, event.title === 'Not specified')}
        </TableCell>
        <TableCell>
          {renderCellValue(formatDate(event.timestamp), event.timestamp === 'Not specified')}
        </TableCell>
        <TableCell>
          {renderCellValue(event.location, event.location === 'Not specified')}
        </TableCell>
        <TableCell>
          {renderCellValue(event.type, event.type === 'Not specified')}
        </TableCell>
        <TableCell>
          {getStatusChip(event.status || 'Draft event')}
        </TableCell>
        <TableCell align="right">
          <IconButton
            aria-label="more"
            aria-controls={`event-menu-${event.id}`}
            aria-haspopup="true"
            onClick={(e) => handleMenuOpen(e, event.id)}
          >
            <MoreVertIcon />
          </IconButton>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">My Events</Typography>
        <Button 
          variant="contained" 
          sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4338ca' } }}
          onClick={() => setIsModalOpen(true)}
        >
          + Add New
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Event Name</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">Loading...</TableCell>
              </TableRow>
            ) : processedEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">No events found</TableCell>
              </TableRow>
            ) : (
              processedEvents.map(event => renderEventRow(event))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, gap: 1 }}>
        <Button 
          disabled={currentPage === 1} 
          onClick={() => setCurrentPage(prev => prev - 1)}
          sx={{ color: '#637381' }}
        >
          ← Previous
        </Button>
        
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
          <Button
            key={page}
            variant={currentPage === page ? "contained" : "text"}
            onClick={() => setCurrentPage(page)}
            sx={{ 
              minWidth: '40px',
              color: currentPage === page ? 'white' : '#637381',
              bgcolor: currentPage === page ? '#6366f1' : 'transparent'
            }}
          >
            {page}
          </Button>
        ))}
        
        <Button 
          disabled={currentPage === totalPages} 
          onClick={() => setCurrentPage(prev => prev + 1)}
          sx={{ color: '#637381' }}
        >
          Next →
        </Button>
      </Box>

      <CreateEventModal 
        open={isModalOpen}
        handleClose={() => setIsModalOpen(false)}
        handleCreate={handleCreateEvent}
      />

      <CreateEventModal 
        open={isEditModalOpen}
        handleClose={() => {
          setIsEditModalOpen(false);
          setSelectedEventId(null);
        }}
        handleCreate={handleUpdateEvent}
        initialData={editingEvent?.formData}
        isEditing={true}
      />

      <Menu
        id={`event-menu-${selectedEventId}`}
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          router.push(`/events/${selectedEventId}`);
          handleMenuClose();
        }}>Edit</MenuItem>
        <MenuItem onClick={handleDelete}>Delete</MenuItem>
      </Menu>

      
    </Box>
  );
};

export default AnalyticsDashboard;
