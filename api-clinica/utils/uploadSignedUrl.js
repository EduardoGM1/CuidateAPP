import crypto from 'crypto';

const DEFAULT_TTL_SEC = 3600;

/** Decodifica entidades HTML en URLs (p. ej. tras sanitizeStrings en rutas antiguas). */
export function decodeHtmlEntitiesInUrl(url) {
  if (!url || typeof url !== 'string') return url;
  let s = url;
  let prev;
  do {
    prev = s;
    s = s.replace(/&amp;/g, '&');
    s = s.replace(/&#x2F;/gi, '/').replace(/&#x2F/gi, '/');
    s = s.replace(/&#x3A;/gi, ':').replace(/&#x3A/gi, ':');
    s = s.replace(/&#x3D;/gi, '=').replace(/&#x3D/gi, '=');
    s = s.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  } while (s !== prev);
  return s;
}

/**
 * Ruta persistente en BD: solo /uploads/... sin query ni dominio.
 * Recupera URLs corruptas con entidades HTML.
 */
export function persistUploadPath(urlOrPath) {
  if (!urlOrPath || typeof urlOrPath !== 'string') return null;
  const decoded = decodeHtmlEntitiesInUrl(urlOrPath.trim());
  return normalizeUploadPath(decoded);
}

function signingSecret() {
  const secret = process.env.UPLOAD_SIGN_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('UPLOAD_SIGN_SECRET o JWT_SECRET requerido para URLs de uploads');
  return secret;
}

/**
 * Ruta relativa normalizada bajo /uploads/ (sin query).
 */
export function normalizeUploadPath(urlOrPath) {
  if (!urlOrPath || typeof urlOrPath !== 'string') return null;
  let p = urlOrPath.trim();
  try {
    if (p.startsWith('http://') || p.startsWith('https://')) {
      p = new URL(p).pathname;
    }
  } catch {
    return null;
  }
  if (!p.startsWith('/uploads/')) return null;
  if (p.includes('..')) return null;
  return p.split('?')[0];
}

/**
 * Firma una ruta /uploads/... para acceso temporal sin cabecera Authorization (p. ej. <audio src>).
 */
export function signUploadPublicUrl(urlOrPath, ttlSec = Number(process.env.UPLOAD_SIGN_TTL_SEC || DEFAULT_TTL_SEC)) {
  const pathOnly = normalizeUploadPath(urlOrPath);
  if (!pathOnly) return urlOrPath;

  const exp = Math.floor(Date.now() / 1000) + Math.max(60, ttlSec);
  const payload = `${pathOnly}|${exp}`;
  const sig = crypto.createHmac('sha256', signingSecret()).update(payload).digest('hex');
  return `${pathOnly}?exp=${exp}&sig=${sig}`;
}

export function verifyUploadSignature(urlOrPath, exp, sig) {
  const pathOnly = normalizeUploadPath(urlOrPath);
  if (!pathOnly || !exp || !sig) return false;

  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || expNum < Math.floor(Date.now() / 1000)) return false;

  const payload = `${pathOnly}|${expNum}`;
  const expected = crypto.createHmac('sha256', signingSecret()).update(payload).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(String(sig), 'hex'));
  } catch {
    return false;
  }
}

const SIGNED_UPLOAD_KEYS = new Set(['mensaje_audio_url', 'url', 'audioUrl']);

/**
 * Firma campos de URL de uploads en respuestas API (mensajes de chat, upload-audio).
 */
export function signUploadFieldsInPayload(data) {
  if (data == null) return data;

  if (data instanceof Date) {
    return data.toISOString();
  }

  if (Array.isArray(data)) {
    return data.map((item) => signUploadFieldsInPayload(item));
  }

  if (typeof data !== 'object') return data;

  const out = {};
  for (const [key, value] of Object.entries(data)) {
    if (SIGNED_UPLOAD_KEYS.has(key) && typeof value === 'string') {
      const pathOnly = persistUploadPath(value);
      out[key] = pathOnly ? signUploadPublicUrl(pathOnly) : value;
    } else if (value && typeof value === 'object') {
      out[key] = signUploadFieldsInPayload(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** Convierte modelos Sequelize y firma URLs de uploads en la respuesta. */
export function serializeWithSignedUploads(data) {
  if (data == null) return data;
  if (Array.isArray(data)) {
    return signUploadFieldsInPayload(data.map((item) => (item?.toJSON ? item.toJSON() : item)));
  }
  if (typeof data?.toJSON === 'function') {
    return signUploadFieldsInPayload(data.toJSON());
  }
  return signUploadFieldsInPayload(data);
}
