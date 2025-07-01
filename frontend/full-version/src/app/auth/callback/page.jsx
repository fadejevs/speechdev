'use client';

// @next
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// @project
import { supabase } from '@/utils/supabase/client';

/***************************  AUTH - MAGIC-LINK CALLBACK  ***************************/

export default function SupabaseAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const exchangeSession = async () => {
      // window.location.href includes query params (code, state, etc.)
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);

      if (error) {
        console.error('Supabase session exchange error:', error);
        router.replace(`/login?error=${encodeURIComponent(error.message || 'session_exchange_failed')}`);
        return;
      }

      // Check if a redirectTo path was passed in user_metadata during the sign-in request
      const {
        data: { session }
      } = await supabase.auth.getSession();

      const redirectPath = session?.user?.user_metadata?.redirectTo || '/dashboard/analytics';

      router.replace(redirectPath);
    };

    // Only run on the client
    if (typeof window !== 'undefined') {
      exchangeSession();
    }
  }, [router, searchParams]);

  return null; // Optionally render a spinner or message while processing
} 