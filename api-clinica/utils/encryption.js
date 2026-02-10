import crypto from 'crypto';
import { ENCRYPTION } from './constants.js';
import logger from './logger.js';

const { ALGORITHM, KEY_LENGTH, IV_LENGTH, TAG_LENGTH, MIN_KEY_LENGTH } = ENCRYPTION;

// Generar clave de encriptación desde variable de entorno
const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < MIN_KEY_LENGTH) {
    throw new Error(`ENCRYPTION_KEY must be at least ${MIN_KEY_LENGTH} characters long`);
  }
  return crypto.scryptSync(key, 'salt', KEY_LENGTH);
};

// Encriptar datos sensibles
export const encrypt = (text) => {
  if (!text) return null;
  
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipherGCM(ALGORITHM, key, iv);
    cipher.setAAD(Buffer.from('medical-data', 'utf8'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combinar IV + tag + datos encriptados
    return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
  } catch (error) {
    throw new Error('Encryption failed: ' + error.message);
  }
};

// Desencriptar datos sensibles
export const decrypt = (encryptedData) => {
  if (!encryptedData) return null;
  
  // Si no es un string, retornar el valor original
  if (typeof encryptedData !== 'string') {
    return encryptedData;
  }
  
  try {
    const key = getEncryptionKey();
    const parts = encryptedData.split(':');
    
    // Si no tiene el formato correcto (iv:tag:data), asumir que no está encriptado
    if (parts.length !== 3) {
      logger.debug('Dato no tiene formato encriptado, retornando original');
      return encryptedData;
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    // Validar que las partes sean válidas
    if (!iv || !tag || !encrypted) {
      logger.debug('Partes de encriptación inválidas, retornando original');
      return encryptedData;
    }
    
    const decipher = crypto.createDecipherGCM(ALGORITHM, key, iv);
    decipher.setAAD(Buffer.from('medical-data', 'utf8'));
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    // Si falla la desencriptación, asumir que el dato no está encriptado
    logger.debug(`Error desencriptando, retornando original: ${error.message}`);
    return encryptedData;
  }
};

// Hash para datos que no necesitan ser reversibles
export const hashData = (data) => {
  if (!data) return null;
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Verificar hash
export const verifyHash = (data, hash) => {
  if (!data || !hash) return false;
  return hashData(data) === hash;
};

// Encriptar campos específicos de un objeto
export const encryptPIIFields = (obj, fields = []) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const encrypted = { ...obj };
  fields.forEach(field => {
    if (encrypted[field] !== null && encrypted[field] !== undefined && encrypted[field] !== '') {
      // Solo encriptar si es un string o puede convertirse a string
      const value = encrypted[field];
      
      // ✅ Verificar si el campo ya está encriptado (evitar doble encriptación)
      if (typeof value === 'string') {
        // Verificar formato JSON encriptado
        try {
          const jsonData = JSON.parse(value);
          if (jsonData.encrypted && jsonData.iv && jsonData.authTag) {
            // Ya está encriptado en formato JSON, no encriptar de nuevo
            return;
          }
        } catch (e) {
          // No es JSON, continuar
        }
        
        // Verificar formato iv:tag:data
        const parts = value.split(':');
        if (parts.length === 3 && parts[0].length > 0 && parts[1].length > 0 && parts[2].length > 0) {
          // Ya está encriptado en formato iv:tag:data, no encriptar de nuevo
          return;
        }
      }
      
      if (typeof value === 'string' || (typeof value === 'object' && value instanceof Date)) {
        try {
          // Convertir fecha a string ISO antes de encriptar
          const stringValue = typeof value === 'string' ? value : value.toISOString();
          
          // ✅ Validar que el string no esté vacío después de trim
          if (typeof stringValue === 'string' && stringValue.trim().length === 0) {
            // String vacío, no encriptar
            return;
          }
          
          encrypted[field] = encrypt(stringValue);
        } catch (error) {
          // Si falla la encriptación, mantener el valor original y loguear error detallado
          logger.warn(`Error encriptando campo ${field}:`, {
            error: error.message,
            fieldType: typeof value,
            fieldValue: typeof value === 'string' ? value.substring(0, 20) + '...' : value,
            stack: error.stack
          });
          // Mantener el valor original (no encriptado) si falla la encriptación
        }
      }
      // Si no es string ni fecha, mantener el valor original (no encriptar números, booleans, etc.)
    }
  });
  
  return encrypted;
};

// Desencriptar campos específicos de un objeto
export const decryptPIIFields = async (obj, fields = []) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const decrypted = { ...obj };
  
  // Importar EncryptionService dinámicamente para evitar dependencias circulares
  let EncryptionService = null;
  try {
    const encryptionModule = await import('../services/encryptionService.js');
    EncryptionService = encryptionModule.default;
  } catch (importError) {
    logger.debug('No se pudo importar EncryptionService, usando solo formato iv:tag:data');
  }
  
  for (const field of fields) {
    if (decrypted[field] !== null && decrypted[field] !== undefined && decrypted[field] !== '') {
      try {
        const raw = decrypted[field];
        const isEncryptedObject = typeof raw === 'object' && raw !== null && raw.encrypted != null && raw.iv != null && raw.authTag != null;
        const isEncryptedString = typeof raw === 'string' && raw.trim().startsWith('{');
        if (isEncryptedObject && EncryptionService) {
          const decryptedValue = EncryptionService.decrypt(raw);
          decrypted[field] = decryptedValue !== null ? decryptedValue : null;
          continue;
        }
        if (typeof raw === 'string') {
          let decryptedValue = null;
          if (EncryptionService && isEncryptedString) {
            try {
              const jsonData = JSON.parse(raw);
              if (jsonData.encrypted && jsonData.iv && jsonData.authTag) {
                decryptedValue = EncryptionService.decrypt(raw);
                if (decryptedValue != null && decryptedValue !== raw) {
                  decrypted[field] = decryptedValue;
                  continue;
                }
              }
            } catch (jsonError) {
              // No es JSON válido, continuar con formato iv:tag:data
            }
          }
          if (!decryptedValue || decryptedValue === raw) {
            if (raw.includes(':') && raw.split(':').length === 3) {
              decryptedValue = decrypt(raw);
              if (decryptedValue && decryptedValue !== raw) {
                decrypted[field] = decryptedValue;
              }
            }
          }
        }
      } catch (error) {
        logger.debug(`No se pudo desencriptar campo ${field}, manteniendo valor original:`, error.message);
      }
    }
  }
  
  return decrypted;
};