import api from './servicioApi';
import { PRIVACY_NOTICE_VERSION } from '../content/avisoPrivacidad';
import Logger from '../services/logger';

/**
 * @returns {Promise<{ required: boolean, hasValidConsent: boolean, version: string, acceptedAt?: string }>}
 */
export async function fetchPrivacyConsentStatus(version = PRIVACY_NOTICE_VERSION) {
  const response = await api.get('/privacy-consent/status', {
    params: { version },
  });
  return response.data;
}

/**
 * @param {{ privacyNotice: boolean, healthData: boolean, version?: string }} payload
 */
export async function postPrivacyConsent(payload) {
  const response = await api.post('/privacy-consent', {
    version: payload.version ?? PRIVACY_NOTICE_VERSION,
    privacyNotice: payload.privacyNotice,
    healthData: payload.healthData,
    canal: 'mobile',
  });
  return response.data;
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
export function isPrivacyConsentNetworkError(error) {
  return !error?.response;
}
