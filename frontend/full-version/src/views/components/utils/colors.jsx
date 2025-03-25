'use client';
import PropTypes from 'prop-types';

// @mui
import { useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid2';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// @project
import { Themes, ThemeMode } from '@/config';
import ComponentsWrapper from '@/components/ComponentsWrapper';
import useConfig from '@/hooks/useConfig';
import { ColorBox } from '@/sections/components/color';

// get theme wise color string
function getColorString(themes) {
  switch (themes) {
    case Themes.THEME_HOSTING:
      return 'HOSTING';
    case Themes.THEME_AI:
      return 'AI';
    case Themes.THEME_CRM:
    default:
      return 'CRM';
  }
}

// get theme wise primary/secondary color offset
function getColorCode(themes, index, mode) {
  const lightModeCodes = [90, 80, 40, 30, 10];
  const darkModeCodes = [30, 60, 80, 90, 95];

  const code1 = mode === ThemeMode.DARK ? darkModeCodes : lightModeCodes;

  switch (themes) {
    case Themes.THEME_HOSTING:
    case Themes.THEME_AI:
    case Themes.THEME_CRM:
    default:
      return code1[index];
  }
}

// get theme wise grey color offset
function getGreyCode(themes, index, mode) {
  const lightModeCodes = [98, 96, 94, 92, 90, 87, 80, 50, 30, 10];
  const darkModeCodes = [6, 10, 12, 17, 22, 4, 30, 60, 80, 90];

  const code1 = mode === ThemeMode.DARK ? darkModeCodes : lightModeCodes;

  switch (themes) {
    case Themes.THEME_HOSTING:
    case Themes.THEME_AI:
    case Themes.THEME_CRM:
    default:
      return code1[index];
  }
}

/***************************  COLOR - PALETTE  ***************************/

function ColorPalette({ title, palette }) {
  return (
    <Stack sx={{ gap: { xs: 2, sm: 3 } }}>
      <Typography variant="subtitle1">{title}</Typography>
      <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ alignItems: 'center' }}>
        {palette.map((item, index) => (
          <ColorBox key={index} {...item} />
        ))}
      </Grid>
    </Stack>
  );
}

/***************************  UTILS - COLOR  ***************************/

