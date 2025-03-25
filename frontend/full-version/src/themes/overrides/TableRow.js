/***************************  OVERRIDES - TABLE ROW  ***************************/

export default function TableRow(theme) {
  return {
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: theme.palette.grey[50],
            ...theme.applyStyles('dark', { backgroundColor: theme.palette.grey[200] }),
            '&:hover': { backgroundColor: theme.palette.grey[100] }
          },
          '&:not(.Mui-selected)&.MuiTableRow-hover:hover': { backgroundColor: theme.palette.action.hover }
        }
      }
    }
  };
}
