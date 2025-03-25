import PropTypes from 'prop-types';
// @mui
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';

// @third-party
import { IconTrash, IconX } from '@tabler/icons-react';

// @project
import FilterSection from './Filter';
import DebouncedInput from '@/components/third-party/table/DebouncedInput';

/***************************  TABLE - TOOLBAR  ***************************/

export default function Toolbar({ table, filters, setFilters, onDelete, onGlobalSearch }) {
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
                aria-label="delete"
                onClick={() => onDelete()}
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
          display: { xs: !filters.length ? 'none' : 'flex', sm: 'flex' }
        }}
      >
        <Divider orientation="vertical" flexItem sx={{ height: 18, marginY: 'auto', display: { xs: 'none', sm: 'block' } }} />
        {filters.length > 0 && (
          <>
            <Stack
              direction="row"
              sx={{
                alignItems: 'center',
                gap,
                flexWrap: 'nowrap',
                pt: 0.5,
                pb: 0.25,
                maxWidth: { xs: 'calc(100% - 42px)', sm: 'calc(100% - 174px)' },
                overflowX: 'auto',
                '&::-webkit-scrollbar': { height: '4px' },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'secondary.light', borderRadius: '4px' },
                '&::-webkit-scrollbar-track': { bgcolor: 'secondary.lighter', borderRadius: '4px' }
              }}
            >
              {filters.map((filter) => (
                <Chip
                  key={filter}
                  label={filter}
                  variant="tag"
                  sx={{ '&.Mui-focusVisible': { boxShadow: 'none', borderColor: 'grey.600' } }}
                  onDelete={() => setFilters(filters.filter((f) => f !== filter))}
                />
              ))}
            </Stack>

            <Button color="error" sx={{ display: { xs: 'none', sm: 'block' } }} onClick={() => setFilters([])}>
              Clear All
            </Button>
            <IconButton
              color="error"
              size="small"
              sx={{ display: { xs: 'block', sm: 'none' } }}
              aria-label="delete"
              onClick={() => setFilters([])}
            >
              <IconX size={16} />
            </IconButton>
          </>
        )}
        <FilterSection sx={{ display: { xs: 'none', sm: 'block' } }} />
      </Stack>
    </Stack>
  );
}

Toolbar.propTypes = {
  table: PropTypes.any,
  filters: PropTypes.any,
  setFilters: PropTypes.any,
  onDelete: PropTypes.any,
  onGlobalSearch: PropTypes.any
};
