'use client';
import PropTypes from 'prop-types';

// next
import { useRouter } from 'next/navigation';

import { useState } from 'react';

// @mui
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// @project
// import CodeVerification from '@/components/CodeVerification'; // Commented out for now
import axios from '@/utils/axios';

const verificationTypes = {
  signup: 'signup',
  email_change: 'email_change'
};

/***************************  AUTH - OTP VERIFICATION  ***************************/

export default function AuthOtpVerification({ email }) {
  const router = useRouter();

  const [isProcessing, setIsProcessing] = useState(false);
  const [otpError, setOtpError] = useState('');

  // Commented out react-hook-form and code input for now
  // const {
  //   handleSubmit,
  //   control,
  //   formState: { errors }
  // } = useForm();

  // const onSubmit = (formData) => {
  //   setIsProcessing(true);
  //   setOtpError('');
  //   // ...existing code...
  // };

  return (
    <Stack spacing={3} sx={{ width: 1 }}>
      <Typography variant="h5" align="center">
        Check your email
      </Typography>
      <Typography variant="body1" align="center" color="text.secondary">
        We've sent a login link to <b>{email}</b>. Please check your inbox and follow the instructions to log in to your account.
      </Typography>
      {/* 
      <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
        <InputLabel>Verification Code</InputLabel>
        <CodeVerification control={control} />
        {errors.otp?.message && <FormHelperText error>{errors.otp?.message}</FormHelperText>}
        <Button
          type="submit"
          color="primary"
          variant="contained"
          disabled={isProcessing}
          endIcon={isProcessing && <CircularProgress color="secondary" size={16} />}
          sx={{ minWidth: 120, mt: { xs: 2, sm: 4 }, '& .MuiButton-endIcon': { ml: 1 } }}
        >
          Verify Code
        </Button>
        {otpError && (
          <Alert sx={{ mt: 2 }} severity="error" variant="filled" icon={false}>
            {otpError}
          </Alert>
        )}
      </form>
      */}
      <Button
        variant="contained"
        color="primary"
        onClick={() => router.replace('/login')}
        disabled={isProcessing}
        sx={{ minWidth: 120, mt: 2 }}
      >
        Go to Login
      </Button>
      {otpError && (
        <Alert sx={{ mt: 2 }} severity="error" variant="filled" icon={false}>
          {otpError}
        </Alert>
      )}
    </Stack>
  );
}

AuthOtpVerification.propTypes = { email: PropTypes.any };
