import { PRIVACY_NOTICE_VERSION } from '../content/avisoPrivacidad';
import {
  fetchPrivacyConsentStatus,
  postPrivacyConsent as postPrivacyConsentApi,
} from '../api/privacyConsent';

const STORAGE_KEY = 'cuidate_web_privacy_consent';

/**
 * @typedef {{ version: string, acceptedAt: string, privacyNotice: boolean, healthData: boolean, userId?: string, syncedFromServer?: boolean }} PrivacyConsentRecord
 */

/**
 * @returns {PrivacyConsentRecord | null}
 */
export function getPrivacyConsentLocal() {
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

/** @deprecated Use getPrivacyConsentLocal */
export function getPrivacyConsent() {
  return getPrivacyConsentLocal();
}

function hasValidPrivacyConsentLocal(userId) {
  const record = getPrivacyConsentLocal();
  if (!record) return false;
  if (record.version !== PRIVACY_NOTICE_VERSION) return false;
  if (!record.privacyNotice || !record.healthData) return false;
  if (userId && record.userId && String(record.userId) !== String(userId)) return false;
  return true;
}

function savePrivacyConsentLocal({ privacyNotice, healthData, userId, acceptedAt }) {
  const record = {
    version: PRIVACY_NOTICE_VERSION,
    acceptedAt: acceptedAt || new Date().toISOString(),
    privacyNotice: Boolean(privacyNotice),
    healthData: Boolean(healthData),
    syncedFromServer: true,
    ...(userId != null ? { userId: String(userId) } : {}),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  return record;
}

/**
 * @param {{ hasValidConsent: boolean, acceptedAt?: string, version?: string }} serverStatus
 * @param {string} [userId]
 */
function syncLocalFromServer(serverStatus, userId) {
  if (!serverStatus?.hasValidConsent) return;
  savePrivacyConsentLocal({
    privacyNotice: true,
    healthData: true,
    userId,
    acceptedAt: serverStatus.acceptedAt || new Date().toISOString(),
  });
}

/**
 * @param {string} [userId]
 * @returns {Promise<boolean>}
 */
export async function hasValidPrivacyConsent(userId) {
  try {
    const status = await fetchPrivacyConsentStatus();
    if (status.required === false) return true;
    if (status.hasValidConsent) {
      syncLocalFromServer(status, userId);
      return true;
    }
    return false;
  } catch {
    return hasValidPrivacyConsentLocal(userId);
  }
}

/**
 * @param {{ privacyNotice: boolean, healthData: boolean, userId?: string }} payload
 * @returns {Promise<PrivacyConsentRecord>}
 */
export async function savePrivacyConsent({ privacyNotice, healthData, userId }) {
  if (!privacyNotice || !healthData) {
    throw new Error('Debes aceptar ambas declaraciones');
  }

  try {
    const serverResult = await postPrivacyConsentApi({ privacyNotice, healthData });
    return savePrivacyConsentLocal({
      privacyNotice,
      healthData,
      userId,
      acceptedAt: serverResult.acceptedAt,
    });
  } catch (error) {
    if (!error?.response) {
      return savePrivacyConsentLocal({ privacyNotice, healthData, userId });
    }
    throw error;
  }
}

export function clearPrivacyConsent() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}
