// @next
import { NextResponse } from 'next/server';

// @project
import { authProvider } from '@/app/api/auth/authProvider';

export async function GET(request) {
  try {
    const authProviderHandler = await authProvider();

    // Check if `signUp` is defined and is a function
    if (authProviderHandler.signUp) {
      return await authProviderHandler.signUp(request);
    } else {
      return NextResponse.json({ error: 'SignUp functionality not available' }, { status: 404 });
    }
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
