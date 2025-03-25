// @mui
import { alpha } from '@mui/material/styles';

// @assets
import { IconChevronDown } from '@tabler/icons-react';

/***************************  OVERRIDES - AUTOCOMPLETE  ***************************/

export default function Autocomplete(theme) {
  return {
    MuiAutocomplete: {
      defaultProps: {
        popupIcon: <IconChevronDown size={16} />,
        slotProps: { paper: { elevation: 0 } }
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root.MuiInputBase-sizeSmall': {
            '& .MuiAutocomplete-tag': { margin: 2 },
            ':not(:has(.MuiChip-root))': { paddingTop: 5.44, paddingBottom: 5.44, paddingLeft: 3 },
            ':has(.MuiChip-root)': { paddingTop: 4, paddingBottom: 4, paddingLeft: 8 },
            '& .MuiAutocomplete-popupIndicator': { width: 20, height: 20 }
          }
        },
        popupIndicator: { color: theme.palette.text.secondary },
        popper: {
          '& .MuiPaper-root': {
            boxShadow: theme.customShadows.tooltip,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 8
          }
        },
        listbox: {
          ...theme.typography.body2,
          padding: 4,
          '& .MuiAutocomplete-option': {
            borderRadius: 8,
            padding: 9,
            minHeight: 38,
            '&:has(.MuiCheckbox-root)': {
              padding: 8.35
            },
            '&.MuiCheckbox-root': {
              padding: 0,
              marginLeft: 6
            },
            '&:not(:first-of-type):not(:last-of-type)': {
              marginTop: 2,
              marginBottom: 2
            },
            '&[aria-selected="true"]:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.12)
            },
            '&[aria-selected="true"].Mui-focused': {
              backgroundColor: alpha(theme.palette.primary.main, 0.2)
            },
            '&.Mui-focusVisible': {
              backgroundColor: alpha(theme.palette.secondary.main, 0.08)
            },
            '& .MuiTypography-custom': {
              color: theme.palette.grey[600],
              display: 'flex',
              alignItems: 'center',
              marginLeft: 16
            }
          }
        }
      }
    }
  };
}
