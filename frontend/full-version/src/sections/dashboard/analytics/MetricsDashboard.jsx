'use client';

import React from 'react';
import { Box, Grid, Paper, Typography, Alert, Table, TableBody, TableCell, TableHead, TableRow, Chip, Stack } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

const StatCard = ({ title, value, subtitle, critical }) => (
  <Paper sx={{ p: 2, borderRadius: 2 }}>
    <Typography variant="overline" sx={{ color: critical ? '#D14343' : '#637381' }}>{title}</Typography>
    <Stack direction="row" alignItems="center" spacing={1}>
      <Typography variant="h5" sx={{ color: '#212B36', fontWeight: 600 }}>{value}</Typography>
      {critical ? <ErrorOutlineIcon sx={{ color: '#D14343' }} /> : null}
    </Stack>
    {subtitle ? (<Typography variant="caption" sx={{ color: '#919EAB' }}>{subtitle}</Typography>) : null}
  </Paper>
);

const ServiceRow = ({ name, subtitle, status, errorRate, latency, calls, highlight }) => (
  <TableRow sx={{ bgcolor: highlight ? 'rgba(255, 86, 48, 0.04)' : 'transparent' }}>
    <TableCell>
      <Stack spacing={0.5}>
        <Typography sx={{ fontWeight: 600 }}>{name}</Typography>
        {subtitle ? <Typography variant="caption" sx={{ color: '#637381' }}>{subtitle}</Typography> : null}
      </Stack>
    </TableCell>
    <TableCell>
      <Chip
        size="small"
        label={status}
        color={status === 'healthy' ? 'success' : status === 'unknown' ? 'default' : 'warning'}
        variant={status === 'healthy' ? 'filled' : 'outlined'}
      />
    </TableCell>
    <TableCell>{errorRate}</TableCell>
    <TableCell>{latency}</TableCell>
    <TableCell>{calls}</TableCell>
  </TableRow>
);

const MetricsDashboard = () => {
  const [lastUpdated, setLastUpdated] = React.useState(new Date());
  const [autoRefreshSec] = React.useState(15);

  // Placeholder data; wire to Supabase later
  const issues = [
    'Translation appears to be down - no activity in 5+ minutes',
    'Translation has 49.2% error rate (max: 3%)',
    'Text Processing appears to be down - no activity in 5+ minutes'
  ];

  const services = [
    { name: 'Speech Recognition', subtitle: 'Real-time transcription', status: 'unknown', errorRate: '0.0%', latency: '0ms', calls: 0 },
    { name: 'Translation', subtitle: 'Multi-language support', status: 'healthy', errorRate: '49.2%', latency: '671ms', calls: 63, highlight: true },
    { name: 'Text Processing', subtitle: 'Content cleaning & formatting', status: 'healthy', errorRate: '0.0%', latency: '1220ms', calls: 210, highlight: true },
    { name: 'Voice Synthesis', subtitle: 'Text-to-speech output', status: 'healthy', errorRate: '77.6%', latency: '2008ms', calls: 67, highlight: true },
    { name: 'Real-time Comms', subtitle: 'Live event streaming', status: 'unknown', errorRate: '0.0%', latency: '0ms', calls: 0 },
    { name: 'Database', subtitle: 'Data storage & retrieval', status: 'healthy', errorRate: '0.1%', latency: '73ms', calls: 1371 }
  ];

  React.useEffect(() => {
    const id = setInterval(() => setLastUpdated(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const servicesOnline = `${services.filter((s) => s.status === 'healthy').length}/${services.length}`;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Operations Dashboard</Typography>
          <Typography variant="caption" sx={{ color: '#637381' }}>Real-time monitoring for live events</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <AccessTimeIcon sx={{ fontSize: 16, color: '#919EAB' }} />
          <Typography variant="caption" sx={{ color: '#919EAB' }}>{lastUpdated.toLocaleTimeString()}</Typography>
        </Stack>
      </Stack>

      {issues.length > 0 ? (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          <Typography sx={{ fontWeight: 600, mb: 0.5 }}>{issues.length} issues detected</Typography>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {issues.slice(0, 3).map((t, i) => (
              <li key={i}>
                <Typography variant="body2">{t}</Typography>
              </li>
            ))}
            {issues.length > 3 ? <li><Typography variant="body2">+{issues.length - 3} more issues</Typography></li> : null}
          </ul>
        </Alert>
      ) : (
        <Alert icon={<CheckIcon fontSize="inherit" />} severity="success" sx={{ mb: 2, borderRadius: 2 }}>
          All systems nominal
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="System Status" value={issues.length > 0 ? 'Issues' : 'OK'} subtitle={`${issues.length} issues`} critical={issues.length > 0} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Services Online" value={servicesOnline} subtitle={`${Math.round((services.filter((s)=>s.status==='healthy').length/services.length)*100)}% operational`} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Calls Today" value="—" subtitle="API requests" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Auto-refresh" value={`${autoRefreshSec}s`} subtitle="Real-time updates" />
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>Service Status</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Service</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Error Rate</TableCell>
              <TableCell>Avg Latency</TableCell>
              <TableCell>Calls Today</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {services.map((s, i) => (
              <ServiceRow key={i} {...s} />
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default MetricsDashboard;

