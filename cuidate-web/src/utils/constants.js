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

export const API_PATHS = {
  LOGIN: '/api/auth/login',
  DASHBOARD: '/api/dashboard',
  PACIENTES: '/api/pacientes',
  CITAS: '/api/citas',
  DOCTORES: '/api/doctores',
  AUTH_USUARIOS: '/api/auth/usuarios',
  ADMIN_AUDITORIA: '/api/admin/auditoria',
  MODULOS: '/api/modulos',
  REPORTES: '/api/reportes',
  REPORTES_ESTADISTICAS_HTML: '/api/reportes/estadisticas/html',
  REPORTES_FORMA: '/api/reportes/forma',
  REPORTES_EXPEDIENTE_HTML: (id) => `/api/reportes/expediente/${id}/html`,
  DASHBOARD_ADMIN_SUMMARY: '/api/dashboard/admin/summary',
  DASHBOARD_DOCTOR_SUMMARY: '/api/dashboard/doctor/summary',
  AUTH_CHANGE_PASSWORD: '/api/auth/change-password',
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
