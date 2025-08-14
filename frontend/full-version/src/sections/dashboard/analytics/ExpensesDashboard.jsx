'use client';

import React from 'react';
import { Box, Grid, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';

const StatCard = ({ title, value, hint }) => (
  <Paper sx={{ p: 2, borderRadius: 2 }}>
    <Typography variant="overline" sx={{ color: '#637381' }}>{title}</Typography>
    <Typography variant="h5" sx={{ color: '#212B36', fontWeight: 600 }}>{value}</Typography>
    {hint ? (<Typography variant="caption" sx={{ color: '#919EAB' }}>{hint}</Typography>) : null}
  </Paper>
);

const ExpensesDashboard = () => {
  // Placeholder costs; wire to billing_rates + daily_aggregates later
  const services = [
    { service: 'Speech Recognition', calls: 1727, unit: 'min', unitCost: 0.00444, quantity: 950, cost: 4.22 },
    { service: 'Translation', calls: 63, unit: 'char', unitCost: 0.00000549, quantity: 98000, cost: 0.54 },
    { service: 'LLM', calls: 210, unit: 'tok', unitCost: 0.000045, quantity: 250000, cost: 11.25 },
    { service: 'TTS', calls: 67, unit: 'char', unitCost: 0.000015, quantity: 45000, cost: 0.68 }
  ];

  const total = services.reduce((s, r) => s + r.cost, 0);

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total cost (7d)" value={`$${total.toFixed(2)}`} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Top spender" value={services.sort((a,b)=>b.cost-a.cost)[0].service} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Calls (7d)" value={services.reduce((s,r)=>s+r.calls,0)} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Window" value="7 days" />
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>Service Costs</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Service</TableCell>
              <TableCell align="right">Calls</TableCell>
              <TableCell align="right">Unit</TableCell>
              <TableCell align="right">Unit Price</TableCell>
              <TableCell align="right">Quantity</TableCell>
              <TableCell align="right">Cost</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {services.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.service}</TableCell>
                <TableCell align="right">{r.calls}</TableCell>
                <TableCell align="right">{r.unit}</TableCell>
                <TableCell align="right">${r.unitCost.toFixed(6)}</TableCell>
                <TableCell align="right">{r.quantity.toLocaleString()}</TableCell>
                <TableCell align="right">${r.cost.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default ExpensesDashboard;

