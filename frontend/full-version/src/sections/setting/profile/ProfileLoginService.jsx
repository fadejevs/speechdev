// @mui
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CardMedia from '@mui/material/CardMedia';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// @project
import SettingCard from '@/components/cards/SettingCard';
import { AvatarSize } from '@/enum';

// @assets
import { IconExternalLink } from '@tabler/icons-react';

/***************************   PROFILE - LOGIN SERIVCE  ***************************/

export default function SettingServiceCard() {
  return (
    <SettingCard title="Login Service" caption="Connect an external login service to quickly and securely access your account.">
      <List disablePadding>
        <ListItem sx={{ p: { xs: 2, sm: 3 }, flexWrap: 'wrap', gap: 1 }}>
          <ListItemAvatar sx={{ mr: 1, minWidth: 48 }}>
            <Avatar sx={{ bgcolor: 'grey.100' }} variant="rounded" size={AvatarSize.MD}>
              <CardMedia component="img" src="/assets/images/social/google.svg" alt="social icon" sx={{ width: 'auto' }} />
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary="You can log in using Google"
            secondary={
              <Stack direction="row" sx={{ gap: 0.25, alignItems: 'center' }}>
                <Typography>Connected to </Typography>
                <Typography sx={{ color: 'primary.main', '& svg': { verticalAlign: 'middle', ml: 0.25 } }}>
                  junius12@saasable.io
                  <Link href="#" aria-label="external link">
                    <IconExternalLink size={16} />
                  </Link>
                </Typography>
              </Stack>
            }
            primaryTypographyProps={{ variant: 'body2', color: 'grey.800' }}
            // Set component for console error & warning remove
            secondaryTypographyProps={{ component: 'div', mt: 1 }}
          />
          <Button sx={{ ml: 'auto' }}>Disconnect</Button>
        </ListItem>
      </List>
    </SettingCard>
  );
}
