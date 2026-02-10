/**
 * Override de la URL de la API.
 *
 * TELÉFONO FÍSICO NO CONECTA:
 * 1. PC y teléfono en el mismo WiFi.
 * 2. En la PC ejecuta: ipconfig → anota "Dirección IPv4" (ej. 192.168.1.68).
 * 3. Pon aquí: 'http://TU_IP:3000' (ej. 'http://192.168.1.68:3000').
 * 4. Firewall Windows: permitir conexiones entrantes en el puerto 3000 (red privada).
 *
 * - Probar contra Railway desde dev:
 *   'https://cuidateappbackend-production.up.railway.app'
 *
 * - null = detección automática (usa localhost + adb reverse en dev,
 *   y la lógica de apiConfig para emulador / red local).
 */
// Dejamos null para usar localhost:3000 en desarrollo con adb reverse
// y evitar problemas de firewall / red WiFi entre PC y teléfono físico.
export const API_BASE_URL_OVERRIDE = null; // null = detección automática
