#!/usr/bin/env node

import crypto from 'crypto';

// Generar JWT Secret (64 caracteres)
const generateJWTSecret = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Generar Encryption Key (64 caracteres)
const generateEncryptionKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Generar CSRF Secret (32 caracteres)
const generateCSRFSecret = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Generar JWT Refresh Secret (debe ser distinto de JWT_SECRET en producción)
const generateJWTRefreshSecret = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Generar SESSION_SECRET (32 caracteres)
const generateSessionSecret = () => {
  return crypto.randomBytes(16).toString('hex');
};

console.log('🔐 Generando claves seguras para tu aplicación...\n');

console.log('Copia estas claves a tu archivo .env:\n');
console.log('# Security Keys');
console.log(`JWT_SECRET=${generateJWTSecret()}`);
console.log(`JWT_REFRESH_SECRET=${generateJWTRefreshSecret()}`);
console.log(`ENCRYPTION_KEY=${generateEncryptionKey()}`);
console.log(`CSRF_SECRET=${generateCSRFSecret()}`);
console.log(`SESSION_SECRET=${generateSessionSecret()}`);

console.log('\n✅ Claves generadas exitosamente!');
console.log('\n⚠️  IMPORTANTE:');
console.log('- Nunca compartas estas claves');
console.log('- Usa claves diferentes para desarrollo y producción');
console.log('- Guarda las claves de producción en un lugar seguro');