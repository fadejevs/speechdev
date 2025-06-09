'use client';
import PropTypes from 'prop-types';

// @next
import { useRouter } from 'next/navigation';

import { useState } from 'react';

// @mui
import { useTheme } from '@mui/material/styles';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';

// @third-party
import { useForm } from 'react-hook-form';

// @project
import axios from '@/utils/axios';
import { emailSchema } from '@/utils/validationSchema';

export default function AuthLogin({ inputSx }) {
  const router = useRouter();
  const theme = useTheme();

  const [isProcessing, setIsProcessing] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Initialize react-hook-form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({ defaultValues: { email: '' } });

  // Handle form submission
  const onSubmit = async (formData) => {
    setIsProcessing(true);
    setLoginError('');

    try {
      // First check if the email exists
      const { data: checkData } = await axios.get(`/api/auth/check-email?email=${formData.email}`);
      console.log('Check email response:', checkData);

      if (!checkData.exists) {
        setLoginError('There is no account associated with this email. Please sign up.');
        router.push('/register');
        return;
      }

      // If email exists, magic link has already been sent by the check-email endpoint
      router.push(`/otp-verification?email=${encodeURIComponent(formData.email)}&verify=login`);
    } catch (error) {
      console.error('Login error:', error.response?.data || error);
      setLoginError(error.response?.data?.error || 'Failed to process login request');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack gap={2}>
          <Box>
            <InputLabel>Email</InputLabel>
            <OutlinedInput
              {...register('email', emailSchema)}
              placeholder="example@email.com"
              fullWidth
              error={Boolean(errors.email)}
              sx={inputSx}
              type="email"
              autoComplete="email"
            />
            {errors.email?.message && <FormHelperText error>{errors.email.message}</FormHelperText>}
          </Box>
        </Stack>

        <Button
          type="submit"
          color="primary"
          variant="contained"
          disabled={isProcessing}
          endIcon={isProcessing && <CircularProgress color="secondary" size={16} />}
          sx={{ minWidth: 120, mt: { xs: 1, sm: 4 }, '& .MuiButton-endIcon': { ml: 1 } }}
        >
          Send Login Link
        </Button>

        {loginError && (
          <Alert sx={{ mt: 2 }} severity="error" variant="filled" icon={false}>
            {loginError}
          </Alert>
        )}
      </form>
    </>
  );
}

AuthLogin.propTypes = { inputSx: PropTypes.any };
