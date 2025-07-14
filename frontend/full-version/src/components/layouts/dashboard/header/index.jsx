'use client';

import { usePathname } from 'next/navigation';
import { Typography, Box, Breadcrumbs } from '@mui/material';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const Header = ({ onOpenNav }) => {
  const pathname = usePathname();
  const [eventName, setEventName] = useState('Demo Event');

  // Fetch the event name when on an event page
  useEffect(() => {
    if (pathname.includes('/events/') && !pathname.endsWith('/events')) {
      const eventId = pathname.split('/').pop();

      // Get event data from localStorage
      try {
        const savedEvents = localStorage.getItem('eventData');
        if (savedEvents) {
          const events = JSON.parse(savedEvents);
          const event = events.find((e) => e.id.toString() === eventId);
          if (event) {
            setEventName(event.title || 'Demo Event');
          }
        }
      } catch (error) {
        console.error('Error fetching event name:', error);
      }
    }
  }, [pathname]);

  // Only render breadcrumbs on event pages
  const shouldShowBreadcrumbs = pathname.includes('/events/') && !pathname.endsWith('/events');

  return (
    <Box
      component="header"
      sx={{
        display: 'flex',
        alignItems: 'center',
        height: 64,
        px: 2,
        borderBottom: '1px solid #f0f0f0',
        backgroundColor: 'background.default'
      }}
    >
      {shouldShowBreadcrumbs && (
        <Breadcrumbs separator={<KeyboardArrowRightIcon fontSize="small" sx={{ color: 'text.secondary' }} />} aria-label="breadcrumb">
          <Link href="/dashboard/analytics" style={{ textDecoration: 'none' }}>
            <Typography
              variant="subtitle1"
              color="text.secondary"
              sx={{
                fontWeight: 500,
                '&:hover': { color: 'primary.main' }
              }}
            >
              My Events
            </Typography>
          </Link>
          <Typography variant="subtitle1" color="text.primary" fontWeight={500}>
            {eventName}
          </Typography>
        </Breadcrumbs>
      )}

      {/* Add your other header content here */}
    </Box>
  );
};

export default Header;
