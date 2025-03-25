import { useState } from 'react';

// @mui
import Button from '@mui/material/Button';
import FormHelperText from '@mui/material/FormHelperText';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';

// @third-party
import { useForm } from 'react-hook-form';

// @project
import Modal from '@/components/Modal';
import { ModalSize } from '@/enum';
import { emailSchema } from '@/utils/validationSchema';

// @assets
import { IconMail } from '@tabler/icons-react';

/***************************   MODAL - EMAIL  ***************************/

export default function ModalEmail() {
  const [open, setOpen] = useState(false);

  // Initialize react-hook-form
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: { email: 'junius12@saasable.io' }
  });

  const onSubmit = (data) => {
    console.log(data);
    setOpen(false);
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>Update</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        maxWidth={ModalSize.MD}
        header={{ title: 'Email Address', subheader: 'Update your email address to keep your account up to date.' }}
        modalContent={
          <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
            <InputLabel>Email</InputLabel>
            <OutlinedInput
              fullWidth
              startAdornment={
                <InputAdornment position="start">
                  <IconMail />
                </InputAdornment>
              }
              error={errors.email && Boolean(errors.email)}
              {...register('email', emailSchema)}
              aria-describedby="outlined-email"
              inputProps={{ 'aria-label': 'email' }}
            />
            {errors.email?.message && <FormHelperText error>{errors.email?.message}</FormHelperText>}
          </form>
        }
        footer={
          <Stack direction="row" sx={{ width: 1, justifyContent: 'space-between', gap: 2 }}>
            <Button variant="outlined" color="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" onClick={handleSubmit(onSubmit)}>
              Update Email
            </Button>
          </Stack>
        }
      />
    </>
  );
}
