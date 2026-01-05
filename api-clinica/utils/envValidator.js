import { JWT, ENCRYPTION } from './constants.js';

// Validador de variables de entorno
const requiredEnvVars = {
  development: [
    'DB_NAME',
    'DB_USER', 
    'DB_PASSWORD',
    'DB_HOST',
    'JWT_SECRET'
  ],
  production: [
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD', 
    'DB_HOST',
    'JWT_SECRET',
    'ENCRYPTION_KEY',
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS',
    'ALERT_EMAIL'
  ]
};

export const validateEnvironment = () => {
  const env = process.env.NODE_ENV || 'development';
  const required = requiredEnvVars[env] || requiredEnvVars.development;
  const missing = [];

  required.forEach(varName => {
    // En desarrollo, permitir valores vacíos para algunas variables
    if (env === 'development' && (varName === 'DB_PASSWORD' || varName === 'ENCRYPTION_KEY')) {
      return; // Saltar validación para estas variables en desarrollo
    }
    
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validaciones específicas
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < JWT.MIN_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must be at least ${JWT.MIN_SECRET_LENGTH} characters long`);
  }

  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length < ENCRYPTION.MIN_KEY_LENGTH) {
    throw new Error(`ENCRYPTION_KEY must be at least ${ENCRYPTION.MIN_KEY_LENGTH} characters long`);
  }

  return true;
};

export default validateEnvironment;