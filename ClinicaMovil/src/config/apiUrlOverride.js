/**
 * Override de la URL de la API para desarrollo.
 * Si la app no conecta con la API, pon aquí la URL de tu PC en la red local.
 *
 * Cómo saber la IP de tu PC:
 * - Windows: abre CMD y ejecuta "ipconfig", busca "Dirección IPv4" en tu adaptador WiFi/Ethernet.
 * - Ejemplo: si tu IP es 192.168.1.68, pon: 'http://192.168.1.68:3000'
 *
 * Deja null para usar la detección automática (getLocalIP en apiConfig.js).
 */
export const API_BASE_URL_OVERRIDE = 'http://192.168.1.68:3000'; // IP actual (ipconfig 2026-01-28). Pon null para auto.
