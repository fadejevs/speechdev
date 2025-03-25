'use client';
import PropTypes from 'prop-types';

// @mui
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// @project
import MainCard from '@/components/MainCard';

// @next
import { useRouter } from 'next/navigation';

/***************************   GENERAL - BRAND ASSETS  ***************************/
export default function GeneralBrandAssets({ tab }) {
  const router = useRouter();

  const handleButtonClick = () => {
    router.push(`/setting/general/${tab}`);
  };

  return (
    <MainCard>
      <Stack direction="row" sx={{ gap: 0.5, alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack sx={{ gap: 0.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 400 }}>
            Brand assets
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.disabled' }}>
            Integrate brand assets across sales channels, themes, and apps
          </Typography>
        </Stack>
        <Button variant="outlined" color="secondary" onClick={handleButtonClick}>
          Manage
        </Button>
      </Stack>
    </MainCard>
  );
}

GeneralBrandAssets.propTypes = { tab: PropTypes.string };
