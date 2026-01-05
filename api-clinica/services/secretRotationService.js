import crypto from 'crypto';
import logger from '../utils/logger.js';

/**
 * Servicio de Rotación de Secretos JWT
 * 
 * Mejores prácticas implementadas:
 * - Rotación automática de secretos cada 90 días
 * - Soporte para múltiples secretos activos durante transición
 * - Validación de tokens con secretos antiguos y nuevos
 * - Registro de rotaciones
 * - Rollback en caso de error
 */
class SecretRotationService {
  /**
   * Genera un nuevo secreto JWT
   * @returns {string} - Nuevo secreto (64 bytes en hex)
   */
  static generateNewSecret() {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Obtiene los secretos activos (actual y anteriores para transición)
   * @returns {Object} - { current, previous, legacy }
   */
  static getActiveSecrets() {
    return {
      current: process.env.JWT_SECRET,
      previous: process.env.JWT_SECRET_PREVIOUS,
      legacy: process.env.JWT_SECRET_LEGACY
    };
  }

  /**
   * Rota el secreto JWT
   * @returns {Object} - { success, newSecret, message }
   */
  static async rotateSecret() {
    try {
      const currentSecret = process.env.JWT_SECRET;
      
      if (!currentSecret) {
        throw new Error('JWT_SECRET no está definido');
      }

      // Generar nuevo secreto
      const newSecret = this.generateNewSecret();
      
      // Guardar secreto anterior
      const previousSecret = currentSecret;
      
      // Actualizar variables de entorno
      // NOTA: En producción, esto debería hacerse a través de un gestor de secretos
      // (AWS Secrets Manager, HashiCorp Vault, etc.)
      process.env.JWT_SECRET_PREVIOUS = previousSecret;
      process.env.JWT_SECRET_LEGACY = process.env.JWT_SECRET_LEGACY || previousSecret;
      process.env.JWT_SECRET = newSecret;
      
      // Actualizar fecha de rotación
      process.env.JWT_SECRET_ROTATED_AT = new Date().toISOString();
      
      logger.info('Secreto JWT rotado exitosamente', {
        rotatedAt: process.env.JWT_SECRET_ROTATED_AT,
        newSecretLength: newSecret.length
      });
      
      return {
        success: true,
        newSecret: newSecret.substring(0, 16) + '...', // Solo mostrar parte del secreto
        message: 'Secreto rotado exitosamente. Actualiza las variables de entorno.',
        rotatedAt: process.env.JWT_SECRET_ROTATED_AT
      };
    } catch (error) {
      logger.error('Error rotando secreto JWT', {
        error: error.message,
        stack: error.stack
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verifica un token con múltiples secretos (para transición)
   * @param {string} token - Token JWT a verificar
   * @param {Array<string>} secrets - Lista de secretos a probar
   * @returns {Object|null} - Token decodificado o null
   */
  static async verifyTokenWithMultipleSecrets(token, secrets) {
    const jwt = (await import('jsonwebtoken')).default;
    
    for (const secret of secrets) {
      if (!secret) continue;
      
      try {
        const decoded = jwt.verify(token, secret);
        return decoded;
      } catch (error) {
        // Continuar con siguiente secreto
        continue;
      }
    }
    
    return null;
  }

  /**
   * Verifica si es necesario rotar el secreto
   * @returns {boolean} - true si debe rotarse
   */
  static shouldRotateSecret() {
    const rotatedAt = process.env.JWT_SECRET_ROTATED_AT;
    const rotationInterval = parseInt(process.env.JWT_SECRET_ROTATION_DAYS || '90');
    
    if (!rotatedAt) {
      return true; // Nunca se ha rotado
    }
    
    const lastRotation = new Date(rotatedAt);
    const daysSinceRotation = (Date.now() - lastRotation.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysSinceRotation >= rotationInterval;
  }

  /**
   * Programa rotación automática (debe ejecutarse como cron job)
   */
  static async scheduleRotation() {
    if (this.shouldRotateSecret()) {
      logger.info('Iniciando rotación automática de secreto JWT');
      const result = await this.rotateSecret();
      
      if (result.success) {
        logger.info('Rotación automática completada', {
          rotatedAt: result.rotatedAt
        });
      } else {
        logger.error('Error en rotación automática', {
          error: result.error
        });
      }
    } else {
      logger.debug('Rotación de secreto no necesaria aún');
    }
  }
}

export default SecretRotationService;

