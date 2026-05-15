import { PRIVACY_NOTICE_VERSION } from '../content/avisoPrivacidad';

const STORAGE_KEY = 'cuidate_web_privacy_consent';

/**
 * @typedef {{ version: string, acceptedAt: string, privacyNotice: boolean, healthData: boolean, userId?: string }} PrivacyConsentRecord
 */

/**
 * @returns {PrivacyConsentRecord | null}
 */
export function getPrivacyConsent() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * @param {string} [userId]
 * @returns {boolean}
 */
export function hasValidPrivacyConsent(userId) {
  const record = getPrivacyConsent();
  if (!record) return false;
  if (record.version !== PRIVACY_NOTICE_VERSION) return false;
  if (!record.privacyNotice || !record.healthData) return false;
  if (userId && record.userId && String(record.userId) !== String(userId)) return false;
  return true;
}

/**
 * @param {{ privacyNotice: boolean, healthData: boolean, userId?: string }} payload
 */
export function savePrivacyConsent({ privacyNotice, healthData, userId }) {
  const record = {
    version: PRIVACY_NOTICE_VERSION,
    acceptedAt: new Date().toISOString(),
    privacyNotice: Boolean(privacyNotice),
    healthData: Boolean(healthData),
    ...(userId != null ? { userId: String(userId) } : {}),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  return record;
}

export function clearPrivacyConsent() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}
