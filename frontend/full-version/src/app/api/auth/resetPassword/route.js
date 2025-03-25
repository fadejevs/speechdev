// @next
import { NextResponse } from 'next/server';

// @project
import { authProvider } from '@/app/api/auth/authProvider';

export async function POST(request) {
  try {
    const authProviderHandler = await authProvider();

    // Check if `resetPassword` is defined and is a function
    if (authProviderHandler.resetPassword) {
      return await authProviderHandler.resetPassword(request);
    } else {
      return NextResponse.json({ error: 'Reset password functionality not available' }, { status: 404 });
    }
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
