/**
 * Cliente Socket.IO para tiempo real (chat, notificaciones).
 * Reutiliza la base URL de la API y el token de autenticación.
 */
import { io } from 'socket.io-client';
import { STORAGE_KEYS } from '../utils/constants';

const baseURL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')}`
  : (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '');

/** Convierte URL HTTP(S) a WS(S) para Socket.IO */
function getSocketURL() {
  if (!baseURL) return undefined;
  return baseURL.replace(/^http/, 'ws');
}

let socket = null;

/**
 * Conecta al servidor Socket.IO con el token actual.
 * Si ya hay una conexión activa, la reutiliza.
 * @param {string} [token] - Token JWT (si no se pasa, se usa el de localStorage).
 * @returns {import('socket.io-client').Socket | null}
 */
export function connect(token) {
  const t = token ?? (typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null);
  if (!t) return null;

  const url = getSocketURL();
  if (!url) return null;

  if (socket?.connected) return socket;

  socket = io(url, {
    auth: { token: t },
    transports: ['websocket', 'polling'],
    path: '/socket.io',
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Error de conexión:', err.message);
  });

  return socket;
}

/**
 * Desconecta y limpia la instancia (ej. al cerrar sesión).
 */
export function disconnect() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Devuelve la instancia actual del socket (puede ser null).
 */
export function getSocket() {
  return socket ?? null;
}

/**
 * Registra un listener para un evento.
 * @param {string} event
 * @param {(...args: any[]) => void} handler
 */
export function on(event, handler) {
  if (socket) socket.on(event, handler);
}

/**
 * Elimina un listener.
 * @param {string} event
 * @param {(...args: any[]) => void} [handler]
 */
export function off(event, handler) {
  if (socket) socket.off(event, handler);
}

/**
 * Comprueba si hay una conexión activa.
 */
export function isConnected() {
  return Boolean(socket?.connected);
}
