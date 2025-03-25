'use client';
import { createContext, useContext, useEffect, useState } from 'react';

// @project
import { AUTH_USER_KEY } from '@/config';
import axios from '@/utils/axios';

/***************************  AUTH - CONTEXT & PROVIDER  ***************************/

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isProcessing, setIsProcessing] = useState(true);

  const fetchUser = async () => {
    axios
      .get('/api/auth/getUser')
      .then((response) => {
        setUser(response.data || {});
        setIsProcessing(false);
      })
      .catch(() => {
        setIsProcessing(false);
        localStorage.removeItem(AUTH_USER_KEY);
        setUser(null);
      });
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

  return <AuthContext.Provider value={{ user, isProcessing }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
