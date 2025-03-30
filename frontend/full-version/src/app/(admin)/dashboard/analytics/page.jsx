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

const AnalyticsDashboard = () => {
  const [transcripts, setTranscripts] = useState(initialMockData);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const itemsPerPage = 10;
  const [editingEvent, setEditingEvent] = useState(null);
  const router = useRouter();

  // Calculate pagination
  const totalPages = Math.ceil(transcripts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTranscripts = transcripts.slice(startIndex, startIndex + itemsPerPage);

  const handleMenuOpen = (event, transcript) => {
    setAnchorEl(event.currentTarget);
    setSelectedEvent(transcript);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedEvent(null);
  };

  const handleDelete = () => {
    if (selectedEvent) {
      setTranscripts(prev => prev.filter(t => t.id !== selectedEvent.id));
      handleMenuClose();
    }
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
      title: eventData.name,
      timestamp: new Date().toLocaleDateString(),
      location: eventData.location || 'Online',
      type: eventData.type || 'stt',
      status: 'Draft event'
    };
    
    setTranscripts([newEvent, ...transcripts]);
  };

  // Add this useEffect to load events from localStorage on component mount
  useEffect(() => {
    try {
      const savedEvents = localStorage.getItem('eventData');
      if (savedEvents) {
        setTranscripts(JSON.parse(savedEvents));
      } else {
        // Initialize localStorage with mock data if empty
        localStorage.setItem('eventData', JSON.stringify(initialMockData));
        setTranscripts(initialMockData);
      }
    } catch (error) {
      console.error('Error loading events:', error);
      setTranscripts(initialMockData);
    }
  }, []);

  const getStatusChip = (status) => {
    switch(status) {
      case 'Draft event':
        return <Chip label="Draft event" size="small" sx={{ bgcolor: '#e6f7e6', color: '#43a047', borderRadius: '16px' }} />;
      case 'Completed':
        return <Chip label="Completed" size="small" sx={{ bgcolor: '#e8f5e9', color: '#4caf50', borderRadius: '16px' }} />;
      default:
        return <Chip label={status} size="small" sx={{ bgcolor: '#fff8e1', color: '#ff9800', borderRadius: '16px' }} />;
    }
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
            {paginatedTranscripts.map((transcript) => (
              <TableRow key={transcript.id}>
                <TableCell>{transcript.title}</TableCell>
                <TableCell>{transcript.timestamp}</TableCell>
                <TableCell>{transcript.location}</TableCell>
                <TableCell>{transcript.type}</TableCell>
                <TableCell>{getStatusChip(transcript.status)}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={(e) => handleMenuOpen(e, transcript)}>
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
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
          setSelectedEvent(null);
        }}
        handleCreate={handleUpdateEvent}
        initialData={editingEvent?.formData}
        isEditing={true}
      />

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem 
          onClick={() => {
            router.push(`/events/${selectedEvent.id}`);
            handleMenuClose();
          }}
          sx={{ py: 1 }}
        >
          <ListItemText primary="Edit" />
        </MenuItem>
        <MenuItem onClick={handleDelete}>Delete</MenuItem>
      </Menu>
    </Box>
  );
};

export default AnalyticsDashboard;
