// @mui
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// @project
import MainCard from '@/components/MainCard';

// @assets
import { SitReadingDoodle } from '@/images/illustration';
import { IconPlus } from '@tabler/icons-react';

/***************************  I18N - ADD LANGUAGE  ***************************/

export default function AddLanguage() {
  return (
    <MainCard>
      <Stack sx={{ gap: 3, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <Box sx={{ height: 170, width: 230 }}>
          <SitReadingDoodle />
        </Box>
        <Stack sx={{ gap: 1 }}>
          <Typography variant="h5">Speak your customers’ language</Typography>
          <Typography variant="body1" sx={{ color: 'text.disabled', width: { xs: 1, sm: '58%' }, mx: 'auto' }}>
            Adding translations to your store improves cross-border conversion by an average of 13%. It&apos;s free and takes minutes.
          </Typography>
        </Stack>
        <Button variant="contained" size="small" startIcon={<IconPlus size={16} />}>
          Add Language
        </Button>
      </Stack>
    </MainCard>
  );
}
