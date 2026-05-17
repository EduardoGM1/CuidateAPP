const DRAFT_PREFIX = 'paciente:';

export function patientDraftKey(pacienteId, suffix) {
  return `${DRAFT_PREFIX}${pacienteId}:${suffix}`;
}

export function savePatientDraft(pacienteId, suffix, value) {
  if (typeof window === 'undefined' || pacienteId == null) return;
  try {
    localStorage.setItem(patientDraftKey(pacienteId, suffix), value);
  } catch {
    // quota o modo privado
  }
}

export function loadPatientDraft(pacienteId, suffix) {
  if (typeof window === 'undefined' || pacienteId == null) return null;
  return localStorage.getItem(patientDraftKey(pacienteId, suffix));
}

export function clearPatientDrafts(pacienteId) {
  if (typeof window === 'undefined' || pacienteId == null) return;
  const prefix = `${DRAFT_PREFIX}${pacienteId}:`;
  const keys = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) keys.push(key);
  }
  keys.forEach((key) => localStorage.removeItem(key));
}

export function clearAllPatientDrafts() {
  if (typeof window === 'undefined') return;
  const keys = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key?.startsWith(DRAFT_PREFIX)) keys.push(key);
  }
  keys.forEach((key) => localStorage.removeItem(key));
}
