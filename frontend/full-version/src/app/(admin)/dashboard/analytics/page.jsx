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
import { supabase } from '@/utils/supabase/client';

const formatDate = (dateString) => {
  if (!dateString || dateString === 'Not specified') return dateString;
  const date = new Date(dateString);
  if (isNaN(date)) return dateString;
  // Use ISO format for hydration consistency
  return date.toISOString().split('T')[0];
};

const AnalyticsDashboard = () => {
  const [transcripts, setTranscripts] = useState([]);
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

  const handleRowClick = (event) => {
    if (event.status === "Live" || event.status === "Paused") {
      router.push(`/events/${event.id}/live`);
    } else {
      router.push(`/events/${event.id}`);
    }
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

  const handleDelete = async () => {
    if (!selectedEventId) return;
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', selectedEventId);
    if (error) {
      console.error('Error deleting event:', error);
      return;
    }
    setTranscripts(prev => prev.filter(t => String(t.id) !== String(selectedEventId)));
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

  const handleUpdateEvent = async (updatedData) => {
    const { data, error } = await supabase
      .from('events')
      .update(updatedData)
      .eq('id', editingEvent.id)
      .select();
    if (error) {
      console.error('Error updating event:', error);
      return;
    }
    setTranscripts(transcripts.map(event => 
      event.id === editingEvent.id ? data[0] : event
    ));
    setIsEditModalOpen(false);
    setEditingEvent(null);
  };

  const handleCreateEvent = async (eventData) => {
    const { data, error } = await supabase
      .from('events')
      .insert([eventData])
      .select();
    if (error) {
      console.error('Error creating event:', error);
      return;
    }
    setTranscripts(prev => [data[0], ...prev]);
  };

  // 1. Fetch events from Supabase
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('timestamp', { ascending: false });
      if (error) {
        console.error('Error fetching events:', error);
        setTranscripts([]);
      } else {
        setTranscripts(data || []);
      }
      setLoading(false);
    };
    fetchEvents();
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
        key={event.id || `${event.title}-${event.timestamp}`}
        hover
        onClick={() => handleRowClick(event)}
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
