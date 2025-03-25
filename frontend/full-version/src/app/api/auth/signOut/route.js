// @next
import { NextResponse } from 'next/server';

// @project
import { authProvider } from '@/app/api/auth/authProvider';

export async function POST(request) {
  try {
    const authProviderHandler = await authProvider();

    // Check if `signOut` is defined and is a function
    if (authProviderHandler.signOut) {
      return await authProviderHandler.signOut(request);
    } else {
      return NextResponse.json({ error: 'SignOut functionality not available' }, { status: 404 });
    }
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
