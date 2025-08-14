'use client';

import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, Stack, Chip, Select, MenuItem, FormControl, InputLabel } from '@mui/material';

const StatCard = ({ title, value, hint }) => (
  <Paper sx={{ p: 2, borderRadius: 2 }}>
    <Typography variant="overline" sx={{ color: '#637381' }}>{title}</Typography>
    <Typography variant="h5" sx={{ color: '#212B36', fontWeight: 600 }}>{value}</Typography>
    {hint ? (<Typography variant="caption" sx={{ color: '#919EAB' }}>{hint}</Typography>) : null}
  </Paper>
);

const BenchmarksDashboard = () => {
  const [selectedLanguage, setSelectedLanguage] = useState('overall');
  const [benchmarkData, setBenchmarkData] = useState(null);

  // ASR Benchmark data from the test system
  const asrBenchmarks = [
    { 
      model: 'Azure Speech', 
      language: 'overall',
      avg_overall_wer: 0.0456,
      avg_rtf_transcription: 0.23,
      avg_rtf_total: 0.31,
      cost_batch_per_1000_min: 6.0,
      cost_rt_per_1000_min: 16.67
    },
    { 
      model: 'OpenAI Whisper', 
      language: 'overall',
      avg_overall_wer: 0.0523,
      avg_rtf_transcription: 0.18,
      avg_rtf_total: 0.25,
      cost_batch_per_1000_min: 6.0,
      cost_rt_per_1000_min: 0
    },
    { 
      model: 'GPT-4o Transcribe', 
      language: 'overall',
      avg_overall_wer: 0.0389,
      avg_rtf_transcription: 0.42,
      avg_rtf_total: 0.58,
      cost_batch_per_1000_min: 6.0,
      cost_rt_per_1000_min: 6.0
    },
    { 
      model: 'Groq Whisper', 
      language: 'overall',
      avg_overall_wer: 0.0491,
      avg_rtf_transcription: 0.15,
      avg_rtf_total: 0.22,
      cost_batch_per_1000_min: 0.67,
      cost_rt_per_1000_min: 0
    },
    { 
      model: 'Fireworks Whisper', 
      language: 'overall',
      avg_overall_wer: 0.0512,
      avg_rtf_transcription: 0.19,
      avg_rtf_total: 0.28,
      cost_batch_per_1000_min: 54.0,
      cost_rt_per_1000_min: 0
    }
  ];

  // Filter data by selected language
  const filteredData = selectedLanguage === 'overall' 
    ? asrBenchmarks.filter(d => d.language === 'overall')
    : asrBenchmarks.filter(d => d.language === selectedLanguage);

  // Calculate summary stats
  const bestWER = Math.min(...filteredData.map(d => d.avg_overall_wer));
  const bestRTF = Math.min(...filteredData.map(d => d.avg_rtf_total));
  const bestCost = Math.min(...filteredData.map(d => d.cost_batch_per_1000_min));
  const totalModels = filteredData.length;

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Best WER" value={`${(bestWER * 100).toFixed(2)}%`} hint="Lowest error rate" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Best RTF" value={`${bestRTF.toFixed(2)}x`} hint="Fastest processing" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Best Cost" value={`$${bestCost}/1000min`} hint="Most affordable" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Models Tested" value={totalModels} hint="ASR systems" />
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, borderRadius: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>ASR Model Performance</Typography>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Language</InputLabel>
            <Select
              value={selectedLanguage}
              label="Language"
              onChange={(e) => setSelectedLanguage(e.target.value)}
            >
              <MenuItem value="overall">Overall</MenuItem>
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="de">German</MenuItem>
              <MenuItem value="lv">Latvian</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Model</TableCell>
              <TableCell align="right">WER (%)</TableCell>
              <TableCell align="right">RTF</TableCell>
              <TableCell align="right">Batch Cost</TableCell>
              <TableCell align="right">RT Cost</TableCell>
              <TableCell>Performance</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.map((row, idx) => {
              const isBestWER = row.avg_overall_wer === bestWER;
              const isBestRTF = row.avg_rtf_total === bestRTF;
              const isBestCost = row.cost_batch_per_1000_min === bestCost;
              
              return (
                <TableRow key={idx}>
                  <TableCell>{row.model}</TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: isBestWER ? 600 : 400 }}>
                      {(row.avg_overall_wer * 100).toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: isBestRTF ? 600 : 400 }}>
                      {row.avg_rtf_total.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">${row.cost_batch_per_1000_min}</TableCell>
                  <TableCell align="right">${row.cost_rt_per_1000_min}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      {isBestWER && <Chip label="Best WER" size="small" color="success" />}
                      {isBestRTF && <Chip label="Best RTF" size="small" color="primary" />}
                      {isBestCost && <Chip label="Best Cost" size="small" color="warning" />}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>Performance Comparison</Typography>
        <Box sx={{ height: 220, bgcolor: '#F9FAFB', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Chart visualization coming soon...
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default BenchmarksDashboard;

