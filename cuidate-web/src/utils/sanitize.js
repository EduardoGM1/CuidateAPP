/**
 * Utilidades de sanitización para inputs (XSS y longitud)
 * Usar en formularios antes de enviar o mostrar.
 */

const ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Escapa HTML para evitar XSS. Usar en cualquier string que venga del usuario.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str == null || typeof str !== 'string') return '';
  return String(str).replace(/[&<>"'`=/]/g, (c) => ENTITIES[c] || c);
}

/**
 * Normaliza string: trim, elimina caracteres de control, límite de longitud.
 * @param {string} str
 * @param {{ maxLength?: number }} options
 * @returns {string}
 */
export function normalizeString(str, { maxLength = 500 } = {}) {
  if (str == null) return '';
  let s = String(str)
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '');
  if (maxLength > 0 && s.length > maxLength) {
    s = s.slice(0, maxLength);
  }
  return s;
}

/**
 * Sanitiza valor para campo email: solo caracteres válidos, longitud razonable.
 * @param {string} str
 * @returns {string}
 */
export function sanitizeEmail(str) {
  if (str == null || typeof str !== 'string') return '';
  return normalizeString(str, { maxLength: 254 }).toLowerCase();
}

/**
 * Para campos de texto libre que se mostrarán en UI (escapar HTML).
 * @param {string} str
 * @param {{ maxLength?: number }} options
 * @returns {string}
 */
export function sanitizeForDisplay(str, { maxLength = 2000 } = {}) {
  const normalized = normalizeString(str, { maxLength });
  return escapeHtml(normalized);
}

/**
 * Decodifica entidades HTML frecuentes para mostrar texto correctamente.
 * Útil cuando el backend o alguna capa envía ya codificado (ej. &#39; en lugar de ').
 * @param {string} str
 * @returns {string}
 */
export function decodeHtmlEntities(str) {
  if (str == null || typeof str !== 'string') return '';
  return String(str)
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x2F;/g, '/')
    .replace(/&#x60;/g, '`')
    .replace(/&#x3D;/g, '=');
}

/**
 * Normaliza y decodifica texto para mostrar en UI (sin escapar; React ya escapa).
 * Corrige entidades HTML que lleguen del API (ej. &#39; -> ').
 */
export function displayText(str, { maxLength = 2000 } = {}) {
  const normalized = normalizeString(str, { maxLength });
  return decodeHtmlEntities(normalized);
}
