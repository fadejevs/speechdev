'use client';

import React from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';

const StatCard = ({ title, value, hint }) => (
  <Paper sx={{ p: 2, borderRadius: 2 }}>
    <Typography variant="overline" sx={{ color: '#637381' }}>{title}</Typography>
    <Typography variant="h5" sx={{ color: '#212B36', fontWeight: 600 }}>{value}</Typography>
    {hint ? (<Typography variant="caption" sx={{ color: '#919EAB' }}>{hint}</Typography>) : null}
  </Paper>
);

const MetricsDashboard = () => {
  // Placeholder values; wire to Supabase in follow-up
  const stats = [
    { title: 'Throughput (calls/min)', value: '—' },
    { title: 'Error rate', value: '—' },
    { title: 'p50 / p90 / p99 (ms)', value: '—' },
    { title: 'Active users (24h)', value: '—' }
  ];

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {stats.map((s, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <StatCard title={s.title} value={s.value} hint={s.hint} />
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>Latency over time</Typography>
        <Box sx={{ height: 220, bgcolor: '#F9FAFB', borderRadius: 1 }} />
      </Paper>
    </Box>
  );
};

export default MetricsDashboard;

