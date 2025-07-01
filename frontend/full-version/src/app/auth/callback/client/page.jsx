'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';

export default function ClientCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      
      if (code) {
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (!error) {
            // Success - redirect to dashboard
            router.replace('/dashboard/analytics');
          } else {
            console.error('Client callback error:', error);
            router.replace('/login?error=client_callback_failed');
          }
        } catch (error) {
          console.error('Client callback exception:', error);
          router.replace('/login?error=client_callback_exception');
        }
      } else {
        router.replace('/login?error=no_code_client');
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p>Completing sign in...</p>
    </div>
  );
} 