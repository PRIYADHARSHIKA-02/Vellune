import axios from 'axios';
import { useStore } from '../store';

const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const API_BASE_URL = rawUrl.endsWith('/api/v1') ? rawUrl : `${rawUrl}/api/v1`;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT Token dynamically from Zustand store
api.interceptors.request.use(
  (config) => {
    const token = useStore.getState().token || localStorage.getItem('rlm_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to handle 401 Unauthorized errors (expired/invalid tokens)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const errorMessage = error.response.data?.error;
      if (
        errorMessage === 'Invalid or expired token.' ||
        errorMessage === 'Authorization header missing or invalid format.'
      ) {
        // Clear auth state from store and localStorage, triggering automatic redirect to /auth
        useStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);

