/**
 * Input Validation Middleware
 * 
 * Middleware para validar datos de entrada en endpoints.
 * Centraliza validaciones y mejora seguridad.
 * 
 * @author Senior Developer
 * @date 2025-10-28
 */

import { VALIDATION_RULES, MEDICAL_VALUES, FILTERS } from '../config/constants.js';
import logger from '../utils/logger.js';

/**
 * Valida parámetros de paginación
 */
export const validatePagination = (req, res, next) => {
  const { limit, offset } = req.query;

  // Validar límite
  if (limit) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum <= 0 || limitNum > 1000) {
      return res.status(400).json({
        success: false,
        error: 'El límite debe ser un número entre 1 y 1000'
      });
    }
  }

  // Validar offset
  if (offset) {
    const offsetNum = parseInt(offset);
    if (isNaN(offsetNum) || offsetNum < 0) {
      return res.status(400).json({
        success: false,
        error: 'El offset debe ser un número mayor o igual a 0'
      });
    }
  }

  next();
};

/**
 * Valida filtros de estado
 */
export const validateEstadoFilter = (req, res, next) => {
  const { estado } = req.query;

  if (estado && !Object.values(FILTERS).includes(estado)) {
    return res.status(400).json({
      success: false,
      error: `Estado inválido. Valores permitidos: ${Object.values(FILTERS).join(', ')}`
    });
  }

  next();
};

/**
 * Valida ID de parámetro de ruta
 */
export const validateIdParam = (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'ID de recurso es requerido'
    });
  }

  const idNum = parseInt(id);
  if (isNaN(idNum) || idNum <= 0) {
    return res.status(400).json({
      success: false,
      error: 'ID debe ser un número entero positivo'
    });
  }

  // Asignar el ID parseado al request
  req.params.id = idNum;

  next();
};

/**
 * Valida que el body no esté vacío
 */
export const validateBodyNotEmpty = (req, res, next) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({
      success: false,
      error: 'El cuerpo de la solicitud no puede estar vacío'
    });
  }

  next();
};

/**
 * Valida campos requeridos
 * 
 * @param {Array<string>} requiredFields - Campos requeridos
 * @returns {Function} - Middleware
 * 
 * @example
 * router.post('/pacientes', validateRequiredFields(['nombre', 'apellido_paterno']), createPaciente);
 */
export const validateRequiredFields = (requiredFields) => {
  return (req, res, next) => {
    const missingFields = [];
    const errors = {};

    for (const field of requiredFields) {
      if (!req.body[field] || (typeof req.body[field] === 'string' && !req.body[field].trim())) {
        missingFields.push(field);
        errors[field] = 'Campo requerido';
      }
    }

    if (missingFields.length > 0) {
      logger.warn('Campos requeridos faltantes', {
        missingFields,
        body: req.body
      });

      return res.status(400).json({
        success: false,
        error: 'Campos requeridos faltantes',
        missingFields,
        details: errors
      });
    }

    next();
  };
};

/**
 * Valida formato de email
 */
export const validateEmail = (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(); // Email opcional, validar solo si existe
  }

  if (typeof email !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'El email debe ser un texto'
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({
      success: false,
      error: 'Formato de email inválido'
    });
  }

  if (email.length > VALIDATION_RULES.EMAIL_MAX_LENGTH) {
    return res.status(400).json({
      success: false,
      error: `El email no puede exceder ${VALIDATION_RULES.EMAIL_MAX_LENGTH} caracteres`
    });
  }

  next();
};

/**
 * Valida formato de teléfono
 */
export const validatePhone = (req, res, next) => {
  const { numero_celular, telefono } = req.body;
  const phone = numero_celular || telefono;

  if (!phone) {
    return next(); // Teléfono opcional
  }

  if (typeof phone !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'El teléfono debe ser un texto'
    });
  }

  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length < VALIDATION_RULES.PHONE_MIN_LENGTH || 
      cleaned.length > VALIDATION_RULES.PHONE_MAX_LENGTH) {
    return res.status(400).json({
      success: false,
      error: `El teléfono debe tener entre ${VALIDATION_RULES.PHONE_MIN_LENGTH} y ${VALIDATION_RULES.PHONE_MAX_LENGTH} dígitos`
    });
  }

  next();
};

/**
 * Valida rango de valores médicos
 * 
 * @param {string} field - Campo a validar
 * @param {number} min - Valor mínimo
 * @param {number} max - Valor máximo
 * @returns {Function} - Middleware
 */
export const validateMedicalRange = (field, min, max) => {
  return (req, res, next) => {
    const value = req.body[field];

    // Si el campo está vacío, es opcional
    if (!value || value === '') {
      return next();
    }

    const numValue = parseFloat(value);

    if (isNaN(numValue)) {
      return res.status(400).json({
        success: false,
        error: `${field} debe ser un número`
      });
    }

    if (numValue < min || numValue > max) {
      return res.status(400).json({
        success: false,
        error: `${field} debe estar entre ${min} y ${max}`
      });
    }

    next();
  };
};

/**
 * Valida longitud de texto
 */
export const validateTextLength = (field, maxLength = 1000) => {
  return (req, res, next) => {
    const value = req.body[field];

    if (!value) {
      return next(); // Campo opcional
    }

    if (typeof value !== 'string') {
      return res.status(400).json({
        success: false,
        error: `${field} debe ser un texto`
      });
    }

    if (value.length > maxLength) {
      return res.status(400).json({
        success: false,
        error: `${field} no puede exceder ${maxLength} caracteres`
      });
    }

    next();
  };
};

/**
 * Valida formato de fecha
 */
export const validateDateFormat = (req, res, next) => {
  const dateFields = ['fecha_nacimiento', 'fecha_registro', 'fecha_cita'];

  for (const field of dateFields) {
    const value = req.body[field];
    
    if (!value) continue;

    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        error: `${field} tiene un formato de fecha inválido`
      });
    }
  }

  next();
};

/**
 * Valida que un array contenga elementos
 */
export const validateArrayNotEmpty = (field) => {
  return (req, res, next) => {
    const value = req.body[field];

    if (!value) {
      return next(); // Campo opcional
    }

    if (!Array.isArray(value)) {
      return res.status(400).json({
        success: false,
        error: `${field} debe ser un arreglo`
      });
    }

    if (value.length === 0) {
      return res.status(400).json({
        success: false,
        error: `${field} no puede estar vacío`
      });
    }

    next();
  };
};

/**
 * Combinador de validaciones múltiples
 * 
 * @param {Array<Function>} validators - Array de middlewares de validación
 * @returns {Function} - Middleware combinado
 * 
 * @example
 * router.post('/pacientes',
 *   combineValidators([
 *     validateRequiredFields(['nombre', 'apellido_paterno']),
 *     validateEmail,
 *     validatePhone
 *   ]),
 *   createPaciente
 * );
 */
export const combineValidators = (validators) => {
  return async (req, res, next) => {
    for (const validator of validators) {
      await new Promise((resolve) => {
        validator(req, res, (result) => {
          resolve(result);
        });
        if (res.headersSent) break;
      });
      if (res.headersSent) break;
    }
    if (!res.headersSent) next();
  };
};

export default {
  validatePagination,
  validateEstadoFilter,
  validateIdParam,
  validateBodyNotEmpty,
  validateRequiredFields,
  validateEmail,
  validatePhone,
  validateMedicalRange,
  validateTextLength,
  validateDateFormat,
  validateArrayNotEmpty,
  combineValidators
};




