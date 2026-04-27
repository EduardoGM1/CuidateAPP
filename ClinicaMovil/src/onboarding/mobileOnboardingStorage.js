import AsyncStorage from '@react-native-async-storage/async-storage';

/** Misma idea que `cuidate-onboarding-reset` en la web: reiniciar guías desde Perfil. */
export const MOBILE_ONBOARDING_RESET_EVENT = 'cuidate-mobile-onboarding-reset';

const PREFIX = 'cuidate_onboarding_mobile_';
const VERSION = 'v1';

function shellKey() {
  return `${PREFIX}shell_${VERSION}`;
}

function scopedShellKey(scope = {}) {
  const role = String(scope.role || '').trim().toLowerCase();
  const userId = String(scope.userId || '').trim();
  if (!role || !userId) return null;
  return `${PREFIX}shell_${role}_${userId}_${VERSION}`;
}

function patientShellKey() {
  return `${PREFIX}patient_shell_${VERSION}`;
}

export function stackTourKey(screenName) {
  return `${PREFIX}stack_${screenName}_${VERSION}`;
}

export function sectionStorageKey(sectionId) {
  return `${PREFIX}section_${sectionId}_${VERSION}`;
}

export async function isShellComplete(scope = null) {
  try {
    const scopedKey = scopedShellKey(scope || {});
    if (scopedKey) {
      const scopedValue = await AsyncStorage.getItem(scopedKey);
      if (scopedValue === '1') return true;
    }
    const v = await AsyncStorage.getItem(shellKey());
    return v === '1';
  } catch (e) {
    return false;
  }
}

export async function markShellComplete(scope = null) {
  try {
    const scopedKey = scopedShellKey(scope || {});
    if (scopedKey) {
      await AsyncStorage.setItem(scopedKey, '1');
    }
    // Mantener la llave legacy para compatibilidad y usuarios sin scope
    await AsyncStorage.setItem(shellKey(), '1');
  } catch (e) {
    /* ignore */
  }
}

export async function isSectionComplete(sectionId) {
  if (!sectionId) {
    return true;
  }
  try {
    const v = await AsyncStorage.getItem(sectionStorageKey(sectionId));
    return v === '1';
  } catch (e) {
    return false;
  }
}

export async function markSectionComplete(sectionId) {
  if (!sectionId) {
    return;
  }
  try {
    await AsyncStorage.setItem(sectionStorageKey(sectionId), '1');
  } catch (e) {
    /* ignore */
  }
}

export async function isPatientShellComplete() {
  try {
    const v = await AsyncStorage.getItem(patientShellKey());
    return v === '1';
  } catch (e) {
    return false;
  }
}

export async function markPatientShellComplete() {
  try {
    await AsyncStorage.setItem(patientShellKey(), '1');
  } catch (e) {
    /* ignore */
  }
}

export async function isStackTourComplete(screenName) {
  if (!screenName) return true;
  try {
    const v = await AsyncStorage.getItem(stackTourKey(screenName));
    return v === '1';
  } catch (e) {
    return false;
  }
}

export async function markStackTourComplete(screenName) {
  if (!screenName) return;
  try {
    await AsyncStorage.setItem(stackTourKey(screenName), '1');
  } catch (e) {
    /* ignore */
  }
}

export async function resetAllMobileOnboarding() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const toRemove = keys.filter((k) => k.startsWith(PREFIX));
    if (toRemove.length) {
      await AsyncStorage.multiRemove(toRemove);
    }
  } catch (e) {
    /* ignore */
  }
}

const PROFESSIONAL_SECTION_STORAGE_IDS = ['dashboard', 'pacientes', 'chat', 'perfil'];

export async function clearProfessionalShellStorage() {
  try {
    await AsyncStorage.removeItem(shellKey());
  } catch (e) {
    /* ignore */
  }
}

export async function clearPatientShellStorage() {
  try {
    await AsyncStorage.removeItem(patientShellKey());
  } catch (e) {
    /* ignore */
  }
}

export async function clearProfessionalSectionTipsStorage() {
  try {
    const keys = PROFESSIONAL_SECTION_STORAGE_IDS.map((id) => sectionStorageKey(id));
    await AsyncStorage.multiRemove(keys);
  } catch (e) {
    /* ignore */
  }
}

export async function clearStackTourKeysForScreens(screenNames) {
  const uniq = [...new Set((screenNames || []).filter(Boolean))];
  if (!uniq.length) return;
  try {
    await AsyncStorage.multiRemove(uniq.map((s) => stackTourKey(s)));
  } catch (e) {
    /* ignore */
  }
}
