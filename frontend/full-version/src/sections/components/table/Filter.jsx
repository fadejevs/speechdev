import PropTypes from 'prop-types';
import { useState } from 'react';

// @mui
import { useTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Fade from '@mui/material/Fade';
import IconButton from '@mui/material/IconButton';
import Popper from '@mui/material/Popper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// @project
import MainCard from '@/components/MainCard';
import SimpleBar from '@/components/third-party/SimpleBar';

// @assets
import { IconFilter, IconX } from '@tabler/icons-react';

/***************************  TABLE - FILTER  ***************************/

export default function FilterSection({ sx }) {
  const theme = useTheme();

  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const open = Boolean(filterAnchorEl);
  const id = open ? 'Filter-popper' : undefined;

  const handleActionClick = (event) => {
    setFilterAnchorEl(filterAnchorEl ? null : event.currentTarget);
  };

  return (
    <Box sx={{ ...sx }}>
      <Button
        variant="text"
        color="secondary"
        startIcon={<IconFilter size={16} />}
        sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
        onClick={handleActionClick}
      >
        Filter
      </Button>
      <IconButton
        size="small"
        color="secondary"
        sx={{ display: { xs: 'block', sm: 'none' } }}
        aria-label="filter"
        onClick={handleActionClick}
      >
        <IconFilter size={16} />
      </IconButton>
      <Popper placement="bottom-end" id={id} open={open} anchorEl={filterAnchorEl} transition>
        {({ TransitionProps }) => (
          <Fade in={open} {...TransitionProps}>
            <MainCard sx={{ p: 0, borderRadius: 3, boxShadow: theme.customShadows.tooltip, minWidth: 300 }}>
              <ClickAwayListener onClickAway={() => setFilterAnchorEl(null)}>
                <Box>
                  <Stack
                    direction="row"
                    sx={{
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 2,
                      p: 2,
                      borderBottom: `1px solid ${theme.palette.divider}`
                    }}
                  >
                    <Typography variant="h6">Filter</Typography>
                    <IconButton variant="outlined" size="small" color="secondary" aria-label="close" onClick={handleActionClick}>
                      <IconX size={16} />
                    </IconButton>
                  </Stack>
                  <Box sx={{ px: 1, py: 2 }}>
                    <SimpleBar sx={{ maxHeight: 300, height: 1 }}>Filter Content</SimpleBar>
                  </Box>
                  <Stack
                    direction="row"
                    sx={{ width: 1, justifyContent: 'space-between', gap: 2, p: 2, borderTop: `1px solid ${theme.palette.divider}` }}
                  >
                    <Button variant="outlined" color="secondary">
                      Reset
                    </Button>
                    <Button variant="contained" onClick={handleActionClick}>
                      Apply
                    </Button>
                  </Stack>
                </Box>
              </ClickAwayListener>
            </MainCard>
          </Fade>
        )}
      </Popper>
    </Box>
  );
}

FilterSection.propTypes = { sx: PropTypes.any };
