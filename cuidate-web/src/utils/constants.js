/** Constantes de la aplicación web */

export const ROLES = {
  ADMIN: 'Admin',
  ADMIN_ALT: 'admin',
  DOCTOR: 'Doctor',
  DOCTOR_ALT: 'doctor',
};

export const STORAGE_KEYS = {
  TOKEN: 'cuidate_web_token',
  USER: 'cuidate_web_user',
};

/** Clave de persistencia del store de auth (Zustand). Limpiar junto con TOKEN/USER al cerrar sesión por token inválido. */
export const AUTH_PERSIST_KEY = 'cuidate-web-auth';

/** Query param para indicar en /login que la sesión caducó (redirección desde interceptor 401/403). */
export const LOGIN_REASON_SESSION_EXPIRED = 'session_expired';

export const API_PATHS = {
  LOGIN: '/api/auth/login',
  DASHBOARD: '/api/dashboard',
  PACIENTES: '/api/pacientes',
  CITAS: '/api/citas',
  DOCTORES: '/api/doctores',
  AUTH_USUARIOS: '/api/auth/usuarios',
  ADMIN_AUDITORIA: '/api/admin/auditoria',
  ADMIN_OPERATIONS: '/api/admin/operations',
  /** Soporte doctor→admin (prefijo bajo /api/doctores para mismo proxy que el resto de rutas de doctor) */
  TICKETS: '/api/doctores/soporte',
  MODULOS: '/api/modulos',
  INSTITUCIONES_SALUD: '/api/instituciones-salud',
  REPORTES: '/api/reportes',
  REPORTES_ESTADISTICAS_HTML: '/api/reportes/estadisticas/html',
  REPORTES_FORMA: (id) => `/api/reportes/forma/${id}`,
  REPORTES_FORMA_MESES_DISPONIBLES: (id) => `/api/reportes/forma/${id}/meses-disponibles`,
  REPORTES_EXPEDIENTE_HTML: (id) => `/api/reportes/expediente/${id}/html`,
  REPORTES_NOTAS_MEDICAS_HTML: (id) => `/api/reportes/notas-medicas/${id}/html`,
  DASHBOARD_ADMIN_SUMMARY: '/api/dashboard/admin/summary',
  DASHBOARD_DOCTOR_SUMMARY: '/api/dashboard/doctor/summary',
  AUTH_CHANGE_PASSWORD: '/api/auth/change-password',
  AUTH_ADMIN_CHANGE_PASSWORD: '/api/auth/admin/change-password',
  /** PUT: restablecer PIN de paciente (solo Admin/Doctor, JWT) */
  AUTH_UNIFIED_ADMIN_RESET_PATIENT_PIN: '/api/auth-unified/admin/reset-patient-pin',
  AUTH_FORGOT_PASSWORD: '/api/auth/forgot-password',
  AUTH_RESET_PASSWORD: '/api/auth/reset-password',
  COMORBILIDADES: '/api/comorbilidades',
  MEDICAMENTOS: '/api/medicamentos',
  VACUNAS: '/api/vacunas',
  MENSAJES_CHAT: '/api/mensajes-chat',
};

export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_MAX = 100;

/** Longitudes máximas para validación */
export const LIMITS = {
  EMAIL_MAX: 254,
  PASSWORD_MIN: 6,
  PASSWORD_MAX: 128,
};
