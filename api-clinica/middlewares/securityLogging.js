/**
 * Middleware de logging de seguridad
 * Registra eventos de seguridad para auditoría
 */

import logger from '../utils/logger.js';

/**
 * Log de eventos de seguridad
 */
export const securityLogger = {
  /**
   * Log de intento de acceso no autorizado
   */
  logUnauthorizedAccess(req, reason) {
    logger.warn('🔒 Unauthorized access attempt', {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'anonymous',
      reason,
      headers: {
        origin: req.get('origin'),
        referer: req.get('referer')
      }
    });
  },

  /**
   * Log de actividad sospechosa
   */
  logSuspiciousActivity(req, activityType, details = {}) {
    logger.warn('🚨 Suspicious activity detected', {
      timestamp: new Date().toISOString(),
      activityType,
      ip: req.ip,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'anonymous',
      ...details
    });
  },

  /**
   * Log de intento de acceso HTTP en producción
   */
  logHTTPInProduction(req) {
    logger.warn('⚠️ HTTP access attempt in production', {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      host: req.get('host'),
      url: req.url,
      userAgent: req.get('User-Agent')
    });
  },

  /**
   * Log de CORS rechazado
   */
  logCORSRejected(req, origin) {
    logger.warn('🌐 CORS request rejected', {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      origin,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent')
    });
  },

  /**
   * Log de validación de seguridad fallida
   */
  logSecurityValidationFailed(req, validationType, details = {}) {
    logger.warn('🛡️ Security validation failed', {
      timestamp: new Date().toISOString(),
      validationType,
      ip: req.ip,
      url: req.url,
      method: req.method,
      ...details
    });
  },

  /**
   * Log de rate limit alcanzado
   */
  logRateLimitExceeded(req, limitType) {
    logger.warn('⏱️ Rate limit exceeded', {
      timestamp: new Date().toISOString(),
      limitType,
      ip: req.ip,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'anonymous'
    });
  }
};

/**
 * Middleware para logging automático de eventos de seguridad
 */
export const securityEventLogger = (req, res, next) => {
  // Interceptar respuestas 401, 403, 429 para logging
  const originalJson = res.json;
  res.json = function(data) {
    if (res.statusCode === 401) {
      securityLogger.logUnauthorizedAccess(req, data.error || 'Authentication failed');
    } else if (res.statusCode === 403) {
      securityLogger.logUnauthorizedAccess(req, data.error || 'Authorization failed');
    } else if (res.statusCode === 429) {
      securityLogger.logRateLimitExceeded(req, data.code || 'general');
    }
    return originalJson.call(this, data);
  };

  next();
};

export default securityLogger;

