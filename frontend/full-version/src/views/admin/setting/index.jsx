'use client';
import PropTypes from 'prop-types';

import { useEffect } from 'react';

// @next
import { useRouter, usePathname } from 'next/navigation';

// @mui
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Box from '@mui/material/Box';

// @project
import { handlerActiveItem, useGetMenuMaster } from '@/states/menu';
import { AuthenticationSetting, GeneralSetting, I18nSetting, PricingSetting, ProfileSetting } from '@/sections/setting';

// @assets
import { IconDownload, IconPlus, IconUpload } from '@tabler/icons-react';

/***************************  SETTING  ***************************/

export default function Setting({ tab = 'profile' }) {
  const router = useRouter();
  const pathname = usePathname();
  const { menuMaster } = useGetMenuMaster();

  const handleChange = (event, newValue) => {
    router.replace(`/setting/${newValue}`);
  };

  useEffect(() => {
    if (menuMaster.openedItem !== 'setting') handlerActiveItem('setting');
    // eslint-disable-next-line
  }, [pathname]);

  return (
    <Stack sx={{ gap: { xs: 2.5, md: 4 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 3, justifyContent: 'space-between' }}>
        <Tabs variant="scrollable" scrollButtons="auto" value={tab} onChange={handleChange} aria-label="setting tabs">
          <Tab label="Profile" value="profile" />
          <Tab label="General" value="general" />
          <Tab label="Pricing" value="pricing" />
          <Tab label="Internationalization" value="internationalization" />
          <Tab label="Authentication" value="authentication" />
        </Tabs>
        {tab === 'internationalization' && (
          <Stack
            direction="row"
            sx={{ width: { xs: 1, sm: 'unset' }, gap: 1.5, alignItems: 'center', justifyContent: { xs: 'center', sm: 'flex-end' } }}
          >
            <Button variant="outlined" color="secondary" startIcon={<IconUpload size={16} />}>
              Export
            </Button>
            <Button variant="outlined" color="secondary" startIcon={<IconDownload size={16} />}>
              Import
            </Button>
            <IconButton variant="contained" color="primary" aria-label="add">
              <IconPlus size={16} />
            </IconButton>
          </Stack>
        )}
      </Stack>

      <Box>
        {tab === 'profile' && <ProfileSetting />}
        {tab === 'general' && <GeneralSetting />}
        {tab === 'pricing' && <PricingSetting />}
        {tab === 'internationalization' && <I18nSetting />}
        {tab === 'authentication' && <AuthenticationSetting />}
      </Box>
    </Stack>
  );
}

Setting.propTypes = { tab: PropTypes.string };
