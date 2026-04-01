/**
 * URLs base de la API por entorno.
 * Única fuente de verdad: cambiar aquí al pasar a dominio/HTTPS.
 *
 * - Producción (release): API en VPS Hostinger.
 * - Desarrollo: ver apiConfig.js (localhost, IP local, emulador).
 */

// API en producción. Sin /api al final; servicioApi añade /api.
// Usar HTTPS + dominio: evita 301 en POST (login) y coincide con certificado/Nginx.
export const PRODUCTION_API_BASE_URL = 'https://cuidateapp.com.mx';

// Para forzar siempre la API online en desarrollo, usar en apiUrlOverride.js:
// export const API_BASE_URL_OVERRIDE = PRODUCTION_API_BASE_URL;

