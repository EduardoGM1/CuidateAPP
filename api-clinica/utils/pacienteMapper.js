/**
 * @file pacienteMapper.js
 * @description Mapper centralizado para transformar datos de Paciente a formato estándar
 * @author Senior Developer
 * @date 2025-10-28
 * 
 * Este módulo centraliza la transformación de datos de Sequelize a formato estándar
 * para mantener consistencia en toda la aplicación y evitar duplicación de lógica.
 */

import EncryptionService from '../services/encryptionService.js';

/**
 * Helper function para desencriptar un campo si está encriptado
 * Maneja tanto formato JSON como formato iv:tag:data
 */
const decryptFieldIfNeeded = (value) => {
  if (!value || value === null || value === undefined || value === '') {
    return value;
  }
  
  // Solo intentar desencriptar si es string
  if (typeof value !== 'string') {
    return value;
  }
  
  try {
    // Intentar formato JSON primero (EncryptionService)
    try {
      const jsonData = JSON.parse(value);
      if (jsonData.encrypted && jsonData.iv && jsonData.authTag) {
        // Es formato JSON encriptado, desencriptar
        const decrypted = EncryptionService.decrypt(value);
        return decrypted !== null ? decrypted : value;
      }
    } catch (jsonError) {
      // No es JSON válido, continuar
    }
    
    // Si no parece estar encriptado, retornar valor original
    return value;
  } catch (error) {
    // En caso de error, retornar valor original
    return value;
  }
};

/**
 * Normaliza las comorbilidades de Sequelize a formato estándar
 * 
 * @param {Array|null|undefined} comorbilidades - Array de Comorbilidad de Sequelize o null/undefined
 * @returns {Array} Array normalizado con estructura estándar
 * 
 * @example
 * // Input (Sequelize format)
 * [
 *   {
 *     id_comorbilidad: 1,
 *     nombre_comorbilidad: "Diabetes",
 *     descripcion: "...",
 *     PacienteComorbilidad: {
 *       fecha_deteccion: "2025-01-15",
 *       observaciones: "Diagnosticada en consulta"
 *     }
 *   }
 * ]
 * 
 * // Output (Standard format)
 * [
 *   {
 *     id: 1,
 *     nombre: "Diabetes",
 *     descripcion: "...",
 *     fecha_deteccion: "2025-01-15",
 *     observaciones: "Diagnosticada en consulta"
 *   }
 * ]
 */
export const normalizeComorbilidades = (comorbilidades) => {
  // Casos edge: null, undefined, no array
  // También manejar el caso donde Sequelize devuelve un objeto vacío que parece array
  if (!comorbilidades) {
    return [];
  }
  
  // Sequelize puede devolver objetos que parecen arrays pero no lo son
  if (!Array.isArray(comorbilidades)) {
    // Si es un objeto con propiedades, intentar convertirlo
    if (typeof comorbilidades === 'object') {
      // Verificar si tiene estructura de Sequelize (puede ser un objeto vacío)
      return [];
    }
    return [];
  }

  // Si el array está vacío
  if (comorbilidades.length === 0) {
    return [];
  }

  return comorbilidades
    .map(com => {
      // Validar que sea un objeto válido
      if (!com || typeof com !== 'object') {
        return null;
      }

      // Extraer datos de la comorbilidad
      const id = com.id_comorbilidad || com.id;
      const nombre = com.nombre_comorbilidad || com.nombre;
      
      // Validar campos requeridos
      if (!id || !nombre) {
        return null;
      }

      // Extraer datos de la tabla intermedia (PacienteComorbilidad)
      // Puede venir como objeto anidado o como propiedad directa
      const throughData = com.PacienteComorbilidad || com.through || {};
      
      // Desencriptar observaciones si están encriptadas
      const observaciones = throughData.observaciones || com.observaciones || null;
      const observacionesDesencriptadas = observaciones ? decryptFieldIfNeeded(observaciones) : null;
      
      const comorbilidad = {
        id: Number(id),
        nombre: String(nombre).trim(),
        descripcion: com.descripcion || null,
        fecha_deteccion: throughData.fecha_deteccion || com.fecha_deteccion || null,
        observaciones: observacionesDesencriptadas // Desencriptado si estaba encriptado
      };
      
      return comorbilidad;
    })
    .filter(com => com !== null) // Eliminar nulos (datos inválidos)
    .sort((a, b) => compareComorbilidadesByDate(a, b)); // Ordenar por fecha (más reciente primero)
};

/**
 * Normaliza un paciente completo incluyendo todas sus relaciones
 * 
 * @param {Object} pacienteData - Datos del paciente de Sequelize (ya convertido a JSON)
 * @param {Object} options - Opciones de normalización
 * @param {boolean} options.includeComorbilidades - Incluir comorbilidades normalizadas (default: true)
 * @param {boolean} options.includeDoctor - Incluir información del doctor (default: true)
 * @returns {Object} Paciente normalizado con estructura estándar
 */
