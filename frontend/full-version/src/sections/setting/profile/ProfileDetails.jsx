import { useState, useEffect } from 'react';

// @mui
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import FormHelperText from '@mui/material/FormHelperText';
import Grid from '@mui/material/Grid2';
import InputLabel from '@mui/material/InputLabel';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';

// @project
import ModalEmail from './ModalEmail';
import ModalPhoneNumber from './ModalPhoneNumber';
import ModalPassword from './ModalPassword';
import ProfileAvatar from './ProfileAvatar';

import SettingCard from '@/components/cards/SettingCard';
import DialogLogout from '@/components/dialog/DialogLogout';
import DialogDelete from '@/components/dialog/DialogDelete';

// @assets
import { IconCheck } from '@tabler/icons-react';
import { supabase } from '@/utils/supabase/client';
import useCurrentUser from '@/hooks/useCurrentUser';

/***************************   PROFILE - DETAILS  ***************************/

export default function SettingDetailsCard() {
  const listStyle = { p: { xs: 2, sm: 3 }, flexWrap: 'wrap', gap: 1 };

  const primaryTypographyProps = { variant: 'body2', sx: { color: 'grey.700' } };
  const secondaryTypographyProps = {
    variant: 'body1',
    sx: { mt: 1, color: 'text.primary' }
  };

  // Dialog Logout handle
  const [openLogoutDialog, setOpenLogoutDialog] = useState(false);
  const handleDialogLogoutOpen = () => {
    setOpenLogoutDialog(true);
  };

  const handleDialogLogoutClose = () => {
    setOpenLogoutDialog(false);
  };

  const handleDialogLogout = () => {
    console.log('logout');
    setOpenLogoutDialog(false);
  };

  // Dialog Delete handle
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const handleDialogDeleteOpen = () => {
    setOpenDeleteDialog(true);
  };

  const handleDialogDeleteClose = () => {
    setOpenDeleteDialog(false);
  };

  const handleDialogDelete = () => {
    console.log('Delete');
    setOpenDeleteDialog(false);
  };

  // --- Add state for user profile ---
  const [profile, setProfile] = useState({ firstname: '', lastname: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { refreshUser } = useCurrentUser();

  // --- Fetch user profile on mount ---
  useEffect(() => {
    async function fetchUser() {
      setLoading(true);
      const { data: { user }, error } = await supabase.auth.getUser();
      if (user) {
        setProfile({
          firstname: user.user_metadata?.firstname || '',
          lastname: user.user_metadata?.lastname || '',
          email: user.email || ''
        });
      }
      setLoading(false);
    }
    fetchUser();
  }, []);

  // --- Handle input changes ---
  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  // --- Handle save ---
  const handleSave = async () => {
    setSaving(true);
    setError('');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user) {
      setError('You are not logged in. Please log in again.');
      setSaving(false);
      return;
    }
    const displayName = `${profile.firstname} ${profile.lastname}`.trim();
    const { error } = await supabase.auth.updateUser({
      data: {
        firstname: profile.firstname,
        lastname: profile.lastname,
        display_name: displayName
      }
    });

    await refreshUser();

    setSaving(false);
    if (error) setError(error.message);
  };

  return (
    <SettingCard title="Details" caption="Manage your personal details and preferences.">
      <List disablePadding>
        <ListItem sx={listStyle} divider>
          <ProfileAvatar />
        </ListItem>
        <ListItem sx={listStyle} divider>
          <Grid container columnSpacing={2} rowSpacing={1.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <InputLabel>First Name</InputLabel>
              <OutlinedInput
                name="firstname"
                value={profile.firstname}
                onChange={handleChange}
                fullWidth
                aria-describedby="outlined-name"
                inputProps={{ 'aria-label': 'name' }}
                placeholder="ex. John"
                disabled={loading}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <InputLabel>Last Name</InputLabel>
              <OutlinedInput
                name="lastname"
                value={profile.lastname}
                onChange={handleChange}
                fullWidth
                aria-describedby="outlined-name"
                inputProps={{ 'aria-label': 'name' }}
                placeholder="ex. Doe"
                disabled={loading}
              />
            </Grid>
            <Grid size={12}>
              <FormHelperText sx={{ mt: 0 }}>
                Use your first and last name as they appear on your government-issued ID.
              </FormHelperText>
            </Grid>
            <Grid size={12}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSave}
                disabled={loading || saving}
                sx={{ mt: 2 }}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
              {error && <FormHelperText error>{error}</FormHelperText>}
            </Grid>
          </Grid>
        </ListItem>
        <ListItem sx={listStyle} divider>
          <ListItemText
            primary="Email Address"
            secondary={profile.email}
            {...{ primaryTypographyProps, secondaryTypographyProps }}
          />
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, ml: 'auto' }}>
            <Chip label="Verified" variant="text" avatar={<IconCheck />} color="success" />
            <ModalEmail />
          </Stack>
        </ListItem>
        <ListItem sx={listStyle} divider>
          <ListItemText
            primary="Phone Number (optional)"
            secondary="No phone number"
            {...{ primaryTypographyProps, secondaryTypographyProps }}
          />
          <ModalPhoneNumber />
        </ListItem>
        <ListItem sx={listStyle} divider>
          <ListItemText
            primary="Change Password"
            secondary="Change the passwords for your Account Security"
            {...{ primaryTypographyProps, secondaryTypographyProps }}
          />
          <ModalPassword />
        </ListItem>
        <ListItem sx={listStyle} divider>
          <ListItemText primary="Logout" secondary="Logout options here" {...{ primaryTypographyProps, secondaryTypographyProps }} />
          <Button onClick={handleDialogLogoutOpen} sx={{ ml: 'auto' }}>
            Logout
          </Button>
          <DialogLogout
            open={openLogoutDialog}
            title="Logout"
            heading="Are you sure you want to logout of Erika Collins?"
            onClose={handleDialogLogoutClose}
            onLogout={handleDialogLogout}
          />
        </ListItem>
        <ListItem sx={listStyle}>
          <ListItemText
            primary="Delete Account"
            secondary="No longer use of this Account?"
            {...{ primaryTypographyProps, secondaryTypographyProps }}
          />
          <Button color="error" onClick={handleDialogDeleteOpen} sx={{ ml: 'auto' }}>
            Delete Account
          </Button>
          <DialogDelete
            open={openDeleteDialog}
            title="Delete Account"
            heading="Are you sure you want to Delete Your Account?"
            description="After deleting your account there is no way to recover your data back."
            onClose={handleDialogDeleteClose}
            onDelete={handleDialogDelete}
          />
        </ListItem>
      </List>
    </SettingCard>
  );
}

function AvatarUpload({ user, profile, onAvatarChange }) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    console.log('handleFileChange called');
    const file = e.target.files[0];
    if (!file) {
      console.log('No file selected');
      return;
    }
    console.log('Selected file:', file);

    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/${user.id}.${fileExt}`;
    console.log('Upload path:', filePath);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    console.log('Upload data:', uploadData);
    console.log('Upload error:', uploadError);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      alert('Upload failed!');
      setUploading(false);
      return;
    }

    // 2. Get public URL
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const publicUrl = data.publicUrl;

    // 3. Update profile in Supabase
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id);

    if (updateError) {
      alert('Profile update failed!');
      setUploading(false);
      return;
    }

    setUploading(false);
    if (onAvatarChange) onAvatarChange(publicUrl);
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} />
      {uploading && <p>Uploading...</p>}
    </div>
  );
}
