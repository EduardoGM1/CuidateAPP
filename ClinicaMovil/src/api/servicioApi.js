import { Platform } from 'react-native';
import Logger from '../services/logger';
import { ensureApiClient, reinitializeApiConfig as reinitHttpClient } from './httpClient';

/**
 * Cliente Axios compartido (httpClient). Proxy lazy para mantener
 * `import api from './servicioApi'` y métodos sync-looking (.get/.post).
 */
const api = new Proxy(
  {},
  {
    get(_target, prop) {
      if (prop === 'then' || prop === 'catch' || prop === 'finally') {
        return undefined;
      }
      return async (...args) => {
        const client = await ensureApiClient();
        const value = client[prop];
        if (typeof value === 'function') {
          return value.apply(client, args);
        }
        return value;
      };
    },
  }
);

// Métodos específicos para móviles
export const mobileApi = {
  login: async (email, password) => {
    const client = await ensureApiClient();
    const response = await client.post('/auth/login', {
      email: String(email).trim().toLowerCase(),
      password,
    });
    const { token, refresh_token, usuario } = response.data;

    const { storageService } = await import('../services/storageService');
    await storageService.saveAuthToken(token);
    await storageService.saveRefreshToken(refresh_token);
    await storageService.saveUserData(usuario);

    return response.data;
  },

  registerDevice: async (deviceToken, deviceInfo) => {
    const client = await ensureApiClient();
    const response = await client.post('/mobile/device/register', {
      device_token: deviceToken,
      platform: Platform.OS,
      device_info: deviceInfo,
    });
    return response.data;
  },

  getConfig: async () => {
    const client = await ensureApiClient();
    const response = await client.get('/mobile/config');
    return response.data;
  },

  refreshToken: async () => {
    const { storageService } = await import('../services/storageService');
    const refreshToken = await storageService.getRefreshToken();
    const client = await ensureApiClient();
    const response = await client.post('/mobile/refresh-token', {
      refresh_token: refreshToken,
    });

    const { token, refresh_token } = response.data;
    await storageService.saveAuthToken(token);
    await storageService.saveRefreshToken(refresh_token);

    return response.data;
  },

  logout: async () => {
    const { storageService } = await import('../services/storageService');
    await storageService.clearAuthData();
  },
};

export const reinitializeApiConfig = async () => {
  Logger.info('servicioApi: reinicializando cliente HTTP compartido');
  return reinitHttpClient();
};

export { ensureApiClient };

export default api;
