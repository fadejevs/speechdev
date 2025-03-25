// @mui
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Stack from '@mui/material/Stack';

// @project
import PresentationCard from '@/components/cards/PresentationCard';
import { AvatarSize } from '@/enum';

/***************************  AVATAR - PROFILE  ***************************/

export default function ProfileAvatar() {
  return (
    <PresentationCard title="Profile">
      <Stack sx={{ gap: 2.5 }}>
        <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Avatar size={AvatarSize.BADGE} src="/assets/images/users/avatar-1.png" alt="Avatar 1" />
          <Avatar size={AvatarSize.XXS} src="/assets/images/users/avatar-1.png" alt="Avatar 2" />
          <Avatar size={AvatarSize.XS} src="/assets/images/users/avatar-1.png" alt="Avatar 3" />
          <Avatar size={AvatarSize.SM} src="/assets/images/users/avatar-1.png" alt="Avatar 4" />
          <Avatar size={AvatarSize.MD} src="/assets/images/users/avatar-1.png" alt="Avatar 5" />
          <Avatar size={AvatarSize.LG} src="/assets/images/users/avatar-1.png" alt="Avatar 6" />
          <Avatar size={AvatarSize.XL} src="/assets/images/users/avatar-1.png" alt="Avatar 7" />
        </Stack>
        <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Badge overlap="circular" variant="dot" color="success" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
            <Avatar size={AvatarSize.BADGE} src="/assets/images/users/avatar-1.png" alt="Avatar 1" />
          </Badge>
          <Badge overlap="circular" variant="dot" color="success" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
            <Avatar size={AvatarSize.XXS} src="/assets/images/users/avatar-1.png" alt="Avatar 2" />
          </Badge>
          <Badge overlap="circular" variant="dot" color="success" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
            <Avatar size={AvatarSize.XS} src="/assets/images/users/avatar-1.png" alt="Avatar 3" />
          </Badge>
          <Badge overlap="circular" variant="dot" color="success" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
            <Avatar size={AvatarSize.SM} src="/assets/images/users/avatar-1.png" alt="Avatar 4" />
          </Badge>
          <Badge overlap="circular" variant="dot" color="success" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
            <Avatar size={AvatarSize.MD} src="/assets/images/users/avatar-1.png" alt="Avatar 5" />
          </Badge>
          <Badge overlap="circular" variant="dot" color="success" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
            <Avatar size={AvatarSize.LG} src="/assets/images/users/avatar-1.png" alt="Avatar 6" />
          </Badge>
          <Badge overlap="circular" variant="dot" color="success" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
            <Avatar size={AvatarSize.XL} src="/assets/images/users/avatar-1.png" alt="Avatar 7" />
          </Badge>
        </Stack>
      </Stack>
    </PresentationCard>
  );
}
