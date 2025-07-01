// @next
import { NextResponse } from 'next/server';

// @project
// import { AuthRole } from '@/enum';
// import { createSupabaseClient } from '@/utils/supabase/server';
import { supabase } from '@/utils/supabase/client';

// const supabaseServer = createSupabaseClient();

export async function login(request) {
  try {
    const body = await request.json();
    const { email } = body;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // emailRedirectTo: 'http://localhost:3000/auth/callback',
        emailRedirectTo: 'https://app.everspeak.ai/auth/callback',
        data: {
          redirectTo: '/dashboard/analytics'
        }
      }
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ status: 200 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function getUser(token) {
  try {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser(token);
    if (error || !user) {
      return NextResponse.json({ error: error?.message || 'Invalid token or user not found' }, { status: 401 });
    }

    return NextResponse.json(
      {
        id: user.id,
        email: user.email || '',
        role: user.user_metadata?.role || user.role || 'user',
        contact: user.user_metadata?.contact,
        dialcode: user.user_metadata?.dialcode,
        display_name: user.user_metadata?.display_name,
        full_name: user.user_metadata?.full_name,
        firstname: user.user_metadata?.firstname,
        lastname: user.user_metadata?.lastname
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("Error in Supabase getUser:", e);
    return NextResponse.json({ error: 'Server error in getUser' }, { status: 500 });
  }
}

export async function signUp(request) {
  try {
    const body = await request.json();
    const { email, ...user_metadata } = body;

    // Send magic-link and create the user (password-less)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Redirect back to the app after the user clicks the link in their inbox
        emailRedirectTo: 'https://app.everspeak.ai/auth/callback',
        // Persist any extra information that was collected during sign-up
        data: user_metadata,
        // Ensure a new user is created if one does not already exist
        shouldCreateUser: true
      }
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ status: 200 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function verifyOtp(request) {
  try {
    const body = await request.json();
    const payload = { email: body.email, token: body.otp, type: body.type };

    // Verify OTP
    const { error } = await supabase.auth.verifyOtp(payload);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Success
    return NextResponse.json({ status: 200 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function resend(request) {
  try {
    const body = await request.json();
    const payload = { email: body.email, type: body.type };

    const { error } = await supabase.auth.resend(payload);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Success
    return NextResponse.json({ status: 200 });
  } catch {
    // Internal Server Error
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function forgotPassword(request) {
  try {
    const body = await request.json();
    const { error } = await supabase.auth.resetPasswordForEmail(body.email, { redirectTo: body.redirectTo });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Success
    return NextResponse.json({ status: 200 });
  } catch {
    // Internal Server Error
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function resetPassword(request) {
  try {
    const body = await request.json();

    // To reset a password in Supabase, first you need to set a session, and then only you can update the user.
    // After successful user update, sign out from Supabase so that we can prevent the user from resetting the password again with the same link.
    const { error: sessionError } = await supabase.auth.setSession({ access_token: body.accessToken, refresh_token: body.refreshToken });

    if (sessionError) {
      // Bad Request
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase.auth.updateUser({ password: body.password });

    if (error) {
      // Bad Request
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await supabase.auth.signOut();

    // // Success
    return NextResponse.json({ status: 200 });
  } catch {
    // Internal Server Error
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function signOut() {
  try {
    await supabase.auth.signOut();
    return NextResponse.json({ status: 200 });
  } catch {
    // Internal Server Error
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Export as a single object for easy import
const mockAuth = { login, getUser, signUp, verifyOtp, resend, forgotPassword, resetPassword, signOut };

export default mockAuth;
