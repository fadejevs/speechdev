import PropTypes from 'prop-types';
import { useState } from 'react';

// @mui
import { useTheme } from '@mui/material/styles';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Fade from '@mui/material/Fade';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Popper from '@mui/material/Popper';

// @third-party
import { IconDotsVertical, IconEdit, IconTrash } from '@tabler/icons-react';

// @project
import DialogDelete from '@/components/dialog/DialogDelete';
import MainCard from '@/components/MainCard';

/***************************  DIALOG - DATA  ***************************/

const dialogDeleteData = {
  title: 'Delete Pricing Plan',
  heading: 'Are you sure you want to delete?',
  description: 'By deleting pricing plan Audrey Leffler MD it will vanish all records so be careful about it'
};

/***************************  TABLE - ACTION  ***************************/

export default function ActionCell({ row, onDelete }) {
  const theme = useTheme();

  // Handle action popper
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const id = open ? 'pricing-plan-action-popper' : undefined;

  const handleActionClick = (event) => {
    setAnchorEl(anchorEl ? null : event.currentTarget);
  };

  // Handle delete dialog
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  const handleDeleteDialogOpen = () => {
    setOpenDeleteDialog(true);
  };

  const handleDeleteDialogClose = () => {
    setOpenDeleteDialog(false);
  };

  const handleDialogDelete = (id) => {
    onDelete(row.id);
    console.log('Pricing plan deleted', id, row);
    handleDeleteDialogClose();
  };

  const buttonStyle = { borderRadius: 2 };
  const iconSize = 16;

  return (
    <>
      <IconButton color="secondary" size="small" onClick={handleActionClick} aria-label="action">
        <IconDotsVertical size={iconSize} color={theme.palette.text.secondary} />
      </IconButton>
      <Popper placement="bottom-end" id={id} open={open} anchorEl={anchorEl} transition>
        {({ TransitionProps }) => (
          <Fade in={open} {...TransitionProps}>
            <MainCard sx={{ borderRadius: 3, boxShadow: theme.customShadows.tooltip, minWidth: 150, p: 0.5 }}>
              <ClickAwayListener onClickAway={() => setAnchorEl(null)}>
                <List disablePadding>
                  <ListItemButton sx={buttonStyle} onClick={handleActionClick}>
                    <ListItemIcon>
                      <IconEdit size={iconSize} />
                    </ListItemIcon>
                    <ListItemText>Edit</ListItemText>
                  </ListItemButton>
                  <ListItemButton
                    sx={{ ...buttonStyle, color: 'error.main', ...theme.applyStyles('dark', { color: theme.palette.error.light }) }}
                    onClick={handleDeleteDialogOpen}
                  >
                    <ListItemIcon sx={{ color: 'inherit' }}>
                      <IconTrash size={iconSize} />
                    </ListItemIcon>
                    <ListItemText sx={{ color: 'inherit' }}>Delete</ListItemText>
                  </ListItemButton>
                </List>
              </ClickAwayListener>
            </MainCard>
          </Fade>
        )}
      </Popper>

      <DialogDelete
        open={openDeleteDialog}
        onClose={handleDeleteDialogClose}
        title={dialogDeleteData.title}
        heading={dialogDeleteData.heading}
        description={dialogDeleteData.description}
        onDelete={() => handleDialogDelete(row.id)}
      />
    </>
  );
}

ActionCell.propTypes = { row: PropTypes.any, onDelete: PropTypes.func };
