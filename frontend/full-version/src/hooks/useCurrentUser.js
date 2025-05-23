'use client';

// @project
import { useAuth } from '@/contexts/AuthContext';

/***************************  HOOKS - CONFIG  ***************************/

export default function useCurrentUser() {
  const { user, isProcessing, refreshUser } = useAuth();
  return { userData: user, isProcessing, refreshUser };
}
