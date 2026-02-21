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

/**
 * Resuelve la URL completa del audio para reproducción en la web.
 * La API puede devolver rutas relativas (ej: /uploads/audio/xxx.m4a) o URLs con entidades HTML.
 */
export function getAudioFullUrl(audioUrl) {
  if (!audioUrl || typeof audioUrl !== 'string') return '';
  const decoded = decodeHtmlEntitiesInUrl(audioUrl.trim());
  if (/^https?:\/\//i.test(decoded)) return decoded;
  const base = import.meta.env.VITE_API_BASE_URL
    ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')}`
    : (typeof window !== 'undefined' ? `${window.location.origin}` : '');
  const path = decoded.startsWith('/') ? decoded : `/${decoded}`;
  return base ? `${base}${path}` : path;
}
