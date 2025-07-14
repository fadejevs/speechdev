import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function middleware(request) {
  const response = NextResponse.next();

  // Only apply auth middleware to protected routes
  if (request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/api/auth')) {
    // Create Supabase client for middleware
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: false,
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Check for existing session in cookies
    const accessToken = request.cookies.get('sb-access-token')?.value;
    const refreshToken = request.cookies.get('sb-refresh-token')?.value;

    if (accessToken && refreshToken) {
      try {
        // Set the session for this request
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
      } catch (error) {
        console.log('Middleware: Session validation failed:', error);
      }
    }
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/auth/:path*']
};
