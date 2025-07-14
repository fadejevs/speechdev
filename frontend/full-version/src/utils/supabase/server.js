import { createClient } from '@supabase/supabase-js';

export function createSupabaseClient() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: false, // Server side should not detect session in URL
        autoRefreshToken: false, // Server side should not auto refresh
        persistSession: false // Server side should not persist session
      }
    });
  } else {
    throw new Error('Supabase URL and anon key are required.');
  }
}
