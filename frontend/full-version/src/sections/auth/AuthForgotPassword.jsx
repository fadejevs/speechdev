'use client';
import PropTypes from 'prop-types';

// @next
import { useRouter } from 'next/navigation';

import { useEffect, useState } from 'react';

// @mui
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';

// @third-party
import { useForm } from 'react-hook-form';

// @project
import axios from '@/utils/axios';
import { emailSchema } from '@/utils/validationSchema';

function useBaseUrl() {
  const [baseUrl, setBaseUrl] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol;
      const host = window.location.host;
      setBaseUrl(`${protocol}//${host}`);
    }
  }, [router]);

  return baseUrl;
}

/***************************  AUTH - FORGOT PASSWORD  ***************************/

export default function AuthForgotPassword({ inputSx }) {
  const baseUrl = useBaseUrl();

  const [isProcessing, setIsProcessing] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [mailSent, setMailSent] = useState(false);

  // Initialize react-hook-form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm();

  // Handle form submission
  const onSubmit = (formData) => {
    if (!baseUrl) return;

    setIsProcessing(true);
    setForgotPasswordError('');
    setMailSent(false);

    const redirectTo = `${baseUrl}/password-recovery`;
    const payload = { email: formData.email, redirectTo };

    axios
      .post('/api/auth/forgotPassword', payload)
      .then(() => {
        setIsProcessing(false);
        reset();
        setMailSent(true);
      })
      .catch((response) => {
        setIsProcessing(false);
        setForgotPasswordError(response.error || 'Something went wrong');
      });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
      <InputLabel>Email</InputLabel>
      <OutlinedInput
        {...register('email', emailSchema)}
        placeholder="example@saasable.io"
        fullWidth
        error={Boolean(errors.email)}
        sx={{ ...inputSx }}
      />
      {errors.email?.message && <FormHelperText error>{errors.email?.message}</FormHelperText>}

      <Button
        type="submit"
        color="primary"
        variant="contained"
        disabled={isProcessing}
        endIcon={isProcessing && <CircularProgress color="secondary" size={16} />}
        sx={{ minWidth: 120, mt: { xs: 2, sm: 4 }, '& .MuiButton-endIcon': { ml: 1 } }}
      >
        Request Code
      </Button>
      {forgotPasswordError && (
        <Alert sx={{ mt: 2 }} severity="error" variant="filled" icon={false}>
          {forgotPasswordError}
        </Alert>
      )}
      {mailSent && (
        <Alert sx={{ mt: 2 }} severity="success" variant="filled" icon={false}>
          An email with the recovery link has been sent to your inbox. Please check your email to proceed with account recovery.
        </Alert>
      )}
    </form>
  );
}

AuthForgotPassword.propTypes = { inputSx: PropTypes.any };
