'use client';

import React, { useState } from 'react';

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

// @assets
import { IconTrash, IconUpload } from '@tabler/icons-react';

/***************************  PROFILE - AVATAR  ***************************/

export default function ProfileAvatar() {
  const [avatar, setAvatar] = useState('/assets/images/users/avatar-1.png');

  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatar(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: { 'image/*': [] }, maxFiles: 1 });

  return (
    <>
      <ListItemAvatar sx={{ mr: 2 }}>
        <Avatar src={avatar || undefined} alt="Erika Collins" size={AvatarSize.XL}>
          EC
        </Avatar>
      </ListItemAvatar>
      <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
        <ListItemText {...getRootProps()}>
          <input {...getInputProps()} />
          <Button variant="outlined" color="secondary" size="small" startIcon={<IconUpload size={16} stroke={1.5} />}>
            Upload Photo
          </Button>
        </ListItemText>
        {avatar && (
          <Tooltip title="Remove Avatar">
            <IconButton color="error" onClick={() => setAvatar(null)} size="small" aria-label="delete">
              <IconTrash size={16} stroke={1.5} />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </>
  );
}
