import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { STORAGE_KEYS, AUTH_PERSIST_KEY, LOGIN_REASON_SESSION_EXPIRED } from '../utils/constants';

vi.mock('axios', () => {
  const instance = {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    get: vi.fn(),
    post: vi.fn(),
  };
  return {
    default: {
      create: vi.fn(() => instance),
    },
  };
});

describe('api client', () => {
  let requestOnFulfilled;
  let responseOnRejected;

  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    axios.create.mockClear();
    const instance = axios.create();
    instance.interceptors.request.use.mockImplementation((fn) => {
      requestOnFulfilled = fn;
    });
    instance.interceptors.response.use.mockImplementation((_ok, reject) => {
      responseOnRejected = reject;
    });
    await import('./client.js');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('adjunta Authorization cuando hay token', () => {
    localStorage.setItem(STORAGE_KEYS.TOKEN, 'jwt-test');
    const config = requestOnFulfilled({ headers: {}, url: '/api/pacientes' });
    expect(config.headers.Authorization).toBe('Bearer jwt-test');
  });

  it('limpia sesión en 401 de token inválido', async () => {
    localStorage.setItem(STORAGE_KEYS.TOKEN, 'jwt-test');
    localStorage.setItem(STORAGE_KEYS.USER, '{}');
    localStorage.setItem(AUTH_PERSIST_KEY, '{}');

    const hrefSetter = vi.fn();
    vi.stubGlobal('location', {
      pathname: '/dashboard',
      set href(v) {
        hrefSetter(v);
      },
      get href() {
        return '/dashboard';
      },
    });

    await expect(
      responseOnRejected({
        response: { status: 401, data: { error: 'Token inválido' } },
        config: { url: '/api/pacientes' },
      })
    ).rejects.toBeDefined();

    expect(localStorage.getItem(STORAGE_KEYS.TOKEN)).toBeNull();
    expect(String(hrefSetter.mock.calls[0]?.[0] ?? '')).toContain(LOGIN_REASON_SESSION_EXPIRED);
  });

  it('no limpia sesión en 401 de login', async () => {
    localStorage.setItem(STORAGE_KEYS.TOKEN, 'jwt-test');
    await expect(
      responseOnRejected({
        response: { status: 401, data: { error: 'Credenciales inválidas' } },
        config: { url: '/api/auth/login' },
      })
    ).rejects.toBeDefined();
    expect(localStorage.getItem(STORAGE_KEYS.TOKEN)).toBe('jwt-test');
  });
});
