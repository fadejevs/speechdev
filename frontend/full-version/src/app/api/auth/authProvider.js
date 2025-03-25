// @project
import { AUTH_PROVIDER } from '@/config';

// Mapping of auth types to dynamic imports
const authProviderMapping = {
  mock: () => import('@/app/api/mock/auth').then((mod) => mod.default),
  supabase: () => import('@/app/api/supabase/auth').then((mod) => mod.default)
};

// Dynamically loads and returns the auth provider based on AUTH_PROVIDER.
export async function authProvider() {
  return await authProviderMapping[AUTH_PROVIDER]();
}
