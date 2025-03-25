import { createClient } from '@supabase/supabase-js';

export function createSupabaseClient() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  } else {
    throw new Error('Supabase URL and anon key are required.');
  }
}
