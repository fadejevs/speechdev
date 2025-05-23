'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { AUTH_USER_KEY, APP_DEFAULT_PATH } from '@/config';

// @project
import axios from '@/utils/axios';

/***************************  AUTH - CONTEXT & PROVIDER  ***************************/

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const router = useRouter();

  const fetchUser = async () => {
    axios
      .get('/api/auth/getUser')
      .then((response) => {
        console.log('API user response:', response.data);
        setUser(response.data || {});
        setIsProcessing(false);
      })
      .catch(() => {
        setIsProcessing(false);
        localStorage.removeItem(AUTH_USER_KEY);
        setUser(null);
      });
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  const manageUserData = (localStorageData) => {
    const parsedAuthData = localStorageData ? JSON.parse(localStorageData) : null;
    if (parsedAuthData?.access_token) {
      fetchUser();
    } else {
      setIsProcessing(false);
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

  useEffect(() => {
    async function syncSession() {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.session));
      }
    }
    syncSession();
  }, []);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(session));
        await fetchUser();
      } else {
        localStorage.removeItem(AUTH_USER_KEY);
        setUser(null);
      }
    });
    return () => {
      listener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // useEffect(() => {
  //   const handleAuth = async () => {
  //     const { data, error } = await supabase.auth.getSession();
  //     if (data?.session) {
  //       localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.session));
  //       router.replace(APP_DEFAULT_PATH);
  //     } else {
  //       // fallback: try to refresh session
  //       await supabase.auth.refreshSession();
  //       const { data: refreshed } = await supabase.auth.getSession();
  //       if (refreshed?.session) {
  //         localStorage.setItem(AUTH_USER_KEY, JSON.stringify(refreshed.session));
  //         router.replace(APP_DEFAULT_PATH);
  //       } else {
  //         router.replace('/login');
  //       }
  //     }
  //   };
  //   handleAuth();
  // }, [router]);

  return <AuthContext.Provider value={{ user, isProcessing, refreshUser }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
