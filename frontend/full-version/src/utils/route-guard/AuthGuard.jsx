'use client';
import PropTypes from 'prop-types';

// @next
import { usePathname, useRouter } from 'next/navigation';

import { useEffect, useState } from 'react';

// @project
import PageLoader from '@/components/PageLoader';
import { supabase } from '@/utils/supabase/client';

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

export function useCurrentUser() {
  const [userData, setUserData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUserData(data?.session?.user || null);
      setIsProcessing(false);
    };
    getSession();

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      getSession();
    });

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  return { userData, isProcessing };
}
