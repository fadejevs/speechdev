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
  TextField
} from '@mui/material';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { logout } from '@/utils/api';
import CreateEventModal from '@/components/events/CreateEventModal';

// API service
const getTranscriptHistory = async () => {
  try {
    const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/transcripts`);
    return response.data;
  } catch (error) {
    console.error('Error fetching transcripts:', error);
    return [];
  }
};

const AnalyticsDashboard = () => {
  const router = useRouter();
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchTranscripts = async () => {
      try {
        setLoading(true);
        const data = await getTranscriptHistory();
        setTranscripts(data);
      } catch (error) {
        console.error('Error fetching transcripts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTranscripts();
  }, []);

  const handleCreateEvent = (eventData) => {
    // Create a new event with the form data
    const newEvent = {
      id: transcripts.length + 1,
      title: eventData.name,
      timestamp: new Date(),
      source_language: eventData.sourceLanguage || 'English',
      type: eventData.eventType === 'onsite' ? 'translation' : 'stt'
    };
    
    // Add the new event to the list
    setTranscripts([newEvent, ...transcripts]);
  };

  const getStatusChip = (type) => {
    switch(type) {
      case 'stt':
        return <Chip label="Draft event" color="primary" size="small" sx={{ bgcolor: '#e6f7e6', color: '#43a047', borderRadius: '16px' }} />;
      case 'translation':
        return <Chip label="Scheduled" color="warning" size="small" sx={{ bgcolor: '#fff8e1', color: '#ff9800', borderRadius: '16px' }} />;
      case 'tts':
        return <Chip label="Completed" color="success" size="small" sx={{ bgcolor: '#e8f5e9', color: '#4caf50', borderRadius: '16px' }} />;
      default:
        return <Chip label="Completed" color="success" size="small" sx={{ bgcolor: '#e8f5e9', color: '#4caf50', borderRadius: '16px' }} />;
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(transcripts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTranscripts = transcripts.slice(startIndex, startIndex + itemsPerPage);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      
      <Box sx={{ display: 'flex', flexGrow: 1 }}>

        {/* Main content */}
        <Box sx={{ flexGrow: 1, p: 3, bgcolor: '#ffffff' }}>
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

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TextField
                placeholder="Search event here..."
                size="small"
                sx={{ width: 300, mr: 2 }}
              />
              <Button 
                variant="outlined"
                sx={{ borderColor: '#e0e0e0', color: '#637381' }}
              >
                Filter
              </Button>
            </Box>
          </Box>

          <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #e0e0e0' }}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                <TableRow>
                  <TableCell padding="checkbox">
                    <input type="checkbox" />
                  </TableCell>
                  <TableCell>Event Name</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right"></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">Loading...</TableCell>
                  </TableRow>
                ) : paginatedTranscripts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">No events found</TableCell>
                  </TableRow>
                ) : (
                  paginatedTranscripts.map((transcript, index) => (
                    <TableRow key={index} hover>
                      <TableCell padding="checkbox">
                        <input type="checkbox" />
                      </TableCell>
                      <TableCell>
                        {`Demo Event ${index + 1}`}
                      </TableCell>
                      <TableCell>
                        {transcript.timestamp && transcript.timestamp.seconds 
                          ? new Date(transcript.timestamp.seconds * 1000).toLocaleDateString()
                          : new Date(transcript.timestamp).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{transcript.source_language || 'Riga, Latvia'}</TableCell>
                      <TableCell>{transcript.type === 'stt' ? 'Online' : 'On-site'}</TableCell>
                      <TableCell>{getStatusChip(transcript.type)}</TableCell>
                      <TableCell align="right">
                        <Button size="small">⋮</Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Button 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(prev => prev - 1)}
              sx={{ mx: 0.5, color: '#637381' }}
            >
              ← Previous
            </Button>
            
            <Button
              variant="contained"
              sx={{ 
                mx: 0.5, 
                minWidth: '40px',
                bgcolor: '#6366f1',
                '&:hover': { bgcolor: '#4338ca' }
              }}
            >
              1
            </Button>
            
            {totalPages > 1 && (
              <Button
                variant="text"
                sx={{ mx: 0.5, minWidth: '40px', color: '#637381' }}
              >
                2
              </Button>
            )}
            
            {totalPages > 2 && (
              <Typography sx={{ mx: 0.5, color: '#637381', alignSelf: 'center' }}>...</Typography>
            )}
            
            {totalPages > 3 && (
              <Button
                variant="text"
                sx={{ mx: 0.5, minWidth: '40px', color: '#637381' }}
              >
                {totalPages}
              </Button>
            )}
            
            <Button 
              disabled={currentPage === totalPages} 
              onClick={() => setCurrentPage(prev => prev + 1)}
              sx={{ mx: 0.5, color: '#637381' }}
            >
              Next →
            </Button>
          </Box>

          {/* Add the modal component */}
          <CreateEventModal 
            open={isModalOpen}
            handleClose={() => setIsModalOpen(false)}
            handleCreate={handleCreateEvent}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default AnalyticsDashboard;
