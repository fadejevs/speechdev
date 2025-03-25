'use client';
import PropTypes from 'prop-types';

import { useState } from 'react';

// @mui
import { useTheme } from '@mui/material/styles';
import Chip from '@mui/material/Chip';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Fade from '@mui/material/Fade';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Popper from '@mui/material/Popper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// @project
import MainCard from '@/components/MainCard';
import SimpleBar from '@/components/third-party/SimpleBar';

// @assets
import { IconPlus } from '@tabler/icons-react';

/***************************  REACT TABLE - TAG LIST  ***************************/

export default function TagList({ list, max = 2 }) {
  const theme = useTheme();

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const id = open ? 'Tag-popper' : undefined;

  let tagData = [...list];
  let extraTags = [];
  if (tagData?.length > max) extraTags.push(...tagData.splice(max));

  const handleClick = (event) => {
    setAnchorEl(anchorEl ? null : event.currentTarget);
  };

  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5 }}>
      <Typography variant="body2" color="text.secondary">
        {tagData.join(', ')}
      </Typography>
      {extraTags.length > 0 && (
        <>
          <Chip
            icon={<IconPlus />}
            label={extraTags.length + ' more'}
            clickable
            variant="outlined"
            color="secondary"
            size="small"
            onClick={handleClick}
          />
          <Popper
            placement="bottom-end"
            id={id}
            open={open}
            anchorEl={anchorEl}
            transition
            popperOptions={{ modifiers: [{ name: 'offset', options: { offset: [0, 4] } }] }}
            sx={{ zIndex: 1301 }}
          >
            {({ TransitionProps }) => (
              <Fade in={open} {...TransitionProps}>
                <MainCard sx={{ p: 0, borderRadius: 2, boxShadow: theme.customShadows.tooltip, width: 180 }}>
                  <ClickAwayListener onClickAway={() => setAnchorEl(null)}>
                    <Box sx={{ p: 0.75 }}>
                      <SimpleBar sx={{ maxHeight: 220, height: 1 }}>
                        <List disablePadding>
                          {extraTags.map((tag, index) => (
                            <ListItem key={index} sx={{ px: 0.75, py: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                {tag}
                              </Typography>
                            </ListItem>
                          ))}
                        </List>
                      </SimpleBar>
                    </Box>
                  </ClickAwayListener>
                </MainCard>
              </Fade>
            )}
          </Popper>
        </>
      )}
    </Stack>
  );
}

TagList.propTypes = { list: PropTypes.array, max: PropTypes.number };
