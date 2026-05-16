import client from './client';
import { PRIVACY_NOTICE_VERSION } from '../content/avisoPrivacidad';

/**
 * @returns {Promise<{ required: boolean, hasValidConsent: boolean, version: string, acceptedAt?: string }>}
 */
export async function fetchPrivacyConsentStatus(version = PRIVACY_NOTICE_VERSION) {
  const { data } = await client.get('/api/privacy-consent/status', {
    params: { version },
  });
  return data;
}

/**
 * @param {{ privacyNotice: boolean, healthData: boolean, version?: string }} payload
 */
export async function postPrivacyConsent(payload) {
  const { data } = await client.post('/api/privacy-consent', {
    version: payload.version ?? PRIVACY_NOTICE_VERSION,
    privacyNotice: payload.privacyNotice,
    healthData: payload.healthData,
    canal: 'web',
  });
  return data;
}
