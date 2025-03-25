'use client';
import PropTypes from 'prop-types';

// @next
import { usePathname, useRouter } from 'next/navigation';

import { useEffect } from 'react';

// @project
import PageLoader from '@/components/PageLoader';
import useCurrentUser from '@/hooks/useCurrentUser';

/***************************  AUTH GUARD  ***************************/

export default function AuthGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isProcessing, userData } = useCurrentUser();

  useEffect(() => {
    if (!isProcessing && (!userData || Object.keys(userData).length === 0)) {
      router.push('/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData, pathname, isProcessing]);

  if (isProcessing) return <PageLoader />;

  return userData && Object.keys(userData).length > 0 ? children : null;
}

AuthGuard.propTypes = { children: PropTypes.node };
