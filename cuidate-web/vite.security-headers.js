/**
 * Cabeceras HTTP de seguridad para el dev server y `vite preview`.
 * CSP centralizada en `security/csp-spa-policy.js` — mantener alineada con
 * `deploy/nginx-security-headers.inc`.
 */

import {
  buildSpaContentSecurityPolicy,
  PERMISSIONS_POLICY,
  REFERRER_POLICY,
} from './security/csp-spa-policy.js';

function baseHeaders(csp) {
  return {
    'X-Frame-Options': 'SAMEORIGIN',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': REFERRER_POLICY,
    'Permissions-Policy': PERMISSIONS_POLICY,
    'Content-Security-Policy': csp,
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-site',
  };
}

/** Dev server (Vite HMR requiere unsafe-inline / eval en scripts). */
export const securityHeadersDev = baseHeaders(buildSpaContentSecurityPolicy(true));

/** `vite preview` — mismo enfoque que build servido por Nginx (sin eval). */
export const securityHeadersProd = baseHeaders(buildSpaContentSecurityPolicy(false));
