import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (!error && data?.session) {
        console.log('Auth callback: Session exchange successful');
        
        // Get the redirect URL from the session data or use default
        const redirectTo = data?.session?.user?.user_metadata?.redirectTo || '/dashboard/analytics';
        
        // Add a small delay to ensure session is fully propagated
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
      } else {
        console.error('Auth callback: Session exchange failed:', error);
        // Don't immediately redirect to login - give it another chance
        return NextResponse.redirect(new URL('/login?error=session_exchange_failed', requestUrl.origin));
      }
    } catch (error) {
      console.error('Auth callback: Error exchanging code for session:', error);
      return NextResponse.redirect(new URL('/login?error=callback_error', requestUrl.origin));
    }
  }

  // If there's no code, redirect to login
  console.log('Auth callback: No code parameter found');
  return NextResponse.redirect(new URL('/login?error=no_code', requestUrl.origin));
} 