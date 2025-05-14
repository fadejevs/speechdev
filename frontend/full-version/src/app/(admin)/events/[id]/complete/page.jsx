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

// ── 1) add this mapping under your imports ──────────────────────
const languagesMap = {
  en: "English",
  lv: "Latvian",
  lt: "Lithuanian",
  et: "Estonian",
  ru: "Russian",
  fr: "French",
  de: "German",
  es: "Spanish",
};
const getFullLanguageName = (code) => languagesMap[code] || code;

const getBaseLangCode = (code) => code?.split('-')[0]?.toLowerCase() || code;

const EventCompletionPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const [eventData, setEventData] = useState(null);
  const [transcripts, setTranscripts] = useState({});

  useEffect(() => {
    // Get event data from localStorage
    const storedEvents = localStorage.getItem('eventData');
    if (storedEvents) {
      const parsedEvents = JSON.parse(storedEvents);
      const event = parsedEvents.find(event => String(event.id) === String(id));
      if (event) {
        // unify shape so we always have arrays to iterate
        const srcArr =
          event.sourceLanguages ||
          (event.sourceLanguage ? [event.sourceLanguage] : []);
        const tgtArr =
          event.targetLanguages ||
          (event.targetLanguage ? [event.targetLanguage] : []);

        setEventData({
          ...event,
          sourceLanguages: srcArr,
          targetLanguages: tgtArr,
        });
      }
    }
  }, [id]);

  useEffect(() => {
    if (eventData && eventData.recordEvent) {
      const key = `transcripts_${String(eventData.id)}`;
      const stored = localStorage.getItem(key);
      console.log('Looking for transcripts with key:', key, 'Found:', stored);
      if (stored) setTranscripts(JSON.parse(stored));
    }
  }, [eventData]);

  const handleBackToEvents = () => {
    router.push('/dashboard/analytics');
  };

  if (!eventData) {
    return <Typography>Loading…</Typography>;
  }

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
          Published Languages
        </Typography>

        <Typography variant="body2" sx={{ color: '#637381', mb: 3 }}>
          Debitis consequatur et facilis consequatur fugiat fugit nulla quo.
        </Typography>

        {/* Language List */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Source language */}
          {eventData.sourceLanguages.map((lang, i) => (
            <Box
              key={`src-${lang}-${i}`}
              sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                py: 2,
                borderBottom: '1px solid #F2F3F5'
              }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle1">
                  {getFullLanguageName(getBaseLangCode(lang))}
                </Typography>
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
              <IconButton size="small">
                <MoreVertIcon />
              </IconButton>
            </Box>
          ))}

          {/* Target languages */}
          {eventData.targetLanguages.map((lang, i) => {
            const baseLang = getBaseLangCode(lang).toUpperCase(); // privKeys are uppercase
            // Extract all translations for this language from privmap
            const translationLines = (transcripts.privmap || [])
              .map(item => {
                const idx = item.privKeys.indexOf(baseLang);
                return idx !== -1 ? item.privValues[idx] : null;
              })
              .filter(Boolean);

            return (
              <Box
                key={`tgt-${lang}-${i}`}
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  py: 2,
                  borderBottom: '1px solid #F2F3F5'
                }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle1">
                    {getFullLanguageName(getBaseLangCode(lang))}
                  </Typography>
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Button
                    variant="contained"
                    disabled={translationLines.length === 0}
                    onClick={() => {
                      const blob = new Blob([translationLines.join('\n')], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${getFullLanguageName(baseLang)}_translation.txt`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    sx={{
                      bgcolor: '#6366f1',
                      color: 'white',
                      borderRadius: '8px',
                      textTransform: 'none',
                      fontWeight: 500,
                      px: 2,
                      py: 0.5,
                      fontSize: '13px',
                      minWidth: 'auto',
                      '&:hover': { bgcolor: '#4338ca' }
                    }}
                  >
                    Download
                  </Button>
                  <IconButton size="small">
                    <MoreVertIcon />
                  </IconButton>
                </Box>

                
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};

export default EventCompletionPage; 