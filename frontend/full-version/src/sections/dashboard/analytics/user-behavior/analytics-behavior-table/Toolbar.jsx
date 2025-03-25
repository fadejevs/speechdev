import PropTypes from 'prop-types';
// @mui
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';

// @project
import DebouncedInput from '@/components/third-party/table/DebouncedInput';

// @assets
import { IconLink } from '@tabler/icons-react';

/***************************  TABLE - TOOLBAR  ***************************/

export default function Toolbar({ onGlobalSearch }) {
  const gap = 0.75;

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      sx={{
        alignItems: { xs: 'start', sm: 'center' },
        justifyContent: 'space-between',
        gap: { xs: 1, sm: 2 },
        px: { xs: 1.25, sm: 2.5 },
        py: 0.5,
        width: 1
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap, minWidth: { xs: 1, sm: 'fit-content' } }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap }}>
          <DebouncedInput placeholder="Search here" value="" onValueChange={(data) => onGlobalSearch(data)} borderless />
        </Stack>
        <IconButton color="secondary" aria-label="view" sx={{ display: { xs: 'inline-flex', sm: 'none' } }}>
          <IconLink size={16} />
        </IconButton>
      </Stack>

      <Stack
        direction="row"
        sx={{ alignItems: 'center', gap, width: { xs: 1, sm: 'calc(100% - 263px)' }, justifyContent: 'flex-end', display: { xs: 'flex' } }}
      >
        <Divider orientation="vertical" flexItem sx={{ height: 18, marginY: 'auto', display: { xs: 'none', sm: 'block' } }} />
        <Button variant="text" color="secondary" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
          View All
        </Button>
      </Stack>
    </Stack>
  );
}

Toolbar.propTypes = { onGlobalSearch: PropTypes.any };
