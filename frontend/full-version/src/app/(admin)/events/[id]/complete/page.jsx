"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import IconButton from '@mui/material/IconButton';
import SelfieDoodle from '@/images/illustration/SelfieDoodle';

const EventCompletionPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const [eventData, setEventData] = useState(null);

  useEffect(() => {
    // Get event data from localStorage
    const storedEvents = localStorage.getItem('eventData');
    if (storedEvents) {
      const parsedEvents = JSON.parse(storedEvents);
      const event = parsedEvents.find(event => event.id === id);
      if (event) {
        setEventData(event);
      }
    }
  }, [id]);

  const handleBackToEvents = () => {
    router.push('/dashboard/analytics');
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 },  minHeight: '100vh' }}>

      {/* Back button and Create New Event button */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 4
      }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBackToEvents}
          sx={{ 
            color: '#212B36',
            textTransform: 'none',
            '&:hover': { bgcolor: 'rgba(33, 43, 54, 0.08)' }
          }}
        >
          Back To Events
        </Button>
        
        <Button
          variant="contained"
          onClick={() => router.push('/dashboard/analytics')}
          sx={{
            bgcolor: '#6366F1',
            color: 'white',
            textTransform: 'none',
            px: 3,
            py: 1,
            borderRadius: '8px',
            '&:hover': { bgcolor: '#4338CA' }
          }}
        >
          Create New Event
        </Button>
      </Box>

      {/* Completed Event Card */}
      <Box sx={{ 
        bgcolor: 'white',
        borderRadius: 2,
        p: 4,
        mb: 4,
        textAlign: 'center',
        boxShadow: '0px 2px 4px rgba(145, 158, 171, 0.16)'
      }}>
        {/* Illustration */}
        <Box sx={{ 
          mb: 2,
          display: 'flex',
          justifyContent: 'center'
        }}>
          {/* <SelfieDoodle sx={{ 
            width: 120,
            height: 120
          }} /> */}
             <Box sx={{ 
                mb: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: 172,
                width: 230,
                position: 'relative'
              }}>
                <SelfieDoodle sx={{ 
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  maxWidth: '100%',
                  maxHeight: '100%'
                }} />
              </Box>
        </Box>

        {/* Title */}
        <Typography variant="h5" sx={{ 
          fontWeight: 600, 
          color: '#212B36',
          mb: 1
        }}>
          Your Event Is Completed
        </Typography>

        {/* Description */}
        <Typography variant="body2" sx={{ 
          color: '#637381',
          mb: 2
        }}>
          Debitis consequatur et facilis consequatur fugiat fugit nulla quo.
        </Typography>
      </Box>

      {/* Event Details Section */}
      <Box sx={{ display: 'flex', gap: 3 }}>
        <Box sx={{ 
          flex: '0 0 30%',
          bgcolor: 'white',
          borderRadius: 2,
          p: 3,
          height: 'fit-content',
          boxShadow: '0px 2px 4px rgba(145, 158, 171, 0.16)'
        }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 600,
            color: '#212B36',
            mb: 1
          }}>
            Event Details
          </Typography>

          <Typography variant="body2" sx={{ color: '#637381', mb: 3 }}>
            Debitis consequatur et facilis consequatur fugiat fugit nulla quo.
          </Typography>
        </Box>

        <Box sx={{ 
          flex: '1',
          bgcolor: 'white',
          borderRadius: 2,
          p: 3,
          boxShadow: '0px 2px 4px rgba(145, 158, 171, 0.16)'
        }}>
          <Box sx={{ display: 'grid', gap: 3 }}>
            {/* Event Name */}
            <Box>
              <Typography variant="subtitle2" sx={{ color: '#212B36', mb: 1 }}>
                Event Name
              </Typography>
              <Typography variant="body2" sx={{ color: '#637381' }}>
                {eventData?.name || 'Not specified'}
              </Typography>
            </Box>

            {/* Event Description */}
            <Box>
              <Typography variant="subtitle2" sx={{ color: '#212B36', mb: 1 }}>
                Event Description
              </Typography>
              <Typography variant="body2" sx={{ color: '#637381' }}>
                {eventData?.description || 'Not specified'}
              </Typography>
            </Box>

            {/* Event Location */}
            <Box>
              <Typography variant="subtitle2" sx={{ color: '#212B36', mb: 1 }}>
                Event Location
              </Typography>
              <Typography variant="body2" sx={{ color: '#637381' }}>
                {eventData?.location || 'Not specified'}
              </Typography>
            </Box>

            {/* Event Date */}
            <Box>
              <Typography variant="subtitle2" sx={{ color: '#212B36', mb: 1 }}>
                Event Date
              </Typography>
              <Typography variant="body2" sx={{ color: '#637381' }}>
                {eventData?.date ? new Date(eventData.date).toLocaleDateString() : 'Not specified'}
              </Typography>
            </Box>

            {/* Event Type */}
            <Box>
              <Typography variant="subtitle2" sx={{ color: '#212B36', mb: 1 }}>
                Event Type
              </Typography>
              <Typography variant="body2" sx={{ color: '#637381' }}>
                {eventData?.eventType || 'Not specified'}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Languages Section */}
      <Box sx={{ 
        mt: 4,
        bgcolor: 'white',
        borderRadius: 2,
        p: 3,
        boxShadow: '0px 2px 4px rgba(145, 158, 171, 0.16)'
      }}>
        <Typography variant="h6" sx={{ 
          fontWeight: 600,
          color: '#212B36',
          mb: 1
        }}>
          Languages
        </Typography>

        <Typography variant="body2" sx={{ color: '#637381', mb: 3 }}>
          Debitis consequatur et facilis consequatur fugiat fugit nulla quo.
        </Typography>

        {/* Language List */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Source Language */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            py: 2,
            borderBottom: '1px solid #F2F3F5'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1">Latvian</Typography>
              <Box sx={{ 
                bgcolor: '#EEF2FF', 
                color: '#6366F1', 
                px: 1, 
                py: 0.5, 
                borderRadius: 1,
                fontSize: '12px'
              }}>
                Source
              </Box>
            </Box>
            <IconButton>
              <MoreVertIcon />
            </IconButton>
          </Box>

          {/* Target Languages */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            py: 2,
            borderBottom: '1px solid #F2F3F5'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1">English</Typography>
              <Box sx={{ 
                bgcolor: '#E5F7FF', 
                color: '#0EA5E9', 
                px: 1, 
                py: 0.5, 
                borderRadius: 1,
                fontSize: '12px'
              }}>
                Translation
              </Box>
            </Box>
            <IconButton>
              <MoreVertIcon />
            </IconButton>
          </Box>

          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            py: 2,
            borderBottom: '1px solid #F2F3F5'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1">Lithuanian</Typography>
              <Box sx={{ 
                bgcolor: '#E5F7FF', 
                color: '#0EA5E9', 
                px: 1, 
                py: 0.5, 
                borderRadius: 1,
                fontSize: '12px'
              }}>
                Translation
              </Box>
            </Box>
            <IconButton>
              <MoreVertIcon />
            </IconButton>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default EventCompletionPage; 