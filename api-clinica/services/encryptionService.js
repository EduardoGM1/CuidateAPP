import crypto from 'crypto';
import logger from '../utils/logger.js';

/**
 * Servicio de encriptación AES-256-GCM para datos sensibles
 * 
 * Mejores prácticas implementadas:
 * - AES-256-GCM (Galois/Counter Mode) para autenticación y encriptación
 * - IV (Initialization Vector) único por cada encriptación
 * - Auth Tag para verificar integridad
 * - Key derivation usando scrypt
 * - Manejo seguro de errores
 */
class EncryptionService {
  /**
   * Obtiene la clave de encriptación desde variables de entorno
   * Si no existe, genera una y la almacena (solo para desarrollo)
   */
  static getEncryptionKey() {
    let key = process.env.ENCRYPTION_KEY;
    
    if (!key) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('ENCRYPTION_KEY debe estar definida en producción');
      }
      
      // Solo para desarrollo: generar clave temporal
      logger.warn('ENCRYPTION_KEY no definida, generando clave temporal (NO USAR EN PRODUCCIÓN)');
      key = crypto.randomBytes(32).toString('hex');
      process.env.ENCRYPTION_KEY = key;
    }
    
    // Derivar clave usando scrypt para mayor seguridad
    const salt = process.env.ENCRYPTION_SALT || 'clinica-medica-salt-2025';
    return crypto.scryptSync(key, salt, 32);
  }

  /**
   * Encripta un texto usando AES-256-GCM
   * @param {string} text - Texto a encriptar
   * @returns {string} - String JSON con encrypted, iv, authTag (base64)
   */
  static encrypt(text) {
    try {
      if (!text || typeof text !== 'string') {
        return null;
      }

      const algorithm = 'aes-256-gcm';
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(16); // IV único por cada encriptación
      
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag(); // Tag de autenticación
      
      // Retornar como JSON string con todos los componentes necesarios
      const result = {
        encrypted: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
      
      return JSON.stringify(result);
    } catch (error) {
      logger.error('Error encriptando datos', {
        error: error.message,
        stack: error.stack
      });
      throw new Error('Error al encriptar datos sensibles');
    }
  }

  /**
   * Desencripta un texto encriptado
   * @param {string} encryptedData - String JSON con encrypted, iv, authTag
   * @returns {string} - Texto desencriptado
   */
  static decrypt(encryptedData) {
    try {
      if (!encryptedData || typeof encryptedData !== 'string') {
        return null;
      }

      // Intentar parsear como JSON
      let data;
      try {
        data = JSON.parse(encryptedData);
      } catch (parseError) {
        // Si no es JSON, podría ser texto plano (migración)
        logger.warn('Datos no encriptados detectados (migración pendiente)', {
          data: encryptedData.substring(0, 50)
        });
        return encryptedData; // Retornar como está para compatibilidad
      }

      if (!data.encrypted || !data.iv || !data.authTag) {
        logger.warn('Formato de datos encriptados inválido');
        return encryptedData; // Retornar como está
      }

      const algorithm = 'aes-256-gcm';
      const key = this.getEncryptionKey();
      const iv = Buffer.from(data.iv, 'hex');
      const authTag = Buffer.from(data.authTag, 'hex');
      
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Error desencriptando datos', {
        error: error.message,
        stack: error.stack,
        dataLength: encryptedData?.length
      });
      
      // En caso de error, retornar null en lugar de lanzar excepción
      // Esto permite que el sistema continúe funcionando durante migraciones
      return null;
    }
  }

  /**
   * Encripta un campo específico si tiene valor
   * @param {string|null|undefined} value - Valor a encriptar
   * @returns {string|null} - Valor encriptado o null
   */
  static encryptField(value) {
    if (!value || value === null || value === undefined) {
      return null;
    }
    
    if (typeof value !== 'string') {
      value = String(value);
    }
    
    return this.encrypt(value);
  }

  /**
   * Desencripta un campo específico
   * @param {string|null|undefined} encryptedValue - Valor encriptado
   * @returns {string|null} - Valor desencriptado o null
   */
  static decryptField(encryptedValue) {
    if (!encryptedValue || encryptedValue === null || encryptedValue === undefined) {
      return null;
    }
    
    return this.decrypt(encryptedValue);
  }

  /**
   * Verifica si un string está encriptado
   * @param {string} value - Valor a verificar
   * @returns {boolean} - true si está encriptado
   */
  static isEncrypted(value) {
    if (!value || typeof value !== 'string') {
      return false;
    }
    
    try {
      const data = JSON.parse(value);
      return data && data.encrypted && data.iv && data.authTag;
    } catch {
      return false;
    }
  }

  /**
   * Encripta múltiples campos de un objeto
   * @param {Object} data - Objeto con datos
   * @param {Array<string>} fieldsToEncrypt - Campos a encriptar
   * @returns {Object} - Objeto con campos encriptados
   */
  static encryptFields(data, fieldsToEncrypt) {
    const encrypted = { ...data };
    
    for (const field of fieldsToEncrypt) {
      if (encrypted[field] !== undefined && encrypted[field] !== null) {
        encrypted[field] = this.encryptField(encrypted[field]);
      }
    }
    
    return encrypted;
  }

  /**
   * Desencripta múltiples campos de un objeto
   * @param {Object} data - Objeto con datos encriptados
   * @param {Array<string>} fieldsToDecrypt - Campos a desencriptar
   * @returns {Object} - Objeto con campos desencriptados
   */
  static decryptFields(data, fieldsToDecrypt) {
    const decrypted = { ...data };
    
    for (const field of fieldsToDecrypt) {
      if (decrypted[field] !== undefined && decrypted[field] !== null) {
        decrypted[field] = this.decryptField(decrypted[field]);
      }
    }
    
    return decrypted;
  }

  /**
   * Obtiene la versión actual de la clave de encriptación
   * Para soportar rotación de claves en el futuro
   * @returns {number} - Versión de la clave (1 por defecto)
   */
  static getKeyVersion() {
    return parseInt(process.env.ENCRYPTION_KEY_VERSION || '1', 10);
  }

  /**
   * Verifica si una clave de encriptación necesita rotación
   * @param {number} keyAgeDays - Edad de la clave en días
   * @returns {boolean} - true si necesita rotación
   */
  static shouldRotateKey(keyAgeDays = 90) {
    const lastRotation = process.env.ENCRYPTION_KEY_LAST_ROTATION;
    if (!lastRotation) {
      return false; // No hay fecha de rotación, asumir que es nueva
    }
    
    const lastRotationDate = new Date(lastRotation);
    const daysSinceRotation = (Date.now() - lastRotationDate.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysSinceRotation >= keyAgeDays;
  }

  /**
   * Prepara para rotación de claves (estructura básica)
   * NOTA: La rotación completa requiere re-encriptar todos los datos
   * Esto es solo la estructura base para futura implementación
   * @returns {Object} - Información sobre el estado de rotación
   */
  static getKeyRotationStatus() {
    return {
      currentVersion: this.getKeyVersion(),
      lastRotation: process.env.ENCRYPTION_KEY_LAST_ROTATION || null,
      shouldRotate: this.shouldRotateKey(),
      keyConfigured: !!process.env.ENCRYPTION_KEY
    };
  }
}

export default EncryptionService;

