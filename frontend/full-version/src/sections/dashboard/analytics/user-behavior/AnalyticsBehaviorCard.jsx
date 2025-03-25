'use client';

// @mui
import { useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid2';
import Typography from '@mui/material/Typography';

// @project
import BehaviorCard from '@/components/cards/BehaviorCard';
import MainCard from '@/components/MainCard';
import { getRadiusStyles } from '@/utils/getRadiusStyles';

// @assets
import { IconArrowDown, IconArrowUpRight } from '@tabler/icons-react';

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
      [theme.breakpoints.down('md')]: {
        '&:nth-of-type(1)': getRadiusStyles(radius, 'topLeft'),
        '&:nth-of-type(2)': getRadiusStyles(radius, 'topRight'),
        '&:nth-of-type(3)': getRadiusStyles(radius, 'bottomLeft'),
        '&:nth-of-type(4)': getRadiusStyles(radius, 'bottomRight')
      },
      [theme.breakpoints.up('md')]: {
        '&:first-of-type': getRadiusStyles(radius, 'topLeft', 'bottomLeft'),
        '&:last-of-type': getRadiusStyles(radius, 'topRight', 'bottomRight')
      }
    }
  };
}

/***************************   BEHAVIOR CARD - DATA  ***************************/

const userBehaviorAnalytics = [
  {
    title: 'Total Users',
    value: '23,876',
    compare: 'vs last month',
    chip: {
      label: '24.5%',
      icon: <IconArrowUpRight />
    }
  },
  {
    title: 'New Users',
    value: '30,450',
    compare: 'vs last month',
    chip: {
      label: '20.5%',
      icon: <IconArrowUpRight />
    }
  },
  {
    title: 'Current Users',
    value: '34,789',
    compare: 'vs last month',
    chip: {
      label: '20.5%',
      color: 'error',
      icon: <IconArrowDown />
    }
  }
];

/***************************   USER BEHAVIOR - CARDS  ***************************/

export default function AnalyticsBehaviorCard() {
  const theme = useTheme();
  const cardCommonProps = { border: 'none', borderRadius: 0, boxShadow: 'none' };

  return (
    <Grid container sx={{ borderRadius: 4, boxShadow: theme.customShadows.section, ...applyBorderWithRadius(16, theme) }}>
      {userBehaviorAnalytics.map((item, index) => (
        <Grid key={index} size={{ xs: 6, md: 2.75 }}>
          <BehaviorCard {...{ ...item, cardProps: { sx: cardCommonProps } }} />
        </Grid>
      ))}
      <Grid size={{ xs: 6, md: 3.75 }}>
        <MainCard sx={{ ...cardCommonProps, height: 1, display: 'flex', alignItems: 'center', textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            You have increased your net income by{' '}
            <Typography
              component="span"
              variant="inherit"
              sx={{ color: 'success.main', ...theme.applyStyles('dark', { color: 'success.light' }) }}
            >
              6.2%
            </Typography>{' '}
            this month and decreased your expensed by{' '}
            <Typography
              component="span"
              variant="inherit"
              sx={{ color: 'error.main', ...theme.applyStyles('dark', { color: 'error.light' }) }}
            >
              3.2%
            </Typography>
          </Typography>
        </MainCard>
      </Grid>
    </Grid>
  );
}
