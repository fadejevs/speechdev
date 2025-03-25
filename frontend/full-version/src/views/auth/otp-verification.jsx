'use client';

// @next
import { useSearchParams, redirect } from 'next/navigation';

import { useEffect, useState } from 'react';

// @mui
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// @project
import CircularWithPath from '@/components/progress/CircularWithPath';
import Copyright from '@/sections/auth/Copyright';
import axios from '@/utils/axios';

// @types
import AuthOtpVerification from '@/sections/auth/AuthOtpVerification';

const resendTypes = {
  signup: 'signup',
  email_change: 'email_change'
};

/***************************  AUTH - OTP VERIFICATION  ***************************/

export default function OtpVerification() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const verify = searchParams.get('verify') || 'signup';
  if (!email) {
    redirect('/register');
  }

  const [timer, setTimer] = useState(60); // 1 minute = 60 seconds
  const [isTimerActive, setIsTimerActive] = useState(false);

  useEffect(() => {
    let interval;
    if (isTimerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    } else if (timer === 0) {
      setIsTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timer]);

  const resendCode = () => {
    setTimer(60); // Reset timer to 60 seconds
    setIsTimerActive(true);

    const type = resendTypes[verify] ?? resendTypes.signup;
    const payload = { email, type };

    axios
      .post('/api/auth/resend', payload)
      .then(() => {})
      .catch((response) => {
        console.log(response.error || 'Something went wrong');
      });
  };

  return (
    <Stack sx={{ height: 1, gap: 3 }}>
      <Box sx={{ width: 1, maxWidth: 458, m: 'auto' }}>
        <Stack sx={{ gap: { xs: 1, sm: 1.5 }, textAlign: 'center', mb: { xs: 3, sm: 8 } }}>
          <Typography variant="h1">Verify Code</Typography>
          <Typography variant="body1" color="text.secondary">
            Code is sent to{' '}
            <Typography component="span" variant="subtitle1" color="text.primary">
              {email}
            </Typography>
          </Typography>
        </Stack>

        {/* Code verification form */}
        <AuthOtpVerification email={email} verify={verify} />

        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mt: { xs: 2, sm: 3 } }}>
          <Typography variant="body2" color="text.secondary">
            Didn’t receive a code?{' '}
            <Link
              variant="subtitle2"
              underline={isTimerActive ? 'none' : 'hover'}
              {...(!isTimerActive && { onClick: resendCode })}
              {...(isTimerActive && { color: 'text.disabled' })}
              sx={{ cursor: isTimerActive ? 'not-allowed' : 'pointer', ...(!isTimerActive && { '&:hover': { color: 'primary.dark' } }) }}
            >
              Request again
            </Link>
          </Typography>

          {isTimerActive && (
            <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5 }}>
              <CircularWithPath variant="determinate" value={(timer / 60) * 100} size={15} thickness={5} />
              <Typography variant="body2" sx={{ color: 'text.primary' }}>
                {String(timer).padStart(2, '0')} s
              </Typography>
            </Stack>
          )}
        </Stack>
      </Box>

      {/* Copyright section*/}
      <Copyright />
    </Stack>
  );
}
