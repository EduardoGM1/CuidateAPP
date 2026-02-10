/**
 * Utilidades para construcción de query strings y validación de parámetros.
 */

/**
 * Convierte objeto a query string con valores escapados.
 * @param {Record<string, string|number|boolean|undefined|null>} obj
 * @returns {string}
 */
export function buildQueryString(obj) {
  if (!obj || typeof obj !== 'object') return '';
  const pairs = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null || value === '') continue;
    const encoded = encodeURIComponent(String(value).trim());
    if (encoded !== '') pairs.push(`${encodeURIComponent(key)}=${encoded}`);
  }
  return pairs.length ? `?${pairs.join('&')}` : '';
}

/**
 * Parsea entero positivo para page, limit, id. Evita NaN y negativos.
 * @param {unknown} value
 * @param {number} defaultVal
 * @returns {number}
 */
export function parsePositiveInt(value, defaultVal = 0) {
  if (value == null) return defaultVal;
  const n = parseInt(String(value), 10);
  if (Number.isNaN(n) || n < 0) return defaultVal;
  return n;
}
