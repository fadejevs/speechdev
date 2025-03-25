// @mui
import Grid from '@mui/material/Grid2';

// @project
import AnalyticsOverviewCard from './AnalyticsOverviewCard';
import AnalyticsOverviewChart from './AnalyticsOverviewChart';
import AnalyticsTopRef from './AnalyticsTopRef';

/***************************  ANALYTICS - OVERVIEW  ***************************/

export default function AnalyticsOverview() {
  return (
    <Grid container spacing={{ xs: 2, md: 3 }}>
      <Grid size={12}>
        <AnalyticsOverviewCard />
      </Grid>
      <Grid size={12}>
        <AnalyticsOverviewChart />
      </Grid>
      <Grid size={12}>
        <AnalyticsTopRef />
      </Grid>
    </Grid>
  );
}
