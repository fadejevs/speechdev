'use client';
import PropTypes from 'prop-types';

// @mui
import CardMedia from '@mui/material/CardMedia';
import Grid from '@mui/material/Grid2';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// @project
import LogoMain from '@/components/logo/LogoMain';
import GetImagePath from '@/utils/GetImagePath';

// @types

const dashBoardImage = {
  light: '/assets/images/graphics/hosting/onboarding.svg',
  dark: '/assets/images/graphics/hosting/onboarding.svg'
};

/***************************  AUTH LAYOUT  ***************************/

export default function AuthLayout({ children }) {
  return (
    <Grid container sx={{ height: '100vh' }}>
      <Grid size={{ xs: 12, md: 6, lg: 7 }} sx={{ p: { xs: 3, sm: 7 } }}>
        {children}
      </Grid>
      <Grid size={{ xs: 12, md: 6, lg: 5 }} sx={{ bgcolor: 'grey.100', pt: 7, display: { xs: 'none', md: 'block' } }}>
        <Stack sx={{ height: 1, justifyContent: 'space-between' }}>
          <Stack sx={{ alignItems: 'center', gap: 2 }}>
            <LogoMain />
            <Typography variant="body2" color="text.secondary" align="center" sx={{ maxWidth: 400 }}>
            The Smarter Alternative To Human Interpretation
            </Typography>
          </Stack>
          <Box sx={{ pt: 0, pl: 6, height: 'calc(100% - 114px)' }}>
            <CardMedia
              component="img"
              image={GetImagePath(dashBoardImage)}
              alt="Onboarding"
              sx={{
                display: 'block',
                maxWidth: '440px',
                maxHeight: '70vh',
                width: '100%',
                height: 'auto',
                objectFit: 'contain',
                margin: '0 auto',
                background: 'none',
                boxShadow: 'none',
              }}
            />
          </Box>
        </Stack>
      </Grid>
    </Grid>
  );
}

AuthLayout.propTypes = { children: PropTypes.any };
