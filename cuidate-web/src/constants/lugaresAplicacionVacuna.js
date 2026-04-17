/** Valor interno del desplegable para texto libre */
export const LUGAR_APLICACION_OTRO = '__otro__';

/**
 * Instituciones / lugares habituales donde se aplica una vacuna (México).
 * El valor guardado en API es el `value` (string).
 */
export const LUGARES_APLICACION_VACUNA_OPTIONS = [
  { value: '', label: '— No indicar —' },
  { value: 'IMSS-Bienestar', label: 'IMSS-Bienestar' },
  { value: 'IMSS', label: 'IMSS' },
  { value: 'ISSSTE', label: 'ISSSTE' },
  { value: 'ISSET', label: 'ISSET' },
  { value: 'SEDENA', label: 'SEDENA' },
  { value: 'Secretaría de Salud', label: 'Secretaría de Salud' },
  { value: LUGAR_APLICACION_OTRO, label: 'Otro (especificar)' },
];

const PRESET_VALUES = new Set(
  LUGARES_APLICACION_VACUNA_OPTIONS.filter((o) => o.value && o.value !== LUGAR_APLICACION_OTRO).map((o) => o.value)
);

/**
 * @param {string} [guardado] - Valor en BD
 * @returns {{ select: string, otro: string }}
 */
export function parseLugarAplicacionVacunaForm(guardado) {
  const s = (guardado != null ? String(guardado) : '').trim();
  if (!s) return { select: '', otro: '' };
  if (PRESET_VALUES.has(s)) return { select: s, otro: '' };
  return { select: LUGAR_APLICACION_OTRO, otro: s };
}

/**
 * @param {string} selectValue
 * @param {string} otroText
 * @returns {string}
 */
export function buildLugarAplicacionPayload(selectValue, otroText) {
  if (selectValue === LUGAR_APLICACION_OTRO) {
    return (otroText || '').trim().slice(0, 150);
  }
  return (selectValue || '').trim().slice(0, 150);
}
