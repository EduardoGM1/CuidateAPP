const PREFIX = 'cuidate_onboarding_';

const STORAGE_SHELL_KEY = `${PREFIX}shell_v1`;

export function isShellComplete() {
  try {
    return localStorage.getItem(STORAGE_SHELL_KEY) === '1';
  } catch {
    return true;
  }
}

export function markShellComplete() {
  try {
    localStorage.setItem(STORAGE_SHELL_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function sectionStorageKey(sectionId) {
  return `${PREFIX}section_${sectionId}_v1`;
}

export function isSectionComplete(sectionId) {
  try {
    return localStorage.getItem(sectionStorageKey(sectionId)) === '1';
  } catch {
    return true;
  }
}

export function markSectionComplete(sectionId) {
  try {
    localStorage.setItem(sectionStorageKey(sectionId), '1');
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
      if (k && k.startsWith(PREFIX)) toRemove.push(k);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
