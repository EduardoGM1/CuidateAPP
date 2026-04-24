/**
 * Citas: el selector usa hora local sin zona. Estas utilidades
 * serializan/deserializan de forma estable para evitar desfases.
 */

/**
 * Convierte un valor local (datetime-local o fecha) a ISO UTC para API.
 * @param {string|null|undefined} value
 * @returns {string}
 */
export function fechaCitaDatetimeLocalToApi(value) {
  if (value == null) return '';
  const s = String(value).trim();
  if (!s) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T12:00:00`);
    return Number.isNaN(d.getTime()) ? s.slice(0, 35) : d.toISOString().slice(0, 35);
  }

  const tIndex = s.indexOf('T');
  const timePart = tIndex >= 0 ? s.slice(tIndex) : '';
  if (/[zZ]$/.test(s) || /[+-]\d{2}:?\d{2}$/.test(timePart)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? s.slice(0, 35) : d.toISOString().slice(0, 35);
  }

  const withSec = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s) ? `${s}:00` : s;
  const d = new Date(withSec);
  if (Number.isNaN(d.getTime())) return s.slice(0, 35);
  return d.toISOString().slice(0, 35);
}

