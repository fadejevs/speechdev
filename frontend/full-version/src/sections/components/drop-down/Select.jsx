'use client';

import { useState } from 'react';

// @mui
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';

// @assets
import { IconCommand, IconCut, IconUser } from '@tabler/icons-react';
import { Stack } from '@mui/material';

/***************************  DROP-DOWN - SELECT  ***************************/

export default function BasicSelect() {
  const [age, setAge] = useState('10');

  const handleChange = (event) => {
    setAge(event.target.value);
  };

  return (
    <Stack spacing={-1}>
      <InputLabel>Age</InputLabel>
      <FormControl fullWidth>
        <Select
          id="demo-simple-select"
          value={age}
          onChange={handleChange}
          renderValue={(selected) => {
            console.log(selected);
            return selected;
          }}
          sx={{ mt: 2 }}
        >
          <MenuItem value={10}>
            <ListItemIcon>
              <IconCut size={16} />
            </ListItemIcon>
            <ListItemText>Cut</ListItemText>
            <Typography variant="caption" className="MuiTypography-custom">
              <IconCommand size={20} />C
            </Typography>
          </MenuItem>
          <MenuItem value={20}>
            <ListItemIcon>
              <IconUser size={16} />
            </ListItemIcon>
            <ListItemText>My Account</ListItemText>
            <Typography variant="caption" className="MuiTypography-custom">
              <IconCommand size={20} />C
            </Typography>
          </MenuItem>
          <MenuItem value={30}>Logout</MenuItem>
        </Select>
      </FormControl>
    </Stack>
  );
}
