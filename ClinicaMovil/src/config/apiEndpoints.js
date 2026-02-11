/**
 * Puntos de entrada de la API para la app móvil.
 *
 * ÚNICA fuente de verdad para la URL de producción de la API.
 * Actualmente apunta a la VPS (Hostinger) por IP.
 *
 * Cuando tengas dominio + HTTPS, cambia SOLO esta constante:
 *   export const PRODUCTION_API_BASE_URL = 'https://api.tudominio.com';
 */

// API de producción actual (VPS Hostinger)
export const PRODUCTION_API_BASE_URL = 'http://187.77.14.148';

// Endpoints comunes usados en la app (útil para reutilizar)
export const API_ENDPOINTS = {
  BASE_URL: PRODUCTION_API_BASE_URL,
  AUTH_LOGIN: `${PRODUCTION_API_BASE_URL}/api/auth/login`,
  AUTH_UNIFIED_LOGIN_DOCTOR_ADMIN: `${PRODUCTION_API_BASE_URL}/api/auth-unified/login-doctor-admin`,
  AUTH_UNIFIED_LOGIN_PACIENTE: `${PRODUCTION_API_BASE_URL}/api/auth-unified/login-paciente`,
  PACIENTES: `${PRODUCTION_API_BASE_URL}/api/pacientes`,
  DOCTORES: `${PRODUCTION_API_BASE_URL}/api/doctores`,
  DASHBOARD: `${PRODUCTION_API_BASE_URL}/api/dashboard`,
};

