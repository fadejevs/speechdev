// @mui
import Grid from '@mui/material/Grid2';

// @project
import ComponentsWrapper from '@/components/ComponentsWrapper';
import { PerformanceChart, TrafficInDevice, SaleMappingChart, LineChart, BarChart, RadialChart } from '@/sections/components/chart';

/***************************  COMPONENT - CHART  ***************************/

export default function Chart() {
  return (
    <ComponentsWrapper title="Charts">
      <Grid container spacing={3}>
        <Grid size={12}>
          <LineChart />
        </Grid>
        <Grid size={12}>
          <BarChart />
        </Grid>
        <Grid size={12}>
          <PerformanceChart />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TrafficInDevice />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SaleMappingChart />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <RadialChart />
        </Grid>
      </Grid>
    </ComponentsWrapper>
  );
}
