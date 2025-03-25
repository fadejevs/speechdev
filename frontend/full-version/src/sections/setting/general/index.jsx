// @mui
import Grid from '@mui/material/Grid2';

// @project
import GeneralBrandAssets from './GeneralBrandAssets';
import GeneralDetails from './GeneralDetails';
import GeneralResource from './GeneralResource';

/***************************  SETTING - GENERAL  ***************************/

export default function GeneralSetting() {
  return (
    <Grid container spacing={{ xs: 2, md: 3 }}>
      <Grid size={12}>
        <GeneralDetails />
      </Grid>
      <Grid size={12}>
        <GeneralResource />
      </Grid>
      <Grid size={12}>
        <GeneralBrandAssets tab="brand" />
      </Grid>
    </Grid>
  );
}
