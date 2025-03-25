// @mui
import Grid from '@mui/material/Grid2';

// @project;
import AnalyticsBehaviorCard from './AnalyticsBehaviorCard';
import AnalyticsBehaviorChart from './AnalyticsBehaviorChart';
import AnalyticsBehaviorTable from './AnalyticsBehaviorTable';
import AnalyticsBehaviorTrafficDevice from './AnalyticsBehaviorTrafficDevice';

/***************************  ANALYTICS - USER BEHAVIOR  ***************************/

export default function AnalyticsUserBehavior() {
  return (
    <Grid container spacing={{ xs: 2, md: 3 }}>
      <Grid size={12}>
        <AnalyticsBehaviorCard />
      </Grid>
      <Grid size={12}>
        <AnalyticsBehaviorChart />
      </Grid>
      <Grid size={{ xs: 12, md: 8 }}>
        <AnalyticsBehaviorTable />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <AnalyticsBehaviorTrafficDevice />
      </Grid>
    </Grid>
  );
}
