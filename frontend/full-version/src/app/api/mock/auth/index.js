// @next
import { NextResponse } from 'next/server';

// @project
import mockUsers from './data';

export async function login(request) {
  try {
    const body = await request.json(); // Parse the JSON body
    const user = mockUsers.find((user) => user.email === body.email && user.password === body.password);
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 });
    }

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        contact: user.contact,
        dialcode: user.dialcode,
        firstname: user.firstname,
        lastname: user.lastname,
        access_token: user.access_token
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function getUser(token) {
  try {
    const user = mockUsers.find((user) => user.access_token === token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }
    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        contact: user.contact,
        dialcode: user.dialcode,
        firstname: user.firstname,
        lastname: user.lastname
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
    console.log(body);
    return NextResponse.json({ status: 200 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function verifyOtp(request) {
  try {
    const body = await request.json();
    console.log(body);
    return NextResponse.json({ status: 200 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function resend(request) {
  try {
    const body = await request.json();
    console.log(body);
    return NextResponse.json({ status: 200 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function forgotPassword(request) {
  try {
    const body = await request.json();
    console.log(body);
    return NextResponse.json({ status: 200 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function resetPassword(request) {
  try {
    const body = await request.json();
    console.log(body);
    return NextResponse.json({ status: 200 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function signOut() {
  try {
    return NextResponse.json({ status: 200 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Export as a single object for easy import
const mockAuth = { login, getUser, signUp, verifyOtp, resend, forgotPassword, resetPassword, signOut };

export default mockAuth;
