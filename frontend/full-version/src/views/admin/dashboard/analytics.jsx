'use client';
import PropTypes from 'prop-types';

import { useEffect } from 'react';

// @next
import { useRouter, usePathname } from 'next/navigation';

//  @mui
import Stack from '@mui/material/Stack';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';

// @project
import { handlerActiveItem, useGetMenuMaster } from '@/states/menu';
import { AnalyticsOverview, AnalyticsPerformance, AnalyticsUserBehavior } from '@/sections/dashboard/analytics';

/***************************  DASHBOARD - ANALYTICS  ***************************/

export default function DashboardAnalytics({ tab = 'overview' }) {
  const router = useRouter();
  const pathname = usePathname();
  const { menuMaster } = useGetMenuMaster();

  const handleChange = (event, newValue) => {
    router.replace(`/dashboard/analytics/${newValue}`);
  };

  useEffect(() => {
    if (menuMaster.openedItem !== 'dashboard') handlerActiveItem('dashboard');
    // eslint-disable-next-line
  }, [pathname]);

  return (
    <Stack sx={{ gap: 4 }}>
      <Tabs variant="scrollable" scrollButtons="auto" value={tab} onChange={handleChange} aria-label="analytics tabs">
        <Tab label="Overview" value="overview" />
        <Tab label="User Behavior" value="use-behavior" />
        <Tab label="Performance" value="performance" />
      </Tabs>
      <Box>
        {tab === 'overview' && <AnalyticsOverview />}
        {tab === 'use-behavior' && <AnalyticsUserBehavior />}
        {tab === 'performance' && <AnalyticsPerformance />}
      </Box>
    </Stack>
  );
}

DashboardAnalytics.propTypes = { tab: PropTypes.string };
