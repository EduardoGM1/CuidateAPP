import axios from 'axios';
import { STORAGE_KEYS } from '../utils/constants';

const baseURL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')}`
  : '';

const client = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Type': 'web',
  },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      const isLoginPage = window.location.pathname === '/login';
      if (!isLoginPage) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default client;
