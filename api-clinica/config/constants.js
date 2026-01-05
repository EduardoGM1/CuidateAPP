/**
 * Constants Configuration
 * 
 * Centralización de todas las constantes y valores mágicos del proyecto.
 * Esto permite fácil mantenimiento y cambios globales.
 * 
 * @author Senior Developer
 * @date 2025-10-28
 */

/**
 * PAGINATION - Configuración de paginación
 */
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 1000,
  DEFAULT_OFFSET: 0,
  DEFAULT_SORT: 'DESC',
  
  // Límites específicos por entidad
  PACIENTES_LIMIT: 20,
  DOCTORES_LIMIT: 20,
  
  // Páginas
  MIN_PAGE: 1,
  MAX_PAGE: 10000
};

/**
 * MEDICAL_DATA - Configuración de datos médicos
 */
export const MEDICAL_DATA = {
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  SIGNOS_VITALES_DISPLAY_LIMIT: 5,
  RECENT_RECORDS_DISPLAY: 1,
  
  // Límites por tipo de dato
  CITAS_LIMIT: 5,
  DIAGNOSTICOS_LIMIT: 5,
  MEDICAMENTOS_LIMIT: 5,
  SIGNOS_VITALES_LIMIT: 1
};

/**
 * DATABASE - Configuración de base de datos
 */
export const DATABASE = {
  QUERY_TIMEOUT: 30000, // 30 segundos
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000 // 1 segundo
};

/**
 * RATE_LIMITING - Configuración de rate limiting
 */
export const RATE_LIMITING = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutos
  MAX_REQUESTS: 100,
  SKIP_SUCCESSFUL: true,
  SKIP_FAILED: false,
  
  // Límites específicos
  AUTH_ATTEMPTS: 5,
  AUTH_WINDOW: 15 * 60 * 1000,
  SEARCH_WINDOW: 60000, // 1 minuto
  MAX_SEARCHES: 10
};

/**
 * SECURITY - Configuración de seguridad
 */
export const SECURITY = {
  // JWT
  JWT_EXPIRES_IN: '24h',
  JWT_REFRESH_EXPIRES_IN: '7d',
  
  // Bcrypt
  BCRYPT_ROUNDS: 10,
  
  // Token
  RESET_TOKEN_EXPIRES_IN: 3600000, // 1 hora en ms
  VERIFY_TOKEN_EXPIRES_IN: 86400000, // 24 horas
  
  // Pagination security
  MAX_ITEMS_PER_PAGE: 100,
  
  // Input validation
  MAX_STRING_LENGTH: 1000,
  MAX_TEXT_LENGTH: 5000,
  MAX_ARRAY_LENGTH: 100
};

/**
 * FILTERS - Configuración de filtros
 */
export const FILTERS = {
  // Estados
  ESTADO_ALL: 'todos',
  ESTADO_ACTIVOS: 'activos',
  ESTADO_INACTIVOS: 'inactivos',
  
  // Ordenamiento
  SORT_RECENT: 'recent',
  SORT_OLDEST: 'oldest',
  
  // Orden por defecto
  DEFAULT_SORT_FIELD: 'fecha_registro',
  DEFAULT_ACTIVE_FIRST: 'activo'
};

/**
 * VALIDATION_RULES - Reglas de validación
 */
export const VALIDATION_RULES = {
  // Email
  EMAIL_MIN_LENGTH: 5,
  EMAIL_MAX_LENGTH: 255,
  
  // Password
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  
  // Nombres
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  
  // Teléfono
  PHONE_MIN_LENGTH: 10,
  PHONE_MAX_LENGTH: 15,
  
  // CURP
  CURP_LENGTH: 18,
  
  // Fechas
  MIN_YEAR: 1900,
  MAX_YEAR: 2100,
  
  // Números de documento
  MEDICAL_RECORD_NUMBER_LENGTH: 50
};

