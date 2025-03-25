'use client';
import PropTypes from 'prop-types';

import { useState } from 'react';

// @mui
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// @project
import ProgressCard from '@/components/cards/ProgressCard';
import MainCard from '@/components/MainCard';
import { TabsType } from '@/enum';

/***************************  TABS - DATA  ***************************/

const sevenDaysData = [
  { title: 'Direct', value: '16,890', progress: { value: 80 } },
  { title: 'Search', value: '4,909', progress: { value: 70 } },
  { title: 'Social', value: '550', progress: { value: 50 } },
  { title: 'Ads', value: '140', progress: { value: 30 } },
  { title: 'Mail', value: '8,675', progress: { value: 60 } },
  { title: 'Links', value: '4,900', progress: { value: 40 } }
];

const monthData = [
  { title: 'Direct', value: '67,560', progress: { value: 80 } },
  { title: 'Search', value: '19,636', progress: { value: 70 } },
  { title: 'Social', value: '2,220', progress: { value: 50 } },
  { title: 'Ads', value: '560', progress: { value: 30 } },
  { title: 'Mail', value: '34,700', progress: { value: 60 } },
  { title: 'Links', value: '19,600', progress: { value: 40 } }
];

const yearData = [
  { title: 'Direct', value: '8,10,720', progress: { value: 80 } },
  { title: 'Search', value: '2,35,632', progress: { value: 70 } },
  { title: 'Social', value: '26,640', progress: { value: 40 } },
  { title: 'Ads', value: '6,720', progress: { value: 10 } },
  { title: 'Mail', value: '4,16,400', progress: { value: 60 } },
  { title: 'Links', value: '2,35,200', progress: { value: 65 } }
];

/***************************  TABS - A11Y  ***************************/

function a11yProps(value) {
  return { value: value, id: `simple-tab-${value}`, 'aria-controls': `simple-tabpanel-${value}` };
}

/***************************  TABS - PANEL  ***************************/

function TabPanel({ children, value, index, ...other }) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`simple-tabpanel-${index}`} aria-labelledby={`simple-tab-${index}`} {...other}>
      {value === index && <Box sx={{ pt: 1.5 }}>{children}</Box>}
    </div>
  );
}

/***************************  TABS - CONTENT  ***************************/

function TabContent({ data }) {
  return (
    <Stack sx={{ gap: 1.25 }}>
      {data.map((item, index) => (
        <ProgressCard key={index} {...item} />
      ))}
    </Stack>
  );
}

/***************************  PERFORMANCE - BOUNCE RATE  ***************************/

export default function AnalyticsPerformanceBounceRate() {
  const [bounce, setBounce] = useState('days');

  const handleChange = (event, newBounce) => {
    setBounce(newBounce);
  };

  return (
    <MainCard>
      <Stack sx={{ gap: 2.5 }}>
        <Typography variant="subtitle1">Bounce Rate</Typography>
        <Box>
          <Tabs variant="fullWidth" value={bounce} onChange={handleChange} aria-label="basic tabs example" type={TabsType.SEGMENTED}>
            <Tab label="Last 7 day" {...a11yProps('days')} />
            <Tab label="Last Month" {...a11yProps('month')} />
            <Tab label="Last Year" {...a11yProps('year')} />
          </Tabs>
          <TabPanel value={bounce} index="days">
            <TabContent data={sevenDaysData} />
          </TabPanel>
          <TabPanel value={bounce} index="month">
            <TabContent data={monthData} />
          </TabPanel>
          <TabPanel value={bounce} index="year">
            <TabContent data={yearData} />
          </TabPanel>
        </Box>
      </Stack>
    </MainCard>
  );
}

TabPanel.propTypes = {
  children: PropTypes.any,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  index: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  other: PropTypes.any
};

TabContent.propTypes = { data: PropTypes.array };