export const normalizePaciente = (pacienteData, options = {}) => {
  if (!pacienteData || typeof pacienteData !== 'object') {
    return null;
  }

  const {
    includeComorbilidades = true,
    includeDoctor = true
  } = options;

  // Desencriptar campos encriptados (fallback si los hooks no funcionaron)
  const curp = decryptFieldIfNeeded(pacienteData.curp);
  const numero_celular = decryptFieldIfNeeded(pacienteData.numero_celular);
  const direccion = decryptFieldIfNeeded(pacienteData.direccion);
  const fecha_nacimiento = decryptFieldIfNeeded(pacienteData.fecha_nacimiento);
  
  // Base del objeto normalizado
  const normalized = {
    id_paciente: pacienteData.id_paciente,
    id_usuario: pacienteData.id_usuario || null,
    nombre: pacienteData.nombre || '',
    apellido_paterno: pacienteData.apellido_paterno || '',
    apellido_materno: pacienteData.apellido_materno || null,
    fecha_nacimiento: fecha_nacimiento || null, // Desencriptado si estaba encriptado
    curp: curp || null, // Desencriptado si estaba encriptado
    institucion_salud: pacienteData.institucion_salud || null,
    sexo: pacienteData.sexo || null,
    direccion: direccion || null, // Desencriptado si estaba encriptado
    estado: pacienteData.estado || null,
    localidad: pacienteData.localidad || null,
    numero_celular: numero_celular || null, // Desencriptado si estaba encriptado
    id_modulo: pacienteData.id_modulo || null,
    activo: pacienteData.activo !== undefined ? Boolean(pacienteData.activo) : true,
    fecha_registro: pacienteData.fecha_registro || null,
    email: pacienteData.Usuario?.email || null,
    // Campos calculados
    nombre_completo: [
      pacienteData.nombre,
      pacienteData.apellido_paterno,
      pacienteData.apellido_materno || ''
    ].filter(Boolean).join(' '),
    edad: fecha_nacimiento
      ? Math.floor((new Date() - new Date(fecha_nacimiento)) / (365.25 * 24 * 60 * 60 * 1000))
      : null
  };

  // Normalizar doctor
  if (includeDoctor) {
    if (pacienteData.Doctors && Array.isArray(pacienteData.Doctors) && pacienteData.Doctors.length > 0) {
      const doctor = pacienteData.Doctors[0];
      normalized.doctor_nombre = [
        doctor.nombre,
        doctor.apellido_paterno,
        doctor.apellido_materno || ''
      ].filter(Boolean).join(' ') || 'Sin nombre';
      normalized.id_doctor = doctor.id_doctor || null;
    } else {
      normalized.doctor_nombre = 'Sin doctor asignado';
      normalized.id_doctor = null;
    }
  }

  // Normalizar comorbilidades
  // Ahora usamos alias explícito 'Comorbilidades' en associations.js
  if (includeComorbilidades) {
    normalized.comorbilidades = normalizeComorbilidades(
      pacienteData.Comorbilidades || // ✅ Alias explícito definido en associations.js
      pacienteData.Comorbilidads || // Fallback: Sequelize pluraliza automáticamente
      pacienteData.comorbilidades   // Fallback: Minúscula
    );
  }

  return normalized;
};

/**
 * Valida que una comorbilidad tenga la estructura correcta
 * 
 * @param {Object} comorbilidad - Objeto de comorbilidad a validar
 * @returns {boolean} true si es válida, false en caso contrario
 */
export const isValidComorbilidad = (comorbilidad) => {
  if (!comorbilidad || typeof comorbilidad !== 'object') {
    return false;
  }

  const id = comorbilidad.id || comorbilidad.id_comorbilidad;
  const nombre = comorbilidad.nombre || comorbilidad.nombre_comorbilidad;

  return !!(id && nombre);
};

/**
 * Compara dos comorbilidades por nombre (para ordenamiento)
 * 
 * @param {Object} a - Primera comorbilidad
 * @param {Object} b - Segunda comorbilidad
 * @returns {number} -1, 0, o 1 para ordenamiento
 */
export const compareComorbilidadesByName = (a, b) => {
  const nombreA = (a.nombre || a.nombre_comorbilidad || '').toLowerCase();
  const nombreB = (b.nombre || b.nombre_comorbilidad || '').toLowerCase();
  return nombreA.localeCompare(nombreB);
};

/**
 * Ordena comorbilidades por fecha de detección (más reciente primero)
 * 
 * @param {Object} a - Primera comorbilidad
 * @param {Object} b - Segunda comorbilidad
 * @returns {number} -1, 0, o 1 para ordenamiento
 */
export const compareComorbilidadesByDate = (a, b) => {
  const fechaA = a.fecha_deteccion || '';
  const fechaB = b.fecha_deteccion || '';
  
  if (!fechaA && !fechaB) return 0;
  if (!fechaA) return 1; // Sin fecha al final
  if (!fechaB) return -1;
  
  return new Date(fechaB) - new Date(fechaA); // Más reciente primero
};

