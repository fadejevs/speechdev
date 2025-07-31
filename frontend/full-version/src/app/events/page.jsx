'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  IconButton
} from '@mui/material';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/utils/dateUtils';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CreateEventModal from '@/components/events/CreateEventModal';

// Mock data for faster development when backend is not available
const mockData = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  original_text: `Sample transcript ${i + 1}`,
  source_language: 'en',
  target_language: i % 2 === 0 ? 'fr' : 'es',
  translated_text: `Translated text ${i + 1}`,
  timestamp: new Date(2023, i % 12, (i + 1) * 2),
  type: i % 3 === 0 ? 'stt' : i % 3 === 1 ? 'translation' : 'tts'
}));

// Simple API service with caching
const getTranscriptHistory = async () => {
  try {
    const response = await axios.get('http://localhost:5001/api/transcripts');
    return response.data;
  } catch (error) {
    console.error('Error fetching transcripts:', error);
    return [];
  }
};

const EventsPage = () => {
  const router = useRouter();
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Use mock data for faster development
  const useMockData = true;

  useEffect(() => {
    const fetchTranscripts = async () => {
      try {
        setLoading(true);
        if (useMockData) {
          setTranscripts(mockData);
          setLoading(false);
          return;
        }

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

  // Memoize status chips to prevent re-renders
  const getStatusChip = useMemo(() => {
    const chips = {
      stt: <Chip label="Draft event" size="small" sx={{ bgcolor: '#e6f7e6', color: '#43a047', borderRadius: '16px' }} />,
      translation: <Chip label="Scheduled" size="small" sx={{ bgcolor: '#fff8e1', color: '#ff9800', borderRadius: '16px' }} />,
      tts: <Chip label="Completed" size="small" sx={{ bgcolor: '#e8f5e9', color: '#4caf50', borderRadius: '16px' }} />
    };

    return (type) => chips[type] || chips['tts'];
  }, []);

  // Calculate pagination
  const totalPages = Math.ceil(transcripts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTranscripts = transcripts.slice(startIndex, startIndex + itemsPerPage);

  // Demo locations
  const locations = ['Riga, Latvia', 'Tallinn, Estonia', 'Frankfurt, Germany', 'Vienna, Austria'];

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const filteredTranscripts = transcripts.filter(
    (transcript) =>
      transcript.original_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transcript.source_language.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transcript.target_language.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedFilteredTranscripts = filteredTranscripts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleCreateEvent = (eventData) => {
    // Create a new event with the form data
    const newEvent = {
      id: transcripts.length + 1,
      title: eventData.name || 'Not specified',
      date: eventData.date || 'Not specified',
      location: eventData.location || 'Not specified',
      type: eventData.eventType || 'Not specified',
      status: 'Draft event'
    };

    // Add the new event to the list
    setTranscripts([newEvent, ...transcripts]);

    // Close the modal since this page doesn't navigate anywhere
    setIsModalOpen(false);
  };

  return (
    <Box sx={{ p: 3, maxWidth: '100%' }}>
      {/* Page header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          My Events
        </Typography>

        <Button variant="contained" onClick={() => setIsModalOpen(true)} sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4338ca' } }}>
          + Add New
        </Button>
      </Box>

      {/* Search and filter */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TextField
            placeholder="Search event here..."
            size="small"
            sx={{ width: 300, mr: 2 }}
            value={searchQuery}
            onChange={handleSearch}
          />
          <Button variant="outlined" sx={{ borderColor: '#e0e0e0', color: '#637381' }}>
            Filter
          </Button>
        </Box>
      </Box>

      {/* Table */}
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
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : paginatedFilteredTranscripts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No events found
                </TableCell>
              </TableRow>
            ) : (
              paginatedFilteredTranscripts.map((transcript, index) => (
                <TableRow key={index} hover>
                  <TableCell padding="checkbox">
                    <input type="checkbox" />
                  </TableCell>
                  <TableCell>{transcript.original_text}</TableCell>
                  <TableCell>
                    {formatDate(transcript.timestamp)}
                  </TableCell>
                  <TableCell>{locations[index % locations.length]}</TableCell>
                  <TableCell>{index % 2 === 0 ? 'Online' : 'On-site'}</TableCell>
                  <TableCell>{getStatusChip(transcript.type)}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small">
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Button disabled={currentPage === 1} onClick={() => setCurrentPage((prev) => prev - 1)} sx={{ mx: 0.5, color: '#637381' }}>
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
          {currentPage}
        </Button>

        {totalPages > 1 && (
          <Button variant="text" onClick={() => setCurrentPage(2)} sx={{ mx: 0.5, minWidth: '40px', color: '#637381' }}>
            2
          </Button>
        )}

        {totalPages > 2 && <Typography sx={{ mx: 0.5, color: '#637381', alignSelf: 'center' }}>...</Typography>}

        {totalPages > 3 && (
          <Button variant="text" onClick={() => setCurrentPage(totalPages)} sx={{ mx: 0.5, minWidth: '40px', color: '#637381' }}>
            {totalPages}
          </Button>
        )}

        <Button disabled={currentPage === totalPages} onClick={() => setCurrentPage((prev) => prev + 1)} sx={{ mx: 0.5, color: '#637381' }}>
          Next →
        </Button>
      </Box>

      <CreateEventModal open={isModalOpen} handleClose={() => setIsModalOpen(false)} handleCreate={handleCreateEvent} />
    </Box>
  );
};

export default EventsPage;
