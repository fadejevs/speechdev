'use client';
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

// @project
import DialogBlock from '@/components/dialog/DialogBlock';
import DialogDelete from '@/components/dialog/DialogDelete';
import MainCard from '@/components/MainCard';
import AddNewAccount from '@/sections/account/NewAccount';

// @assets
import { IconBan, IconDotsVertical, IconEdit, IconTrash } from '@tabler/icons-react';

/***************************  DIALOG - DATA  ***************************/

const dialogDeleteData = {
  title: 'Delete Account',
  heading: 'Are you sure you want to delete?',
  description: 'By deleting account Audrey Leffler MD it will vanish all records so be careful about it',
  successMessage: 'Account has been deleted.'
};

const dialogBlockData = {
  title: 'Block Account',
  heading: 'Are you sure you want to block?',
  description: 'By blocking account Audrey Leffler MD. Account will not able to access the service.',
  successMessage: 'Account has been blocked.'
};

/***************************  TABLE - ACTION  ***************************/

export default function ActionCell({ row, onDelete, onBlock }) {
  const theme = useTheme();

  // Handle action popper
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const id = open ? 'account-action-popper' : undefined;

  const handleActionClick = (event) => {
    setAnchorEl(anchorEl ? null : event.currentTarget);
  };

  //Handle Edit Modal
  const [openEditModal, setOpenEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState(null);

  const handleEditModalOpen = () => {
    setEditFormData({
      firstName: row.profile.firstName,
      lastName: row.profile.lastName,
      email: row.email,
      contact: row.contact,
      plan: row.plan,
      dialcode: row.dialCode,
      timePeriod: row.timePeriod
    });
    setOpenEditModal(true);
  };

  const handleEditModalClose = () => {
    setOpenEditModal(false);
    setEditFormData(null);
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
    console.log('Account deleted', id, row);
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
    console.log('Account Block', id, row);
    onBlock(row.id, !row.isBlocked);
    handleBlockDialogClose();
  };

  const buttonStyle = { borderRadius: 2 };
  const iconSize = 16;

  return (
    <>
      <IconButton color="secondary" size="small" onClick={handleActionClick} aria-label="action">
        <IconDotsVertical size={iconSize} color={theme.palette.text.secondary} />
      </IconButton>
      <Popper placement="top-end" id={id} open={open} anchorEl={anchorEl} transition>
        {({ TransitionProps }) => (
          <Fade in={open} {...TransitionProps}>
            <MainCard sx={{ borderRadius: 3, boxShadow: theme.customShadows.tooltip, minWidth: 150, p: 0.5 }}>
              <ClickAwayListener onClickAway={() => setAnchorEl(null)}>
                <List disablePadding>
                  <ListItemButton sx={buttonStyle} onClick={handleEditModalOpen}>
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
        {...dialogDeleteData}
        open={openDeleteDialog}
        onClose={handleDeleteDialogClose}
        onDelete={() => handleDialogDelete(row.id)}
      />

      <DialogBlock {...dialogBlockData} open={openBlockDialog} onClose={handleBlockDialogClose} onBlock={() => handleDialogBlock(row.id)} />

      <AddNewAccount open={openEditModal} onClose={handleEditModalClose} formData={editFormData} />
    </>
  );
}

ActionCell.propTypes = { row: PropTypes.any, onDelete: PropTypes.func, onBlock: PropTypes.func };
