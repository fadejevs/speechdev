import PropTypes from 'prop-types';
// @next
import dynamic from 'next/dynamic';

// @types

// @project
import { AuthProvider } from '@/contexts/AuthContext';
const AdminLayout = dynamic(() => import('@/layouts/AdminLayout'));
const AuthGuard = dynamic(() => import('@/utils/route-guard/AuthGuard'));
const RoleGuard = dynamic(() => import('@/utils/route-guard/RoleGuard'));

/***************************  LAYOUT - ADMIN  ***************************/

export default function Layout({ children }) {
  return (
    <AuthProvider>
      <AuthGuard>
        <RoleGuard>
          <AdminLayout>{children}</AdminLayout>
        </RoleGuard>
      </AuthGuard>
    </AuthProvider>
  );
}

Layout.propTypes = { children: PropTypes.any };
