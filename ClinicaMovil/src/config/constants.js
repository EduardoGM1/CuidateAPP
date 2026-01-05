/**
 * Constantes centralizadas de la aplicación
 * Evita magic numbers y strings hardcodeados
 */

// Configuración de API
export const API_CONFIG = {
  TIMEOUT: {
    DEFAULT: 15000,
    UPLOAD: 60000,
    DOWNLOAD: 30000,
  },
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY: 1000,
  },
};

// Configuración de validación
export const VALIDATION = {
  PASSWORD: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 128,
    REQUIRE_LETTER: true,
    REQUIRE_NUMBER: true,
  },
  PIN: {
    LENGTH: 4,
  },
  EMAIL: {
    MAX_LENGTH: 255,
  },
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
  },
  PHONE: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 15,
  },
  CURP: {
    LENGTH: 18,
  },
};

// Configuración de paginación
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 10,
};

// Configuración de UI
export const UI = {
  DEBOUNCE_DELAY: 300,
  ANIMATION_DURATION: 200,
  TOAST_DURATION: 3000,
};

// Configuración de seguridad
export const SECURITY = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutos
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutos antes de expirar
};

// Configuración de notificaciones
export const NOTIFICATIONS = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
};

// Configuración de datos médicos
export const MEDICAL_DATA = {
  VITALS: {
    BLOOD_PRESSURE: {
      SYSTOLIC: { MIN: 50, MAX: 250 },
      DIASTOLIC: { MIN: 30, MAX: 150 },
    },
    GLUCOSE: { MIN: 30, MAX: 600 },
    HEART_RATE: { MIN: 30, MAX: 220 },
    TEMPERATURE: { MIN: 30, MAX: 45 },
    OXYGEN: { MIN: 70, MAX: 100 },
  },
};

// Mensajes de error comunes
export const ERROR_MESSAGES = {
  NETWORK: 'Error de conexión. Verifica tu internet.',
  UNAUTHORIZED: 'Sesión expirada. Por favor inicia sesión nuevamente.',
  NOT_FOUND: 'Recurso no encontrado.',
  SERVER_ERROR: 'Error del servidor. Intenta más tarde.',
  VALIDATION: 'Por favor verifica los datos ingresados.',
  UNKNOWN: 'Ocurrió un error inesperado.',
};

// Mensajes de éxito comunes
export const SUCCESS_MESSAGES = {
  SAVE: 'Datos guardados exitosamente.',
  DELETE: 'Eliminado exitosamente.',
  UPDATE: 'Actualizado exitosamente.',
  CREATE: 'Creado exitosamente.',
};

export default {
  API_CONFIG,
  VALIDATION,
  PAGINATION,
  UI,
  SECURITY,
  NOTIFICATIONS,
  MEDICAL_DATA,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
};



