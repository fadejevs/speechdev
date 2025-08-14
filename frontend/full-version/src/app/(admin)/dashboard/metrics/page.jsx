'use client';

import React from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import MetricsDashboard from '@/sections/dashboard/analytics/MetricsDashboard';

function TabPanel({ value, index, children }) {
  if (value !== index) return null;
  return <Box sx={{ p: 2 }}>{children}</Box>;
}

const MetricsPage = () => {
  const [value, setValue] = React.useState(0);
  return (
    <Box sx={{ p: 3 }}>
      <Tabs value={value} onChange={(_, v) => setValue(v)} sx={{ mb: 2 }}>
        <Tab label="Metrics" />
        <Tab label="Benchmarks" />
        <Tab label="Expenses" />
      </Tabs>

      <TabPanel value={value} index={0}>
        <MetricsDashboard />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <Box>Benchmarks (to be implemented)</Box>
      </TabPanel>
      <TabPanel value={value} index={2}>
        <Box>Expenses (to be implemented)</Box>
      </TabPanel>
    </Box>
  );
};

export default MetricsPage;

