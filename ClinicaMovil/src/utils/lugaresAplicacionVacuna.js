export const LUGAR_APLICACION_OTRO = '__otro__';

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

const LUGARES_APLICACION_PRESET = new Set(
  LUGARES_APLICACION_VACUNA_OPTIONS
    .filter((option) => option.value && option.value !== LUGAR_APLICACION_OTRO)
    .map((option) => option.value)
);

export function parseLugarAplicacionVacunaForm(guardado) {
  const value = String(guardado || '').trim();
  if (!value) return { select: '', otro: '' };
  if (LUGARES_APLICACION_PRESET.has(value)) return { select: value, otro: '' };
  return { select: LUGAR_APLICACION_OTRO, otro: value };
}

export function buildLugarAplicacionPayload(selectValue, otroText) {
  if (selectValue === LUGAR_APLICACION_OTRO) {
    return String(otroText || '').trim().slice(0, 150);
  }
  return String(selectValue || '').trim().slice(0, 150);
}

