import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from './authStore';
import { STORAGE_KEYS, AUTH_PERSIST_KEY, ROLES } from '../utils/constants';

vi.mock('../api/auth', () => ({
  login: vi.fn(),
  logout: vi.fn(() => {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  }),
}));

vi.mock('../api/socket', () => ({
  disconnect: vi.fn(),
}));

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ token: null, user: null });
  });

  it('isAdmin detecta rol Admin', () => {
    useAuthStore.setState({
      user: { email: 'a@test.com', rol: ROLES.ADMIN },
    });
    expect(useAuthStore.getState().isAdmin()).toBe(true);
  });

  it('isDoctor incluye Admin', () => {
    useAuthStore.setState({
      user: { email: 'd@test.com', rol: ROLES.ADMIN },
    });
    expect(useAuthStore.getState().isDoctor()).toBe(true);
  });

  it('logout limpia token, usuario y persistencia', () => {
    localStorage.setItem(STORAGE_KEYS.TOKEN, 't');
    localStorage.setItem(STORAGE_KEYS.USER, '{}');
    localStorage.setItem(AUTH_PERSIST_KEY, '{}');
    useAuthStore.setState({ token: 't', user: { email: 'x@test.com', rol: ROLES.DOCTOR } });

    useAuthStore.getState().logout();

    expect(useAuthStore.getState().token).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.TOKEN)).toBeNull();
    const persisted = JSON.parse(localStorage.getItem(AUTH_PERSIST_KEY) || '{}');
    expect(persisted?.state?.token ?? null).toBeNull();
  });
});
