'use client';

// @project
import { useAuth } from '@/contexts/AuthContext';

/***************************  HOOKS - CONFIG  ***************************/

export default function useCurrentUser() {
  const { user, isProcessing } = useAuth();
  return { userData: user, isProcessing };
}
