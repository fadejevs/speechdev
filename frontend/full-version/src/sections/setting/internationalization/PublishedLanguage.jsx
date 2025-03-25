'use client';
import PropTypes from 'prop-types';

// @mui
import Button from '@mui/material/Button';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// @project
import MainCard from '@/components/MainCard';

// @assets
import { IconChevronDown, IconDotsVertical } from '@tabler/icons-react';

/***************************  PUBLISHED LANGUAGE - DATA  ***************************/

const languages = [{ name: 'English', isDefault: true }, { name: 'Spanish' }];

/***************************  I18N - PUBLISHED LANGUAGE  ***************************/

function PublishedLanguage({ name, isDefault }) {
  return (
    <Box sx={{ '&:not(:last-of-type)': { borderBottom: '1px solid', borderColor: 'divider' } }}>
      <Stack direction="row" sx={{ p: 3, justifyContent: 'space-between', alignItems: 'center' }}>
        <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center' }}>
          <Typography variant="h5">{name}</Typography>
          {isDefault && <Chip color="primary" label="Default" />}
        </Stack>
        <Stack direction="row" sx={{ gap: 1, alignItems: 'center', height: 48 }}>
          <Box>
            <Button id="basic-button" endIcon={<IconChevronDown size={16} />}>
              Localize
            </Button>
          </Box>
          <IconButton color="secondary" size="small" aria-label="more">
            <IconDotsVertical />
          </IconButton>
        </Stack>
      </Stack>
    </Box>
  );
}

/***************************  I18N - PUBLISHED LANGUAGE  ***************************/

export default function I18nPublishedLanguage() {
  return (
    <MainCard sx={{ p: 0 }}>
      <CardHeader
        title="Published languages"
        subheader="Active in the markets they’ve been added to and visible to customers"
        titleTypographyProps={{ sx: { fontWeight: 400 } }}
        subheaderTypographyProps={{ variant: 'body2', sx: { color: 'grey.700' } }}
        sx={{ p: { xs: 1.75, sm: 2.25, md: 3 } }}
      />
      <Divider />
      {languages.map((language, index) => (
        <PublishedLanguage key={index} {...language} />
      ))}
    </MainCard>
  );
}

PublishedLanguage.propTypes = { name: PropTypes.string, isDefault: PropTypes.bool };
