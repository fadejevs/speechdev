'use client';

import React, { useState, useEffect } from 'react';

// @mui
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';

// @third-party
import { useDropzone } from 'react-dropzone';

// @project
import { AvatarSize } from '@/enum';
import { supabase } from '@/utils/supabase/client';
import useCurrentUser from '@/hooks/useCurrentUser';

// @assets
import { IconTrash, IconUpload } from '@tabler/icons-react';

/***************************  PROFILE - AVATAR  ***************************/

export default function ProfileAvatar() {
  const { userData, refreshUser } = useCurrentUser();
  // Check for Google avatar first, then fall back to Supabase avatar
  const [avatar, setAvatar] = useState(
    userData?.app_metadata?.provider === 'google' 
      ? userData?.user_metadata?.avatar_url 
      : userData?.user_metadata?.avatar_url || ''
  );
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Update avatar when userData changes, prioritizing Google avatar
    if (userData?.app_metadata?.provider === 'google') {
      setAvatar(userData?.user_metadata?.avatar_url);
    } else {
      setAvatar(userData?.user_metadata?.avatar_url || '');
    }
  }, [userData]);

  // Only show upload/remove buttons if NOT using Google auth
  const showAvatarControls = userData?.app_metadata?.provider !== 'google';

  // Handle file drop/upload
  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file || !userData) return;

    setUploading(true);

    try {
      // 1. Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${userData.id}/${userData.id}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      // 3. Update user profile (user_metadata)
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) throw updateError;

      await refreshUser();
      setAvatar(publicUrl);
    } catch (err) {
      alert('Avatar upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Remove avatar (set to default and remove from user_metadata)
  const handleRemoveAvatar = async () => {
    if (!userData) return;
    setUploading(true);
    try {
      await supabase.auth.updateUser({
        data: { avatar_url: null }
      });
      await refreshUser();
      setAvatar('');
    } catch (err) {
      alert('Failed to remove avatar: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
    disabled: uploading
  });

  const getDisplayName = (user) => {
    if (!user) return '';
    return (
      user.user_metadata?.display_name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email
    );
  };

  return (
    <>
      <ListItemAvatar sx={{ mr: 2 }}>
        <Avatar src={avatar || undefined} alt="Profile Avatar" size={AvatarSize.XL}>
          {getDisplayName(userData)[0]}
        </Avatar>
      </ListItemAvatar>
      <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
        <ListItemText
          primary={getDisplayName(userData)}
          secondary="User"
        />
        {showAvatarControls && (
          <>
            <ListItemText {...getRootProps()}>
              <input {...getInputProps()} />
              <Button
                variant="outlined"
                color="secondary"
                size="small"
                startIcon={<IconUpload size={16} stroke={1.5} />}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload Photo'}
              </Button>
            </ListItemText>
            {avatar && avatar !== '/assets/images/users/avatar-1.png' && (
              <Tooltip title="Remove Avatar">
                <IconButton color="error" onClick={handleRemoveAvatar} size="small" aria-label="delete" disabled={uploading}>
                  <IconTrash size={16} stroke={1.5} />
                </IconButton>
              </Tooltip>
            )}
          </>
        )}
      </Stack>
    </>
  );
}
