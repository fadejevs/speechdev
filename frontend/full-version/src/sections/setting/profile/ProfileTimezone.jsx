'use client';
import PropTypes from 'prop-types';

import { useState, useEffect } from 'react';

// @mui
import Autocomplete from '@mui/material/Autocomplete';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';

// @project
import SettingCard from '@/components/cards/SettingCard';

const TimeList = [
  { label: '(GMT+05:30) Chennai,Kolkata, Mumbai, New Delhi', iana: 'Asia/Kolkata' },
  { label: '(GMT-05:00) Eastern Time (US & Canada) - New York, Washington, D.C.', iana: 'America/New_York' },
  { label: '(GMT-06:00) Central Time (US & Canada) - Chicago, Dallas', iana: 'America/Chicago' },
  { label: '(GMT+02:00) Eastern European Time - Riga, Vilnius, Tallinn', iana: 'Europe/Riga' },
  // ...add more as needed
];

const mapIanaToTimeList = (ianaTz) => {
  if (!ianaTz) return null;
  if (ianaTz.includes('Kolkata') || ianaTz.includes('Calcutta')) return TimeList[0];
  if (ianaTz.includes('New_York') || ianaTz.includes('Washington')) return TimeList[1];
  if (ianaTz.includes('Chicago') || ianaTz.includes('Dallas')) return TimeList[2];
  // Add more mappings as needed
  return null;
};

/***************************   PROFILE - TIMEZONE  ***************************/

export default function SettingTimezoneCard({ selectedTags, setSelectedTags, isDisabled = false }) {
  // Find the initial value by label (for backward compatibility)
  const initialValue = TimeList.find(tz => tz.label === selectedTags) || TimeList[0];
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (!selectedTags) {
      const ianaTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const matched = TimeList.find(tz => tz.iana === ianaTz);
      if (matched) {
        setValue(matched);
        if (setSelectedTags) setSelectedTags(matched.label);
      }
    }
  }, [selectedTags, setSelectedTags]);

  return (
    <SettingCard title="Timezone" caption="Set your preferred timezone for accurate timekeeping.">
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <InputLabel>Timezone</InputLabel>
        <Autocomplete
          options={TimeList}
          getOptionLabel={option => option.label}
          value={value}
          onChange={(_event, newValue) => {
            if (newValue) {
              setValue(newValue);
              if (setSelectedTags) setSelectedTags(newValue.label);
            }
          }}
          disabled={isDisabled}
          disableClearable
          renderOption={({ key: optionKey, ...optionProps }, option) => (
            <li key={optionKey} {...optionProps}>
              {option.label}
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
