// @mui
import { useTheme } from '@mui/material/styles';
import { BarChart } from '@mui/x-charts/BarChart';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// @project
import MainCard from '@/components/MainCard';

/***************************  CHART - TRAFFIC DEVICE  ***************************/

export default function AnalyticsBehaviorTrafficDevice() {
  const theme = useTheme();

  return (
    <MainCard>
      <Stack sx={{ gap: 2.5 }}>
        <Typography variant="subtitle1">Traffic in Device</Typography>
        <BarChart
          xAxis={[
            // @ts-ignore
            { scaleType: 'band', data: ['Computer', 'Tablet', 'Mobile'], categoryGapRatio: 0, disableLine: true, disableTicks: true }
          ]}
          series={[{ id: 'TrafficInDevice', data: [86.5, 42.5, 64.2] }]}
          height={284}
          leftAxis={null}
          axisHighlight={{ x: 'none' }}
          tooltip={{ trigger: 'none' }}
          margin={{ top: 0, right: 0, bottom: 20, left: 0 }}
          sx={{ '& .MuiBarElement-series-TrafficInDevice': { fill: 'url(#chart4Gradient)' } }}
          barLabel={(item) => `${item.value?.toString()}%`}
        >
          <defs>
            <linearGradient id="chart4Gradient" gradientTransform="rotate(90)">
              <stop offset="10%" stopColor={theme.palette.primary.main} stopOpacity={0.2} />
              <stop offset="90%" stopColor={theme.palette.background.default} stopOpacity={0} />
            </linearGradient>
          </defs>
        </BarChart>
      </Stack>
    </MainCard>
  );
}
