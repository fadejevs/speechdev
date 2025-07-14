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
    try {
      const response = await axios.get('/api/auth/getUser');
      setUser(response.data || {});
      setIsProcessing(false);
    } catch (error) {
      console.log('Failed to fetch user:', error);
      setIsProcessing(false);
      // Don't remove localStorage here - let Supabase manage it
      setUser(null);
    }
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  // Simplified session management - let Supabase handle the heavy lifting
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Wait a bit for any pending auth operations to complete
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Get the current session
        const {
          data: { session },
          error
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session && !error) {
          // Store session in localStorage for axios interceptor
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(session));
          await fetchUser();
        } else {
          // Try to refresh the session once
          const {
            data: { session: refreshedSession }
          } = await supabase.auth.refreshSession();

          if (!mounted) return;

          if (refreshedSession) {
            localStorage.setItem(AUTH_USER_KEY, JSON.stringify(refreshedSession));
            await fetchUser();
          } else {
            localStorage.removeItem(AUTH_USER_KEY);
            setUser(null);
            setIsProcessing(false);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setIsProcessing(false);
          setUser(null);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      // Auth state change

      if (session) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(session));
        await fetchUser();
      } else {
        localStorage.removeItem(AUTH_USER_KEY);
        setUser(null);
        setIsProcessing(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={{ user, isProcessing, refreshUser }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
