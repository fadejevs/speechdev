/***************************  OVERRIDES - MENU  ***************************/

export default function ListItemButton(theme) {
  return {
    MuiListItemButton: {
      styleOverrides: {
        root: {
          padding: '10px 8px',
          borderRadius: 4,
          '&.Mui-selected': {
            backgroundColor: theme.palette.primary.lighter,
            '&:hover': { backgroundColor: theme.palette.primary.light },
            ...theme.applyStyles('dark', {
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.background.default,
              '&:hover': { backgroundColor: theme.palette.primary.light }
            })
          }
        }
      }
    }
  };
}
