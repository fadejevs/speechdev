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
import { ProfileSetting } from '@/sections/setting';

// @assets
import { IconDownload, IconPlus, IconUpload } from '@tabler/icons-react';

/***************************  SETTING  ***************************/

const validTabs = ['general'];

export default function Setting({ tab = 'general' }) {
  const router = useRouter();
  const pathname = usePathname();
  const { menuMaster } = useGetMenuMaster();

  // Redirect to 'general' if tab is invalid
  useEffect(() => {
    if (!validTabs.includes(tab)) {
      router.replace('/setting/general');
    }
    // eslint-disable-next-line
  }, [tab, router]);

  useEffect(() => {
    if (menuMaster.openedItem !== 'setting') handlerActiveItem('setting');
    // eslint-disable-next-line
  }, [pathname]);

  return (
    <Stack sx={{ gap: { xs: 2.5, md: 4 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 3, justifyContent: 'space-between' }}>
        <Tabs
          variant="scrollable"
          scrollButtons="auto"
          value={validTabs.includes(tab) ? tab : 'general'}
          onChange={(event, newValue) => router.replace(`/setting/${newValue}`)}
          aria-label="setting tabs"
        >
          <Tab label="General" value="general" />
        </Tabs>
      </Stack>

      <Box>{tab === 'general' && <ProfileSetting />}</Box>
    </Stack>
  );
}

Setting.propTypes = { tab: PropTypes.string };
