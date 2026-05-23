/**
 * Orígenes permitidos para Socket.IO (alineado con CORS HTTP en index.js).
 */
const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:8081',
  'http://10.0.2.2:3000',
  'http://localhost:19006',
];

export function getSocketAllowedOrigins() {
  const fromEnv = process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) ?? [];
  const web = process.env.WEB_APP_ORIGIN?.trim();
  const extra = web ? [web] : [];
  return [...new Set([...DEV_ORIGINS, ...fromEnv, ...extra])];
}

export function isSocketOriginAllowed(origin) {
  if (!origin) return true;
  return getSocketAllowedOrigins().includes(origin);
}
