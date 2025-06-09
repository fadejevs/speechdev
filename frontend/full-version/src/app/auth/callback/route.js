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
      
      if (!error) {
        // Get the redirect URL from the session data or use default
        const redirectTo = data?.session?.user?.user_metadata?.redirectTo || '/dashboard/analytics';
        return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
      }
    } catch (error) {
      console.error('Error exchanging code for session:', error);
    }
  }

  // If there's no code or an error occurred, redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
} 