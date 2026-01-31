/**
 * Override de la URL de la API para desarrollo.
 * Si la app no conecta con la API, pon aquí la URL de tu PC en la red local.
 *
 * Cómo saber la IP de tu PC:
 * - Windows: abre CMD y ejecuta "ipconfig", busca "Dirección IPv4" en tu adaptador WiFi/Ethernet.
 * - Ejemplo: si tu IP es 192.168.1.100, pon: 'http://192.168.1.100:3000'
 *
 * Deja null para usar la detección automática (localhost, 10.0.2.2, o IPs por defecto).
 */
export const API_BASE_URL_OVERRIDE = null; // Ej: 'http://192.168.1.100:3000'
