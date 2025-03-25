/***************************  OVERRIDES - TABLE HEAD  ***************************/

export default function TableHead(theme) {
  return {
    MuiTableHead: {
      styleOverrides: {
        root: { background: theme.palette.grey[100] }
      }
    }
  };
}
