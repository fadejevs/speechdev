import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Create a Supabase admin client with implicit flow
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    flowType: 'implicit', // Use implicit flow instead of PKCE
    detectSessionInUrl: false
  }
});

// Get the correct redirect URL based on environment
const getRedirectUrl = (path = '/auth/callback') => {
  if (process.env.NODE_ENV === 'development') {
    return `http://localhost:3000${path}`;
  }
  return `https://app.everspeak.ai${path}`;
};

export async function GET(request) {
  // Get the email from the URL
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    console.log('Checking email:', email);

    // First, check if the user exists using admin API
    const { data, error: adminError } = await supabaseAdmin.auth.admin.listUsers();

    if (adminError) {
      console.error('Error checking user:', adminError);
      return NextResponse.json({ error: adminError.message }, { status: 500 });
    }

    // Check if a user with this email exists
    const userExists = data.users.some((user) => user.email === email);
    console.log('User exists:', userExists);

    if (!userExists) {
      return NextResponse.json({ exists: false });
    }

    // User exists, now send the magic link for login (not signup)
    const { error: signInError } = await supabaseAdmin.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: getRedirectUrl('/auth/callback'),
        data: {
          redirectTo: '/dashboard/analytics'
        }
      }
    });

    if (signInError) {
      console.error('Error sending magic link:', signInError);
      return NextResponse.json({ error: signInError.message }, { status: 500 });
    }

    console.log('Magic link sent successfully for existing user:', email);
    return NextResponse.json({ exists: true });
  } catch (error) {
    console.error('Server error in check-email:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
