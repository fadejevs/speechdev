'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      // Check for PKCE code in query parameters
      const code = searchParams.get('code');

      // Check for implicit flow tokens in URL hash fragment
      const urlHash = window.location.hash.substring(1); // Remove the #
      const hashParams = new URLSearchParams(urlHash);
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const tokenType = hashParams.get('token_type');
      const authType = hashParams.get('type'); // 'signup' or 'recovery', etc.

      console.log('Auth callback: Processing authentication...');
      console.log('Auth callback: Has PKCE code:', !!code);
      console.log('Auth callback: Has access token:', !!accessToken);
      console.log('Auth callback: Auth type:', authType);
      console.log('Auth callback: Full URL:', window.location.href);

      // Handle implicit flow tokens (from URL hash)
      if (accessToken && tokenType) {
        try {
          setStatus('Setting up your session...');
          console.log('Auth callback: Processing implicit flow tokens');

          // Set the session using the tokens from the URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });

          if (!error && data?.session) {
            console.log('Auth callback: Implicit flow session set successfully');
            console.log('Auth callback: User email:', data.session.user?.email);
            setStatus('Authentication successful! Redirecting...');

            // Small delay to ensure the session is properly set
            setTimeout(() => {
              router.replace('/dashboard/analytics');
            }, 500);
          } else {
            console.error('Auth callback: Session setup failed:', error);
            setStatus('Authentication failed. Redirecting to login...');

            setTimeout(() => {
              router.replace('/login?error=session_setup_failed');
            }, 2000);
          }
        } catch (error) {
          console.error('Auth callback: Exception setting session:', error);
          setStatus('Authentication error. Redirecting to login...');

          setTimeout(() => {
            router.replace('/login?error=session_exception');
          }, 2000);
        }
        return;
      }

      // Handle PKCE flow (from query parameters)
      if (code) {
        try {
          setStatus('Exchanging authentication code...');

          // Debug: Check if PKCE verifier exists
          const pkceVerifier = localStorage.getItem('supabase.auth.code_verifier');
          console.log('Auth callback: PKCE verifier exists:', !!pkceVerifier);

          // Exchange the code for a session using PKCE flow
          console.log('Auth callback: Attempting exchangeCodeForSession...');
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          console.log('Auth callback: PKCE exchange result - data:', !!data, 'error:', error);

          if (!error && data?.session) {
            console.log('Auth callback: PKCE session exchange successful');
            console.log('Auth callback: User email:', data.session.user?.email);
            setStatus('Authentication successful! Redirecting...');

            // Small delay to ensure the session is properly set
            setTimeout(() => {
              router.replace('/dashboard/analytics');
            }, 500);
          } else {
            console.error('Auth callback: PKCE error:', error);
            setStatus('Authentication failed. Redirecting to login...');

            setTimeout(() => {
              router.replace('/login?error=pkce_callback_failed');
            }, 2000);
          }
        } catch (error) {
          console.error('Auth callback: PKCE exception:', error);
          setStatus('Authentication error. Redirecting to login...');

          setTimeout(() => {
            router.replace('/login?error=pkce_callback_exception');
          }, 2000);
        }
        return;
      }

      // No authentication parameters found
      console.log('Auth callback: No authentication parameters found');
      setStatus('No authentication data found. Redirecting to login...');

      setTimeout(() => {
        router.replace('/login?error=no_auth_data');
      }, 1500);
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div
      style={{
        padding: '40px 20px',
        textAlign: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        maxWidth: '400px',
        margin: '100px auto'
      }}
    >
      <div
        style={{
          fontSize: '24px',
          marginBottom: '20px',
          animation: 'pulse 1.5s ease-in-out infinite'
        }}
      >
        🔐
      </div>
      <p
        style={{
          fontSize: '16px',
          color: '#666',
          lineHeight: '1.5'
        }}
      >
        {status}
      </p>
      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
