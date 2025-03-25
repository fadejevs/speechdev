'use client';
import PropTypes from 'prop-types';

import { useState } from 'react';

// @mui
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Slide from '@mui/material/Slide';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// @project
import MessyDoodle from '@/images/illustration/MessyDoodle';

/***************************  DIALOG - DELETE  ***************************/

export default function DialogDelete({ title, heading, description, open, onClose, onDelete, successMessage }) {
  const [snackbar, setSnackbar] = useState(null);

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }

    setSnackbar((prev) => prev && { ...prev, open: false });
  };

  const handleDelete = () => {
    setSnackbar({ open: true, message: successMessage || 'Deleted successfully', severity: 'success' });
    onClose();
    onDelete();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        disableRestoreFocus
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        maxWidth="xs"
      >
        <DialogTitle id="delete-dialog-title">{title || 'Delete'}</DialogTitle>
        <DialogContent dividers>
          <Stack sx={{ gap: 2.5, alignItems: 'center' }}>
            <Box sx={{ height: 170, width: 230 }}>
              <MessyDoodle />
            </Box>
            <Stack sx={{ gap: 1, textAlign: 'center', alignItems: 'center' }}>
              <Typography id="delete-dialog-description" variant="h5" sx={{ color: 'text.primary' }}>
                {heading || 'Are you sure you want to delete?'}
              </Typography>
              <Typography variant="body1" color="grey.700" sx={{ width: '90%' }}>
                {description}
              </Typography>
            </Stack>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'space-between' }}>
          <Button variant="outlined" color="secondary" onClick={onClose} autoFocus>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        TransitionComponent={(props) => <Slide {...props} direction="left" />}
        open={snackbar?.open}
        autoHideDuration={2500}
        onClose={handleCloseSnackbar}
      >
        <Alert severity={snackbar?.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </>
  );
}

DialogDelete.propTypes = {
  title: PropTypes.string,
  heading: PropTypes.string,
  description: PropTypes.string,
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onDelete: PropTypes.func,
  successMessage: PropTypes.string
};
