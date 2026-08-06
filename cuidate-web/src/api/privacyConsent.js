import client from './client';
import { PRIVACY_NOTICE_VERSION } from '../content/avisoPrivacidad';
import { API_PATHS } from '../utils/constants';

/**
 * @returns {Promise<{ required: boolean, hasValidConsent: boolean, version: string, acceptedAt?: string }>}
 */
export async function fetchPrivacyConsentStatus(version = PRIVACY_NOTICE_VERSION) {
  const { data } = await client.get(API_PATHS.PRIVACY_CONSENT_STATUS, {
    params: { version },
  });
  return data;
}

/**
 * @param {{ privacyNotice: boolean, healthData: boolean, version?: string }} payload
 */
export async function postPrivacyConsent(payload) {
  const { data } = await client.post(API_PATHS.PRIVACY_CONSENT, {
    version: payload.version ?? PRIVACY_NOTICE_VERSION,
    privacyNotice: payload.privacyNotice,
    healthData: payload.healthData,
    canal: 'web',
  });
  return data;
}
