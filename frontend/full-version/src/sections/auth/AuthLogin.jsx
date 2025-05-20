'use client';
import PropTypes from 'prop-types';

// @next
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';

import { useState } from 'react';

// @mui
import { useTheme } from '@mui/material/styles';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import FormHelperText from '@mui/material/FormHelperText';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import Link from '@mui/material/Link';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';

// @third-party
import { useForm } from 'react-hook-form';

// @project
import { APP_DEFAULT_PATH, AUTH_USER_KEY } from '@/config';
import axios from '@/utils/axios';
import { emailSchema, passwordSchema } from '@/utils/validationSchema';
import { supabase } from '@/utils/supabase/client';

// @icons
import { IconEye, IconEyeOff } from '@tabler/icons-react';

// Mock user credentials
const userCredentials = [
  // { title: 'Super Admin', email: 'super_admin@saasable.io', password: 'Super@123' },
  // { title: 'Admin', email: 'admin@saasable.io', password: 'Admin@123' },
  // { title: 'User', email: 'user@saasable.io', password: 'User@123' }
];

/***************************  AUTH - LOGIN  ***************************/

export default function AuthLogin({ inputSx }) {
  const router = useRouter();
  const theme = useTheme();

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Initialize react-hook-form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({ defaultValues:
    // { email: 'super_admin@saasable.io', password: 'Super@123' }
    { email: 'admin@everspeak.ai', password: 'Super@123' }
  });

  // Handle form submission
  const onSubmit = (formData) => {
    setIsProcessing(true);
    setLoginError('');

    axios
      .post('/api/auth/login', formData)
      .then(async (response) => {
        setIsProcessing(false);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.data));

        // Set session for the client-side Supabase instance
        if (response.data.access_token && response.data.refresh_token) {
          try {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: response.data.access_token,
              refresh_token: response.data.refresh_token
            });
            if (sessionError) {
              console.error('Error setting Supabase client session:', sessionError.message);
              // Optionally handle this error, though the app might still work via token-based API calls
            } else {
              console.log('Supabase client session set successfully.');
            }
          } catch (e) {
            console.error('Exception setting Supabase client session:', e);
          }
        } else {
          console.warn('Access token or refresh token missing in login response, cannot set Supabase client session.');
        }

        router.push(APP_DEFAULT_PATH);
        // router.push('/events');
      })
      .catch((response) => {
        setIsProcessing(false);
        setLoginError(response.error || 'Something went wrong');
      });
  };

  const commonIconProps = { size: 16, color: theme.palette.grey[700] };

  return (
    <>
      <Stack direction="row" sx={{ gap: 1, mb: 2 }}>
        {userCredentials.map((credential) => (
          <Button
            key={credential.title}
            variant="outlined"
            color="secondary"
            sx={{ flex: 1 }}
            onClick={() => reset({ email: credential.email, password: credential.password })}
          >
            {credential.title}
          </Button>
        ))}
      </Stack>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack gap={2}>
          <Box>
            <InputLabel>Email</InputLabel>
            <OutlinedInput
              {...register('email', emailSchema)}
              placeholder="example@saasable.io"
              fullWidth
              error={Boolean(errors.email)}
              sx={inputSx}
            />
            {errors.email?.message && <FormHelperText error>{errors.email.message}</FormHelperText>}
          </Box>

          <Box>
            <InputLabel>Password</InputLabel>
            <OutlinedInput
              {...register('password', passwordSchema)}
              type={isPasswordVisible ? 'text' : 'password'}
              placeholder="Enter your password"
              fullWidth
              error={Boolean(errors.password)}
              endAdornment={
                <InputAdornment
                  position="end"
                  sx={{ cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
                  onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                >
                  {isPasswordVisible ? <IconEye {...commonIconProps} /> : <IconEyeOff {...commonIconProps} />}
                </InputAdornment>
              }
              sx={inputSx}
            />
            <Stack direction="row" alignItems="center" justifyContent={errors.password ? 'space-between' : 'flex-end'} width={1}>
              {errors.password?.message && <FormHelperText error>{errors.password.message}</FormHelperText>}
              <Link
                component={NextLink}
                underline="hover"
                variant="caption"
                href="/forgot-password"
                textAlign="right"
                sx={{ '&:hover': { color: 'primary.dark' }, mt: 0.75 }}
              >
                Forgot Password?
              </Link>
            </Stack>
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
          Sign In
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
