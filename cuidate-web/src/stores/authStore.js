import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS, AUTH_PERSIST_KEY, ROLES } from '../utils/constants';
import { formatWelcomeDisplayName } from '../utils/format';
import * as authApi from '../api/auth';
import { getDoctorById } from '../api/doctores';
import { disconnect } from '../api/socket';
import { clearAllPatientDrafts } from '../utils/patientDraftStorage';

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
        const rawUser = data.user ?? data.usuario ?? null;
        const user = rawUser
          ? { ...rawUser, rol: rawUser.rol ?? data.rol, id_doctor: rawUser.id_doctor ?? data.id_doctor }
          : { email: data.email, rol: data.rol, id_doctor: data.id_doctor };
        if (!token) throw new Error('No se recibió token');
        get().setAuth(token, user);
        return { token, user };
      },

      logout: () => {
        disconnect();
        authApi.logout();
        clearAllPatientDrafts();
        localStorage.removeItem(AUTH_PERSIST_KEY);
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
        const welcome = formatWelcomeDisplayName(user);
        if (welcome) return welcome;
        return user.nombre?.trim() || 'Usuario';
      },

      /** Completa nombre/apellidos en sesiones antiguas (localStorage sin perfil). */
      refreshUserProfile: async () => {
        const token = get().token ?? getStoredToken();
        const user = get().user ?? getStoredUser();
        if (!token || !user) return;
        const hasName = Boolean(user.nombre?.trim() && user.apellido_paterno?.trim());
        if (hasName) return;

        const rol = String(user.rol ?? '').trim();
        if (rol === 'Doctor' && user.id_doctor) {
          try {
            const doc = await getDoctorById(user.id_doctor);
            const d = doc && typeof doc === 'object' ? doc : {};
            if (d.nombre || d.apellido_paterno) {
              get().setAuth(token, {
                ...user,
                nombre: d.nombre ?? user.nombre,
                apellido_paterno: d.apellido_paterno ?? user.apellido_paterno,
                apellido_materno: d.apellido_materno ?? user.apellido_materno,
              });
            }
          } catch {
            /* no bloquear UI */
          }
        }
      },
    }),
    {
      name: AUTH_PERSIST_KEY,
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
