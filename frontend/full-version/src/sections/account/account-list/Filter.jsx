import PropTypes from 'prop-types';
import { useState } from 'react';

// @mui
import { useTheme } from '@mui/material/styles';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import useMediaQuery from '@mui/material/useMediaQuery';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Fade from '@mui/material/Fade';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import Popper from '@mui/material/Popper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// @project
import MainCard from '@/components/MainCard';
import SimpleBar from '@/components/third-party/SimpleBar';
import DebouncedInput from '@/components/third-party/table/DebouncedInput';

//@third party
import { format } from 'date-fns';
import { Controller, useForm } from 'react-hook-form';

//@types
import { Plans } from '@/sections/account/type';

// @assets
import { IconFilter, IconX } from '@tabler/icons-react';

const planOptions = [
  { label: 'Basic', value: Plans.BASIC },
  { label: 'Started', value: Plans.STARTER },
  { label: 'Enterprise', value: Plans.ENTERPRISE }
];

const statusOptions = ['Paid', 'Scheduled'];

/***************************  TABLE - FILTER  ***************************/

export default function FilterSection({ sx }) {
  const theme = useTheme();
  const onlyXS = useMediaQuery(theme.breakpoints.only('xs'));

  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const open = Boolean(filterAnchorEl);
  const id = open ? 'Filter-popper' : undefined;

  const handleActionClick = (event) => {
    setFilterAnchorEl(filterAnchorEl ? null : event.currentTarget);
  };

  const {
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors }
  } = useForm({
    defaultValues: {
      plan: [Plans.STARTER, Plans.ENTERPRISE],
      status: ['Scheduled'],
      startDate: new Date('2023-08-07'),
      endDate: new Date('2023-08-22')
    }
  });

  const onSubmit = (data) => {
    console.log(data);
    reset();
  };

  const selectedPlans = watch('plan', []);
  const selectedStatus = watch('status', []);
  const startDates = watch('startDate');
  const endDates = watch('endDate');

  const formattedStartDate = startDates ? format(new Date(startDates), 'dd MMM') : 'N/A';
  const formattedEndDate = endDates ? format(new Date(endDates), 'dd MMM') : 'N/A';

  return (
    <Box sx={{ ...sx }}>
      <Button
        variant="text"
        color="secondary"
        startIcon={<IconFilter size={16} />}
        sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
        onClick={handleActionClick}
      >
        Filter
      </Button>
      <IconButton
        size="small"
        color="secondary"
        sx={{ display: { xs: 'block', sm: 'none' } }}
        onClick={handleActionClick}
        aria-label="filter"
      >
        <IconFilter size={16} />
      </IconButton>
      <Popper
        placement="bottom-end"
        id={id}
        open={open}
        anchorEl={filterAnchorEl}
        transition
        popperOptions={{ modifiers: [{ name: 'offset', options: { offset: [onlyXS ? 12 : 22, onlyXS ? 12 : 0] } }] }}
      >
        {({ TransitionProps }) => (
          <Fade in={open} {...TransitionProps}>
            <MainCard sx={{ p: 0, borderRadius: 3, boxShadow: theme.customShadows.tooltip, width: { xs: 'calc(100vw - 32px)', sm: 352 } }}>
              <ClickAwayListener onClickAway={() => setFilterAnchorEl(null)}>
                <Box>
                  <Stack
                    direction="row"
                    sx={{
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 2,
                      p: 2,
                      borderBottom: `1px solid ${theme.palette.divider}`
                    }}
                  >
                    <Typography variant="h6">Filter</Typography>
                    <IconButton variant="outlined" size="small" color="secondary" aria-label="close" onClick={handleActionClick}>
                      <IconX size={16} />
                    </IconButton>
                  </Stack>
                  <form onSubmit={handleSubmit(onSubmit)}>
                    <SimpleBar sx={{ maxHeight: '100%', height: 1 }}>
                      <Box sx={{ px: 1, py: 2 }}>
                        <Box sx={{ mb: 1.5 }}>
                          <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                            {[...selectedPlans].map((item, index) => (
                              <Chip
                                key={index}
                                label={item}
                                variant="tag"
                                color="secondary"
                                size="small"
                                clickable={true}
                                onDelete={() => {
                                  const newPlans = selectedPlans.filter((plan) => plan !== item);
                                  setValue('plan', newPlans);
                                }}
                              />
                            ))}
                            {[...selectedStatus].map((item, index) => (
                              <Chip
                                key={index}
                                label={item}
                                variant="tag"
                                color="secondary"
                                size="small"
                                clickable={true}
                                onDelete={() => {
                                  const newStatus = selectedStatus.filter((status) => status !== item);
                                  setValue('status', newStatus);
                                }}
                              />
                            ))}
                            <Chip
                              label={`${formattedStartDate} - ${formattedEndDate}`}
                              variant="tag"
                              color="secondary"
                              size="small"
                              clickable={true}
                              onDelete={() => {
                                setValue('startDate', null);
                                setValue('endDate', null);
                              }}
                            />
                          </Stack>
                        </Box>
                        <DebouncedInput fullWidth placeholder="Search here" value="" onValueChange={(data) => console.log(data)} />
                        <Box sx={{ mt: 1.5 }}>
                          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', p: 1, mb: 0.5 }}>
                            <Typography variant="caption1" color="text.disabled">
                              Plans
                            </Typography>
                            <Chip
                              label={`${selectedPlans.length} Plan${selectedPlans.length > 1 ? 's' : ''}`}
                              variant="outlined"
                              color="secondary"
                              size="small"
                            />
                          </Stack>
                          <Controller
                            name="plan"
                            control={control}
                            render={({ field }) => (
                              <FormGroup sx={{ gap: 1.25, pl: 1 }}>
                                {planOptions.map(({ label, value }) => (
                                  <FormControlLabel
                                    key={value}
                                    control={
                                      <Checkbox
                                        size="medium"
                                        checked={selectedPlans.includes(value)}
                                        onChange={() =>
                                          field.onChange(
                                            selectedPlans.includes(value)
                                              ? selectedPlans.filter((plan) => plan !== value)
                                              : [...selectedPlans, value]
                                          )
                                        }
                                        sx={{ mt: -1 }}
                                      />
                                    }
                                    label={<Typography variant="body2">{label}</Typography>}
                                    sx={{ alignItems: 'flex-start' }}
                                  />
                                ))}
                              </FormGroup>
                            )}
                          />
                        </Box>
                        <Box sx={{ mt: 1.5 }}>
                          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', p: 1, mb: 0.5 }}>
                            <Typography variant="caption1" color="text.disabled">
                              Status
                            </Typography>
                            <Chip
                              label={`${selectedStatus.length} Status${selectedStatus.length > 1 ? 'es' : ''}`}
                              variant="outlined"
                              color="secondary"
                              size="small"
                            />
                          </Stack>
                          <Controller
                            name="status"
                            control={control}
                            render={({ field }) => (
                              <FormGroup sx={{ gap: 1.25, pl: 1 }}>
                                {statusOptions.map((status) => (
                                  <FormControlLabel
                                    key={status}
                                    control={
                                      <Checkbox
                                        size="medium"
                                        checked={selectedStatus.includes(status)}
                                        onChange={() =>
                                          field.onChange(
                                            selectedStatus.includes(status)
                                              ? selectedStatus.filter((plan) => plan !== status)
                                              : [...selectedStatus, status]
                                          )
                                        }
                                        sx={{ mt: -1 }}
                                      />
                                    }
                                    label={<Typography variant="body2">{status}</Typography>}
                                    sx={{ alignItems: 'flex-start' }}
                                  />
                                ))}
                              </FormGroup>
                            )}
                          />
                        </Box>
                        <Box sx={{ mt: 1.5 }}>
                          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', p: 1, mb: 0.5 }}>
                            <Typography variant="caption1" color="text.disabled">
                              Date
                            </Typography>
                            <Chip label={`${formattedStartDate} - ${formattedEndDate}`} variant="outlined" color="secondary" size="small" />
                          </Stack>
                          <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center' }}>
                            <LocalizationProvider dateAdapter={AdapterDateFns}>
                              <Box>
                                <InputLabel>Form</InputLabel>
                                <Controller
                                  name="startDate"
                                  control={control}
                                  rules={{
                                    required: 'Start date is required',
                                    validate: (value) => (endDates && value && value <= endDates) || 'Start date cannot be after end date'
                                  }}
                                  render={({ field }) => (
                                    <DatePicker
                                      value={field.value}
                                      onChange={(date) => field.onChange(date)}
                                      slotProps={{
                                        textField: {
                                          variant: 'outlined',
                                          error: !!errors.startDate,
                                          helperText: errors.startDate?.message
                                        },
                                        actionBar: {
                                          actions: ['clear']
                                        }
                                      }}
                                    />
                                  )}
                                />
                              </Box>

                              <Box>
                                <InputLabel>To</InputLabel>
                                <Controller
                                  name="endDate"
                                  control={control}
                                  rules={{
                                    required: 'End date is required',
                                    validate: (value) =>
                                      (startDates && value && value >= startDates) || 'End date cannot be before start date'
                                  }}
                                  render={({ field }) => (
                                    <DatePicker
                                      value={field.value}
                                      onChange={(date) => field.onChange(date)}
                                      minDate={startDates ?? undefined}
                                      slotProps={{
                                        textField: {
                                          variant: 'outlined',
                                          error: !!errors.endDate,
                                          helperText: errors.endDate?.message
                                        },
                                        actionBar: ({ wrapperVariant }) => ({
                                          actions: wrapperVariant === 'desktop' ? [] : ['clear']
                                        })
                                      }}
                                    />
                                  )}
                                />
                              </Box>
                            </LocalizationProvider>
                          </Stack>
                        </Box>
                      </Box>
                    </SimpleBar>
                  </form>
                  <Stack
                    direction="row"
                    sx={{ width: 1, justifyContent: 'space-between', gap: 2, p: 2, borderTop: `1px solid ${theme.palette.divider}` }}
                  >
                    <Button variant="outlined" color="secondary" onClick={() => reset()}>
                      Reset
                    </Button>
                    <Button variant="contained" onClick={handleActionClick}>
                      Apply
                    </Button>
                  </Stack>
                </Box>
              </ClickAwayListener>
            </MainCard>
          </Fade>
        )}
      </Popper>
    </Box>
  );
}

FilterSection.propTypes = { sx: PropTypes.any };
