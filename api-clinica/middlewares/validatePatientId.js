/**
 * Middleware para validar que un pacienteId existe antes de procesar la solicitud
 * SOLUCIÓN DEFENSIVA: Previene errores 404 por IDs inexistentes
 */

import { Paciente } from '../models/associations.js';
import logger from '../utils/logger.js';

/**
 * Valida que el pacienteId existe y está activo
 * Si no existe, intenta sugerir búsqueda global o devuelve error descriptivo
 */
export const validatePatientId = async (req, res, next) => {
  const { id_paciente, pacienteId } = req.body || req.params || {};
  const patientId = id_paciente || pacienteId;

  // Si no hay pacienteId, continuar (puede ser búsqueda global)
  if (!patientId) {
    return next();
  }

  try {
    const pacienteIdNum = parseInt(patientId);
    
    // Validar que es un número válido
    if (isNaN(pacienteIdNum) || pacienteIdNum <= 0) {
      logger.warn('ID de paciente inválido recibido', { 
        patientId, 
        pacienteIdNum,
        endpoint: req.path 
      });
      
      return res.status(400).json({
        success: false,
        error: 'ID de paciente inválido',
        suggestion: 'Intenta iniciar sesión solo con tu PIN (sin ID de paciente)'
      });
    }

    // Verificar que el paciente existe
    const paciente = await Paciente.findByPk(pacienteIdNum);

    if (!paciente) {
      logger.warn('Intento de acceso con pacienteId inexistente', {
        pacienteId: pacienteIdNum,
        endpoint: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Si es un endpoint de login, sugerir búsqueda global
      if (req.path.includes('login')) {
        return res.status(404).json({
          success: false,
          error: 'Paciente no encontrado',
          suggestion: 'El ID de paciente proporcionado no existe. Intenta iniciar sesión solo con tu PIN.',
          fallback_available: true
        });
      }

      return res.status(404).json({
        success: false,
        error: 'Paciente no encontrado',
        pacienteId: pacienteIdNum
      });
    }

    if (!paciente.activo) {
      logger.warn('Intento de acceso a paciente inactivo', {
        pacienteId: pacienteIdNum,
        endpoint: req.path
      });

      return res.status(403).json({
        success: false,
        error: 'Paciente inactivo',
        pacienteId: pacienteIdNum
      });
    }

    // Agregar paciente validado al request para uso posterior
    req.validatedPaciente = paciente;
    next();
  } catch (error) {
    logger.error('Error validando pacienteId', {
      error: error.message,
      patientId,
      endpoint: req.path
    });

    return res.status(500).json({
      success: false,
      error: 'Error validando paciente',
      message: error.message
    });
  }
};

/**
 * Middleware opcional: Solo valida si pacienteId está presente
 * Útil para endpoints que pueden funcionar con o sin pacienteId
 */
export const validatePatientIdIfPresent = async (req, res, next) => {
  const { id_paciente, pacienteId } = req.body || req.params || {};
  const patientId = id_paciente || pacienteId;

  // Si no hay pacienteId, continuar sin validar
  if (!patientId) {
    return next();
  }

  // Si hay pacienteId, validar
  return validatePatientId(req, res, next);
};

