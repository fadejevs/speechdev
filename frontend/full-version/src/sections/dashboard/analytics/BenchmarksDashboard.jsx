'use client';

import React from 'react';
import { Box, Grid, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, Stack, Chip } from '@mui/material';

const StatCard = ({ title, value, hint }) => (
  <Paper sx={{ p: 2, borderRadius: 2 }}>
    <Typography variant="overline" sx={{ color: '#637381' }}>{title}</Typography>
    <Typography variant="h5" sx={{ color: '#212B36', fontWeight: 600 }}>{value}</Typography>
    {hint ? (<Typography variant="caption" sx={{ color: '#919EAB' }}>{hint}</Typography>) : null}
  </Paper>
);

const BenchmarksDashboard = () => {
  // Placeholder benchmark data; connect to Supabase rollups in follow-up
  const latency = [
    { service: 'Speech Recognition', p50: 120, p90: 350, p99: 900, slaMs: 800 },
    { service: 'Translation', p50: 650, p90: 1100, p99: 2400, slaMs: 1500 },
    { service: 'Text Processing', p50: 950, p90: 1600, p99: 3000, slaMs: 2000 }
  ];

  const slaPassed = latency.filter((r) => r.p90 <= r.slaMs).length;

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="SLA Pass (p90)" value={`${slaPassed}/${latency.length}`} hint="Services within target" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Best p99 (ms)" value={`${Math.min(...latency.map(l=>l.p99))}ms`} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Worst p99 (ms)" value={`${Math.max(...latency.map(l=>l.p99))}ms`} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Window" value="7 days" />
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>Latency Benchmarks</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Service</TableCell>
              <TableCell>p50 (ms)</TableCell>
              <TableCell>p90 (ms)</TableCell>
              <TableCell>p99 (ms)</TableCell>
              <TableCell>SLA</TableCell>
              <TableCell>State</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {latency.map((r, idx) => {
              const pass = r.p90 <= r.slaMs;
              return (
                <TableRow key={idx}>
                  <TableCell>{r.service}</TableCell>
                  <TableCell>{r.p50}</TableCell>
                  <TableCell>{r.p90}</TableCell>
                  <TableCell>{r.p99}</TableCell>
                  <TableCell>{r.slaMs} ms (p90)</TableCell>
                  <TableCell>
                    <Chip label={pass ? 'within' : 'breach'} size="small" color={pass ? 'success' : 'error'} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 2, borderRadius: 2, mt: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>Trend (p50/p90/p99)</Typography>
        <Box sx={{ height: 220, bgcolor: '#F9FAFB', borderRadius: 1 }} />
      </Paper>
    </Box>
  );
};

export default BenchmarksDashboard;

