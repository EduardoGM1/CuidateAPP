import axios from 'axios';

const WEB_HEADERS = {
  'Content-Type': 'application/json',
  'X-Client-Type': 'web',
  Accept: 'application/json',
};

const MOBILE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Client-Type': 'app',
  'X-Platform': 'android',
  'X-Device-ID': 'contract-test-device',
  'X-App-Version': '1.0.0',
  Accept: 'application/json',
};

/**
 * @param {string} baseUrl - sin barra final, sin /api
 * @param {'web'|'mobile'} variant
 * @param {string} [token]
 */
export function createApiClient(baseUrl, variant, token) {
  const headers = { ...(variant === 'mobile' ? MOBILE_HEADERS : WEB_HEADERS) };
  if (token) headers.Authorization = `Bearer ${token}`;

  return axios.create({
    baseURL: `${baseUrl.replace(/\/$/, '')}/api`,
    timeout: 60000,
    validateStatus: () => true,
    headers,
  });
}

export function getBaseUrl() {
  const u = process.env.API_BASE_URL || process.env.API_URL || 'http://127.0.0.1:3000';
  return u.replace(/\/$/, '');
}
