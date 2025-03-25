'use client';
import PropTypes from 'prop-types';

// @mui
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// @project
import PlantDoodle from '@/images/illustration/PlantDoodle';

/***************************  DIALOG - EXIT ALERT  ***************************/

export default function DialogExitAlert({ title, heading, open, onClose, onSave }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      disableRestoreFocus
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-description"
      maxWidth="xs"
      PaperProps={{ elevation: 0, sx: { minWidth: { xs: 356, sm: 400 } } }}
    >
      <DialogTitle id="delete-dialog-title">{title || 'Exit'}</DialogTitle>
      <DialogContent dividers>
        <Stack sx={{ gap: 2.5, alignItems: 'center' }}>
          <Box sx={{ height: 172, width: 230 }}>
            <PlantDoodle />
          </Box>
          <Stack sx={{ gap: 1, textAlign: 'center', alignItems: 'center' }}>
            <Typography id="delete-dialog-description" variant="h5" sx={{ color: 'text.primary' }}>
              {heading || 'Are you sure you want to exit?'}
            </Typography>
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between' }}>
        <Button variant="outlined" color="error" onClick={onClose} autoFocus>
          Discard
        </Button>
        <Button variant="contained" onClick={onSave}>
          Save & Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

DialogExitAlert.propTypes = {
  title: PropTypes.string,
  heading: PropTypes.string,
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onSave: PropTypes.func
};
