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
  const [avatar, setAvatar] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function getAvatar() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // First check for custom uploaded avatar
        if (user?.user_metadata?.avatar_url) {
          setAvatar(user.user_metadata.avatar_url);
        }
        // Then check for Google avatar
        else if (user?.identities?.[0]?.identity_data?.avatar_url) {
          setAvatar(user.identities[0].identity_data.avatar_url);
        }
        // Finally check for avatar in userData
        else if (userData?.avatar_url) {
          setAvatar(userData.avatar_url);
        } else {
          setAvatar('');
        }
      } catch (error) {
        console.error('Error fetching avatar:', error);
        setAvatar('');
      }
    }

    getAvatar();
  }, [userData]);

  const getDisplayName = (user) => {
    if (!user) return '';
    return user.display_name || user.full_name || user.email || 'User';
  };

  // Always show upload/remove buttons
  const showAvatarControls = true;

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

      // 3. Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { 
          avatar_url: publicUrl,
          // Preserve other metadata
          ...userData.user_metadata,
        }
      });

      if (updateError) throw updateError;

      // 4. Update profiles table if it exists
      try {
        await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', userData.id);
      } catch (err) {
        console.log('Profile table update failed:', err);
        // Don't throw error as this is optional
      }

      // 5. Update local state and refresh user data
      setAvatar(publicUrl);
      await refreshUser();

    } catch (err) {
      console.error('Avatar upload error:', err);
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

  return (
    <>
      <ListItemAvatar sx={{ mr: 2 }}>
        <Avatar 
          src={avatar || undefined} 
          alt="Profile Avatar" 
          size={AvatarSize.XL}
        >
          {getDisplayName(userData)?.[0]}
        </Avatar>
      </ListItemAvatar>
      <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
        <ListItemText
          primary={getDisplayName(userData)}
          secondary={userData?.role || "User"}
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
                <IconButton 
                  color="error" 
                  onClick={handleRemoveAvatar} 
                  size="small" 
                  aria-label="delete" 
                  disabled={uploading}
                >
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
