import axios from 'axios';
import { STORAGE_KEYS, AUTH_PERSIST_KEY, LOGIN_REASON_SESSION_EXPIRED } from '../utils/constants';

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

/** Indica si la respuesta de error es por token inválido/expirado (401 o 403 con mensaje de token). */
function isTokenInvalidResponse(error) {
  const status = error.response?.status;
  const message = (error.response?.data?.error || error.response?.data?.message || '').toString().toLowerCase();
  const tokenInvalidMessage = /token\s*inválido|token\s*invalido|token\s*requerido|token\s*de\s*acceso|acceso\s*requerido|no\s*autenticado/.test(message);
  return status === 401 || (status === 403 && tokenInvalidMessage);
}

let isClearingSession = false;

/** Limpia sesión en localStorage (token, user, persist) y redirige a login con motivo de sesión caducada. Solo se ejecuta una vez aunque varios interceptores reciban 401 a la vez. */
function clearSessionAndRedirectToLogin() {
  if (isClearingSession) return;
  isClearingSession = true;
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
  localStorage.removeItem(AUTH_PERSIST_KEY);
  const isLoginPage = window.location.pathname === '/login';
  if (!isLoginPage) {
    const params = new URLSearchParams({ reason: LOGIN_REASON_SESSION_EXPIRED });
    window.location.href = `/login?${params.toString()}`;
  }
}

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
    if (isTokenInvalidResponse(error)) {
      clearSessionAndRedirectToLogin();
    }
    return Promise.reject(error);
  }
);

export default client;
