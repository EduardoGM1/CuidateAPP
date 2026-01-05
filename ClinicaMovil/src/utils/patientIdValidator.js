/**
 * Validador de ID de Paciente para Frontend
 * SOLUCIÓN DEFENSIVA: Previene envío de IDs inválidos o inexistentes
 */

import Logger from '../services/logger';

/**
 * Valida que un pacienteId sea válido antes de usarlo
 * @param {string|number} pacienteId - ID del paciente a validar
 * @returns {Object} { isValid, error, suggestion }
 */
export const validatePatientId = (pacienteId) => {
  // Si no hay pacienteId, es válido (se usará búsqueda global)
  if (!pacienteId || pacienteId === null || pacienteId === undefined || pacienteId === '') {
    return {
      isValid: true,
      willUseGlobalSearch: true,
      error: null,
      suggestion: null
    };
  }

  // Convertir a número
  const idNum = parseInt(pacienteId);

  // Validar que es un número válido
  if (isNaN(idNum) || idNum <= 0) {
    Logger.warn('ID de paciente inválido detectado', { pacienteId, idNum });
    return {
      isValid: false,
      willUseGlobalSearch: false,
      error: 'ID de paciente inválido',
      suggestion: 'El ID debe ser un número positivo. Intenta iniciar sesión solo con tu PIN.'
    };
  }

  // IDs conocidos como problemáticos (hardcodeados en código antiguo)
  const problematicIds = ['7', 7]; // IDs que sabemos que no existen
  
  // También detectar strings descriptivos que no son IDs reales
  if (typeof pacienteId === 'string' && 
      (pacienteId.toLowerCase().includes('búsqueda') || 
       pacienteId.toLowerCase().includes('global') ||
       pacienteId.toLowerCase().includes('search'))) {
    Logger.info('String descriptivo detectado, usando búsqueda global', { pacienteId });
    return {
      isValid: true,
      willUseGlobalSearch: true,
      error: null,
      suggestion: null
    };
  }
  
  if (problematicIds.includes(pacienteId) || problematicIds.includes(idNum)) {
    Logger.warn('ID de paciente problemático detectado (probablemente hardcodeado)', { 
      pacienteId, 
      idNum,
      suggestion: 'Usar búsqueda global por PIN'
    });
    return {
      isValid: false,
      willUseGlobalSearch: true,
      error: 'ID de paciente no válido',
      suggestion: 'Este ID de paciente no existe. Se usará búsqueda global por PIN.'
    };
  }

  return {
    isValid: true,
    willUseGlobalSearch: false,
    error: null,
    suggestion: null
  };
};

/**
 * Sanitiza un pacienteId antes de enviarlo al backend
 * Si es inválido o problemático, retorna null para usar búsqueda global
 * @param {string|number|null|undefined} pacienteId - ID del paciente
 * @returns {number|null} ID sanitizado o null para búsqueda global
 */
export const sanitizePatientId = (pacienteId) => {
  // SOLUCIÓN MEJORADA: Normalizar primero valores vacíos o descriptivos
  if (pacienteId === null || 
      pacienteId === undefined || 
      pacienteId === '' ||
      pacienteId === 'búsqueda global' ||
      (typeof pacienteId === 'string' && (
        pacienteId.toLowerCase().includes('búsqueda') ||
        pacienteId.toLowerCase().includes('global') ||
        pacienteId.toLowerCase().includes('search')
      ))) {
    Logger.debug('pacienteId es null/vacío/descriptivo, usando búsqueda global', { original: pacienteId });
    return null;
  }

  // Ahora validar el pacienteId real
  const validation = validatePatientId(pacienteId);

  if (!validation.isValid) {
    if (validation.willUseGlobalSearch) {
      Logger.info('Usando búsqueda global por PIN (pacienteId inválido o problemático)', {
        originalPacienteId: pacienteId
      });
      return null; // Usar búsqueda global
    }
    return null; // También usar búsqueda global si hay error
  }

  // Si es válido, retornar como número
  return typeof pacienteId === 'number' ? pacienteId : parseInt(pacienteId);
};

/**
 * Valida y sanitiza pacienteId desde parámetros de ruta
 * @param {Object} routeParams - Parámetros de la ruta
 * @returns {number|null} ID sanitizado o null
 */
export const getValidatedPatientIdFromRoute = (routeParams) => {
  const pacienteId = routeParams?.pacienteId;
  return sanitizePatientId(pacienteId);
};

export default {
  validatePatientId,
  sanitizePatientId,
  getValidatedPatientIdFromRoute
};

