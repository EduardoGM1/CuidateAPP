/**
 * URLs base de la API por entorno.
 * Única fuente de verdad: cambiar aquí al pasar a dominio/HTTPS.
 *
 * - Producción (release): API en VPS Hostinger.
 * - Desarrollo: ver apiConfig.js (localhost, IP local, emulador).
 */

// API en producción (VPS). Sin /api al final; el cliente lo añade.
// Cuando tengas dominio: 'https://api.tudominio.com' (sin /api).
export const PRODUCTION_API_BASE_URL = 'http://187.77.14.148';

// Para forzar siempre la API online en desarrollo, usar en apiUrlOverride.js:
// export const API_BASE_URL_OVERRIDE = PRODUCTION_API_BASE_URL;

