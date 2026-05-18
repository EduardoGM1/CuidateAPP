/**
 * Política CSP única para la SPA (Vite dev/preview y Nginx en producción).
 * Mantener alineada con `deploy/nginx-security-headers.inc`.
 *
 * style-src (no solo style-src-elem): Ant Design 6 / @ant-design/cssinjs inyecta estilos
 * en runtime (<style> y CSSStyleSheet); sin 'unsafe-inline' en style-src la UI queda rota.
 */

const PERMISSIONS_POLICY =
  'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()';

const REFERRER_POLICY = 'strict-origin-when-cross-origin';

/**
 * @param {boolean} dev - true en `vite` dev server (HMR)
 * @param {{ upgradeInsecure?: boolean }} [opts]
 * @returns {string}
 */
export function buildSpaContentSecurityPolicy(dev, opts = {}) {
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

  if (opts.upgradeInsecure && !dev) {
    parts.push('upgrade-insecure-requests');
  }

  return parts.join('; ');
}

/** Cadena CSP producción (copiar a nginx-security-headers.inc si se cambia aquí). */
export const CSP_SPA_PRODUCTION = buildSpaContentSecurityPolicy(false);

export { PERMISSIONS_POLICY, REFERRER_POLICY };
