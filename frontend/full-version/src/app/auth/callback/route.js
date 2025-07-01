import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  console.log('Auth callback: Processing request with code:', !!code);

  if (code) {
    // Create a Supabase client with PKCE configuration for server-side auth
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          flowType: 'pkce',
          detectSessionInUrl: false,
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    try {
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (!error && data?.session) {
        console.log('Auth callback: Session exchange successful');
        
        // Set cookies for the session
        const response = NextResponse.redirect(new URL('/dashboard/analytics', requestUrl.origin));
        
        // Set the session cookies
        response.cookies.set('sb-access-token', data.session.access_token, {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: data.session.expires_in
        });
        
        response.cookies.set('sb-refresh-token', data.session.refresh_token, {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30 // 30 days
        });
        
        return response;
      } else {
        console.error('Auth callback: Session exchange failed:', error);
        return NextResponse.redirect(new URL('/login?error=session_exchange_failed', requestUrl.origin));
      }
    } catch (error) {
      console.error('Auth callback: Error exchanging code for session:', error);
      return NextResponse.redirect(new URL('/login?error=exchange_exception', requestUrl.origin));
    }
  }

  // If there's no code, redirect to login
  console.log('Auth callback: No code parameter found');
  return NextResponse.redirect(new URL('/login?error=no_code', requestUrl.origin));
} 