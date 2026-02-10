import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS, ROLES } from '../utils/constants';
import * as authApi from '../api/auth';

function getStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getStoredToken() {
  return localStorage.getItem(STORAGE_KEYS.TOKEN);
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      setAuth: (token, user) => {
        if (token) localStorage.setItem(STORAGE_KEYS.TOKEN, token);
        if (user) localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        set({ token, user });
      },

      login: async (email, password) => {
        const data = await authApi.login({ email, password });
        const token = data.token ?? data.accessToken ?? data.access_token;
        const user = data.user ?? data.usuario ?? { email: data.email, rol: data.rol };
        if (!token) throw new Error('No se recibió token');
        get().setAuth(token, user);
        return { token, user };
      },

      logout: () => {
        authApi.logout();
        set({ token: null, user: null });
      },

      isAuthenticated: () => {
        const token = get().token ?? getStoredToken();
        return Boolean(token);
      },

      isAdmin: () => {
        const user = get().user ?? getStoredUser();
        if (!user) return false;
        const rol = (user.rol ?? user.role ?? '').toString();
        return rol === ROLES.ADMIN || rol === ROLES.ADMIN_ALT;
      },

      isDoctor: () => {
        const user = get().user ?? getStoredUser();
        if (!user) return false;
        const rol = (user.rol ?? user.role ?? '').toString();
        return rol === ROLES.DOCTOR || rol === ROLES.DOCTOR_ALT || get().isAdmin();
      },

      getDisplayName: () => {
        const user = get().user ?? getStoredUser();
        if (!user) return '';
        if (user.nombre && user.apellido_paterno) {
          return `${user.nombre} ${user.apellido_paterno}`.trim();
        }
        return user.email ?? user.nombre ?? 'Usuario';
      },
    }),
    {
      name: 'cuidate-web-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
