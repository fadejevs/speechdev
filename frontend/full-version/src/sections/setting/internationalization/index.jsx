// @mui
import Grid from '@mui/material/Grid2';

// @sections
import AddLanguage from './AddLanguage';
import PublishedLanguage from './PublishedLanguage';
import UnpublishedLanguage from './UnpublishedLanguage';

/***************************  SETTING - I18N  ***************************/

export default function I18nSetting() {
  return (
    <Grid container spacing={{ xs: 2, md: 3 }}>
      <Grid size={12}>
        <AddLanguage />
      </Grid>
      <Grid size={12}>
        <PublishedLanguage />
      </Grid>
      <Grid size={12}>
        <UnpublishedLanguage />
      </Grid>
    </Grid>
  );
}
