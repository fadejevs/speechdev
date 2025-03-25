import PropTypes from 'prop-types';
// @mui
import Grid from '@mui/material/Grid2';
import Typography from '@mui/material/Typography';

// @project
import TagList from '@/components/third-party/table/TagList';

/***************************  TABLE - ROW DETAILS  ***************************/

export default function RowDetails({ data }) {
  return (
    <Grid container columns={12} rowSpacing={{ xs: 2, sm: 3, md: 4 }} columnSpacing={{ xs: 2, sm: 3, md: 5 }}>
      <Grid size={{ xs: 12, sm: 4 }}>
        <Typography variant="caption" sx={{ color: 'grey.700' }}>
          Email Address
        </Typography>
        <Typography variant="subtitle2" sx={{ mt: 0.5 }}>
          {data.email}
        </Typography>
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <Typography variant="caption" sx={{ color: 'grey.700' }}>
          Contact No.
        </Typography>
        <Typography variant="subtitle2" sx={{ mt: 0.5 }}>
          {data.contact}
        </Typography>
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <Typography variant="caption" sx={{ color: 'grey.700' }}>
          Plan
        </Typography>
        <Typography variant="subtitle2" sx={{ mt: 0.5 }}>
          {data.planStatus}
        </Typography>
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <Typography variant="caption" sx={{ color: 'grey.700' }}>
          Features
        </Typography>
        <TagList list={data.features} />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <Typography variant="caption" sx={{ color: 'grey.700' }}>
          Pricing
        </Typography>
        <Typography variant="subtitle2" sx={{ mt: 0.5 }}>
          {data.price}
        </Typography>
      </Grid>
    </Grid>
  );
}

RowDetails.propTypes = { data: PropTypes.any };
