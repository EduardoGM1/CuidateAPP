/**
 * Normaliza talla en formulario: si el usuario ingresa cm (ej. 155), convertir a metros (1.55).
 * @param {string|number} raw
 * @returns {{ value: string, convertedFromCm: boolean }}
 */
export function normalizeTallaInput(raw) {
  const s = String(raw ?? '').trim().replace(',', '.');
  if (s === '') return { value: '', convertedFromCm: false };
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return { value: s, convertedFromCm: false };
  if (n > 3 && n <= 250) {
    const m = (n / 100).toFixed(2);
    return { value: m, convertedFromCm: true };
  }
  return { value: s, convertedFromCm: false };
}
