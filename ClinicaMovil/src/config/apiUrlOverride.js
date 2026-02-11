/**
 * Override de la URL de la API.
 *
 * - null = detección automática:
 *   · Release: usa API en producción (VPS), ver apiEndpoints.js.
 *   · Dev: localhost + adb reverse, IP local o emulador.
 *
 * - Forzar siempre API online (incluso en dev):
 *   import { PRODUCTION_API_BASE_URL } from './apiEndpoints';
 *   export const API_BASE_URL_OVERRIDE = PRODUCTION_API_BASE_URL;
 *
 * - TELÉFONO FÍSICO contra PC local:
 *   Pon aquí la IP de tu PC: 'http://TU_IP:3000' (ipconfig → IPv4).
 *   Firewall: permitir puerto 3000 (red privada).
 */
export const API_BASE_URL_OVERRIDE = null; // null = automático (producción = VPS online)
