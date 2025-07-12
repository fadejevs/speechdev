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
    // Be more patient - only redirect after processing is complete AND we're sure there's no user
    if (!isProcessing && (!userData || Object.keys(userData).length === 0)) {
      // Add a small delay to ensure auth state has fully settled
      const timeoutId = setTimeout(() => {
        router.push('/login');
      }, 200);
      
      return () => clearTimeout(timeoutId);
    }
  }, [userData, pathname, isProcessing, router]);

  if (isProcessing) return <PageLoader />;

  return userData && Object.keys(userData).length > 0 ? children : null;
}

AuthGuard.propTypes = { children: PropTypes.node };

export function useCurrentUser() {
  const [userData, setUserData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    let timeoutId;

    const getSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (data?.session?.user && !error) {
          setUserData(data.session.user);
          setIsProcessing(false);
          setRetryCount(0);
        } else if (retryCount < 2) {
          // Retry a couple times with increasing delays
          const delay = (retryCount + 1) * 500;
          timeoutId = setTimeout(() => {
            if (mounted) {
              setRetryCount(prev => prev + 1);
            }
          }, delay);
        } else {
          // After retries, consider user not authenticated
          setUserData(null);
          setIsProcessing(false);
        }
      } catch (error) {
        console.error('Error getting session:', error);
        if (mounted) {
          if (retryCount < 2) {
            const delay = (retryCount + 1) * 500;
            timeoutId = setTimeout(() => {
              if (mounted) {
                setRetryCount(prev => prev + 1);
              }
            }, delay);
          } else {
            setUserData(null);
            setIsProcessing(false);
          }
        }
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      
      // Auth state change
      
      if (session?.user) {
        setUserData(session.user);
        setIsProcessing(false);
        setRetryCount(0);
      } else {
        // Don't immediately set to null - let the retry logic handle it
        if (event === 'SIGNED_OUT') {
          setUserData(null);
          setIsProcessing(false);
        }
      }
    });

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription?.unsubscribe();
    };
  }, [retryCount]);

  return { userData, isProcessing };
}
