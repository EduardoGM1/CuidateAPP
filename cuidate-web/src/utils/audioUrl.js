/**
 * Decodifica entidades HTML en la URL (ej: &#x2F; -> /, &amp;#x2F; doble codificado).
 */
function decodeHtmlEntitiesInUrl(url) {
  if (!url || typeof url !== 'string') return url;
  let s = url;
  let prev;
  do {
    prev = s;
    s = s.replace(/&amp;/g, '&');
    s = s.replace(/&#x2F;/gi, '/').replace(/&#x2F/gi, '/');
    s = s.replace(/&#x3A;/gi, ':').replace(/&#x3A/gi, ':');
  } while (s !== prev);
  return s;
}

/** Indica si el host de la URL es una IP (el certificado SSL suele ser del dominio, no de la IP). */
function isIpHost(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const u = new URL(url.startsWith('http') ? url : `http://${url}`);
    const host = u.hostname || '';
    return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) || host.startsWith('[');
  } catch {
    return false;
  }
}

/**
 * En HTTPS, si la URL apunta a una IP, el certificado no coincide (ERR_CERT_COMMON_NAME_INVALID).
 * Se reescribe la URL al origen actual (dominio con cert válido); el proxy debe servir /uploads/ desde la API.
 */
function avoidHttpsToIp(url) {
  if (!url || typeof url !== 'string') return url;
  if (typeof window === 'undefined' || window.location?.protocol !== 'https:') return url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return url;
  if (!isIpHost(url)) return url.startsWith('http://') ? url.replace(/^http:\/\//i, 'https://') : url;
  const origin = window.location.origin;
  try {
    const u = new URL(url);
    return `${origin}${u.pathname}${u.search}${u.hash}`;
  } catch {
    return url;
  }
}

/**
 * Resuelve la URL completa del audio para reproducción en la web.
 * La API puede devolver rutas relativas (ej: /uploads/audio/xxx.m4a) o URLs con entidades HTML.
 * - En HTTPS: si la base es una IP, se usa el origen de la página (dominio) para evitar ERR_CERT_COMMON_NAME_INVALID.
 * - En HTTPS: si la base es dominio, se fuerza https para evitar mixed content.
 */
export function getAudioFullUrl(audioUrl) {
  if (!audioUrl || typeof audioUrl !== 'string') return '';
  const decoded = decodeHtmlEntitiesInUrl(audioUrl.trim());
  if (/^https?:\/\//i.test(decoded)) return avoidHttpsToIp(decoded);
  const envBase = import.meta.env.VITE_API_BASE_URL
    ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')}`
    : '';
  const pageOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const isHttps = typeof window !== 'undefined' && window.location?.protocol === 'https:';
  let base = envBase || pageOrigin;
  if (isHttps && base && isIpHost(base)) base = pageOrigin;
  const path = decoded.startsWith('/') ? decoded : `/${decoded}`;
  const fullUrl = base ? `${base}${path}` : path;
  if (isHttps && fullUrl.startsWith('http://')) return fullUrl.replace(/^http:\/\//i, 'https://');
  return fullUrl;
}
