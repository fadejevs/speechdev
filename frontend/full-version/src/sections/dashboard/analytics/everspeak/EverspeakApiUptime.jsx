'use client';

import { useState, useEffect } from 'react';

// @mui
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import { useTheme } from '@mui/material/styles';

// @project
import MainCard from '@/components/MainCard';
import analyticsService from '@/services/analyticsService';

// @assets
import { IconCircleCheck, IconCircleX, IconClock } from '@tabler/icons-react';



/***************************  STATUS INDICATORS  ***************************/

const getStatusChip = (status, theme) => {
  switch (status) {
    case 'online':
      return (
        <Chip
          icon={<IconCircleCheck size={16} />}
          label="Online"
          size="small"
          color="success"
          variant="outlined"
        />
      );
    case 'degraded':
      return (
        <Chip
          icon={<IconClock size={16} />}
          label="Degraded"
          size="small"
          color="warning"
          variant="outlined"
        />
      );
    case 'offline':
      return (
        <Chip
          icon={<IconCircleX size={16} />}
          label="Offline"
          size="small"
          color="error"
          variant="outlined"
        />
      );
    default:
      return null;
  }
};

const getUptimeColor = (uptime) => {
  if (uptime >= 99.5) return 'success';
  if (uptime >= 98.0) return 'warning';
  return 'error';
};

/***************************  EVERSPEAK - API UPTIME  ***************************/

export default function EverspeakApiUptime() {
  const theme = useTheme();
  const [services, setServices] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchApiStatus = async (isInitial = false) => {
      try {
        if (isInitial) {
          setInitialLoading(true);
        }
        const data = await analyticsService.fetchApiStatus();
        setServices(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch API status:', err);
        setError('Failed to load API status');
      } finally {
        if (isInitial) {
          setInitialLoading(false);
        }
      }
    };

    // Initial fetch with loading state
    fetchApiStatus(true);
    
    // Set up auto-refresh every 10 seconds for real-time monitoring (silent updates)
    const interval = setInterval(() => fetchApiStatus(false), 10000);
    return () => clearInterval(interval);
  }, []);

  if (initialLoading) {
    return (
      <MainCard title="API Services Status">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress />
        </Box>
      </MainCard>
    );
  }

  if (error || !services || services.length === 0) {
    return (
      <MainCard title="API Services Status">
        <Box sx={{ textAlign: 'center', color: 'text.secondary', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {error || 'No API status data available'}
        </Box>
      </MainCard>
    );
  }

  const overallStatus = services.every(s => s.status === 'online') ? 'All Systems Operational' : 
                       services.some(s => s.status === 'offline') ? 'System Issues Detected' : 
                       'Some Services Degraded';
  
  const overallStatusColor = services.every(s => s.status === 'online') ? 'success' : 
                            services.some(s => s.status === 'offline') ? 'error' : 'warning';

  return (
    <MainCard title="API Services Status">
      <Stack spacing={2}>
        {services.map((service, index) => (
          <Box key={index}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={500}>
                {service.name}
              </Typography>
              {getStatusChip(service.status, theme)}
            </Stack>
            
            <Stack direction="row" spacing={3} alignItems="center" sx={{ mb: 1 }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Uptime
                  </Typography>
                  <Typography variant="caption" fontWeight={500}>
                    {service.uptime.toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={service.uptime}
                  color={getUptimeColor(service.uptime)}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
              
              <Box sx={{ minWidth: 80 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Response Time
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {service.response_time}
                </Typography>
              </Box>
              
              <Box sx={{ minWidth: 70 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Cost/Hour
                </Typography>
                <Typography variant="body2" fontWeight={500} color="warning.main">
                  {service.cost_per_hour || 'N/A'}
                </Typography>
              </Box>
            </Stack>
            
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">
                Last incident: {service.last_incident}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Usage today: {service.usage_today}
              </Typography>
            </Stack>
            
            {index < services.length - 1 && (
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }} />
            )}
          </Box>
        ))}
        
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" fontWeight={500}>
              Overall System Status
            </Typography>
            <Chip
              icon={overallStatusColor === 'success' ? <IconCircleCheck size={16} /> : 
                    overallStatusColor === 'error' ? <IconCircleX size={16} /> : 
                    <IconClock size={16} />}
              label={overallStatus}
              color={overallStatusColor}
              variant="filled"
              size="small"
            />
          </Stack>
        </Box>
      </Stack>
    </MainCard>
  );
} 