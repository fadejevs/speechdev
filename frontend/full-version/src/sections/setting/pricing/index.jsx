// @mui
import Grid from '@mui/material/Grid2';

// @project
import FeaturesList from './FeaturesList';
import PlanList from './PlanList';

/***************************  SETTING - PRICING  ***************************/

export default function PricingSetting() {
  return (
    <Grid container spacing={{ xs: 2, md: 3 }}>
      <Grid size={12}>
        <PlanList />
      </Grid>
      <Grid size={12}>
        <FeaturesList />
      </Grid>
    </Grid>
  );
}
