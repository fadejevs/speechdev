'use client';
import PropTypes from 'prop-types';

// @mui
import Button from '@mui/material/Button';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';

// @third-party
import { useForm } from 'react-hook-form';

// @project
import Modal from '@/components/Modal';
import { ModalSize } from '@/enum';
import { featureNameSchema } from '@/utils/validationSchema';

/*************************** FEATURES - ADD  ***************************/

export default function AddFeatures({ open, onClose }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm();

  const onSubmit = (data) => {
    console.log(data);
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        maxWidth={ModalSize.MD}
        header={{ title: 'Add Fetaure', subheader: 'Add powerful features to boost functionality and efficiency.', closeButton: true }}
        modalContent={
          <form onSubmit={handleSubmit(onSubmit)}>
            <>
              <InputLabel>Feature Name</InputLabel>
              <OutlinedInput
                fullWidth
                placeholder="Enter feature name eg. API"
                error={errors.featureName && Boolean(errors.featureName)}
                {...register('featureName', featureNameSchema)}
              />
              {errors.featureName?.message && <FormHelperText error>{errors.featureName?.message}</FormHelperText>}
            </>
          </form>
        }
        footer={
          <Stack direction="row" sx={{ width: 1, justifyContent: 'space-between', gap: 2 }}>
            <Button variant="outlined" color="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSubmit(onSubmit)}>
              Add Feature
            </Button>
          </Stack>
        }
      />
    </>
  );
}

AddFeatures.propTypes = { open: PropTypes.bool, onClose: PropTypes.func };
