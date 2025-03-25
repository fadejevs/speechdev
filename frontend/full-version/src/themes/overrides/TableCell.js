/***************************  OVERRIDES - TABLE CELL  ***************************/

export default function TableCell(theme) {
  return {
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: theme.palette.divider,
          '&.cell-right': {
            justifyContent: 'flex-end',
            textAlign: 'right',
            '& > *': {
              justifyContent: 'flex-end',
              margin: '0 0 0 auto'
            },
            '& .MuiOutlinedInput-input': {
              textAlign: 'right'
            }
          },
          '&.cell-center': {
            justifyContent: 'center',
            textAlign: 'center',
            '& > *': {
              justifyContent: 'center',
              margin: '0 auto'
            }
          }
        },
        head: {
          ...theme.typography.caption,
          padding: '12px 20px',
          ':has(.MuiCheckbox-root)': {
            paddingTop: 4,
            paddingBottom: 4
          }
        },
        body: { ...theme.typography.caption, padding: '16px 20px' }
      }
    }
  };
}
