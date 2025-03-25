/***************************  OVERRIDES - DAY CALENDAR  ***************************/

export default function DayCalendar(theme) {
  return {
    MuiDayCalendar: {
      styleOverrides: {
        weekDayLabel: {
          ...theme.typography.body1,
          color: theme.palette.text.primary
        }
      }
    }
  };
}
