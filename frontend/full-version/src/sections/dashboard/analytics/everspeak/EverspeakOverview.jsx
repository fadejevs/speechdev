'use client';

// @mui
import Grid from '@mui/material/Grid2';

// @project
import EverspeakMetricsCard from './EverspeakMetricsCard';
import EverspeakApiUptime from './EverspeakApiUptime';
import EverspeakCostAnalytics from './EverspeakCostAnalytics';

/***************************  EVERSPEAK - ANALYTICS OVERVIEW  ***************************/

export default function EverspeakOverview() {
  return (
    <Grid container spacing={{ xs: 2, md: 3 }}>
      {/* Main Metrics Cards */}
      <Grid size={12}>
        <EverspeakMetricsCard />
      </Grid>
      
      {/* API Services Uptime */}
      <Grid size={{ xs: 12, md: 8 }}>
        <EverspeakApiUptime />
      </Grid>
      
      {/* Cost Analytics */}
      <Grid size={{ xs: 12, md: 4 }}>
        <EverspeakCostAnalytics />
      </Grid>
    </Grid>
  );
} 