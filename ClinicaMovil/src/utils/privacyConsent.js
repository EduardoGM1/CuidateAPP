import AsyncStorage from '@react-native-async-storage/async-storage';
import Logger from '../services/logger';
import { PRIVACY_NOTICE_VERSION } from '../content/avisoPrivacidad';
import { saveUserConsent, CONSENT_TYPES } from './securityUtils';
import {
  fetchPrivacyConsentStatus,
  postPrivacyConsent as postPrivacyConsentApi,
  isPrivacyConsentNetworkError,
} from '../api/privacyConsentService';

const STORAGE_KEY = 'privacy_consent_record';

/**
 * @typedef {{ version: string, acceptedAt: string, privacyNotice: boolean, healthData: boolean, userId?: string, syncedFromServer?: boolean }} PrivacyConsentRecord
 */

/**
 * @returns {Promise<PrivacyConsentRecord | null>}
 */
export async function getPrivacyConsentLocal() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch (error) {
    Logger.error('Error leyendo consentimiento de privacidad (local)', error);
    return null;
  }
}

/** @deprecated Use getPrivacyConsentLocal */
export async function getPrivacyConsent() {
  return getPrivacyConsentLocal();
}

async function hasValidPrivacyConsentLocal(userId) {
  const record = await getPrivacyConsentLocal();
  if (!record) return false;
  if (record.version !== PRIVACY_NOTICE_VERSION) return false;
  if (!record.privacyNotice || !record.healthData) return false;
  if (userId != null && record.userId && String(record.userId) !== String(userId)) return false;
  return true;
}

async function savePrivacyConsentLocal({ privacyNotice, healthData, userId, acceptedAt }) {
  const record = {
    version: PRIVACY_NOTICE_VERSION,
    acceptedAt: acceptedAt || new Date().toISOString(),
    privacyNotice: Boolean(privacyNotice),
    healthData: Boolean(healthData),
    syncedFromServer: true,
    ...(userId != null ? { userId: String(userId) } : {}),
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  await saveUserConsent(CONSENT_TYPES.DATA_COLLECTION, privacyNotice);
  await saveUserConsent(CONSENT_TYPES.HEALTH_DATA, healthData);
  return record;
}

function syncLocalFromServer(serverStatus, userId) {
  if (!serverStatus?.hasValidConsent) return;
  return savePrivacyConsentLocal({
    privacyNotice: true,
    healthData: true,
    userId,
    acceptedAt: serverStatus.acceptedAt || new Date().toISOString(),
  });
}

/**
 * @param {string|number} [userId]
 * @returns {Promise<boolean>}
 */
export async function hasValidPrivacyConsent(userId) {
  try {
    const status = await fetchPrivacyConsentStatus();
    if (status.required === false) return true;
    if (status.hasValidConsent) {
      await syncLocalFromServer(status, userId);
      return true;
    }
    return false;
  } catch (error) {
    if (!isPrivacyConsentNetworkError(error)) {
      Logger.warn('Error consultando consentimiento en servidor, usando caché local', error);
    }
    return hasValidPrivacyConsentLocal(userId);
  }
}

/**
 * @param {{ privacyNotice: boolean, healthData: boolean, userId?: string|number }} payload
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
    if (isPrivacyConsentNetworkError(error)) {
      Logger.warn('Sin conexión: guardando consentimiento solo en dispositivo');
      return savePrivacyConsentLocal({ privacyNotice, healthData, userId });
    }
    throw error;
  }
}

export async function clearPrivacyConsent() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    Logger.error('Error limpiando consentimiento de privacidad', error);
  }
}
