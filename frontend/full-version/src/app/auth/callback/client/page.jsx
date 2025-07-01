'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';

export default function ClientCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      
      console.log('Client callback: Processing with code:', !!code);
      
      if (code) {
        try {
          setStatus('Exchanging authentication code...');
          
          // Exchange the code for a session using PKCE flow
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (!error && data?.session) {
            console.log('Client callback: Session exchange successful');
            setStatus('Authentication successful! Redirecting...');
            
            // Small delay to ensure the session is properly set
            setTimeout(() => {
              router.replace('/dashboard/analytics');
            }, 500);
          } else {
            console.error('Client callback error:', error);
            setStatus('Authentication failed. Redirecting to login...');
            
            setTimeout(() => {
              router.replace('/login?error=client_callback_failed');
            }, 2000);
          }
        } catch (error) {
          console.error('Client callback exception:', error);
          setStatus('Authentication error. Redirecting to login...');
          
          setTimeout(() => {
            router.replace('/login?error=client_callback_exception');
          }, 2000);
        }
      } else {
        console.log('Client callback: No code parameter found');
        setStatus('No authentication code found. Redirecting to login...');
        
        setTimeout(() => {
          router.replace('/login?error=no_code_client');
        }, 1500);
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div style={{ 
      padding: '40px 20px', 
      textAlign: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '400px',
      margin: '100px auto'
    }}>
      <div style={{ 
        fontSize: '24px', 
        marginBottom: '20px',
        animation: 'pulse 1.5s ease-in-out infinite'
      }}>
        🔐
      </div>
      <p style={{ 
        fontSize: '16px', 
        color: '#666',
        lineHeight: '1.5'
      }}>
        {status}
      </p>
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
} 