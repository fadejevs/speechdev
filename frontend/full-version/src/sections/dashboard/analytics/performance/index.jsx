// @mui
import Grid from '@mui/material/Grid2';
import Stack from '@mui/material/Stack';

// @project
import AnalyticsPerformanceBounceRate from './AnalyticsPerformanceBounceRate';
import AnalyticsPerformanceCard from './AnalyticsPerformanceCard';
import AnalyticsPerformanceChart from './AnalyticsPerformanceChart';
import AnalyticsPerformanceMapChart from './AnalyricsPerformanceMapChart';
import AnalyticsPerformanceRedialChart from './AnalyticsPerformanceRedialChart';

/***************************  ANALYTICS - PERFORMANCE  ***************************/

export default function AnalyticsPerformance() {
  return (
    <Grid container spacing={{ xs: 2, md: 3 }}>
      <Grid size={12}>
        <AnalyticsPerformanceCard />
      </Grid>
      <Grid size={12}>
        <AnalyticsPerformanceChart />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <AnalyticsPerformanceBounceRate />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Stack sx={{ gap: { xs: 2, md: 3 } }}>
          <AnalyticsPerformanceMapChart />
          <AnalyticsPerformanceRedialChart />
        </Stack>
      </Grid>
    </Grid>
  );
}
