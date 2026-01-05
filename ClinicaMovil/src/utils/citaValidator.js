/**
 * Validador específico para formularios de citas
 * Integrado con el sistema de validación
 */

import { 
  sanitizeString, 
  isValidDate, 
  isDateInPast,
  isValidLength 
} from './validation';

/**
 * Validar datos de cita antes de enviar
 * @param {Object} data - Datos de la cita
 * @returns {Object} - { isValid: boolean, errors: Object }
 */
export const validateCita = (data) => {
  const errors = {};
  
  // Validar fecha y hora
  if (!data.fecha_cita) {
    errors.fecha_cita = 'La fecha y hora son requeridas';
  } else {
    // Intentar parsear como datetime (ISO o formato con hora)
    let fechaHora;
    if (data.fecha_cita.includes('T') || data.fecha_cita.includes(' ')) {
      // Formato con hora: 2025-10-31T14:30:00 o 2025-10-31 14:30:00
      fechaHora = new Date(data.fecha_cita.replace(' ', 'T'));
    } else if (data.fecha_cita.length === 10) {
      // Solo fecha: agregar hora por defecto 09:00
      fechaHora = new Date(data.fecha_cita + 'T09:00:00');
    } else {
      fechaHora = new Date(data.fecha_cita);
    }

    if (!isValidDate(data.fecha_cita) || isNaN(fechaHora.getTime())) {
      errors.fecha_cita = 'Fecha y hora inválidas';
    } else {
      // Comparar datetime completo (incluye hora)
      const ahora = new Date();
      ahora.setSeconds(0);
      ahora.setMilliseconds(0);
      
      if (fechaHora < ahora) {
        errors.fecha_cita = 'No se pueden crear citas en el pasado';
      } else {
        // Verificar que no sea más de 10 años en el futuro
        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() + 10);
        
        if (fechaHora > maxDate) {
          errors.fecha_cita = 'La fecha no puede ser más de 10 años en el futuro';
        }
      }
    }
  }
  
  // Validar motivo (requerido, 3-255 caracteres)
  const motivoSanitizado = sanitizeString(data.motivo, 255);
  
  if (!motivoSanitizado) {
    errors.motivo = 'El motivo es requerido';
  } else if (!isValidLength(motivoSanitizado, 3, 255)) {
    errors.motivo = 'El motivo debe tener entre 3 y 255 caracteres';
  }
  
  // Validar observaciones (opcional, max 2000 caracteres)
  if (data.observaciones) {
    if (data.observaciones.length > 2000) {
      errors.observaciones = 'Las observaciones no pueden exceder 2000 caracteres';
    }
  }
  
  // Validar y sanitizar doctor (opcional pero debe ser válido si existe)
  let doctorIdSanitizado = null;
  if (data.id_doctor !== null && data.id_doctor !== undefined && data.id_doctor !== '') {
    const doctorId = parseInt(data.id_doctor, 10);
    if (isNaN(doctorId) || doctorId <= 0) {
      errors.id_doctor = 'Doctor inválido';
    } else {
      doctorIdSanitizado = doctorId;
    }
  }
  
  // Sanitizar observaciones de forma segura
  let observacionesSanitizadas = null;
  try {
    observacionesSanitizadas = data.observaciones ? sanitizeString(data.observaciones, 2000) : null;
  } catch (error) {
    // Si falla la sanitización, usar el valor original o null
    observacionesSanitizadas = data.observaciones || null;
  }
  
  // SIEMPRE devolver sanitizedData, incluso si hay errores
  const sanitizedData = {
    ...data,
    id_doctor: doctorIdSanitizado, // Convertir a número
    motivo: motivoSanitizado || data.motivo || '', // Fallback al valor original si falla
    observaciones: observacionesSanitizadas,
    es_primera_consulta: Boolean(data.es_primera_consulta),
    fecha_cita: data.fecha_cita || null // Asegurar que fecha_cita esté presente
  };
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedData
  };
};

/**
 * Validar datos de signos vitales
 */
export const validateSignosVitales = (data) => {
  const errors = {};
  
  // Validar que al menos un campo esté lleno
  const hasData = data.peso_kg || 
                  data.talla_m || 
                  data.presion_sistolica || 
                  data.glucosa_mg_dl;
  
  if (!hasData) {
    errors.general = 'Debe completar al menos un campo';
    return {
      isValid: false,
      errors
    };
  }
  
  // Validar peso (opcional pero si existe, debe ser válido)
  if (data.peso_kg) {
    const peso = parseFloat(data.peso_kg);
    if (isNaN(peso) || peso <= 0 || peso > 500) {
      errors.peso_kg = 'Peso inválido (debe ser entre 0.1 y 500 kg)';
    }
  }
  
  // Validar talla (opcional pero si existe, debe ser válido)
  if (data.talla_m) {
    const talla = parseFloat(data.talla_m);
    if (isNaN(talla) || talla <= 0 || talla > 3) {
      errors.talla_m = 'Talla inválida (debe ser entre 0.1 y 3.0 m)';
    }
  }
  
  // Validar presión arterial
  if (data.presion_sistolica && data.presion_diastolica) {
    const sistolica = parseInt(data.presion_sistolica);
    const diastolica = parseInt(data.presion_diastolica);
    
    if (isNaN(sistolica) || sistolica < 50 || sistolica > 250) {
      errors.presion_sistolica = 'Presión sistólica inválida (50-250)';
    }
    if (isNaN(diastolica) || diastolica < 30 || diastolica > 150) {
      errors.presion_diastolica = 'Presión diastólica inválida (30-150)';
    }
    if (sistolica < diastolica) {
      errors.presion_general = 'La presión sistólica debe ser mayor que la diastólica';
    }
  }
  
  // Validar glucosa
  if (data.glucosa_mg_dl) {
    const glucosa = parseFloat(data.glucosa_mg_dl);
    if (isNaN(glucosa) || glucosa < 30 || glucosa > 600) {
      errors.glucosa_mg_dl = 'Glucosa inválida (30-600 mg/dl)';
    }
  }
  
  // Validar colesterol
  if (data.colesterol_mg_dl) {
    const colesterol = parseFloat(data.colesterol_mg_dl);
    if (isNaN(colesterol) || colesterol < 0 || colesterol > 500) {
      errors.colesterol_mg_dl = 'Colesterol inválido (0-500 mg/dl)';
    }
  }
  
  // Validar triglicéridos
  if (data.trigliceridos_mg_dl) {
    const trigs = parseFloat(data.trigliceridos_mg_dl);
    if (isNaN(trigs) || trigs < 0 || trigs > 1000) {
      errors.trigliceridos_mg_dl = 'Triglicéridos inválidos (0-1000 mg/dl)';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};



