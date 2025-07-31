'use client';

import { useState, useEffect } from 'react';

// @mui
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid2';
import CircularProgress from '@mui/material/CircularProgress';
import { useTheme } from '@mui/material/styles';

// @third-party
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

// @project
import MainCard from '@/components/MainCard';
import analyticsService from '@/services/analyticsService';

// @assets
import { IconTrendingUp, IconTrendingDown, IconCurrency, IconCalendarMonth } from '@tabler/icons-react';



/***************************  CUSTOM TOOLTIP  ***************************/

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <Box sx={{ 
        bgcolor: 'background.paper', 
        p: 2, 
        border: 1, 
        borderColor: 'divider',
        borderRadius: 1,
        boxShadow: 2
      }}>
        <Typography variant="subtitle2" fontWeight={600}>
          {label}
        </Typography>
        {payload.map((entry, index) => (
          <Typography key={index} variant="body2" sx={{ color: entry.color }}>
            {entry.name}: ${entry.value}
          </Typography>
        ))}
      </Box>
    );
  }
  return null;
};

/***************************  EVERSPEAK - LTV CARD  ***************************/

export default function EverspeakLtvCard() {
  const theme = useTheme();
  const [ltvData, setLtvData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [animatedData, setAnimatedData] = useState([]);

  useEffect(() => {
    const fetchLtvData = async () => {
      try {
        setLoading(true);
        const data = await analyticsService.fetchLtvAnalytics();
        setLtvData(data);
        setError(null);
        
        // Animate chart data after load
        setTimeout(() => {
          setAnimatedData(data.trend_data);
        }, 300);
      } catch (err) {
        console.error('Failed to fetch LTV analytics:', err);
        setError('Failed to load LTV data');
      } finally {
        setLoading(false);
      }
    };

    fetchLtvData();
    
    // Set up auto-refresh every 5 minutes
    const interval = setInterval(fetchLtvData, 300000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <MainCard title="Customer Lifetime Value (LTV)" border>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </MainCard>
    );
  }

  if (error || !ltvData) {
    return (
      <MainCard title="Customer Lifetime Value (LTV)" border>
        <Box sx={{ textAlign: 'center', color: 'text.secondary', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {error || 'No LTV data available'}
        </Box>
      </MainCard>
    );
  }

  return (
    <MainCard title="Customer Lifetime Value (LTV)" border>
      <Grid container spacing={3}>
        {/* LTV Overview Cards */}
        <Grid size={12}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 3 }}>
              <Box sx={{ p: 2, bgcolor: 'primary.lighter', borderRadius: 1, textAlign: 'center' }}>
                <Stack alignItems="center" spacing={1}>
                                     <IconCurrency size={24} color={theme.palette.primary.main} />
                   <Typography variant="h4" fontWeight={700} color="primary">
                     ${ltvData.current_ltv}
                   </Typography>
                   <Typography variant="caption" color="text.secondary">
                     Average LTV
                   </Typography>
                   <Chip
                     icon={<IconTrendingUp size={14} />}
                     label={`+${ltvData.ltv_growth}%`}
                     color="success"
                     size="small"
                     variant="outlined"
                   />
                </Stack>
              </Box>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 3 }}>
              <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 1, textAlign: 'center' }}>
                <Stack alignItems="center" spacing={1}>
                                     <IconCalendarMonth size={24} color={theme.palette.success.main} />
                   <Typography variant="h4" fontWeight={700} color="success.main">
                     {ltvData.avg_retention_months}
                   </Typography>
                   <Typography variant="caption" color="text.secondary">
                     Avg Months Retained
                   </Typography>
                   <Chip
                     icon={<IconTrendingUp size={14} />}
                     label="+2.1 mo"
                     color="success"
                     size="small"
                     variant="outlined"
                   />
                </Stack>
              </Box>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 3 }}>
              <Box sx={{ p: 2, bgcolor: 'warning.lighter', borderRadius: 1, textAlign: 'center' }}>
                <Stack alignItems="center" spacing={1}>
                                     <IconTrendingDown size={24} color={theme.palette.warning.main} />
                   <Typography variant="h4" fontWeight={700} color="warning.main">
                     {ltvData.churn_rate}%
                   </Typography>
                   <Typography variant="caption" color="text.secondary">
                     Monthly Churn Rate
                   </Typography>
                   <Chip
                     icon={<IconTrendingDown size={14} />}
                     label="-0.3%"
                     color="success"
                     size="small"
                     variant="outlined"
                   />
                </Stack>
              </Box>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 3 }}>
              <Box sx={{ p: 2, bgcolor: 'secondary.lighter', borderRadius: 1, textAlign: 'center' }}>
                <Stack alignItems="center" spacing={1}>
                                     <IconCurrency size={24} color={theme.palette.secondary.main} />
                   <Typography variant="h4" fontWeight={700} color="secondary.main">
                     ${(ltvData.total_ltv_mtd / 1000).toFixed(0)}k
                   </Typography>
                   <Typography variant="caption" color="text.secondary">
                     Total LTV (MTD)
                   </Typography>
                   <Chip
                     icon={<IconTrendingUp size={14} />}
                     label="+12.3%"
                     color="success"
                     size="small"
                     variant="outlined"
                   />
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </Grid>

        {/* LTV Trend Chart */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Box>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              LTV Trend (6 Months)
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={animatedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis 
                    dataKey="month" 
                    stroke={theme.palette.text.secondary}
                    fontSize={12}
                  />
                  <YAxis 
                    stroke={theme.palette.text.secondary}
                    fontSize={12}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="ltv"
                    stroke={theme.palette.primary.main}
                    strokeWidth={3}
                    dot={{ fill: theme.palette.primary.main, strokeWidth: 2, r: 6 }}
                    activeDot={{ r: 8, stroke: theme.palette.primary.main, strokeWidth: 2 }}
                    name="Average LTV"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        </Grid>

        {/* LTV by Customer Segment */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Box>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              LTV by Segment
            </Typography>
                         <Stack spacing={2}>
               {ltvData.ltv_by_segment.map((segment, index) => (
                <Box key={index} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle2" fontWeight={600}>
                        {segment.segment}
                      </Typography>
                      <Chip
                        label={`+${segment.growth}%`}
                        color="success"
                        size="small"
                        variant="outlined"
                      />
                    </Stack>
                    
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6" fontWeight={700} color="primary">
                        ${segment.ltv.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {segment.customers} customers
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Box>
        </Grid>
      </Grid>
    </MainCard>
  );
} 