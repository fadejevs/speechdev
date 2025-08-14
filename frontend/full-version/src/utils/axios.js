// @third-party
import axios from 'axios';

// @project
import { AUTH_USER_KEY } from '@/config';

const axiosServices = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_HOST || (typeof window !== 'undefined' ? window.location.origin : '')
});

/***************************  AXIOS MIDDLEWARE  ***************************/

axiosServices.interceptors.request.use(
  async (config) => {
    const storedValue = typeof window !== 'undefined' ? localStorage.getItem(AUTH_USER_KEY) : null;
    const parsedValue = storedValue && JSON.parse(storedValue);

    if (parsedValue?.access_token) {
      config.headers['Authorization'] = `Bearer ${parsedValue.access_token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosServices.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error && error.response ? error.response.status : undefined;
    if (typeof window !== 'undefined' && status === 401 && !window.location.href.includes('/login')) {
      window.location.pathname = '/login';
    }
    // If there is no response (e.g., ERR_EMPTY_RESPONSE), propagate the original error
    return Promise.reject(error);
  }
);

export default axiosServices;
