'use client';

import { useState } from 'react';

// @mui
import { useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Divider from '@mui/material/Divider';
import Fade from '@mui/material/Fade';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Popper from '@mui/material/Popper';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Box from '@mui/material/Box';

// @project
import { ThemeDirection, ThemeMode } from '@/config';
import MainCard from '@/components/MainCard';
import Profile from '@/components/Profile';
import { AuthRole, AvatarSize, ChipIconPosition } from '@/enum';
import useConfig from '@/hooks/useConfig';
import useCurrentUser from '@/hooks/useCurrentUser';
import { logout } from '@/utils/api';

// @types

// @assets
import { IconChevronRight, IconLanguage, IconLogout, IconSettings, IconSunMoon, IconTextDirectionLtr } from '@tabler/icons-react';

/***************************  HEADER - PROFILE DATA  ***************************/

const profileData = {
  avatar: { src: '/assets/images/users/avatar-1.png', size: AvatarSize.XS },
  title: 'Erika Collins',
  caption: 'Super Admin'
};

const languageList = ['English', 'Spanish', 'France'];

const RoleTitles = {
  [AuthRole.SUPER_ADMIN]: 'Super Admin',
  [AuthRole.ADMIN]: 'Admin',
  [AuthRole.USER]: 'User'
};

/***************************  HEADER - PROFILE  ***************************/

export default function ProfileSection() {
  const theme = useTheme();
  const { onChangeThemeMode, onChangeThemeDirection } = useConfig();
  const { userData } = useCurrentUser();

  const [anchorEl, setAnchorEl] = useState(null);
  const [innerAnchorEl, setInnerAnchorEl] = useState(null);

  const open = Boolean(anchorEl);
  const innerOpen = Boolean(innerAnchorEl);
  const id = open ? 'profile-action-popper' : undefined;
  const innerId = innerOpen ? 'profile-inner-popper' : undefined;
  const buttonStyle = { borderRadius: 2, p: 1 };

  if (userData && Object.keys(userData).length > 0) {
    const name = `${userData?.firstname ?? ''} ${userData?.lastname ?? ''}`.trim();
    profileData.caption = userData?.role ? RoleTitles[userData.role] : undefined;
    profileData.title = name;
  }

  const handleActionClick = (event) => {
    setAnchorEl(anchorEl ? null : event.currentTarget);
  };

  const handleInnerActionClick = (event) => {
    setInnerAnchorEl(innerAnchorEl ? null : event.currentTarget);
  };

  const logoutAccount = () => {
    setAnchorEl(null);
    logout();
  };

  return (
    <>
      <Box onClick={handleActionClick} sx={{ cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
        <Box sx={{ display: { xs: 'none', sm: 'flex' } }}>
          <Profile {...profileData} />
        </Box>
        <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
          <Avatar {...profileData.avatar} alt={profileData.title} />
        </Box>
      </Box>
      <Popper
        placement="bottom-end"
        id={id}
        open={open}
        anchorEl={anchorEl}
        transition
        popperOptions={{ modifiers: [{ name: 'offset', options: { offset: [theme.direction === ThemeDirection.RTL ? -8 : 8, 8] } }] }}
      >
        {({ TransitionProps }) => (
          <Fade in={open} {...TransitionProps}>
            <MainCard sx={{ borderRadius: 2, boxShadow: theme.customShadows.tooltip, minWidth: 220, p: 0.5 }}>
              <ClickAwayListener onClickAway={() => setAnchorEl(null)}>
                <Stack sx={{ p: 0.5 }}>
                  <Profile
                    {...profileData}
                    sx={{
                      flexDirection: 'column',
                      justifyContent: 'center',
                      textAlign: 'center',
                      width: 1,
                      '& .MuiAvatar-root': { width: 48, height: 48 }
                    }}
                  />
                  <Divider sx={{ my: 1 }} />
                  <List disablePadding>
                    <ListItem
                      secondaryAction={
                        <Switch
                          size="small"
                          checked={theme.palette.mode === ThemeMode.DARK}
                          onChange={() => onChangeThemeMode(theme.palette.mode === ThemeMode.DARK ? ThemeMode.LIGHT : ThemeMode.DARK)}
                        />
                      }
                      sx={{ py: 1, pl: 1, '& .MuiListItemSecondaryAction-root': { right: 8 } }}
                    >
                      <ListItemIcon>
                        <IconSunMoon size={16} />
                      </ListItemIcon>
                      <ListItemText primary="Dark Theme" />
                    </ListItem>
                    {/* <ListItem
                      secondaryAction={
                        <Switch
                          size="small"
                          checked={theme.direction === ThemeDirection.RTL}
                          onChange={() =>
                            onChangeThemeDirection(theme.direction === ThemeDirection.RTL ? ThemeDirection.LTR : ThemeDirection.RTL)
                          }
                        />
                      }
                      sx={{ py: 1, pl: 1, '& .MuiListItemSecondaryAction-root': { right: 8 } }}
                    >
                      <ListItemIcon>
                        <IconTextDirectionLtr size={16} />
                      </ListItemIcon>
                      <ListItemText primary="RTL" />
                    </ListItem> */}
                    <ListItemButton sx={buttonStyle} onClick={handleInnerActionClick}>
                      <ListItemIcon>
                        <IconLanguage size={16} />
                      </ListItemIcon>
                      <ListItemText primary="Language" />
                      <Chip
                        label="Eng"
                        variant="text"
                        size="small"
                        color="secondary"
                        icon={<IconChevronRight size={16} />}
                        position={ChipIconPosition.RIGHT}
                      />
                      <Popper
                        placement="left-start"
                        id={innerId}
                        open={innerOpen}
                        anchorEl={innerAnchorEl}
                        transition
                        popperOptions={{
                          modifiers: [
                            {
                              name: 'preventOverflow',
                              options: {
                                boundary: 'clippingParents'
                              }
                            },
                            { name: 'offset', options: { offset: [0, 8] } }
                          ]
                        }}
                      >
                        {({ TransitionProps }) => (
                          <Fade in={innerOpen} {...TransitionProps}>
                            <MainCard sx={{ borderRadius: 2, boxShadow: theme.customShadows.tooltip, minWidth: 150, p: 0.5 }}>
                              <ClickAwayListener onClickAway={() => setInnerAnchorEl(null)}>
                                <List disablePadding>
                                  {languageList.map((item, index) => (
                                    <ListItemButton key={index} sx={buttonStyle} onClick={handleInnerActionClick}>
                                      <ListItemText>{item}</ListItemText>
                                    </ListItemButton>
                                  ))}
                                </List>
                              </ClickAwayListener>
                            </MainCard>
                          </Fade>
                        )}
                      </Popper>
                    </ListItemButton>
                    <ListItemButton href="#" sx={{ ...buttonStyle, my: 0.5 }}>
                      <ListItemIcon>
                        <IconSettings size={16} />
                      </ListItemIcon>
                      <ListItemText primary="Settings" />
                    </ListItemButton>
                    <ListItem disablePadding>
                      <Button
                        fullWidth
                        variant="outlined"
                        color="secondary"
                        size="small"
                        endIcon={<IconLogout size={16} />}
                        onClick={logoutAccount}
                      >
                        Logout
                      </Button>
                    </ListItem>
                  </List>
                </Stack>
              </ClickAwayListener>
            </MainCard>
          </Fade>
        )}
      </Popper>
    </>
  );
}
