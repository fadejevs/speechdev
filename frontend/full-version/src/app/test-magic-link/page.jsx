'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';

export default function TestMagicLink() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleSendMagicLink = async () => {
    if (!email) {
      setMessage('Please enter an email');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: 'http://localhost:3001/auth/callback',
          shouldCreateUser: true,
          data: {
            firstname: 'Test',
            lastname: 'User'
          }
        }
      });

      if (error) {
        setMessage(`Error: ${error.message}`);
      } else {
        setMessage('Magic link sent! Check your email and click the link to test the callback.');
      }
    } catch (err) {
      setMessage(`Exception: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testCallbackFlow = () => {
    // Test the callback routes directly
    setMessage('Testing callback flow...');

    // Simulate what happens when clicking a magic link
    // This will test our callback route with a fake code
    router.push('/auth/callback?code=fake_test_code_123');
  };

  const testClientCallback = () => {
    // Test the client callback directly
    setMessage('Testing client callback...');
    router.push('/auth/callback/client?code=fake_test_code_456');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <h2>Test Magic Link Callback</h2>

      {/* Original email test */}
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px' }}>
        <h3>Option 1: Try Email (might be rate limited)</h3>
        <div style={{ marginBottom: '10px' }}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              marginBottom: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
          <button
            onClick={handleSendMagicLink}
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: loading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </div>
      </div>

      {/* Test callback flow */}
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px' }}>
        <h3>Option 2: Test Callback Flow Directly</h3>
        <p style={{ fontSize: '14px', marginBottom: '10px' }}>These buttons simulate what happens when you click a magic link:</p>

        <button
          onClick={testCallbackFlow}
          style={{
            width: '100%',
            padding: '10px',
            marginBottom: '10px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test Server Callback Route
        </button>

        <button
          onClick={testClientCallback}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#ffc107',
            color: 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test Client Callback Route
        </button>
      </div>

      {message && (
        <div
          style={{
            padding: '10px',
            marginTop: '10px',
            backgroundColor: message.includes('Error') ? '#f8d7da' : '#d1edff',
            border: '1px solid ' + (message.includes('Error') ? '#f5c6cb' : '#bee5eb'),
            borderRadius: '4px'
          }}
        >
          {message}
        </div>
      )}

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p>
          <strong>How to test without emails:</strong>
        </p>
        <ol>
          <li>Click "Test Server Callback Route" - should redirect to client callback</li>
          <li>Click "Test Client Callback Route" - should show callback error (expected)</li>
          <li>Watch the browser developer console for logs</li>
          <li>Check where you end up (login page with error = expected behavior)</li>
        </ol>
        <p>
          <strong>Expected behavior:</strong> Both should redirect you to login with errors since we're using fake codes, but this proves
          the routing works!
        </p>
      </div>
    </div>
  );
}
