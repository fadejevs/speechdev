// @next
import dynamic from 'next/dynamic';

// @project
const AuthForgotPassword = dynamic(() => import('@/views/auth/forgot-password'));

/***************************  AUTH - FORGOT PASSWORD  ***************************/

export default function ForgotPassword() {
  return <AuthForgotPassword />;
}
