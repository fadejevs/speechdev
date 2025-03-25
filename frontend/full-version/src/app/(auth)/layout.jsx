import PropTypes from 'prop-types';
// @next
import dynamic from 'next/dynamic';

// @types

// @project
const AuthLayout = dynamic(() => import('@/layouts/AuthLayout'));
const GuestGuard = dynamic(() => import('@/utils/route-guard/GuestGuard'));

/***************************  LAYOUT - AUTH  ***************************/

export default function Layout({ children }) {
  return (
    <GuestGuard>
      <AuthLayout>{children}</AuthLayout>
    </GuestGuard>
  );
}

Layout.propTypes = { children: PropTypes.any };
