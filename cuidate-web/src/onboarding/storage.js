const PREFIJO = 'cuidate_onboarding_';
const VERSION_ACTUAL = 'v2';
const VERSION_LEGACY = 'v1';

function claveShell(version = VERSION_ACTUAL) {
  return `${PREFIJO}shell_${version}`;
}

function existeClaveEnLocalStorage(clave) {
  try {
    return localStorage.getItem(clave) === '1';
  } catch {
    return null;
  }
}

export function isShellComplete() {
  const estadoActual = existeClaveEnLocalStorage(claveShell(VERSION_ACTUAL));
  const estadoLegacy = existeClaveEnLocalStorage(claveShell(VERSION_LEGACY));
  if (estadoActual == null || estadoLegacy == null) return true;
  return estadoActual || estadoLegacy;
}

export function markShellComplete() {
  try {
    localStorage.setItem(claveShell(VERSION_ACTUAL), '1');
  } catch {
    /* ignore */
  }
}

export function sectionStorageKey(sectionId) {
  return `${PREFIJO}section_${sectionId}_${VERSION_ACTUAL}`;
}

function sectionStorageKeyLegacy(sectionId) {
  return `${PREFIJO}section_${sectionId}_${VERSION_LEGACY}`;
}

export function isSectionComplete(sectionId) {
  const estadoActual = existeClaveEnLocalStorage(sectionStorageKey(sectionId));
  const estadoLegacy = existeClaveEnLocalStorage(sectionStorageKeyLegacy(sectionId));
  if (estadoActual == null || estadoLegacy == null) return true;
  return estadoActual || estadoLegacy;
}

export function markSectionComplete(sectionId) {
  try {
    localStorage.setItem(sectionStorageKey(sectionId), '1');
  } catch {
    /* ignore */
  }
}

/** Mini-tours al abrir cada modal de sección en ficha de paciente (p. ej. Signos vitales). */
export function patientModalSectionStorageKey(sectionId) {
  return `${PREFIJO}patient_modal_${sectionId}_${VERSION_ACTUAL}`;
}

function patientModalSectionStorageKeyLegacy(sectionId) {
  return `${PREFIJO}patient_modal_${sectionId}_${VERSION_LEGACY}`;
}

export function isPatientModalSectionComplete(sectionId) {
  if (!sectionId) return true;
  const estadoActual = existeClaveEnLocalStorage(patientModalSectionStorageKey(sectionId));
  const estadoLegacy = existeClaveEnLocalStorage(patientModalSectionStorageKeyLegacy(sectionId));
  if (estadoActual == null || estadoLegacy == null) return true;
  return estadoActual || estadoLegacy;
}

export function markPatientModalSectionComplete(sectionId) {
  if (!sectionId) return;
  try {
    localStorage.setItem(patientModalSectionStorageKey(sectionId), '1');
  } catch {
    /* ignore */
  }
}

/** Borra todo el progreso de guías (shell + secciones). */
export function resetAllOnboarding() {
  try {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIJO)) toRemove.push(k);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
