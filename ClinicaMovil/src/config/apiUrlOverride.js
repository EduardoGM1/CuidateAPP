/**
 * Override de la URL de la API (SOLO para desarrollo / pruebas).
 *
 * CASOS TÍPICOS:
 * - Teléfono físico no conecta a la PC:
 *   1. PC y teléfono en el mismo WiFi.
 *   2. En la PC ejecuta: ipconfig → anota "Dirección IPv4" (ej. 192.168.1.68).
 *   3. Pon aquí: 'http://TU_IP:3000' (ej. 'http://192.168.1.68:3000').
 *   4. Firewall Windows: permitir conexiones entrantes en el puerto 3000 (red privada).
 *
 * - Probar contra Railway desde dev (ya NO se usa en producción):
 *   'https://cuidateappbackend-production.up.railway.app'
 *
 * - null = detección automática:
 *   - En desarrollo: usa localhost + adb reverse, o IP local (apiConfig.js).
 *   - En release: usa PRODUCTION_API_BASE_URL (VPS / dominio) de apiEndpoints.js.
 *
 * IMPORTANTE:
 * - En compilaciones release de la app móvil, DEJA ESTO EN null para que
 *   se use la URL de producción configurada en apiEndpoints.js.
 */
// Desarrollo: null → detección automática (localhost / red local / VPS según apiConfig)
export const API_BASE_URL_OVERRIDE = null;
