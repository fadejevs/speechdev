import PropTypes from 'prop-types';
// @mui
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';

// @third-party
import { IconTrash } from '@tabler/icons-react';

// @project
import FilterSection from './Filter';
import DebouncedInput from '@/components/third-party/table/DebouncedInput';

/***************************  TABLE - TOOLBAR  ***************************/

export default function Toolbar({ table, onDelete, onGlobalSearch }) {
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
          <Tooltip title="Delete">
            <span>
              <IconButton
                color="error"
                size="small"
                disabled={!table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()}
                onClick={() => onDelete()}
                aria-label="delete"
              >
                <IconTrash size={16} />
              </IconButton>
            </span>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ height: 18, margin: 'auto' }} />
          <DebouncedInput placeholder="Search here" value="" onValueChange={(data) => onGlobalSearch(data)} borderless />
        </Stack>
        <FilterSection sx={{ display: { xs: 'block', sm: 'none' } }} />
      </Stack>

      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          gap,
          width: { xs: 1, sm: 'calc(100% - 263px)' },
          justifyContent: 'flex-end',
          display: { xs: 'flex' }
        }}
      >
        <Divider orientation="vertical" flexItem sx={{ height: 18, marginY: 'auto', display: { xs: 'none', sm: 'block' } }} />

        <FilterSection sx={{ display: { xs: 'none', sm: 'block' } }} />
      </Stack>
    </Stack>
  );
}

Toolbar.propTypes = { table: PropTypes.any, onDelete: PropTypes.any, onGlobalSearch: PropTypes.any };
