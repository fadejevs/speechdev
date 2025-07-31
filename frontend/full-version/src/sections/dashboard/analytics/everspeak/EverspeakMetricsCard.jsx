'use client';

import { useState, useEffect } from 'react';

// @mui
import { useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid2';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

// @project
import OverviewCard from '@/components/cards/OverviewCard';
import { getRadiusStyles } from '@/utils/getRadiusStyles';
import analyticsService from '@/services/analyticsService';

// @assets
import { IconArrowUp, IconArrowDown, IconUsers, IconApi, IconCurrency } from '@tabler/icons-react';

/***************************  CARDS - BORDER WITH RADIUS  ***************************/

export function applyBorderWithRadius(radius, theme) {
  return {
    overflow: 'hidden',
    '--Grid-borderWidth': '1px',
    borderTop: 'var(--Grid-borderWidth) solid',
    borderLeft: 'var(--Grid-borderWidth) solid',
    borderColor: 'divider',
    '& > div': {
      overflow: 'hidden',
      borderRight: 'var(--Grid-borderWidth) solid',
      borderBottom: 'var(--Grid-borderWidth) solid',
      borderColor: 'divider',
      [theme.breakpoints.down('md')]: {
        '&:nth-of-type(1)': getRadiusStyles(radius, 'topLeft'),
        '&:nth-of-type(2)': getRadiusStyles(radius, 'topRight'),
        '&:nth-of-type(3)': getRadiusStyles(radius, 'bottomLeft'),
        '&:nth-of-type(4)': getRadiusStyles(radius, 'bottomRight')
      },
      [theme.breakpoints.up('md')]: {
        '&:first-of-type': getRadiusStyles(radius, 'topLeft', 'bottomLeft'),
        '&:last-of-type': getRadiusStyles(radius, 'topRight', 'bottomRight')
      }
    }
  };
}

/***************************  EVERSPEAK - METRICS CARD  ***************************/

export default function EverspeakMetricsCard() {
  const theme = useTheme();
  const [metrics, setMetrics] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMetrics = async (isInitial = false) => {
      try {
        if (isInitial) {
          setInitialLoading(true);
        }
        const data = await analyticsService.fetchOverviewMetrics();
        
        // Transform API data to component format
        const transformedMetrics = [
          {
            title: 'Active Sessions',
            value: data.active_sessions?.toLocaleString() || '0',
            compare: 'Live event sessions',
            chip: {
              label: '12.3%',
              variant: 'combined',
              color: 'success',
              icon: IconArrowUp
            },
            avatar: {
              color: 'primary',
              icon: IconUsers
            }
          },
          {
            title: 'API Calls Today',
            value: data.api_calls_today?.toLocaleString() || '0',
            compare: 'Requests processed',
            chip: {
              label: '8.7%',
              variant: 'combined',
              color: 'success',
              icon: IconArrowUp
            },
            avatar: {
              color: 'secondary',
              icon: IconApi
            }
          },
          {
            title: 'Daily Costs',
            value: `$${data.daily_cost || '0'}`,
            compare: 'Operational expenses',
            chip: {
              label: '2.1%',
              variant: 'combined',
              color: 'error',
              icon: IconArrowDown
            },
            avatar: {
              color: 'warning',
              icon: IconCurrency
            }
          },
          {
            title: 'Monthly Est.',
            value: `$${data.monthly_cost_estimate || '0'}`,
            compare: 'Projected monthly cost',
            chip: {
              label: '15.2%',
              variant: 'combined',
              color: 'success',
              icon: IconArrowUp
            },
            avatar: {
              color: 'success',
              icon: IconCurrency
            }
          }
        ];
        
        setMetrics(transformedMetrics);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch metrics:', err);
        setError('Failed to load metrics');
      } finally {
        if (isInitial) {
          setInitialLoading(false);
        }
      }
    };

    // Initial fetch with loading state
    fetchMetrics(true);
    
    // Set up auto-refresh every 30 seconds (silent updates)
    const interval = setInterval(() => fetchMetrics(false), 30000);
    return () => clearInterval(interval);
  }, []);

  if (initialLoading) {
    return (
      <Grid container size={12} sx={{ ...applyBorderWithRadius(1, theme), minHeight: 120 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          <CircularProgress />
        </Box>
      </Grid>
    );
  }

  if (error || !metrics) {
    return (
      <Grid container size={12} sx={{ ...applyBorderWithRadius(1, theme), minHeight: 120 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
            {error || 'Failed to load metrics'}
          </Box>
        </Box>
      </Grid>
    );
  }

  return (
    <Grid container size={12} sx={{ ...applyBorderWithRadius(1, theme) }}>
      {metrics.map((item, index) => (
        <Grid key={index} size={{ xs: 6, md: 3 }}>
          <OverviewCard {...item} />
        </Grid>
      ))}
    </Grid>
  );
} 