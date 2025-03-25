// @next
import { NextResponse } from 'next/server';

// @project
import { AuthRole } from '@/enum';
import { createSupabaseClient } from '@/utils/supabase/server';

const supabase = createSupabaseClient();

export async function login(request) {
  try {
    const body = await request.json();
    const payload = { email: body.email, password: body.password };
    const { data, error } = await supabase.auth.signInWithPassword(payload);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        id: data.user?.id,
        email: data.user?.email || '',
        contact: data.user?.user_metadata?.contact,
        dialcode: data.user?.user_metadata?.dialcode,
        firstname: data.user?.user_metadata?.firstname,
        lastname: data.user?.user_metadata?.lastname,
        access_token: data.session?.access_token
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function getUser(token) {
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        id: data.user.id,
        email: data.user.email || '',
        role: data.user.user_metadata.role,
        contact: data.user.user_metadata.contact,
        dialcode: data.user.user_metadata.dialcode,
        firstname: data.user.user_metadata.firstname,
        lastname: data.user.user_metadata.lastname
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function signUp(request) {
  try {
    const body = await request.json();

    const { error } = await supabase.auth.signUp({
      email: body.email,
      password: body.password,
      options: {
        data: {
          firstname: body.firstname,
          lastname: body.lastname,
          dialcode: body.dialcode,
          contact: body.contact,
          role: AuthRole.USER
        }
      }
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Success
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
