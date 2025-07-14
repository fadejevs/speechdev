import { Fragment, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// @mui
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Fade from '@mui/material/Fade';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import OutlinedInput from '@mui/material/OutlinedInput';
import Popper from '@mui/material/Popper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';

// @project
import { ThemeDirection } from '@/config';
import EmptySearch from '@/components/header/empty-state/EmptySearch';
import MainCard from '@/components/MainCard';
import { supabase } from '@/utils/supabase/client';
import { AvatarSize } from '@/enum';

// @assets
import { IconCommand, IconSearch, IconCalendar, IconMapPin } from '@tabler/icons-react';

/***************************  HEADER - SEARCH BAR  ***************************/

export default function SearchBar() {
  const theme = useTheme();
  const router = useRouter();
  const downSM = useMediaQuery(theme.breakpoints.down('sm'));

  const buttonStyle = { borderRadius: 2, p: 1 };
  const [anchorEl, setAnchorEl] = useState(null);
  const [isEmptySearch, setIsEmptySearch] = useState(true);
  const [isPopperOpen, setIsPopperOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userEvents, setUserEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // Fetch user events
  useEffect(() => {
    const fetchUserEvents = async () => {
      try {
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('created_by', user.id)
          .order('timestamp', { ascending: false });

        if (error) {
          console.error('Error fetching events:', error);
          return;
        }

        setUserEvents(data || []);
      } catch (error) {
        console.error('Error fetching user events:', error);
      }
    };

    fetchUserEvents();
  }, []);

  // Filter events based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEvents([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = userEvents.filter(
      (event) =>
        (event.title && event.title.toLowerCase().includes(query)) ||
        (event.description && event.description.toLowerCase().includes(query)) ||
        (event.location && event.location.toLowerCase().includes(query)) ||
        (event.type && event.type.toLowerCase().includes(query))
    );

    setFilteredEvents(filtered);
  }, [searchQuery, userEvents]);

  // Function to open the popper
  const openPopper = (event) => {
    setAnchorEl(inputRef.current);
    setIsPopperOpen(true);
  };

  const handleActionClick = (event) => {
    if (isPopperOpen) {
      // If popper is open, close it
      setIsPopperOpen(false);
      setAnchorEl(null);
    } else {
      openPopper(event);
    }
  };

  const handleInputChange = (event) => {
    const value = event.target.value;
    setSearchQuery(value);
    const isEmpty = value.trim() === '';
    setIsEmptySearch(isEmpty);

    if (!isPopperOpen && !isEmpty) {
      openPopper(event);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !isPopperOpen) {
      openPopper(event);
    } else if (event.key === 'Escape' && isPopperOpen) {
      setIsPopperOpen(false);
      setAnchorEl(null);
    } else if (event.ctrlKey && event.key === 'k') {
      event.preventDefault();
      if (!isPopperOpen) {
        openPopper(event);
      }
    }
  };

  const handleEventClick = (eventData) => {
    // Navigate to the event based on its status
    if (eventData.status === 'Live' || eventData.status === 'Paused') {
      router.push(`/events/${eventData.id}/live`);
    } else if (eventData.status === 'Completed') {
      router.push(`/events/${eventData.id}/complete`);
    } else {
      router.push(`/events/${eventData.id}`);
    }
    // Close the popper
    setIsPopperOpen(false);
    setAnchorEl(null);
    setSearchQuery('');
    setIsEmptySearch(true);
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString === 'Not specified') return 'No date';
    const date = new Date(dateString);
    if (isNaN(date)) return 'No date';
    return date.toLocaleDateString();
  };

  const getStatusChip = (status) => {
    switch (status) {
      case 'Draft event':
        return (
          <Chip
            label="Draft"
            size="small"
            sx={{
              bgcolor: '#fff5f5',
              color: '#ff4842',
              fontSize: '0.75rem',
              height: '20px'
            }}
          />
        );
      case 'Live':
        return (
          <Chip
            label="Live"
            size="small"
            sx={{
              bgcolor: '#e8f5e9',
              color: '#4caf50',
              fontSize: '0.75rem',
              height: '20px'
            }}
          />
        );
      case 'Completed':
        return (
          <Chip
            label="Completed"
            size="small"
            sx={{
              bgcolor: '#e8f5e9',
              color: '#4caf50',
              fontSize: '0.75rem',
              height: '20px'
            }}
          />
        );
      default:
        return (
          <Chip
            label={status || 'Draft'}
            size="small"
            sx={{
              bgcolor: '#fff8e1',
              color: '#ff9800',
              fontSize: '0.75rem',
              height: '20px'
            }}
          />
        );
    }
  };

  const renderEventItem = (event, index) => (
    <ListItemButton key={event.id || index} sx={buttonStyle} onClick={() => handleEventClick(event)}>
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
          <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
            {event.title || 'Untitled Event'}
          </Typography>
          {getStatusChip(event.status)}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
          <IconCalendar size={14} color={theme.palette.text.secondary} />
          <Typography variant="caption" color="text.secondary">
            {formatDate(event.timestamp)}
          </Typography>
        </div>

        {event.location && event.location !== 'Not specified' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconMapPin size={14} color={theme.palette.text.secondary} />
            <Typography variant="caption" color="text.secondary">
              {event.location}
            </Typography>
          </div>
        )}
      </div>
    </ListItemButton>
  );

  useEffect(() => {
    const handleGlobalKeyDown = (event) => {
      if (event.ctrlKey && event.key === 'k') {
        event.preventDefault();
        // Check if the search input is not focused before opening the popper
        if (document.activeElement !== inputRef.current) {
          openPopper(event);
          inputRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isPopperOpen]);

  return (
    <>
      <OutlinedInput
        inputRef={inputRef}
        placeholder="Search events..."
        value={searchQuery}
        startAdornment={
          <InputAdornment position="start">
            <IconSearch />
          </InputAdornment>
        }
        endAdornment={
          <InputAdornment position="end">
            <IconCommand color={theme.palette.grey[700]} />
          </InputAdornment>
        }
        aria-describedby="Search"
        inputProps={{ 'aria-label': 'search events' }}
        onClick={handleActionClick}
        onKeyDown={handleKeyDown}
        onChange={handleInputChange}
        sx={{ minWidth: { xs: 200, sm: 240 } }}
      />
      <Popper
        placement="bottom"
        id={isPopperOpen ? 'search-action-popper' : undefined}
        open={isPopperOpen}
        anchorEl={anchorEl}
        transition
        popperOptions={{
          modifiers: [{ name: 'offset', options: { offset: [downSM ? (theme.direction === ThemeDirection.RTL ? -20 : 20) : 0, 8] } }]
        }}
      >
        {({ TransitionProps }) => (
          <Fade in={isPopperOpen} {...TransitionProps}>
            <MainCard
              sx={{
                borderRadius: 2,
                boxShadow: theme.customShadows.tooltip,
                width: 1,
                minWidth: { xs: 352, sm: 240 },
                maxWidth: { xs: 352, md: 420 },
                p: 0.5
              }}
            >
              <ClickAwayListener
                onClickAway={() => {
                  setIsPopperOpen(false);
                  setAnchorEl(null);
                }}
              >
                {isEmptySearch ? (
                  <EmptySearch />
                ) : filteredEvents.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No events found for "{searchQuery}"
                    </Typography>
                  </div>
                ) : (
                  <List disablePadding>
                    <ListSubheader sx={{ color: 'text.disabled', typography: 'caption', py: 0.5, px: 1, mb: 0.5 }}>
                      Events ({filteredEvents.length})
                    </ListSubheader>
                    {filteredEvents.slice(0, 5).map((event, index) => renderEventItem(event, index))}
                    {filteredEvents.length > 5 && (
                      <ListItemButton
                        sx={buttonStyle}
                        onClick={() => {
                          router.push('/dashboard/analytics');
                          setIsPopperOpen(false);
                          setAnchorEl(null);
                        }}
                      >
                        <Typography variant="caption" color="primary" sx={{ textAlign: 'center', width: '100%' }}>
                          View all {filteredEvents.length} results
                        </Typography>
                      </ListItemButton>
                    )}
                  </List>
                )}
              </ClickAwayListener>
            </MainCard>
          </Fade>
        )}
      </Popper>
    </>
  );
}