/**
 * MEDICAL_VALUES - Valores válidos para datos médicos
 */
export const MEDICAL_VALUES = {
  // Peso
  MIN_WEIGHT_KG: 0.5,
  MAX_WEIGHT_KG: 500,
  
  // Talla
  MIN_HEIGHT_M: 0.5,
  MAX_HEIGHT_M: 3.0,
  
  // Presión arterial
  MIN_SYSTOLIC: 50,
  MAX_SYSTOLIC: 250,
  MIN_DIASTOLIC: 30,
  MAX_DIASTOLIC: 150,
  
  // Glucosa
  MIN_GLUCOSE_MG_DL: 30,
  MAX_GLUCOSE_MG_DL: 600,
  
  // Colesterol
  MIN_CHOLESTEROL_MG_DL: 0,
  MAX_CHOLESTEROL_MG_DL: 500,
  
  // Triglicéridos
  MIN_TRIGLYCERIDES_MG_DL: 0,
  MAX_TRIGLYCERIDES_MG_DL: 1000,
  
  // Cintura
  MIN_WAIST_CM: 30,
  MAX_WAIST_CM: 200,
  
  // IMC
  MIN_IMC: 10,
  MAX_IMC: 80
};

/**
 * API_RESPONSE - Configuración de respuestas de API
 */
export const API_RESPONSE = {
  SUCCESS_STATUS: 200,
  CREATED_STATUS: 201,
  NO_CONTENT_STATUS: 204,
  BAD_REQUEST_STATUS: 400,
  UNAUTHORIZED_STATUS: 401,
  FORBIDDEN_STATUS: 403,
  NOT_FOUND_STATUS: 404,
  CONFLICT_STATUS: 409,
  SERVER_ERROR_STATUS: 500,
  
  // Timeouts
  RESPONSE_TIMEOUT: 30000,
  REQUEST_TIMEOUT: 30000
};

/**
 * LOGGING - Configuración de logging
 */
export const LOGGING = {
  // Niveles
  LEVELS: {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug',
    VERBOSE: 'verbose'
  },
  
  // Formato
  DATE_FORMAT: 'YYYY-MM-DD HH:mm:ss',
  TIMEZONE: 'America/Mexico_City',
  
  // Archivos
  MAX_FILE_SIZE: 10485760, // 10MB
  MAX_FILES: 14, // 2 semanas
  
  // Log por niveles
  ERROR_FILE: 'error.log',
  COMBINED_FILE: 'combined.log',
  DEBUG_FILE: 'debug.log'
};

/**
 * NOTIFICATIONS - Configuración de notificaciones
 */
export const NOTIFICATIONS = {
  // Push
  PUSH_TOKEN_EXPIRES_IN: 86400000, // 24 horas
  
  // Email
  EMAIL_TEMPLATE_DIR: './templates/emails',
  
  // SMS
  SMS_MAX_LENGTH: 160
};

/**
 * FILE_UPLOADS - Configuración de archivos
 */
export const FILE_UPLOADS = {
  // Tamaños
  MAX_FILE_SIZE: 5242880, // 5MB
  MAX_IMAGE_SIZE: 2097152, // 2MB
  
  // MIME types permitidos
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword']
};

/**
 * CACHE - Configuración de caché
 */
export const CACHE = {
  DURATION: 3600000, // 1 hora en ms
  CLEANUP_INTERVAL: 600000, // 10 minutos
  
  // Keys
  KEYS: {
    DOCTORES: 'doctores',
    PACIENTES: 'pacientes',
    MODULOS: 'modulos'
  }
};

export default {
  PAGINATION,
  MEDICAL_DATA,
  DATABASE,
  RATE_LIMITING,
  SECURITY,
  FILTERS,
  VALIDATION_RULES,
  MEDICAL_VALUES,
  API_RESPONSE,
  LOGGING,
  NOTIFICATIONS,
  FILE_UPLOADS,
  CACHE
};