export default function UtilsColor() {
  const theme = useTheme();

  const { currentTheme, mode } = useConfig();
  const colorString = getColorString(currentTheme);

  const primaryPalette = [
    {
      value: theme.palette.primary.lighter,
      color: 'primary.darker',
      muiLabel: 'primary.lighter',
      figmaLabel: mode === 'dark' ? 'Primary Container / On Primary Fixed Variant' : 'Primary Container / Primary Fixed',
      figmaValue: `${colorString}/primary/${getColorCode(currentTheme, 0, mode)}` // setup swr and use function for dynamic value
    },
    {
      value: theme.palette.primary.light,
      color: 'primary.dark',
      muiLabel: 'primary.light',
      figmaLabel: 'Primary Fixed Dim',
      figmaValue: `${colorString}/primary/${getColorCode(currentTheme, 1, mode)}`
    },
    {
      value: theme.palette.primary.main,
      color: 'background.default',
      muiLabel: 'primary.main',
      figmaLabel: 'Primary',
      main: true,
      figmaValue: `${colorString}/primary/${getColorCode(currentTheme, 2, mode)}`
    },
    {
      value: theme.palette.primary.dark,
      color: 'primary.light',
      muiLabel: 'primary.dark',
      figmaLabel: mode === 'dark' ? 'On Primary Container / Primary Fixed' : 'On Primary Fixed Variant',
      figmaValue: `${colorString}/primary/${getColorCode(currentTheme, 3, mode)}`
    },
    {
      value: theme.palette.primary.darker,
      color: 'primary.lighter',
      muiLabel: 'primary.darker',
      figmaLabel: 'On Primary Container / On Primary Fixed',
      figmaValue: `${colorString}/primary/${getColorCode(currentTheme, 4, mode)}`
    }
  ];

  const secondaryPalette = [
    {
      value: theme.palette.secondary.lighter,
      color: 'secondary.darker',
      muiLabel: 'secondary.lighter',
      figmaLabel: mode === 'dark' ? 'Secondary Container / On Secondary Fixed Variant' : 'Secondary Container / Secondary Fixed',
      figmaValue: `${colorString}/secondary/${getColorCode(currentTheme, 0, mode)}`
    },
    {
      value: theme.palette.secondary.light,
      color: 'secondary.dark',
      muiLabel: 'secondary.light',
      figmaLabel: 'Secondary Fixed Dim',
      figmaValue: `${colorString}/secondary/${getColorCode(currentTheme, 1, mode)}`
    },
    {
      value: theme.palette.secondary.main,
      color: 'background.default',
      muiLabel: 'secondary.main',
      figmaLabel: 'Secondary',
      main: true,
      figmaValue: `${colorString}/secondary/${getColorCode(currentTheme, 2, mode)}`
    },
    {
      value: theme.palette.secondary.dark,
      color: 'secondary.light',
      muiLabel: 'secondary.dark',
      figmaLabel: mode === 'dark' ? 'On Secondary Container / Secondary Fixed' : 'On Secondary Fixed Variant',
      figmaValue: `${colorString}/secondary/${getColorCode(currentTheme, 3, mode)}`
    },
    {
      value: theme.palette.secondary.darker,
      color: 'secondary.lighter',
      muiLabel: 'secondary.darker',
      figmaLabel: 'On Secondary Container / On Secondary Fixed',
      figmaValue: `${colorString}/secondary/${getColorCode(currentTheme, 4, mode)}`
    }
  ];

  const greyPalette = [
    {
      value: theme.palette.grey[50],
      color: 'grey.900',
      muiLabel: 'grey.50',
      figmaLabel: mode === 'dark' ? 'Surface / Surface Dim' : 'Surface / Surface Bright',
      figmaValue: `${colorString}/neutral/${getGreyCode(currentTheme, 0, mode)}`
    },
    {
      value: theme.palette.grey[100],
      color: 'grey.900',
      muiLabel: 'grey.100',
      figmaLabel: 'Surface Container Low',
      figmaValue: `${colorString}/neutral/${getGreyCode(currentTheme, 1, mode)}`
    },
    {
      value: theme.palette.grey[200],
      color: 'grey.900',
      muiLabel: 'grey.200',
      figmaLabel: 'Surface Container',
      figmaValue: `${colorString}/neutral/${getGreyCode(currentTheme, 2, mode)}`
    },
    {
      value: theme.palette.grey[300],
      color: 'grey.900',
      muiLabel: 'grey.300',
      figmaLabel: 'Surface Container High',
      figmaValue: `${colorString}/neutral/${getGreyCode(currentTheme, 3, mode)}`
    },
    {
      value: theme.palette.grey[400],
      color: 'grey.900',
      muiLabel: 'grey.400',
      figmaLabel: 'Surface Container Highest',
      figmaValue: `${colorString}/neutral/${getGreyCode(currentTheme, 4, mode)}`
    },
    {
      value: theme.palette.grey[500],
      color: 'grey.900',
      muiLabel: 'grey.500',
      figmaLabel: 'Surface Container Highest',
      figmaValue: `${colorString}/neutral/${getGreyCode(currentTheme, 5, mode)}`
    },
    {
      value: theme.palette.grey[600],
      color: 'grey.800',
      muiLabel: 'divider/grey.600',
      figmaLabel: 'Outline Variant',
      figmaValue: `${colorString}/neutral variant/${getGreyCode(currentTheme, 6, mode)}`
    },
    {
      value: theme.palette.grey[700],
      color: 'grey.600',
      muiLabel: 'grey.700',
      figmaLabel: 'Outline',
      figmaValue: `${colorString}/neutral variant/${getGreyCode(currentTheme, 7, mode)}`
    },
    {
      value: theme.palette.grey[800],
      color: 'grey.600',
      muiLabel: 'text.secondary/grey.800',
      figmaLabel: 'On Surface Variant',
      figmaValue: `${colorString}/neutral variant/${getGreyCode(currentTheme, 8, mode)}`
    },
    {
      value: theme.palette.grey[900],
      color: 'grey.50',
      muiLabel: 'text.primary/grey.900',
      figmaLabel: 'On Surface',
      figmaValue: `${colorString}/neutral/${getGreyCode(currentTheme, 9, mode)}`
    },
    {
      value: theme.palette.background.default,
      color: 'text.priamry',
      muiLabel: 'background.default',
      figmaLabel: 'On Priamry/Secondary',
      figmaValue: 'Common'
    }
  ];

  const errorPalette = [
    {
      value: theme.palette.error.lighter,
      color: 'error.darker',
      muiLabel: 'error.lighter',
      figmaLabel: mode === 'dark' ? 'On Error / Error Container' : 'On Error / Error Container Low',
      figmaValue: `error/${getColorCode(currentTheme, 0, mode)}`
    },
    {
      value: theme.palette.error.light,
      color: 'error.dark',
      muiLabel: 'error.light',
      figmaLabel: mode === 'dark' ? 'Error Container High' : 'Error Container High / Outline',
      figmaValue: `error/${getColorCode(currentTheme, 1, mode)}`
    },
    {
      value: theme.palette.error.main,
      color: 'background.default',
      muiLabel: 'error.main',
      figmaLabel: mode === 'dark' ? 'Error' : 'Error',
      figmaValue: `error/${getColorCode(currentTheme, 2, mode)}`
    },
    {
      value: theme.palette.error.dark,
      color: 'error.light',
      muiLabel: 'error.dark',
      figmaLabel: mode === 'dark' ? 'Error Container High' : 'On Container/ Error Container',
      figmaValue: `error/${getColorCode(currentTheme, 3, mode)}`
    },
    {
      value: theme.palette.error.darker,
      color: 'error.lighter',
      muiLabel: 'error.darker',
      figmaLabel: mode === 'dark' ? 'On Error/ Error Container' : 'On Container Low / Container High',
      figmaValue: `error/${getColorCode(currentTheme, 4, mode)}`
    }
  ];

  const warningPalette = [
    {
      value: theme.palette.warning.lighter,
      color: 'warning.darker',
      muiLabel: 'warning.lighter',
      figmaLabel: mode === 'dark' ? 'On Warning / Warning Container' : 'On Warning / Warning Container Low',
      figmaValue: `warning/${getColorCode(currentTheme, 0, mode)}`
    },
    {
      value: theme.palette.warning.light,
      color: 'warning.dark',
      muiLabel: 'warning.light',
      figmaLabel: mode === 'dark' ? 'Warning Container High' : 'Warning Container High / Outline',
      figmaValue: `warning/${getColorCode(currentTheme, 1, mode)}`
    },
    {
      value: theme.palette.warning.main,
      color: 'background.default',
      muiLabel: 'warning.main',
      figmaLabel: mode === 'dark' ? 'Warning' : 'Warning',
      figmaValue: `warning/${getColorCode(currentTheme, 2, mode)}`
    },
    {
      value: theme.palette.warning.dark,
      color: 'warning.light',
      muiLabel: 'warning.dark',
      figmaLabel: mode === 'dark' ? 'Warning Container High' : 'On Container/ Warning Container',
      figmaValue: `warning/${getColorCode(currentTheme, 3, mode)}`
    },
    {
      value: theme.palette.warning.darker,
      color: 'warning.lighter',
      muiLabel: 'warning.darker',
      figmaLabel: mode === 'dark' ? 'On Warning/ Warning Container' : 'On Container Low / Container High',
      figmaValue: `warning/${getColorCode(currentTheme, 4, mode)}`
    }
  ];

  const infoPalette = [
    {
      value: theme.palette.info.lighter,
      color: 'info.darker',
      muiLabel: 'info.lighter',
      figmaLabel: mode === 'dark' ? 'On Info / Info Container' : 'On Info / Info Container Low',
      figmaValue: `info/${getColorCode(currentTheme, 0, mode)}`
    },
    {
      value: theme.palette.info.light,
      color: 'info.dark',
      muiLabel: 'info.light',
      figmaLabel: mode === 'dark' ? 'Info Container High' : 'Info Container High / Outline',
      figmaValue: `info/${getColorCode(currentTheme, 1, mode)}`
    },
    {
      value: theme.palette.info.main,
      color: 'background.default',
      muiLabel: 'info.main',
      figmaLabel: mode === 'dark' ? 'Info' : 'Info',
      figmaValue: `info/${getColorCode(currentTheme, 2, mode)}`
    },
    {
      value: theme.palette.info.dark,
      color: 'info.light',
      muiLabel: 'info.dark',
      figmaLabel: mode === 'dark' ? 'Info Container High' : 'On Container/ Info Container',
      figmaValue: `info/${getColorCode(currentTheme, 3, mode)}`
    },
    {
      value: theme.palette.info.darker,
      color: 'info.lighter',
      muiLabel: 'info.darker',
      figmaLabel: mode === 'dark' ? 'On Info/ Info Container' : 'On Container Low / Container High',
      figmaValue: `info/${getColorCode(currentTheme, 4, mode)}`
    }
  ];

  const successPalette = [
    {
      value: theme.palette.success.lighter,
      color: 'success.darker',
      muiLabel: 'success.lighter',
      figmaLabel: mode === 'dark' ? 'On Success / Success Container' : 'On Success / Success Container Low',
      figmaValue: `success/${getColorCode(currentTheme, 0, mode)}`
    },
    {
      value: theme.palette.success.light,
      color: 'success.dark',
      muiLabel: 'success.light',
      figmaLabel: mode === 'dark' ? 'Success Container High' : 'Success Container High / Outline',
      figmaValue: `success/${getColorCode(currentTheme, 1, mode)}`
    },
    {
      value: theme.palette.success.main,
      color: 'background.default',
      muiLabel: 'success.main',
      figmaLabel: mode === 'dark' ? 'Success' : 'Success',
      figmaValue: `success/${getColorCode(currentTheme, 2, mode)}`
    },
    {
      value: theme.palette.success.dark,
      color: 'success.light',
      muiLabel: 'success.dark',
      figmaLabel: mode === 'dark' ? 'Success Container High' : 'On Container/ Success Container',
      figmaValue: `success/${getColorCode(currentTheme, 3, mode)}`
    },
    {
      value: theme.palette.success.darker,
      color: 'success.lighter',
      muiLabel: 'success.darker',
      figmaLabel: mode === 'dark' ? 'On Success/ Success Container' : 'On Container Low / Container High',
      figmaValue: `success/${getColorCode(currentTheme, 4, mode)}`
    }
  ];

  const palettes = [
    { title: 'Primary', palette: primaryPalette },
    { title: 'Secondary', palette: secondaryPalette },
    { title: 'Neutral', palette: greyPalette },
    { title: 'Error', palette: errorPalette },
    { title: 'Warning', palette: warningPalette },
    { title: 'Info', palette: infoPalette },
    { title: 'Success', palette: successPalette }
  ];

  return (
    <ComponentsWrapper title="Color">
      <Stack sx={{ gap: { xs: 2, sm: 3 } }}>
        {palettes.map((palette, index) => (
          <ColorPalette key={index} {...palette} />
        ))}
      </Stack>
    </ComponentsWrapper>
  );
}

ColorPalette.propTypes = { title: PropTypes.string, palette: PropTypes.array };
