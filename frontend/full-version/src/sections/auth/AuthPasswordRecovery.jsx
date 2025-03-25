'use client';
import PropTypes from 'prop-types';

// @next
import { useRouter } from 'next/navigation';

import { useState, useRef, useEffect } from 'react';

// @mui
import { useTheme } from '@mui/material/styles';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import FormHelperText from '@mui/material/FormHelperText';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';

// @third-party
import { useForm } from 'react-hook-form';

// @project
import axios from '@/utils/axios';
import { passwordSchema } from '@/utils/validationSchema';

// @icons
import { IconEye, IconEyeOff } from '@tabler/icons-react';

/***************************  AUTH - PASSWORD RECOVERY  ***************************/

export default function AuthPasswordRecovery({ inputSx }) {
  const router = useRouter();
  const theme = useTheme();

  const [hash, setHash] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [passwordRecoveryError, setPasswordRecoveryError] = useState('');

  const iconCommonProps = { size: 16, color: theme.palette.grey[700] };

  useEffect(() => {
    setHash(window.location.hash);
  }, []);

  // Initialize react-hook-form
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm();

  const password = useRef({});
  password.current = watch('password', '');

  // Handle form submission
  const onSubmit = (formData) => {
    if (!hash) {
      setPasswordRecoveryError('Invalid link');
      return;
    }

    const hashParams = new URLSearchParams(hash.substring(1));
    const errorDescription = hashParams.get('error_description') || '';

    if (errorDescription) {
      setPasswordRecoveryError(errorDescription);
      return;
    }

    const type = hashParams.get('type');
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token') || '';

    if (type !== 'recovery' || !accessToken || !refreshToken) {
      setPasswordRecoveryError('Invalid link');
      return;
    }

    setIsProcessing(true);
    setPasswordRecoveryError('');

    const payload = { accessToken, refreshToken, password: formData.password };
    axios
      .post('/api/auth/resetPassword', payload)
      .then(() => {
        setIsProcessing(false);
        reset();
        router.replace('/login');
      })
      .catch((response) => {
        setIsProcessing(false);
        setPasswordRecoveryError(response.error || 'Something went wrong');
      });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
      <Stack gap={2}>
        <Box>
          <InputLabel>New Password</InputLabel>
          <OutlinedInput
            {...register('password', passwordSchema)}
            type={isOpen ? 'text' : 'password'}
            placeholder="Enter new password"
            fullWidth
            autoComplete="new-password"
            error={Boolean(errors.password)}
            endAdornment={
              <InputAdornment
                position="end"
                sx={{ cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
                onClick={() => setIsOpen(!isOpen)}
              >
                {isOpen ? <IconEye {...iconCommonProps} /> : <IconEyeOff {...iconCommonProps} />}
              </InputAdornment>
            }
            sx={inputSx}
          />
          {errors.password?.message && <FormHelperText error>{errors.password?.message}</FormHelperText>}
        </Box>
        <Box>
          <InputLabel>Confirm Password</InputLabel>
          <OutlinedInput
            {...register('confirmPassword', { validate: (value) => value === password.current || 'The passwords do not match' })}
            type={isConfirmOpen ? 'text' : 'password'}
            placeholder="Confirm new password"
            fullWidth
            error={Boolean(errors.confirmPassword)}
            endAdornment={
              <InputAdornment
                position="end"
                sx={{ cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
                onClick={() => setIsConfirmOpen(!isConfirmOpen)}
              >
                {isConfirmOpen ? <IconEye {...iconCommonProps} /> : <IconEyeOff {...iconCommonProps} />}
              </InputAdornment>
            }
            sx={inputSx}
          />
          {errors.confirmPassword?.message && <FormHelperText error>{errors.confirmPassword?.message}</FormHelperText>}
        </Box>
      </Stack>

      <Button
        type="submit"
        color="primary"
        variant="contained"
        disabled={isProcessing}
        endIcon={isProcessing && <CircularProgress color="secondary" size={16} />}
        sx={{ minWidth: 120, mt: { xs: 2, sm: 4 }, '& .MuiButton-endIcon': { ml: 1 } }}
      >
        Reset Passowrd
      </Button>
      {passwordRecoveryError && (
        <Alert sx={{ mt: 2 }} severity="error" variant="filled" icon={false}>
          {passwordRecoveryError}
        </Alert>
      )}
    </form>
  );
}

AuthPasswordRecovery.propTypes = { inputSx: PropTypes.any };
