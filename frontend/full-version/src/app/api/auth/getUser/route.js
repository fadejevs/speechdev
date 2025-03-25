// @next
import { NextResponse } from 'next/server';

// @project
import { authProvider } from '@/app/api/auth/authProvider';

export async function GET(request) {
  try {
    // Get the Authorization header
    const authHeader = request.headers.get('Authorization');

    // Check if the header is present and starts with "Bearer"
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Extract the token from the header
      const token = authHeader.split(' ')[1];

      // Continue with your token handling logic, like verifying it
      const authProviderHandler = await authProvider();

      // Check if `getUser` is defined and is a function
      if (authProviderHandler.getUser) {
        return await authProviderHandler.getUser(token);
      } else {
        return NextResponse.json({ error: 'Get user functionality not available' }, { status: 404 });
      }
    } else {
      // Handle missing or invalid Authorization header
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
