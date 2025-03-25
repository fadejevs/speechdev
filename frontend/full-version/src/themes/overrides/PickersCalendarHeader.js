/***************************  OVERRIDES - PICKERS CALENDAR HEADER  ***************************/

export default function PickersCalendarHeader(theme) {
  return {
    MuiPickersCalendarHeader: {
      styleOverrides: {
        root: {
          '& .MuiPickersCalendarHeader-switchViewIcon': {
            fill: theme.palette.text.secondary
          }
        },
        label: {
          ...theme.typography.subtitle2
        }
      }
    }
  };
}
