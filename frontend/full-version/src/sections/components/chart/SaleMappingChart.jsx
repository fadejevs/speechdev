'use client';

// @mui
import { useTheme } from '@mui/material/styles';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// @third-party
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';

// @project
import MainCard from '@/components/MainCard';

/***************************  MAP CHART - DATA  ***************************/

const geoUrl = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

// Mock data for orders by state (this can be replaced with actual data)
const ordersData = {
  '01': { name: 'Alabama', orders: 1200 },
  '02': { name: 'Alaska', orders: 800 },
  '04': { name: 'Arizona', orders: 432 },
  '05': { name: 'Arkansas', orders: 1087 },
  '06': { name: 'California', orders: 200 },
  '08': { name: 'Colorado', orders: 852 },
  '09': { name: 'Connecticut', orders: 455 },
  17: { name: 'Illinois', orders: 5000 }
};

/***************************  CHART - MAP  ***************************/

export default function AnalyricsPerformanceMapChart() {
  const theme = useTheme();

  const mapColors = { veryHigh: theme.palette.secondary.light, high: theme.palette.secondary.lighter, average: theme.palette.grey[200] };

  const lists = [
    { title: 'Very high level of orders', color: mapColors.veryHigh },
    { title: 'High level of orders', color: mapColors.high },
    { title: 'Average level of orders', color: mapColors.average }
  ];

  // Function to determine the color based on the number of orders
  const getColorByOrders = (orders) => (orders > 1000 ? mapColors.veryHigh : orders > 500 ? mapColors.high : mapColors.average);

  return (
    <MainCard>
      <Stack sx={{ gap: 2.5 }}>
        <Typography variant="h4">Sale Mapping by Country</Typography>
        <Stack direction={{ xs: 'column-reverse', sm: 'row' }} sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Stack sx={{ gap: 1.5, alignItems: 'flex-start', justifyContent: 'flex-start' }}>
            {lists.map((list) => (
              <Stack direction="row" key={list.title} sx={{ alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 15, height: 15, borderRadius: '50%', backgroundColor: list.color }} />
                <Typography variant="caption">{list.title}</Typography>
              </Stack>
            ))}
          </Stack>
          <ComposableMap projection="geoAlbersUsa" style={{ pointerEvents: 'none', height: 138 }}>
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const orderData = ordersData[geo.id] || {};
                  const fillColor = getColorByOrders(orderData.orders || 0);
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      style={{ default: { fill: fillColor, outline: 'none', stroke: theme.palette.background.default, strokeWidth: 1 } }}
                    />
                  );
                })
              }
            </Geographies>
          </ComposableMap>
        </Stack>
      </Stack>
    </MainCard>
  );
}
