// Constantes de la aplicación
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
};

export const ENCRYPTION = {
  ALGORITHM: 'aes-256-gcm',
  KEY_LENGTH: 32,
  IV_LENGTH: 16,
  TAG_LENGTH: 16,
  MIN_KEY_LENGTH: 32
};

export const JWT = {
  MIN_SECRET_LENGTH: 32,
  DEFAULT_EXPIRY: '24h'
};

export const RATE_LIMITING = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100,
  STRICT_MAX_REQUESTS: 5
};

export const BACKUP = {
  DEFAULT_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
  MAX_BACKUPS: 7,
  INITIAL_DELAY: 5 * 60 * 1000 // 5 minutes
};

export const DATABASE = {
  POOL_MAX_PROD: 20,
  POOL_MAX_DEV: 10,
  POOL_MIN_PROD: 5,
  POOL_MIN_DEV: 0,
  ACQUIRE_TIMEOUT: 30000,
  IDLE_TIMEOUT: 10000,
  CONNECTION_TIMEOUT: 60000
};

export const PII_FIELDS = [
  'curp',
  'telefono',
  'direccion',
  'numeroSeguroSocial'
];

export const ALERT_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium', 
  HIGH: 'high',
  CRITICAL: 'critical'
};

export default {
  HTTP_STATUS,
  ENCRYPTION,
  JWT,
  RATE_LIMITING,
  BACKUP,
  DATABASE,
  PII_FIELDS,
  ALERT_SEVERITY
};