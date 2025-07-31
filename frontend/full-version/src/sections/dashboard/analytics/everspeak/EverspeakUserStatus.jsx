'use client';

import { useState, useEffect } from 'react';

// @mui
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import { useTheme } from '@mui/material/styles';

// @third-party
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

// @project
import MainCard from '@/components/MainCard';
import analyticsService from '@/services/analyticsService';

// @assets
import { IconUsers, IconCrown, IconStar, IconTrendingUp } from '@tabler/icons-react';



/***************************  CUSTOM TOOLTIP  ***************************/

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
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
          {data.name}
        </Typography>
        <Typography variant="body2">
          Users: {data.value.toLocaleString()}
        </Typography>
        <Typography variant="body2">
          Percentage: {data.percentage}%
        </Typography>
        <Typography variant="body2">
          Revenue: {data.revenue}
        </Typography>
      </Box>
    );
  }
  return null;
};

/***************************  CUSTOM LEGEND  ***************************/



/***************************  EVERSPEAK - USER STATUS  ***************************/

export default function EverspeakUserStatus() {
  const theme = useTheme();
  const [userStatusData, setUserStatusData] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [animatedData, setAnimatedData] = useState([]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const data = await analyticsService.fetchUserAnalytics();
        
        // Map icons to data
        const dataWithIcons = data.user_distribution.map(item => ({
          ...item,
          icon: item.name === 'Free Users' ? IconUsers :
                item.name === 'Paid Users' ? IconStar : IconCrown
        }));
        
        setUserStatusData(dataWithIcons);
        setTotalUsers(data.total_users);
        setError(null);
        
        // Animate data after load
        setTimeout(() => {
          setAnimatedData(dataWithIcons);
        }, 300);
      } catch (err) {
        console.error('Failed to fetch user analytics:', err);
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
    
    // Set up auto-refresh every 60 seconds
    const interval = setInterval(fetchUserData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <MainCard title="User Distribution" border>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </MainCard>
    );
  }

  if (error || !userStatusData || userStatusData.length === 0) {
    return (
      <MainCard title="User Distribution" border>
        <Box sx={{ textAlign: 'center', color: 'text.secondary', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {error || 'No user data available'}
        </Box>
      </MainCard>
    );
  }

  return (
    <MainCard title="User Distribution" border>
      <Stack spacing={3}>
        {/* Chart */}
        <Box sx={{ height: 250, position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={animatedData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                animationBegin={0}
                animationDuration={800}
              >
                {animatedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center Total */}
          <Box sx={{ 
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none'
          }}>
            <Typography variant="h4" fontWeight={700} color="primary">
              {totalUsers.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Users
            </Typography>
          </Box>
        </Box>

        {/* Legend with Details */}
        <Stack spacing={2}>
          {userStatusData.map((item, index) => {
            const Icon = item.icon;
            return (
              <Box key={index} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: item.color
                      }}
                    />
                    <Icon size={18} style={{ color: item.color }} />
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {item.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.percentage}% of total users
                      </Typography>
                    </Box>
                  </Stack>
                  
                  <Stack alignItems="flex-end" spacing={0.5}>
                    <Typography variant="h6" fontWeight={600}>
                      {item.value.toLocaleString()}
                    </Typography>
                    <Chip
                      label={item.revenue}
                      size="small"
                      variant="outlined"
                      color={index === 0 ? 'default' : 'success'}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {item.avgUsage}
                    </Typography>
                  </Stack>
                </Stack>
              </Box>
            );
          })}
        </Stack>

        {/* Summary Stats */}
        <Box sx={{ p: 2, bgcolor: 'primary.lighter', borderRadius: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" alignItems="center" spacing={1}>
              <IconTrendingUp size={18} color={theme.palette.primary.main} />
              <Typography variant="body2" fontWeight={500}>
                User Growth Rate
              </Typography>
            </Stack>
            <Chip
              label="+12.3% this month"
              color="primary"
              variant="filled"
              size="small"
            />
          </Stack>
        </Box>
      </Stack>
    </MainCard>
  );
} 