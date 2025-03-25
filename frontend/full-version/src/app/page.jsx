// @next
import dynamic from 'next/dynamic';

// @project
const AuthLayout = dynamic(() => import('@/layouts/AuthLayout'));
const AuthLogin = dynamic(() => import('@/views/auth/login'));

/***************************  MAIN - DEFAULT PAGE  ***************************/

export default function Home() {
  return (
    <AuthLayout>
      <AuthLogin />
    </AuthLayout>
  );
}
