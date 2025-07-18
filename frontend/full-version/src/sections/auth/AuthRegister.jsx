'use client';
import PropTypes from 'prop-types';

// @next
import { useRouter } from 'next/navigation';

import { useState, useEffect } from 'react';

// @mui
import { useTheme } from '@mui/material/styles';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import FormHelperText from '@mui/material/FormHelperText';
import Grid from '@mui/material/Grid2';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';

// @third-party
import { useForm } from 'react-hook-form';

// @project
import Contact from '@/components/Contact';
import axios from '@/utils/axios';
import { emailSchema, firstNameSchema, lastNameSchema } from '@/utils/validationSchema';
import countries from '@/data/countries';

/***************************  AUTH - REGISTER  ***************************/

export default function AuthRegister({ inputSx }) {
  const router = useRouter();
  const theme = useTheme();
  const [isProcessing, setIsProcessing] = useState(false);
  const [registerError, setRegisterError] = useState('');

  // Initialize react-hook-form
  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors }
  } = useForm({ defaultValues: { dialcode: '+1' } });

  // Add this useEffect to fetch and set the local dial code
  useEffect(() => {
    fetch('https://api.geoapify.com/v1/ipinfo?&apiKey=a108fe26f510452dae47978e1619c895')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.country && data.country.iso_code) {
          const country = countries.find((c) => c.countryCode.toUpperCase() === data.country.iso_code.toUpperCase());
          if (country) {
            setValue('dialcode', country.dialCode);
          }
        }
      })
      .catch(() => {
        // fallback: do nothing, keep default
      });
  }, [setValue]);

  // Handle form submission
  const onSubmit = (formData) => {
    const payload = {
      firstname: formData.firstname,
      lastname: formData.lastname,
      dialcode: formData.dialcode,
      contact: formData.contact,
      email: formData.email
    };

    setIsProcessing(true);
    setRegisterError('');

    axios
      .post('/api/auth/signUp', payload)
      .then(() => {
        setIsProcessing(false);
        router.push(`/otp-verification?email=${formData.email}&verify=signup`);
      })
      .catch((response) => {
        setIsProcessing(false);
        // TEMPORARY FOR TESTING: If rate limit error, still redirect to OTP page
        if (response.error && response.error.includes('rate limit')) {
          console.log('Rate limit hit, but redirecting anyway for testing...');
          router.push(`/otp-verification?email=${formData.email}&verify=signup`);
        } else {
          setRegisterError(response.error || 'Something went wrong');
        }
      });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
      <Grid container rowSpacing={2.5} columnSpacing={1.5}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <InputLabel>First Name</InputLabel>
          <OutlinedInput
            {...register('firstname', firstNameSchema)}
            placeholder="Enter first name"
            fullWidth
            error={Boolean(errors.firstname)}
            sx={{ ...inputSx }}
          />
          {errors.firstname?.message && <FormHelperText error>{errors.firstname?.message}</FormHelperText>}
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <InputLabel>Last Name</InputLabel>
          <OutlinedInput
            {...register('lastname', lastNameSchema)}
            placeholder="Enter last name"
            fullWidth
            error={Boolean(errors.lastname)}
            sx={{ ...inputSx }}
          />
          {errors.lastname?.message && <FormHelperText error>{errors.lastname?.message}</FormHelperText>}
        </Grid>
        <Grid size={12}>
          <InputLabel>Contact</InputLabel>
          <Contact
            fullWidth
            dialCode={watch('dialcode')}
            onCountryChange={(data) => setValue('dialcode', data.dialCode)}
            control={control}
            isError={Boolean(errors.contact)}
          />
          {errors.contact?.message && <FormHelperText error>{errors.contact?.message}</FormHelperText>}
        </Grid>
        <Grid size={12}>
          <InputLabel>Email</InputLabel>
          <OutlinedInput
            {...register('email', emailSchema)}
            placeholder="example@email.com"
            fullWidth
            error={Boolean(errors.email)}
            sx={{ ...inputSx }}
            type="email"
          />
          {errors.email?.message && <FormHelperText error>{errors.email?.message}</FormHelperText>}
        </Grid>
      </Grid>
      <Button
        type="submit"
        color="primary"
        variant="contained"
        disabled={isProcessing}
        endIcon={isProcessing && <CircularProgress color="secondary" size={16} />}
        sx={{ minWidth: 120, mt: { xs: 2, sm: 4 }, '& .MuiButton-endIcon': { ml: 1 } }}
      >
        Sign Up
      </Button>
      {registerError && (
        <Alert sx={{ mt: 2 }} severity="error" variant="filled" icon={false}>
          {registerError}
        </Alert>
      )}
    </form>
  );
}

AuthRegister.propTypes = { inputSx: PropTypes.any };
