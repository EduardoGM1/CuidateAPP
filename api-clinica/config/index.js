import { DATABASE } from '../utils/constants.js';

// Configuración centralizada de la aplicación
export const config = {
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    corsOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
  },
  
  database: {
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    ssl: process.env.DB_SSL === 'true',
    pool: {
      max: process.env.NODE_ENV === 'production' ? DATABASE.POOL_MAX_PROD : DATABASE.POOL_MAX_DEV,
      min: process.env.NODE_ENV === 'production' ? DATABASE.POOL_MIN_PROD : DATABASE.POOL_MIN_DEV,
      acquire: DATABASE.ACQUIRE_TIMEOUT,
      idle: DATABASE.IDLE_TIMEOUT
    }
  },
  
  security: {
    jwtSecret: process.env.JWT_SECRET,
    encryptionKey: process.env.ENCRYPTION_KEY,
    csrfSecret: process.env.CSRF_SECRET
  },
  
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    alertEmail: process.env.ALERT_EMAIL
  },
  
  backup: {
    dir: process.env.BACKUP_DIR || './backups',
    interval: parseInt(process.env.BACKUP_INTERVAL) || 24 * 60 * 60 * 1000,
    maxBackups: parseInt(process.env.MAX_BACKUPS) || 7,
    encryption: process.env.BACKUP_ENCRYPTION === 'true'
  },
  
  ssl: {
    enabled: process.env.SSL_ENABLED === 'true',
    keyPath: process.env.SSL_KEY_PATH,
    certPath: process.env.SSL_CERT_PATH
  }
};

export default config;