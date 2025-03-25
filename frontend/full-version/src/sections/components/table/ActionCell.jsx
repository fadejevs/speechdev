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
import { IconBan, IconDotsVertical, IconEdit, IconTrash } from '@tabler/icons-react';

// @project
import DialogBlock from '@/components/dialog/DialogBlock';
import DialogDelete from '@/components/dialog/DialogDelete';
import MainCard from '@/components/MainCard';

/***************************  DIALOG - DATA  ***************************/

const dialogDeleteData = {
  title: 'Delete User',
  heading: 'Are you sure you want to delete?',
  description: 'By deleting user Audrey Leffler MD it will vanish all records so be careful about it'
};

const dialogBlockData = {
  title: 'Block User',
  heading: 'Are you sure you want to block?',
  description: 'By blocking user Audrey Leffler MD. User will not able to access the service.'
};

/***************************  TABLE - ACTION  ***************************/

export default function ActionCell({ row, onDelete, onBlock }) {
  const theme = useTheme();

  // Handle action popper
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const id = open ? 'default-action-popper' : undefined;

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
    console.log('User deleted', id, row);
    handleDeleteDialogClose();
  };

  // Handle block dialog open/close
  const [openBlockDialog, setOpenBlockDialog] = useState(false);

  const handleBlockDialogOpen = () => {
    setOpenBlockDialog(true);
  };

  const handleBlockDialogClose = () => {
    setOpenBlockDialog(false);
  };

  const handleDialogBlock = (id) => {
    console.log('User Block', id, row);
    onBlock(row.id, !row.isBlocked);
    handleBlockDialogClose();
  };

  const buttonStyle = { borderRadius: 2 };
  const iconSize = 16;

  return (
    <>
      <IconButton color="secondary" size="small" onClick={handleActionClick} aria-describedby={id} aria-label="actions-btn">
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
                  <ListItemButton
                    sx={{ ...buttonStyle, color: 'error.main', ...theme.applyStyles('dark', { color: theme.palette.error.light }) }}
                    onClick={handleBlockDialogOpen}
                  >
                    <ListItemIcon sx={{ color: 'inherit' }}>
                      <IconBan size={iconSize} />
                    </ListItemIcon>
                    <ListItemText sx={{ color: 'inherit' }}>{row.isBlocked ? 'Unblock' : 'Block'}</ListItemText>
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

      <DialogBlock
        open={openBlockDialog}
        onClose={handleBlockDialogClose}
        title={dialogBlockData.title}
        heading={dialogBlockData.heading}
        description={dialogBlockData.description}
        onBlock={() => handleDialogBlock(row.id)}
      />
    </>
  );
}

ActionCell.propTypes = { row: PropTypes.any, onDelete: PropTypes.func, onBlock: PropTypes.func };
