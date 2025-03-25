import PropTypes from 'prop-types';
// @mui
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import MuiModal from '@mui/material/Modal';

// @project
import MainCard from './MainCard';
import { ModalSize } from '@/enum';

// @types

// @assets
import { IconX } from '@tabler/icons-react';

/***************************  MODAL - SIZES  ***************************/

const ModalMaxWidth = {
  [ModalSize.XS]: 300,
  [ModalSize.SM]: 400,
  [ModalSize.MD]: 600,
  [ModalSize.LG]: 800,
  [ModalSize.XL]: 1000
};

/***************************  MODAL  ***************************/

export default function Modal({ open, onClose, maxWidth = ModalSize.SM, header, footer, modalContent }) {
  return (
    <MuiModal
      open={open}
      onClose={onClose}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
      disableAutoFocus
      disableEnforceFocus
    >
      <MainCard sx={{ p: 0, width: 1, maxWidth: ModalMaxWidth[maxWidth], m: 1 }}>
        <>
          {header && (
            <CardHeader
              {...(header.title && { title: header.title })}
              {...(header.subheader && { subheader: header.subheader, subheaderTypographyProps: { color: 'grey.700' } })}
              {...(header.closeButton && {
                action: (
                  <IconButton variant="outlined" color="secondary" aria-label="close" onClick={onClose}>
                    <IconX size={20} />
                  </IconButton>
                )
              })}
            />
          )}
          <CardContent sx={{ maxHeight: 'calc(100vh - 210px)', overflowY: 'auto' }}>{modalContent}</CardContent>
          {footer && <CardActions>{footer}</CardActions>}
        </>
      </MainCard>
    </MuiModal>
  );
}

Modal.propTypes = {
  open: PropTypes.any,
  onClose: PropTypes.any,
  maxWidth: PropTypes.any,
  ModalSize: PropTypes.any,
  SM: PropTypes.any,
  header: PropTypes.any,
  footer: PropTypes.any,
  modalContent: PropTypes.any
};
