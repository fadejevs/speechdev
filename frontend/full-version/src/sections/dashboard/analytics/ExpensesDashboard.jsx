'use client';

import React, { useState } from 'react';
import { Box, Grid, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, Select, MenuItem, FormControl, InputLabel } from '@mui/material';

const StatCard = ({ title, value, hint }) => (
  <Paper sx={{ p: 2, borderRadius: 2 }}>
    <Typography variant="overline" sx={{ color: '#637381' }}>{title}</Typography>
    <Typography variant="h5" sx={{ color: '#212B36', fontWeight: 600 }}>{value}</Typography>
    {hint ? (<Typography variant="caption" sx={{ color: '#919EAB' }}>{hint}</Typography>) : null}
  </Paper>
);

const ExpensesDashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('7d');

  // Realistic cost data based on ASR benchmark pricing
  const services = [
    { 
      service: 'Azure Speech (RT)', 
      calls: 1727, 
      unit: 'min', 
      unitCost: 0.01667, 
      quantity: 950, 
      cost: 15.83,
      model: 'azure'
    },
    { 
      service: 'OpenAI Whisper', 
      calls: 63, 
      unit: 'min', 
      unitCost: 0.006, 
      quantity: 980, 
      cost: 5.88,
      model: 'whisper'
    },
    { 
      service: 'GPT-4o Transcribe', 
      calls: 210, 
      unit: 'min', 
      unitCost: 0.006, 
      quantity: 250, 
      cost: 1.50,
      model: 'gpt-4o-transcribe'
    },
    { 
      service: 'Groq Whisper', 
      calls: 67, 
      unit: 'min', 
      unitCost: 0.00067, 
      quantity: 450, 
      cost: 0.30,
      model: 'groq-whisper-large-v3-turbo'
    },
    { 
      service: 'Translation (Azure)', 
      calls: 1200, 
      unit: 'char', 
      unitCost: 0.00000549, 
      quantity: 45000, 
      cost: 0.25,
      model: 'azure-translator'
    },
    { 
      service: 'LLM Processing', 
      calls: 180, 
      unit: 'tok', 
      unitCost: 0.000045, 
      quantity: 180000, 
      cost: 8.10,
      model: 'gpt-4o'
    },
    { 
      service: 'TTS (Azure)', 
      calls: 45, 
      unit: 'char', 
      unitCost: 0.000016, 
      quantity: 25000, 
      cost: 0.40,
      model: 'azure-tts'
    }
  ];

  const total = services.reduce((s, r) => s + r.cost, 0);
  const topSpender = services.sort((a,b) => b.cost - a.cost)[0];
  const totalCalls = services.reduce((s, r) => s + r.calls, 0);

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total cost (7d)" value={`$${total.toFixed(2)}`} hint="All services combined" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Top spender" value={topSpender.service} hint={`$${topSpender.cost.toFixed(2)}`} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total calls" value={totalCalls.toLocaleString()} hint="API requests" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Avg cost/day" value={`$${(total / 7).toFixed(2)}`} hint="Daily average" />
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, borderRadius: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Service Costs Breakdown</Typography>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Period</InputLabel>
            <Select
              value={selectedPeriod}
              label="Period"
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <MenuItem value="1d">Last 24h</MenuItem>
              <MenuItem value="7d">Last 7 days</MenuItem>
              <MenuItem value="30d">Last 30 days</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Service</TableCell>
              <TableCell align="right">Calls</TableCell>
              <TableCell align="right">Unit</TableCell>
              <TableCell align="right">Unit Price</TableCell>
              <TableCell align="right">Quantity</TableCell>
              <TableCell align="right">Cost</TableCell>
              <TableCell align="right">% of Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {services.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.service}</TableCell>
                <TableCell align="right">{r.calls.toLocaleString()}</TableCell>
                <TableCell align="right">{r.unit}</TableCell>
                <TableCell align="right">${r.unitCost.toFixed(6)}</TableCell>
                <TableCell align="right">{r.quantity.toLocaleString()}</TableCell>
                <TableCell align="right">${r.cost.toFixed(2)}</TableCell>
                <TableCell align="right">{((r.cost / total) * 100).toFixed(1)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>Cost Trend</Typography>
        <Box sx={{ height: 220, bgcolor: '#F9FAFB', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Cost trend chart coming soon...
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default ExpensesDashboard;

