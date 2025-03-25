'use client';

import { useState } from 'react';

// @mui
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid2';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

//@project
import { AccountList, NewAccount } from '@/sections/account';

// @assets
import { IconPlus } from '@tabler/icons-react';

/***************************  ACCOUNT  ***************************/

export default function Account() {
  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Grid container spacing={{ xs: 2, sm: 3 }}>
      <Grid size={12}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h6">Account</Typography>
          <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={handleOpen}>
            Add New
          </Button>
          <NewAccount open={open} onClose={handleClose} />
        </Stack>
      </Grid>
      <Grid size={12}>
        <AccountList />
      </Grid>
    </Grid>
  );
}
