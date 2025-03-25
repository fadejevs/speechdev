// @mui
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

// @project
import PresentationCard from '@/components/cards/PresentationCard';

/***************************  BUTTON - DISABLED  ***************************/

export default function Disabled() {
  return (
    <PresentationCard title="Disabled">
      <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button disabled>Text</Button>
        <Button disabled variant="contained">
          Contained
        </Button>
        <Button disabled variant="outlined">
          Outlined
        </Button>
      </Stack>
    </PresentationCard>
  );
}
