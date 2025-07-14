import { supabase } from '@/utils/supabase/client';

// This function is no longer needed since you don't have a 'profiles' table.
// You can safely delete it.
// export async function syncGoogleProfile() { ... }

export async function ensureFirstLastName() {
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) {
    console.log('No user found in ensureFirstLastName');
    return;
  }

  // Only update if missing
  if (!user.user_metadata?.firstname || !user.user_metadata?.lastname) {
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || '';
    if (fullName) {
      const [firstname, ...rest] = fullName.split(' ');
      const lastname = rest.join(' ');
      await supabase.auth.updateUser({
        data: {
          firstname,
          lastname
        }
      });
    }
  }
}
