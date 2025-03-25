// @project
import { AUTH_USER_KEY } from '@/config';
import axios from '@/utils/axios';

export function logout() {
  axios.get('/api/auth/logout');
  localStorage.removeItem(AUTH_USER_KEY);
  window.location.pathname = '/login';
}
