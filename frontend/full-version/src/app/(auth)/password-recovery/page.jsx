// @next
import dynamic from 'next/dynamic';

// @project
const AuthPasswordRecovery = dynamic(() => import('@/views/auth/password-recovery'));

/***************************  AUTH - PASSWORD RECOVERY  ***************************/

export default function PasswordRecovery() {
  return <AuthPasswordRecovery />;
}
