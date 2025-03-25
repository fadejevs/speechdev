'use client';

// @mui
import { useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid2';

// @project
import PerformanceCard from '@/components/cards/PerformanceCard';
import { getRadiusStyles } from '@/utils/getRadiusStyles';

/***************************  CARDS - BORDER WITH RADIUS  ***************************/

export function applyBorderWithRadius(radius, theme) {
  return {
    overflow: 'hidden',
    '--Grid-borderWidth': '1px',
    borderTop: 'var(--Grid-borderWidth) solid',
    borderLeft: 'var(--Grid-borderWidth) solid',
    borderColor: 'divider',
    '& > div': {
      overflow: 'hidden',
      borderRight: 'var(--Grid-borderWidth) solid',
      borderBottom: 'var(--Grid-borderWidth) solid',
      borderColor: 'divider',
      [theme.breakpoints.only('xs')]: {
        '&:first-of-type': getRadiusStyles(radius, 'topLeft', 'topRight'),
        '&:last-of-type': getRadiusStyles(radius, 'bottomLeft', 'bottomRight')
      },
      [theme.breakpoints.between('sm', 'md')]: {
        '&:nth-of-type(1)': getRadiusStyles(radius, 'topLeft'),
        '&:nth-of-type(2)': getRadiusStyles(radius, 'topRight'),
        '&:nth-of-type(3)': getRadiusStyles(radius, 'bottomLeft', 'bottomRight')
      },
      [theme.breakpoints.up('md')]: {
        '&:first-of-type': getRadiusStyles(radius, 'topLeft', 'bottomLeft'),
        '&:last-of-type': getRadiusStyles(radius, 'topRight', 'bottomRight')
      }
    }
  };
}

/***************************   CARDS - DATA  ***************************/

const performanceAnalytics = [
  {
    title: 'Sales',
    value: '$9140.20',
    compare: 'Target: $8295.50',
    targetProgress: { target: 8295.5, achieved: 9140.2, goal: 10000 }
  },
  {
    title: 'Profit',
    value: '$4593.35',
    compare: 'Target: $4492.25',
    targetProgress: { target: 4492.25, achieved: 4593.35, goal: 5000 }
  },
  {
    title: 'Order',
    value: '23,876k',
    compare: 'Target: 24,926k',
    targetProgress: { target: 24926, achieved: 23876, goal: 30000 }
  }
];

/***************************   PERFORMANCE - CARDS  ***************************/

export default function AnalyticsPerformanceCard() {
  const theme = useTheme();
  const cardCommonProps = { border: 'none', borderRadius: 0, boxShadow: 'none' };

  return (
    <Grid container sx={{ borderRadius: 4, boxShadow: theme.customShadows.section, ...applyBorderWithRadius(16, theme) }}>
      {performanceAnalytics.map((item, index) => (
        <Grid key={index} size={{ xs: 12, sm: index === performanceAnalytics.length - 1 ? 12 : 6, md: 4 }}>
          <PerformanceCard {...{ ...item, cardProps: { sx: cardCommonProps } }} />
        </Grid>
      ))}
    </Grid>
  );
}
