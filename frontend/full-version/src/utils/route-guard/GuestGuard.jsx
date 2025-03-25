'use client';
import PropTypes from 'prop-types';

// @next
import { useRouter } from 'next/navigation';

import { useEffect } from 'react';

// @project
import { APP_DEFAULT_PATH, AUTH_USER_KEY } from '@/config';

/***************************  GUEST GUARD  ***************************/

export default function GuestGuard({ children }) {
  const router = useRouter();

  const manageUserData = (localStorageData) => {
    const parsedAuthData = localStorageData ? JSON.parse(localStorageData) : null;
    if (parsedAuthData?.access_token) {
      router.replace(APP_DEFAULT_PATH);
    }
  };

  useEffect(() => {
    const localStorageData = typeof window !== 'undefined' ? localStorage.getItem(AUTH_USER_KEY) : null;
    manageUserData(localStorageData);

    const handleStorageEvent = (e) => {
      if (e.storageArea === localStorage && e.key === AUTH_USER_KEY) {
        manageUserData(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener('storage', handleStorageEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return children;
}

GuestGuard.propTypes = { children: PropTypes.node };
