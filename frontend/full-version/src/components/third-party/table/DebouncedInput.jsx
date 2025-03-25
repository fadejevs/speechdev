'use client';
import PropTypes from 'prop-types';

import { useEffect, useState } from 'react';

// @mui
import { useTheme } from '@mui/material/styles';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';

// @assets
import { IconSearch } from '@tabler/icons-react';

/***************************  REACT TABLE - DEBOUNCED INPUT  ***************************/

export default function DebouncedInput({ value: initialValue, onValueChange, debounce = 500, size, startAdornment, borderless, ...props }) {
  const theme = useTheme();

  const [value, setValue] = useState(initialValue);
  const handleInputChange = (event) => setValue(event.target.value);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onValueChange(value);
    }, debounce);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line
  }, [value]);

  return (
    <OutlinedInput
      {...props}
      value={value}
      onChange={handleInputChange}
      startAdornment={
        startAdornment || (
          <InputAdornment position="start">
            <IconSearch color={theme.palette.grey[700]} />
          </InputAdornment>
        )
      }
      {...(size && { size })}
      sx={{ ...(borderless && { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 0 }, boxShadow: 'unset' }) }}
    />
  );
}

DebouncedInput.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onValueChange: PropTypes.func,
  debounce: PropTypes.number,
  size: PropTypes.any,
  startAdornment: PropTypes.any,
  borderless: PropTypes.bool,
  props: PropTypes.any
};
