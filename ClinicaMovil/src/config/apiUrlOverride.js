/**
 * Override de la URL de la API.
 *
 * - Con VPS forzado (actual): toda la app (login, datos, diagnóstico) usa la API en la VPS.
 *
 * - Para volver a detección automática (localhost en dev, VPS en release):
 *   export const API_BASE_URL_OVERRIDE = null;
 *
 * - TELÉFONO FÍSICO contra PC local:
 *   export const API_BASE_URL_OVERRIDE = 'http://TU_IP:3000';
 */
import { PRODUCTION_API_BASE_URL } from './apiEndpoints';
export const API_BASE_URL_OVERRIDE = PRODUCTION_API_BASE_URL; // Todo apunta a VPS (login, API, diagnóstico)
