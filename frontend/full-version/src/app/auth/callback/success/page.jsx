'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';

export default function AuthCallbackSuccess() {
  const router = useRouter();
  const [status, setStatus] = useState('Processing...');

  useEffect(() => {
    let timeoutId;
    let subscription;

    const handleAuth = async () => {
      try {
        // First, check if there's already a session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (initialSession) {
          console.log('Auth success: Initial session found');
          setStatus('Authentication successful! Redirecting...');
          router.replace('/dashboard/analytics');
          return;
        }

        console.log('Auth success: Waiting for auth state change...');
        setStatus('Completing authentication...');

        // Listen for auth state changes
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth state change in success page:', event, session);
          
          if (event === 'SIGNED_IN' && session) {
            console.log('Auth success: User signed in successfully');
            setStatus('Authentication successful! Redirecting...');
            
            // Small delay to ensure state is fully synced
            setTimeout(() => {
              router.replace('/dashboard/analytics');
            }, 500);
            
          } else if (event === 'SIGNED_OUT') {
            console.log('Auth success: User signed out');
            setStatus('Authentication failed. Redirecting to login...');
            setTimeout(() => {
              router.replace('/login?error=auth_signout');
            }, 1000);
          }
        });

        subscription = authSubscription;

        // Set a timeout in case nothing happens
        timeoutId = setTimeout(() => {
          console.log('Auth success: Timeout reached');
          setStatus('Authentication timed out. Redirecting to login...');
          setTimeout(() => {
            router.replace('/login?error=auth_timeout');
          }, 1000);
        }, 15000); // 15 second timeout

      } catch (error) {
        console.error('Auth success error:', error);
        setStatus('Authentication error. Redirecting to login...');
        setTimeout(() => {
          router.replace('/login?error=auth_error');
        }, 1000);
      }
    };

    handleAuth();

    // Cleanup function
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [router]);

  return (
    <div style={{ 
      padding: '40px 20px', 
      textAlign: 'center', 
      maxWidth: '400px', 
      margin: '100px auto',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ 
        marginBottom: '20px',
        fontSize: '24px',
        color: '#333'
      }}>
        🔐 Authenticating...
      </div>
      
      <div style={{ 
        marginBottom: '20px',
        fontSize: '16px',
        color: '#666'
      }}>
        {status}
      </div>
      
      <div style={{ 
        width: '40px',
        height: '40px',
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #007bff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto'
      }} />
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
      <div style={{ 
        marginTop: '30px',
        fontSize: '14px',
        color: '#999'
      }}>
        Please wait while we complete your sign in...
      </div>
    </div>
  );
} 