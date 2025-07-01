import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });

    try {
      // Try the exchange first
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (!error && data?.session) {
        console.log('Auth callback: Session exchange successful');
        
        // Get the redirect URL from the session data or use default
        const redirectTo = data?.session?.user?.user_metadata?.redirectTo || '/dashboard/analytics';
        
        return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
      } else {
        console.error('Auth callback: Session exchange failed:', error);
        
        // If exchange fails, try alternative approach - redirect to a client page that will handle it
        return NextResponse.redirect(new URL(`/auth/callback/client?code=${code}`, requestUrl.origin));
      }
    } catch (error) {
      console.error('Auth callback: Error exchanging code for session:', error);
      // Fallback to client-side handling
      return NextResponse.redirect(new URL(`/auth/callback/client?code=${code}`, requestUrl.origin));
    }
  }

  // If there's no code, redirect to login
  console.log('Auth callback: No code parameter found');
  return NextResponse.redirect(new URL('/login?error=no_code', requestUrl.origin));
} 