'use client';
import PropTypes from 'prop-types';

import { useState } from 'react';

// @mui
import { useTheme } from '@mui/material/styles';
import { BarChart } from '@mui/x-charts/BarChart';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// @project
import MainCard from '@/components/MainCard';
import CustomTooltip from '@/components/third-party/chart/CustomTooltip';
import Legend from '@/components/third-party/chart/Legend';

// @assets
import { IconDownload } from '@tabler/icons-react';

// @types

/**************************** CHART - CUSTOM TOOLTIP ********* */

function TooltipWrapper({ counter, groupLabel = '', label = '' }) {
  return <CustomTooltip counter={counter} groupLabel={groupLabel} label={label} />;
}

/***************************  CHART - BAR  ***************************/

export default function AnalyticsBarChart() {
  const theme = useTheme();

  const [barchart, setBarchart] = useState({
    page_view: true,
    unique_visitor: true
  });

  const toggleVisibility = (label) => {
    setBarchart((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  // Define the series data with the SeriesData interface
  const seriesData = [
    {
      data: [700, 850, 600, 450, 400, 800, 300, 550, 700, 800, 900, 700],
      id: 'page_view',
      label: 'Page View',
      color: theme.palette.primary.main,
      visible: barchart['page_view']
    },
    {
      data: [600, 750, 700, 500, 300, 600, 200, 450, 600, 700, 800, 650],
      id: 'unique_visitor',
      label: 'Unique Visitor',
      color: theme.palette.primary.light,
      visible: barchart['unique_visitor']
    }
  ];

  const xAxisData = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const lagendItems = seriesData.map((series) => ({ label: series.label, color: series.color, visible: series.visible, id: series.id }));
  const visibleSeries = seriesData.filter((series) => series.visible);

  return (
    <MainCard>
      <Stack sx={{ gap: 3.75 }}>
        <Stack direction="row" sx={{ alignItems: 'end', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Stack sx={{ gap: 0.5 }}>
            <Typography variant="h4">Bar Chart</Typography>
            <Typography variant="caption" color="grey.700">
              Monitor visitor behavior to enhance user experience and retention.
            </Typography>
          </Stack>
          <Stack direction="row" sx={{ gap: 1.5, width: { xs: 1, sm: 'auto' } }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                format="dd-MMM-yyyy"
                defaultValue={new Date()}
                slotProps={{ textField: { sx: { width: { xs: 1, sm: 'auto' } } } }}
              />
            </LocalizationProvider>
            <IconButton variant="outlined" color="secondary" size="small">
              <IconDownload size={16} />
            </IconButton>
          </Stack>
        </Stack>
        <Legend items={lagendItems} onToggle={toggleVisibility} />
      </Stack>

      <BarChart
        xAxis={[{ scaleType: 'band', data: xAxisData, disableLine: true, disableTicks: true }]}
        grid={{ horizontal: true }}
        series={visibleSeries}
        yAxis={[{ disableLine: true, disableTicks: true, tickInterval: [0, 200, 400, 600, 800, 1000] }]}
        colors={seriesData.map((series) => series.color)}
        height={256}
        borderRadius={8}
        slots={{
          itemContent: ({ series, itemData }) => (
            <TooltipWrapper
              counter={series.data[itemData.dataIndex] || ''}
              groupLabel={series.label}
              label={xAxisData[itemData.dataIndex]}
            />
          )
        }}
        slotProps={{ legend: { hidden: true } }}
        tooltip={{ trigger: 'item' }}
        margin={{ top: 40, right: 20, bottom: 20, left: 40 }}
      />
    </MainCard>
  );
}

TooltipWrapper.propTypes = { counter: PropTypes.any, groupLabel: PropTypes.string, label: PropTypes.string };
