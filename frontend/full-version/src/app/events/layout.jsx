'use client';

import { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  IconButton, 
  InputBase, 
  Avatar,
  createTheme
} from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useRouter } from 'next/navigation';
import { logout } from '@/utils/api';

// Create a simple theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#6366f1',
    },
    background: {
      default: '#f8f9fa',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

export default function EventsLayout({ children }) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(true);
  
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {/* Sidebar */}
        <Box sx={{ 
          width: drawerOpen ? 240 : 0, 
          bgcolor: '#f8f9fa', 
          borderRight: '1px solid #e0e0e0',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.3s ease',
          overflow: 'hidden'
        }}>
          <Typography sx={{ 
            mb: 1, 
            fontSize: '12px', 
            color: '#637381', 
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Manage
          </Typography>
          
          <Box sx={{ 
            p: 1.5, 
            borderRadius: 1, 
            mb: 1, 
            bgcolor: '#eff3ff', 
            display: 'flex', 
            alignItems: 'center',
            color: '#6366f1'
          }}>
            <Typography>My Events</Typography>
          </Box>
          
          <Box sx={{ mt: 'auto', p: 2, bgcolor: '#f1f5f9', borderRadius: 2 }}>
            <Typography variant="subtitle2">Upgrade your plan</Typography>
            <Typography variant="caption" sx={{ display: 'block', mb: 2 }}>
              Cupiditate omnis at veniam atque sint fugiat quia ut. Harum exce.
            </Typography>
            <Button 
              variant="contained" 
              size="small" 
              sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4338ca' } }}
            >
              Upgrade Now
            </Button>
          </Box>
        </Box>
        
        {/* Main content area */}
        <Box sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column',
          width: { xs: '100%', lg: `calc(100% - ${drawerOpen ? 240 : 0}px)` },
          transition: 'width 0.3s ease, margin 0.3s ease'
        }}>
          {/* Top Navigation Bar */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            px: 2,
            py: 1,
            borderBottom: '1px solid #e0e0e0',
            bgcolor: '#ffffff'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton onClick={handleDrawerToggle} sx={{ mr: 2 }}>
                ≡
              </IconButton>
              <Typography variant="h6" sx={{ color: '#6366f1', fontWeight: 'bold', mr: 3 }}>
                interpretd
              </Typography>
              <Typography sx={{ color: '#637381' }}>My Events</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                bgcolor: '#f5f5f5', 
                borderRadius: '8px',
                px: 2,
                py: 0.5,
                mr: 2
              }}>
                <InputBase
                  placeholder="Search here"
                  sx={{ ml: 1 }}
                />
                <Typography sx={{ mx: 1, color: '#bdbdbd' }}>⌘ K</Typography>
              </Box>
              
              <IconButton sx={{ mr: 1 }}>
                🔔
              </IconButton>
              
              <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={handleLogout}>
                <Avatar 
                  src="https://randomuser.me/api/portraits/women/44.jpg" 
                  sx={{ width: 32, height: 32 }}
                />
                <Box sx={{ ml: 1 }}>
                  <Typography variant="subtitle2">Maija Bitte</Typography>
                  <Typography variant="caption" sx={{ color: '#637381' }}>Admin</Typography>
                </Box>
              </Box>
            </Box>
          </Box>
          
          {/* Page content */}
          <Box component="main" sx={{ p: { xs: 2, sm: 3 }, flexGrow: 1 }}>
            {children}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}