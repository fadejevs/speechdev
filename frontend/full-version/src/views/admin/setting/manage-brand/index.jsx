'use client';

// @mui
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid2';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// @project
import {
  BrandColor,
  BrandCoverImage,
  BrandLogo,
  BrandSlogan,
  BrandShortDescription,
  BrandSocialLinks
} from '@/sections/setting/general/brand';

// @next
import { useRouter } from 'next/navigation';

// @assets
import { IconArrowLeft } from '@tabler/icons-react';

/***************************  BRAND - MANAGE  ***************************/

export default function Brand() {
  const router = useRouter();

  const handleButtonClick = () => {
    router.back();
  };

  return (
    <Stack sx={{ gap: 4 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
        <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center' }}>
          <IconButton onClick={handleButtonClick} color="secondary" variant="outlined" aria-label="back">
            <IconArrowLeft />
          </IconButton>
          <Typography variant="h6">Brand</Typography>
        </Stack>
        <Button variant="contained">SAVE</Button>
      </Stack>

      <Grid container spacing={{ xs: 2, md: 3 }}>
        <Grid size={12}>
          <BrandLogo />
        </Grid>
        <Grid size={12}>
          <BrandColor />
        </Grid>
        <Grid size={12}>
          <BrandCoverImage />
        </Grid>
        <Grid size={12}>
          <BrandSlogan />
        </Grid>
        <Grid size={12}>
          <BrandShortDescription />
        </Grid>
        <Grid size={12}>
          <BrandSocialLinks />
        </Grid>
      </Grid>
    </Stack>
  );
}
