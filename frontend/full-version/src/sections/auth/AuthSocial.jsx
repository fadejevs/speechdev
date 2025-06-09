'use client';
import PropTypes from 'prop-types';

// @mui
import Button from '@mui/material/Button';
import CardMedia from '@mui/material/CardMedia';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// @project
import GetImagePath from '@/utils/GetImagePath';
import { SocialTypes } from '@/enum';

// @types

/***************************  SOCIAL BUTTON - DATA  ***************************/

const authButtons = [
  {
    label: 'Google',
    icon: '/assets/images/social/google.svg',
    title: 'Sign In with Google'
  }
  // {
  //   label: 'Facebook',
  //   icon: '/assets/images/social/facebook.svg',
  //   title: 'Sign In with Facebook'
  // },
  // {
  //   label: 'Apple',
  //   icon: { light: '/assets/images/social/apple-light.svg', dark: '/assets/images/social/apple-dark.svg' },
  //   title: 'Sign In with Apple'
  // }
];

/***************************  AUTH - SOCIAL  ***************************/

export default function AuthSocial({ type = SocialTypes.VERTICAL, buttonSx }) {
  return (
    <Stack direction={type === SocialTypes.VERTICAL ? 'column' : 'row'} sx={{ gap: 1 }}>
      {authButtons.map((item, index) => (
        <Button
          key={index}
          variant="outlined"
          fullWidth
          size="small"
          color="secondary"
          sx={{ 
            ...(type === SocialTypes.HORIZONTAL && { '.MuiButton-startIcon': { m: 0 } }), 
            ...buttonSx,
            justifyContent: 'flex-start',
            gap: 1
          }}
          startIcon={<CardMedia component="img" src={GetImagePath(item.icon)} sx={{ width: 16, height: 16 }} alt={item.label} />}
          onClick={async () => {
            if (item.label === 'Google') {
              const { supabase } = await import('@/utils/supabase/client');
              await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                  redirectTo: window.location.origin + '/dashboard/analytics'
                }
              });
              // After redirect and login, call syncGoogleProfile (see below)
            }
          }}
        >
          <Typography variant="caption1" sx={{ flexGrow: 1, textAlign: 'center' }}>
            {item.title}
          </Typography>
        </Button>
      ))}
    </Stack>
  );
}

AuthSocial.propTypes = { type: PropTypes.any, buttonSx: PropTypes.any };
