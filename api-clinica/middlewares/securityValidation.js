/**
 * Middleware de validación de seguridad adicional
 * - Validación de profundidad de objetos
 * - Validación de tamaño de payload
 * - Validación de tipos de datos
 */

import logger from '../utils/logger.js';

/**
 * Valida la profundidad máxima de objetos anidados
 * Previene ataques DoS por objetos muy anidados
 */
export const validateObjectDepth = (maxDepth = 5) => {
  return (req, res, next) => {
    const checkDepth = (obj, currentDepth = 0) => {
      if (currentDepth > maxDepth) {
        return false;
      }
      
      // Validar que obj sea un objeto válido
      if (obj === null || obj === undefined) {
        return true;
      }
      
      if (typeof obj !== 'object') {
        return true; // Tipos primitivos no tienen profundidad
      }
      
      if (Array.isArray(obj)) {
        for (const item of obj) {
          if (!checkDepth(item, currentDepth + 1)) {
            return false;
          }
        }
        return true;
      }
      
      // Para objetos, usar Object.prototype.hasOwnProperty.call() para mayor compatibilidad
      // o verificar directamente con 'in' operator
      try {
        for (const key in obj) {
          // Verificar que la propiedad pertenezca al objeto (no a su prototipo)
          // Usar Object.prototype.hasOwnProperty.call() para mayor seguridad
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            if (!checkDepth(obj[key], currentDepth + 1)) {
              return false;
            }
          }
        }
      } catch (error) {
        // Si hay un error al iterar (ej: objeto sellado, congelado, o tipo especial),
        // intentar con Object.keys() como fallback
        try {
          const keys = Object.keys(obj);
          for (const key of keys) {
            if (!checkDepth(obj[key], currentDepth + 1)) {
              return false;
            }
          }
        } catch (fallbackError) {
          // Si aún falla, asumir que el objeto es válido pero no iterable
          // (puede ser un objeto especial como Date, RegExp, etc.)
          logger.debug('Objeto no iterable en checkDepth', {
            objType: obj.constructor?.name || typeof obj,
            error: fallbackError.message
          });
          return true;
        }
      }
      
      return true;
    };

    // Validar body
    if (req.body && typeof req.body === 'object') {
      if (!checkDepth(req.body)) {
        logger.warn('Objeto con profundidad excesiva rechazado', {
          ip: req.ip,
          url: req.url,
          maxDepth
        });
        return res.status(400).json({
          error: 'Estructura de datos inválida',
          message: `La profundidad máxima permitida es ${maxDepth} niveles`
        });
      }
    }

    // Validar query params
    if (req.query && typeof req.query === 'object') {
      if (!checkDepth(req.query)) {
        logger.warn('Query params con profundidad excesiva rechazados', {
          ip: req.ip,
          url: req.url
        });
        return res.status(400).json({
          error: 'Parámetros de consulta inválidos',
          message: `La profundidad máxima permitida es ${maxDepth} niveles`
        });
      }
    }

    next();
  };
};

/**
 * Valida el tamaño máximo del payload
 */
export const validatePayloadSize = (maxSizeKB = 100) => {
  return (req, res, next) => {
    const contentLength = req.get('content-length');
    
    if (contentLength) {
      const sizeKB = parseInt(contentLength) / 1024;
      
      if (sizeKB > maxSizeKB) {
        logger.warn('Payload demasiado grande rechazado', {
          ip: req.ip,
          url: req.url,
          sizeKB: sizeKB.toFixed(2),
          maxSizeKB
        });
        return res.status(413).json({
          error: 'Payload demasiado grande',
          message: `El tamaño máximo permitido es ${maxSizeKB}KB`,
          received: `${sizeKB.toFixed(2)}KB`
        });
      }
    }

    next();
  };
};

/**
 * Valida tipos de datos en el body
 */
export const validateDataTypes = () => {
  return (req, res, next) => {
    if (!req.body || typeof req.body !== 'object') {
      return next();
    }

    const validateValue = (value, path = '') => {
      // Permitir tipos primitivos
      if (value === null || value === undefined) {
        return true;
      }

      const type = typeof value;
      
      // Validar tipos permitidos
      if (type === 'string' || type === 'number' || type === 'boolean') {
        return true;
      }

      // Validar arrays
      if (Array.isArray(value)) {
        // Limitar tamaño de arrays
        if (value.length > 1000) {
          logger.warn('Array demasiado grande', { path, length: value.length });
          return false;
        }
        return value.every((item, index) => validateValue(item, `${path}[${index}]`));
      }

      // Validar objetos
      if (type === 'object') {
        // Limitar número de propiedades
        const keys = Object.keys(value);
        if (keys.length > 100) {
          logger.warn('Objeto con demasiadas propiedades', { path, count: keys.length });
          return false;
        }
        return keys.every(key => validateValue(value[key], path ? `${path}.${key}` : key));
      }

      // Rechazar otros tipos (functions, symbols, etc.)
      logger.warn('Tipo de dato no permitido', { path, type });
      return false;
    };

    if (!validateValue(req.body)) {
      return res.status(400).json({
        error: 'Tipos de datos inválidos',
        message: 'El body contiene tipos de datos no permitidos'
      });
    }

    next();
  };
};

/**
 * Middleware combinado de validación de seguridad
 */
export const securityValidation = [
  validateObjectDepth(5),
  validatePayloadSize(100),
  validateDataTypes()
];

