/**
 * Control centralizado del rate limit de autenticación.
 * AUTH_RATE_LIMIT_ENABLED=false desactiva límites de login (solo QA / mantenimiento breve).
 */
export function isAuthRateLimitEnabled() {
  const flag = (process.env.AUTH_RATE_LIMIT_ENABLED ?? 'true').toString().toLowerCase();
  return !['false', '0', 'no', 'off'].includes(flag);
}

export function shouldSkipAuthRateLimit(req) {
  if (!isAuthRateLimitEnabled()) return true;
  if (process.env.NODE_ENV === 'test') return true;
  if (process.env.NODE_ENV === 'development' && req?.get?.('X-Test-Mode') === 'true') return true;
  return false;
}
