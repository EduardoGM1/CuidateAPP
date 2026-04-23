/**
 * Citas: el input datetime-local usa hora local sin zona. Si se envía tal cual a un
 * servidor en UTC, la hora "cambia". Estas funciones serializan/deserializan de forma estable.
 */

/**
 * Convierte valor de input datetime-local (o solo fecha YYYY-MM-DD) a ISO UTC para la API.
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
  if (/[zZ]$/.test(s) || /[+\-]\d{2}:?\d{2}$/.test(timePart)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? s.slice(0, 35) : d.toISOString().slice(0, 35);
  }
  const withSec = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s) ? `${s}:00` : s;
  const d = new Date(withSec);
  if (Number.isNaN(d.getTime())) return s.slice(0, 35);
  return d.toISOString().slice(0, 35);
}

/**
 * Valor para atributo value de datetime-local a partir de lo que devuelve la API (ISO o Date).
 * @param {string|Date|null|undefined} value
 * @returns {string}
 */
export function fechaCitaApiToDatetimeLocalInput(value) {
  if (value == null) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}
