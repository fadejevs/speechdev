'use client';
import PropTypes from 'prop-types';

import { useEffect, useState } from 'react';

import useMediaQuery from '@mui/material/useMediaQuery';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Grid from '@mui/material/Grid2';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Slide from '@mui/material/Slide';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// @third-party
import { useForm, Controller } from 'react-hook-form';

// @project
import { plansData } from './data/plans';
import Contact from '@/components/Contact';
import DynamicIcon from '@/components/DynamicIcon';
import Modal from '@/components/Modal';
import TagList from '@/components/third-party/table/TagList';
import { ModalSize } from '@/enum';
import { emailSchema, firstNameSchema, lastNameSchema } from '@/utils/validationSchema';

//@type

// @assets
import { IconMail } from '@tabler/icons-react';

// @type
import { Plans } from './type';

const plans = plansData;

/***************************  NEW ACCOUNT - PLANS  ***************************/

function RadioPlan({ plan, timePeriod }) {
  const onlyXS = useMediaQuery((theme) => theme.breakpoints.only('xs'));

  return (
    <Stack
      direction="row"
      sx={{ gap: 0.5, width: 1, justifyContent: 'space-between', alignItems: 'center', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}
    >
      <Stack direction="row" sx={{ gap: 1, alignItems: { sm: 'center' } }}>
        <Avatar sx={{ borderRadius: 2.5 }}>
          <DynamicIcon name={plan.icon} />
        </Avatar>
        <Box>
          <Typography variant="h6" sx={{ color: 'text.primary' }}>
            {plan.title}
          </Typography>
          <TagList list={plan.features} max={onlyXS ? 2 : 4} />
        </Box>
      </Stack>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5 }}>
        <Typography variant="h3">{timePeriod === 'yearly' ? `$${plan.yearlyPrice}` : `$${plan.monthlyPrice}`}</Typography>
        <Typography variant="body1">USD</Typography>
      </Stack>
    </Stack>
  );
}

/*************************** MODAL - NEW ACCOUNT  ***************************/

export default function AddNewAccount({ open, onClose, formData }) {
  const [snackbar, setSnackbar] = useState(null);

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }

    setSnackbar((prev) => prev && { ...prev, open: false });
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    setValue,
    formState: { errors }
  } = useForm({
    defaultValues: formData || { dialcode: '+1', plan: Plans.STARTER, timePeriod: 'monthly' }
  });

  const onSubmit = (data) => {
    console.log(data);
    setSnackbar({ open: true, message: formData ? 'Account has been updated' : 'Account has been created', severity: 'success' });
    reset();
    onClose();
  };

  //if form data is passed, set the form values
  useEffect(() => {
    if (formData) {
      reset(formData);
    }
  }, [formData, reset]);

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        maxWidth={ModalSize.MD}
        header={{
          title: formData ? 'Edit Account' : 'Add Account',
          subheader: 'Manage account with the right plan to support your team’s needs.',
          closeButton: true
        }}
        modalContent={
          <>
            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack sx={{ gap: 3 }}>
                <Stack sx={{ gap: 2 }}>
                  <Typography variant="subtitle1">Personal Detail</Typography>
                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <InputLabel>First Name</InputLabel>
                      <OutlinedInput
                        fullWidth
                        placeholder="ex. John"
                        error={errors.firstName && Boolean(errors.firstName)}
                        {...register('firstName', firstNameSchema)}
                      />
                      {errors.firstName?.message && <FormHelperText error>{errors.firstName?.message}</FormHelperText>}
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <InputLabel>Last Name</InputLabel>
                      <OutlinedInput
                        fullWidth
                        placeholder="ex. Doe"
                        error={errors.lastName && Boolean(errors.lastName)}
                        {...register('lastName', lastNameSchema)}
                      />
                      {errors.lastName?.message && <FormHelperText error>{errors.lastName?.message}</FormHelperText>}
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <InputLabel>Email</InputLabel>
                      <OutlinedInput
                        placeholder="example@saasable.io"
                        fullWidth
                        error={errors.email && Boolean(errors.email)}
                        {...register('email', emailSchema)}
                        startAdornment={
                          <InputAdornment position="start">
                            <IconMail />
                          </InputAdornment>
                        }
                        aria-describedby="outlined-email"
                        inputProps={{ 'aria-label': 'email' }}
                      />
                      {errors.email?.message && <FormHelperText error>{errors.email?.message}</FormHelperText>}
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <InputLabel>Contact</InputLabel>
                      <Contact
                        fullWidth
                        dialCode={watch('dialcode')}
                        onCountryChange={(data) => setValue('dialcode', data.dialCode)}
                        control={control}
                        isError={errors.contact && Boolean(errors.contact)}
                      />
                      {errors.contact?.message && <FormHelperText error>{errors.contact?.message}</FormHelperText>}
                    </Grid>
                  </Grid>
                </Stack>
                <Stack sx={{ gap: 2 }}>
                  <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                    <Typography variant="subtitle1">Plans</Typography>
                    <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
                      <Typography variant="subtitle1" color={watch('timePeriod') === 'monthly' ? 'text.primary' : 'text.secondary'}>
                        Monthly
                      </Typography>
                      <Controller
                        name="timePeriod"
                        control={control}
                        render={({ field }) => (
                          <Switch
                            {...field}
                            checked={field.value === 'yearly'}
                            onChange={(e) => field.onChange(e.target.checked ? 'yearly' : 'monthly')}
                            inputProps={{ 'aria-label': 'time period switch' }}
                          />
                        )}
                      />
                      <Typography variant="subtitle1" color={watch('timePeriod') === 'yearly' ? 'text.primary' : 'text.secondary'}>
                        Yearly
                      </Typography>
                    </Stack>
                  </Stack>
                  <Controller
                    name="plan"
                    control={control}
                    render={({ field }) => (
                      <RadioGroup aria-labelledby="radio-group-pricing-plans" {...field} sx={{ gap: 2 }}>
                        {plans.map((item, index) => (
                          <FormControlLabel
                            key={index}
                            value={item.plan}
                            control={<Radio size="large" sx={{ pl: 0, mr: { xs: 0.75, sm: 1.75 } }} />}
                            sx={{
                              p: 2,
                              borderRadius: 3,
                              border: '1px solid',
                              borderColor: 'grey.100',
                              alignItems: 'flex-start',
                              ml: 0,
                              width: 1,
                              ...(watch('plan') === item.plan && { bgcolor: 'grey.50' })
                            }}
                            label={<RadioPlan {...{ plan: item, timePeriod: watch('timePeriod') }} />}
                            slotProps={{ typography: { sx: { width: 1, alignItems: 'center' } } }}
                          />
                        ))}
                      </RadioGroup>
                    )}
                  />
                </Stack>
              </Stack>
            </form>
          </>
        }
        footer={
          <Stack direction="row" sx={{ width: 1, justifyContent: 'space-between', gap: 2 }}>
            <Button variant="outlined" color="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSubmit(onSubmit)}>
              {formData ? 'Update Account' : 'Create Account'}
            </Button>
          </Stack>
        }
      />
      <Snackbar
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        TransitionComponent={(props) => <Slide {...props} direction="left" />}
        open={snackbar?.open}
        autoHideDuration={2500}
        onClose={handleCloseSnackbar}
      >
        <Alert severity={snackbar?.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </>
  );
}

RadioPlan.propTypes = { plan: PropTypes.any, timePeriod: PropTypes.string };

AddNewAccount.propTypes = { open: PropTypes.any, onClose: PropTypes.any, formData: PropTypes.any };
