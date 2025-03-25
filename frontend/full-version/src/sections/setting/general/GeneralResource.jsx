// @mui
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ListItem from '@mui/material/ListItem';
import List from '@mui/material/List';

// @project
import SettingCard from '@/components/cards/SettingCard';

// @assets
import { IconChevronRight, IconClock, IconHelp, IconKeyboard, IconStatusChange } from '@tabler/icons-react';

const resourceData = [
  { id: 1, icon: <IconStatusChange />, title: 'Change Log', buttonLabel: 'View Change Log', buttonType: 'button' },
  { id: 2, icon: <IconHelp />, title: 'SaasAble Help Center', buttonLabel: 'Get Help', buttonType: 'button' },
  { id: 3, icon: <IconKeyboard />, title: 'Keyboard Shortcut', buttonType: 'icon' },
  { id: 4, icon: <IconClock />, title: 'Activity log', buttonType: 'icon' }
];

/***************************  GENERAL - RESOURCE  ***************************/

export default function GeneralResource() {
  const listStyle = { p: { xs: 2, sm: 3 }, flexWrap: 'wrap', gap: 1 };

  return (
    <SettingCard title="Resource" caption="Access essential resources and information.">
      <List disablePadding>
        {resourceData.map((item) => (
          <ListItem key={item.id} sx={listStyle} divider>
            <Stack direction="row" sx={{ justifyContent: 'space-between', width: 1, alignItems: 'center' }}>
              <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center' }}>
                {item.icon}
                <Typography variant="body1">{item.title}</Typography>
              </Stack>
              {item.buttonType === 'button' ? (
                <Button variant="outlined" size="small" color="secondary">
                  {item.buttonLabel}
                </Button>
              ) : (
                <IconButton size="small" color="secondary" aria-label="open">
                  <IconChevronRight size={16} />
                </IconButton>
              )}
            </Stack>
          </ListItem>
        ))}
      </List>
    </SettingCard>
  );
}
