import { useState } from 'react';

// @mui
import Button from '@mui/material/Button';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import Stack from '@mui/material/Stack';

// @third-party
import { useForm } from 'react-hook-form';

// @project
import Contact from '@/components/Contact';
import Modal from '@/components/Modal';
import { ModalSize } from '@/enum';

/***************************   MODAL - PHONE NUMBER  ***************************/

export default function ModalPhoneNumber() {
  const [open, setOpen] = useState(false);

  // Initialize react-hook-form
  const {
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors }
  } = useForm({ defaultValues: { dialcode: '+1' } });

  const onSubmit = (data) => {
    console.log(data);
    setOpen(false);
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} sx={{ ml: 'auto' }}>
        Add
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        maxWidth={ModalSize.MD}
        header={{ title: 'Phone Number', subheader: 'Update your phone number to stay connected.' }}
        modalContent={
          <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
            <InputLabel>Contact Number</InputLabel>
            <Contact
              fullWidth
              dialCode={watch('dialcode')}
              onCountryChange={(data) => setValue('dialcode', data.dialCode)}
              control={control}
              placeholder="8234454656"
              isError={!!errors.contact}
            />
            {errors.contact?.message && <FormHelperText error>{errors.contact?.message}</FormHelperText>}
          </form>
        }
        footer={
          <Stack direction="row" sx={{ width: 1, justifyContent: 'space-between', gap: 2 }}>
            <Button variant="outlined" color="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" onClick={handleSubmit(onSubmit)}>
              Add Number
            </Button>
          </Stack>
        }
      />
    </>
  );
}
