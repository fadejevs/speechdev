'use client';

import { useState, useEffect } from 'react';

// @mui
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import { useTheme } from '@mui/material/styles';

// @project
import MainCard from '@/components/MainCard';
import analyticsService from '@/services/analyticsService';

// @assets
import { IconCurrency, IconTrendingUp, IconTrendingDown, IconAlertTriangle } from '@tabler/icons-react';

/***************************  EVERSPEAK - COST ANALYTICS  ***************************/

export default function EverspeakCostAnalytics() {
  const theme = useTheme();
  const [costData, setCostData] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCostData = async (isInitial = false) => {
      try {
        if (isInitial) {
          setInitialLoading(true);
        }
        const data = await analyticsService.fetchCostAnalytics();
        setCostData(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch cost analytics:', err);
        setError('Failed to load cost data');
      } finally {
        if (isInitial) {
          setInitialLoading(false);
        }
      }
    };

    // Initial fetch with loading state
    fetchCostData(true);
    
    // Set up auto-refresh every 2 minutes for cost monitoring (silent updates)
    const interval = setInterval(() => fetchCostData(false), 120000);
    return () => clearInterval(interval);
  }, []);

  if (initialLoading) {
    return (
      <MainCard title="Cost Analytics">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <CircularProgress />
        </Box>
      </MainCard>
    );
  }

  if (error || !costData) {
    return (
      <MainCard title="Cost Analytics">
        <Box sx={{ textAlign: 'center', color: 'text.secondary', minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {error || 'No cost data available'}
        </Box>
      </MainCard>
    );
  }

  const getServiceColor = (serviceName) => {
    switch (serviceName) {
      case 'azure_speech': return '#0078d4';
      case 'deepl_translation': return '#0f2b5c';
      case 'openai_tts_llm': return '#10a37f';
      case 'infrastructure': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getServiceIcon = (serviceName) => {
    switch (serviceName) {
      case 'azure_speech': return '🎤';
      case 'deepl_translation': return '🌐';
      case 'openai_tts_llm': return '🤖';
      case 'infrastructure': return '🏗️';
      default: return '💰';
    }
  };

  return (
    <MainCard title="Cost Analytics">
      <Stack spacing={3}>
        {/* Daily Total */}
        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.lighter', borderRadius: 1 }}>
          <Stack alignItems="center" spacing={1}>
            <IconCurrency size={24} color={theme.palette.primary.main} />
            <Typography variant="h4" fontWeight={700} color="primary">
              ${costData.daily_total}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Today's Total Cost
            </Typography>
            <Chip
              icon={<IconTrendingUp size={14} />}
              label={`$${costData.monthly_total}/mo projected`}
              color="warning"
              size="small"
              variant="outlined"
            />
          </Stack>
        </Box>

        {/* Cost Breakdown */}
        <Box>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            Service Breakdown
          </Typography>
          <Stack spacing={2}>
            {Object.entries(costData.cost_breakdown).map(([key, service]) => (
              <Box key={key} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ fontSize: '16px' }}>
                      {getServiceIcon(key)}
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {service.requests !== undefined ? `${service.requests} requests` : 'Infrastructure'}
                      </Typography>
                    </Box>
                  </Stack>
                  
                                     <Stack alignItems="flex-end" spacing={0.5}>
                     <Typography variant="h6" fontWeight={600} color={getServiceColor(key)}>
                       ${service.daily_cost || 0}
                     </Typography>
                     <Typography variant="caption" color="text.secondary">
                       ${service.monthly_estimate || 0}/mo
                     </Typography>
                   </Stack>
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* Cost Insights */}
        <Box sx={{ p: 2, bgcolor: 'warning.lighter', borderRadius: 1 }}>
          <Stack spacing={1}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <IconAlertTriangle size={18} color={theme.palette.warning.main} />
              <Typography variant="body2" fontWeight={500}>
                Cost Insights
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Highest cost: {costData.highest_cost_service?.replace(/_/g, ' ')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Cost per transcript: ${costData.cost_per_transcript}
            </Typography>
          </Stack>
        </Box>

        {/* Monthly Trend */}
        <Box>
          <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
            6-Month Cost Trend
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="space-between">
            {costData.cost_trend?.slice(-6).map((month, index) => (
              <Box key={index} sx={{ textAlign: 'center', flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {month.month}
                </Typography>
                <Box sx={{ 
                  height: Math.max(20, (month.cost / 400) * 60), 
                  bgcolor: index === 5 ? 'primary.main' : 'grey.300',
                  borderRadius: 1,
                  mt: 0.5
                }} />
                <Typography variant="caption" fontWeight={500}>
                  ${month.cost}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      </Stack>
    </MainCard>
  );
} 