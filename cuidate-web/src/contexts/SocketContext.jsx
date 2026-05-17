import { createContext, useContext, useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { connect, disconnect, off, on } from '../api/socket';
import { STORAGE_KEYS } from '../utils/constants';

const SocketContext = createContext(true);

function resolveToken(storeToken) {
  return (
    storeToken ??
    (typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null)
  );
}

export function SocketProvider({ children }) {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    const t = resolveToken(token);
    if (!t) {
      disconnect();
      return undefined;
    }
    connect(t);
    return undefined;
  }, [token]);

  return <SocketContext.Provider value={true}>{children}</SocketContext.Provider>;
}

export function useSocketEvent(event, handler, enabled = true) {
  useSocketContext();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled || !event) return undefined;
    const wrapped = (...args) => handlerRef.current(...args);
    on(event, wrapped);
    return () => off(event, wrapped);
  }, [enabled, event]);
}

/** Suscripción a varios eventos con el mismo handler. */
export function useSocketEvents(events, handler, enabled = true) {
  useSocketContext();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const eventsRef = useRef(events);
  eventsRef.current = events;
  const eventKey = Array.isArray(events) ? events.join('\0') : '';

  useEffect(() => {
    if (!enabled || !eventKey) return undefined;
    const list = eventsRef.current;
    const wrapped = (...args) => handlerRef.current(...args);
    list.forEach((event) => on(event, wrapped));
    return () => list.forEach((event) => off(event, wrapped));
  }, [enabled, eventKey]);
}

function useSocketContext() {
  const ok = useContext(SocketContext);
  if (!ok) {
    throw new Error('useSocketEvent requiere SocketProvider');
  }
}
