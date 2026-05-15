import AsyncStorage from '@react-native-async-storage/async-storage';
import Logger from '../services/logger';
import { PRIVACY_NOTICE_VERSION } from '../content/avisoPrivacidad';
import { saveUserConsent, CONSENT_TYPES } from './securityUtils';

const STORAGE_KEY = 'privacy_consent_record';

/**
 * @typedef {{ version: string, acceptedAt: string, privacyNotice: boolean, healthData: boolean, userId?: string }} PrivacyConsentRecord
 */

/**
 * @returns {Promise<PrivacyConsentRecord | null>}
 */
export async function getPrivacyConsent() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch (error) {
    Logger.error('Error leyendo consentimiento de privacidad', error);
    return null;
  }
}

/**
 * @param {string|number} [userId]
 * @returns {Promise<boolean>}
 */
export async function hasValidPrivacyConsent(userId) {
  const record = await getPrivacyConsent();
  if (!record) return false;
  if (record.version !== PRIVACY_NOTICE_VERSION) return false;
  if (!record.privacyNotice || !record.healthData) return false;
  if (userId != null && record.userId && String(record.userId) !== String(userId)) return false;
  return true;
}

/**
 * @param {{ privacyNotice: boolean, healthData: boolean, userId?: string|number }} payload
 * @returns {Promise<PrivacyConsentRecord>}
 */
export async function savePrivacyConsent({ privacyNotice, healthData, userId }) {
  const record = {
    version: PRIVACY_NOTICE_VERSION,
    acceptedAt: new Date().toISOString(),
    privacyNotice: Boolean(privacyNotice),
    healthData: Boolean(healthData),
    ...(userId != null ? { userId: String(userId) } : {}),
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  await saveUserConsent(CONSENT_TYPES.DATA_COLLECTION, privacyNotice);
  await saveUserConsent(CONSENT_TYPES.HEALTH_DATA, healthData);
  return record;
}

export async function clearPrivacyConsent() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    Logger.error('Error limpiando consentimiento de privacidad', error);
  }
}
