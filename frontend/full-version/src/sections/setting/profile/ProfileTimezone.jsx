'use client';
import PropTypes from 'prop-types';

import { useState } from 'react';

// @mui
import Autocomplete from '@mui/material/Autocomplete';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';

// @project
import SettingCard from '@/components/cards/SettingCard';

const TimeList = [
  '(GMT+05:30) Chennai,Kolkata, Mumbai, New Delhi',
  '(GMT-05:00) Eastern Time (US & Canada) - New York, Washington, D.C.',
  '(GMT-06:00) Central Time (US & Canada) - Chicago, Dallas'
];

/***************************   PROFILE - TIMEZONE  ***************************/

export default function SettingTimezoneCard({ selectedTags, setSelectedTags, isDisabled = false }) {
  const [value, setValue] = useState(selectedTags || '(GMT+05:30) Chennai,Kolkata, Mumbai, New Delhi');

  return (
    <SettingCard title="Timezone" caption="Set your preferred timezone for accurate timekeeping.">
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <InputLabel>Timezone</InputLabel>
        <Autocomplete
          options={TimeList}
          value={value}
          onChange={(_event, newValue) => {
            if (typeof newValue === 'string') {
              setValue(newValue);
              if (setSelectedTags) setSelectedTags(newValue);
            }
          }}
          disabled={isDisabled}
          disableClearable
          renderOption={({ key: optionKey, ...optionProps }, option) => (
            <li key={optionKey} {...optionProps}>
              {option}
            </li>
          )}
          renderInput={(params) => <TextField {...params} slotProps={{ htmlInput: { ...params.inputProps, 'aria-label': 'timezone' } }} />}
          sx={{ width: 1 }}
        />
        <FormHelperText>
          This is the timezone for your account. To set the timezone for your Shopify admin, go to the General section in Settings.
        </FormHelperText>
      </Box>
    </SettingCard>
  );
}

SettingTimezoneCard.propTypes = { selectedTags: PropTypes.string, setSelectedTags: PropTypes.func, isDisabled: PropTypes.bool };
