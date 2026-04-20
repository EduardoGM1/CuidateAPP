/**
 * Cabeceras HTTP de seguridad para el dev server y `vite preview`.
 * En producción detrás de Nginx, las mismas políticas aplican vía
 * `deploy/nginx-security-headers.inc` (mantener alineadas al cambiar CSP).
 */

const PERMISSIONS_POLICY =
  'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()';

const REFERRER_POLICY = 'strict-origin-when-cross-origin';

/** CSP para la SPA: Google Fonts (index.html), Ant Design / estilos inline, API y HMR en dev. */
function buildContentSecurityPolicy(dev) {
  const parts = [
    "default-src 'self'",
    dev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
  ];
  if (dev) {
    parts.push(
      "connect-src 'self' https: wss: ws: http://127.0.0.1:3000 http://localhost:3000 http://127.0.0.1:5174 http://localhost:5174 ws://127.0.0.1:5174 ws://localhost:5174",
    );
  } else {
    parts.push("connect-src 'self' https: wss:");
  }
  return parts.join('; ');
}

function baseHeaders(csp) {
  return {
    'X-Frame-Options': 'SAMEORIGIN',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': REFERRER_POLICY,
    'Permissions-Policy': PERMISSIONS_POLICY,
    'Content-Security-Policy': csp,
  };
}

/** Dev server (Vite HMR requiere unsafe-inline / eval en scripts y WebSocket al propio puerto). */
export const securityHeadersDev = baseHeaders(buildContentSecurityPolicy(true));

/** `vite preview` — mismo enfoque que build servido por Nginx (sin eval). */
export const securityHeadersProd = baseHeaders(buildContentSecurityPolicy(false));
