/***************************  OVERRIDES - FORM HELPER TEXT  ***************************/

export default function FormHelperText(theme) {
  return {
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          marginTop: 6,
          color: theme.palette.grey[700],
          '&.Mui-error': {
            color: theme.palette.error.main,
            ...theme.applyStyles('dark', { color: theme.palette.error.light })
          }
        }
      }
    }
  };
}
