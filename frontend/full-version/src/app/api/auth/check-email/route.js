import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Create a Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      flowType: 'pkce'
    }
  }
);

export async function GET(request) {
  // Get the email from the URL
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json(
      { error: 'Email is required' },
      { status: 400 }
    );
  }

  try {
    // First, check if the user exists using admin API
    const { data, error: adminError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (adminError) {
      console.error('Error checking user:', adminError);
      return NextResponse.json(
        { error: adminError.message },
        { status: 500 }
      );
    }

    // Check if a user with this email exists
    const userExists = data.users.some(user => user.email === email);

    if (!userExists) {
      return NextResponse.json({ exists: false });
    }

    // User exists, now send the magic link
    const { error: signInError } = await supabaseAdmin.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${request.headers.get('origin')}/auth/callback`,
        data: {
          redirectTo: '/dashboard/analytics'
        }
      }
    });

    if (signInError) {
      console.error('Error sending magic link:', signInError);
      return NextResponse.json(
        { error: signInError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ exists: true });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 