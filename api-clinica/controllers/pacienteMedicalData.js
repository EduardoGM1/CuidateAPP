import EncryptionService from '../services/encryptionService.js';
import { decrypt as decryptUtils } from '../utils/encryption.js';
import { 
  Cita, 
  Paciente, 
  Doctor, 
  SignoVital, 
  Diagnostico, 
  PlanMedicacion,
  PlanDetalle,
  Medicamento,
  Usuario,
  RedApoyo,
  EsquemaVacunacion,
  DoctorPaciente,
  Comorbilidad,
  PacienteComorbilidad
} from '../models/associations.js';
import sequelize from '../config/db.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';
import alertService from '../services/alertService.js';
import realtimeService from '../services/realtimeService.js';
import { crearNotificacionDoctor } from './cita.js';

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
    // Intentar formato JSON primero (EncryptionService - formato {"encrypted":"...","iv":"...","authTag":"..."})
    try {
      const jsonData = JSON.parse(value);
      if (jsonData.encrypted && jsonData.iv && jsonData.authTag) {
        // Es formato JSON encriptado, desencriptar
        const decrypted = EncryptionService.decrypt(value);
        return decrypted !== null ? decrypted : value;
      }
    } catch (jsonError) {
      // No es JSON válido, continuar con formato iv:tag:data
    }
    
    // Verificar formato iv:tag:data (3 partes separadas por :)
    const parts = value.split(':');
    if (parts.length === 3 && parts[0].length > 0 && parts[1].length > 0 && parts[2].length > 0) {
      try {
        // Usar decrypt de utils/encryption.js para formato iv:tag:data
        const decrypted = decryptUtils(value);
        // Si se desencriptó correctamente (retorna diferente al original), usar el valor desencriptado
        if (decrypted !== null && decrypted !== value) {
          return decrypted;
        }
      } catch (decryptError) {
        // Si falla la desencriptación, retornar valor original
        logger.debug(`Error desencriptando campo en formato iv:tag:data: ${decryptError.message}`);
      }
    }
    
    // No parece estar encriptado, retornar valor original
    return value;
  } catch (error) {
    logger.debug(`Error intentando desencriptar campo: ${error.message}`);
    return value; // En caso de error, retornar valor original
  }
};

/**
 * Verifica si un paciente tiene diagnóstico de Hipercolesterolemia o Dislipidemia
 * @param {number} pacienteId - ID del paciente
 * @returns {Promise<boolean>} - true si tiene el diagnóstico, false en caso contrario
 */
const tieneHipercolesterolemia = async (pacienteId) => {
  try {
    // ✅ MEJOR PRÁCTICA: Usar consulta más robusta con logging para debugging
    const comorbilidades = await PacienteComorbilidad.findAll({
      where: { id_paciente: pacienteId },
      include: [{
        model: Comorbilidad,
        attributes: ['id_comorbilidad', 'nombre_comorbilidad'],
        required: true // INNER JOIN para asegurar que existe la relación
      }]
    });

    if (!comorbilidades || comorbilidades.length === 0) {
      logger.debug('No se encontraron comorbilidades para el paciente', { pacienteId });
      return false;
    }

    // ✅ MEJOR PRÁCTICA: Búsqueda más flexible y robusta (case-insensitive, trim)
    // Buscar comorbilidades relacionadas con colesterol
    const nombresRelevantes = [
      'dislipidemia', 
      'hipercolesterolemia',
      'colesterol',
      'hiperlipidemia'
    ];
    
    const tieneDiagnostico = comorbilidades.some(pc => {
      const nombre = (pc.Comorbilidad?.nombre_comorbilidad || '').toLowerCase().trim();
      
      // Verificar si el nombre contiene alguna palabra relevante
      return nombresRelevantes.some(relevante => 
        nombre.includes(relevante.toLowerCase())
      );
    });
    
    if (tieneDiagnostico) {
      logger.debug('Paciente tiene diagnóstico de hipercolesterolemia/dislipidemia', {
        pacienteId,
        comorbilidades: comorbilidades.map(pc => pc.Comorbilidad?.nombre_comorbilidad).filter(Boolean)
      });
    } else {
      logger.debug('Paciente NO tiene diagnóstico de hipercolesterolemia/dislipidemia', {
        pacienteId,
        comorbilidadesEncontradas: comorbilidades.map(pc => pc.Comorbilidad?.nombre_comorbilidad).filter(Boolean)
      });
    }
    
    return tieneDiagnostico;
  } catch (error) {
    logger.error('Error verificando diagnóstico de hipercolesterolemia:', {
      error: error.message,
      stack: error.stack,
      pacienteId
    });
    return false;
  }
};

/**
 * Verifica si un paciente tiene diagnóstico de Hipertrigliceridemia
 * @param {number} pacienteId - ID del paciente
 * @returns {Promise<boolean>} - true si tiene el diagnóstico, false en caso contrario
 */
const tieneHipertrigliceridemia = async (pacienteId) => {
  try {
    const comorbilidades = await PacienteComorbilidad.findAll({
      where: { id_paciente: pacienteId },
      include: [{
        model: Comorbilidad,
        attributes: ['id_comorbilidad', 'nombre_comorbilidad'],
        required: true
      }]
    });

    if (!comorbilidades || comorbilidades.length === 0) {
      logger.debug('No se encontraron comorbilidades para el paciente', { pacienteId });
      return false;
    }

    // Buscar comorbilidades relacionadas con triglicéridos
    const nombresRelevantes = [
      'hipertrigliceridemia',
      'trigliceridos',
      'hipertrigliceridemia',
      'dislipidemia' // Dislipidemia puede incluir hipertrigliceridemia
    ];
    
    const tieneDiagnostico = comorbilidades.some(pc => {
      const nombre = (pc.Comorbilidad?.nombre_comorbilidad || '').toLowerCase().trim();
      
      return nombresRelevantes.some(relevante => 
        nombre.includes(relevante.toLowerCase())
      );
    });
    
    if (tieneDiagnostico) {
      logger.debug('Paciente tiene diagnóstico de hipertrigliceridemia', {
        pacienteId,
        comorbilidades: comorbilidades.map(pc => pc.Comorbilidad?.nombre_comorbilidad).filter(Boolean)
      });
    } else {
      logger.debug('Paciente NO tiene diagnóstico de hipertrigliceridemia', {
        pacienteId,
        comorbilidadesEncontradas: comorbilidades.map(pc => pc.Comorbilidad?.nombre_comorbilidad).filter(Boolean)
      });
    }
    
    return tieneDiagnostico;
  } catch (error) {
    logger.error('Error verificando diagnóstico de hipertrigliceridemia:', {
      error: error.message,
      stack: error.stack,
      pacienteId
    });
    return false;
  }
};

/**
 * Valida los valores de colesterol LDL y HDL
 * @param {number|null|undefined} colesterol_ldl - Valor de LDL
 * @param {number|null|undefined} colesterol_hdl - Valor de HDL
 * @returns {string|null} - Mensaje de error si hay problema, null si está bien
 */
const validarColesterol = (colesterol_ldl, colesterol_hdl) => {
  // Validar LDL
  if (colesterol_ldl !== undefined && colesterol_ldl !== null && colesterol_ldl !== '') {
    const ldl = parseFloat(colesterol_ldl);
    if (isNaN(ldl) || ldl < 0 || ldl > 500) {
      return 'Colesterol LDL debe estar entre 0 y 500 mg/dL';
    }
  }

  // Validar HDL
  if (colesterol_hdl !== undefined && colesterol_hdl !== null && colesterol_hdl !== '') {
    const hdl = parseFloat(colesterol_hdl);
    if (isNaN(hdl) || hdl < 0 || hdl > 200) {
      return 'Colesterol HDL debe estar entre 0 y 200 mg/dL';
    }
  }

  return null;
};

/**
 * Valida la edad del paciente en medición
 * @param {number|string} edad - Edad del paciente
 * @returns {string|null} - Mensaje de error o null si es válida
 */
const validarEdadMedicion = (edad) => {
  if (edad === undefined || edad === null || edad === '') {
    return null; // Edad es opcional
  }

  const edadNum = parseInt(edad, 10);
  if (isNaN(edadNum) || edadNum < 0 || edadNum > 150) {
    return 'La edad debe estar entre 0 y 150 años';
  }

  return null;
};

/**
 * Valida HbA1c según la edad del paciente
 * @param {number|string} hba1c - Valor de HbA1c
 * @param {number|string} edad - Edad del paciente
 * @returns {string|null} - Mensaje de error o null si es válida
 */
const validarHbA1c = (hba1c, edad) => {
  if (hba1c === undefined || hba1c === null || hba1c === '') {
    return null; // HbA1c es opcional
  }

  const hba1cNum = parseFloat(hba1c);
  
  // Validar rango general (3.0% - 15.0%)
  if (isNaN(hba1cNum) || hba1cNum < 3.0 || hba1cNum > 15.0) {
    return 'HbA1c debe estar entre 3.0% y 15.0%';
  }

  // Si se proporciona edad, validar según rangos objetivo del formato GAM
  if (edad !== undefined && edad !== null && edad !== '') {
    const edadNum = parseInt(edad, 10);
    if (!isNaN(edadNum)) {
      if (edadNum >= 20 && edadNum < 60) {
        // Para 20-59 años: objetivo <7%
        if (hba1cNum > 7.0) {
          logger.warn('HbA1c por encima del objetivo para 20-59 años', {
            hba1c: hba1cNum,
            edad: edadNum,
            objetivo: '<7%'
          });
          // Nota: Solo genera warning, no bloquea (según formato GAM)
        }
      } else if (edadNum >= 60) {
        // Para 60+ años: objetivo <8%
        if (hba1cNum > 8.0) {
          logger.warn('HbA1c por encima del objetivo para 60+ años', {
            hba1c: hba1cNum,
            edad: edadNum,
            objetivo: '<8%'
          });
          // Nota: Solo genera warning, no bloquea (según formato GAM)
        }
      }
    }
  }

  return null;
};

/**
 * =====================================================
 * CONTROLADOR PARA DATOS MÉDICOS DE PACIENTES
 * =====================================================
 * 
 * Este controlador maneja endpoints específicos para obtener
 * datos médicos de un paciente: citas, signos vitales, 
 * diagnósticos y medicamentos.
 * 
 * Seguridad:
 * - Autenticación JWT requerida
 * - Autorización por roles (Admin/Doctor)
 * - Validación de acceso por doctor asignado
 * - Rate limiting aplicado
 * - Logging de todas las operaciones
 */

/**
 * Obtener citas de un paciente específico
 * GET /api/pacientes/:id/citas
 */
export const getPacienteCitas = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 10, offset = 0, sort = 'DESC' } = req.query;

    // Validar parámetros
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de paciente inválido'
      });
    }

    const pacienteId = parseInt(id);

    // Verificar que el paciente existe y está activo
    const paciente = await Paciente.findOne({
      where: { id_paciente: pacienteId, activo: true }
    });

    if (!paciente) {
      return res.status(404).json({
        success: false,
        error: 'Paciente no encontrado o inactivo'
      });
    }

    // Si es Doctor, verificar que tiene acceso al paciente
    if (req.user.rol === 'Doctor') {
      const doctor = await Doctor.findOne({ 
        where: { id_usuario: req.user.id } 
      });
      
      if (!doctor) {
        return res.status(403).json({
          success: false,
          error: 'Doctor no encontrado'
        });
      }

      // Verificar asignación
      const asignacion = await DoctorPaciente.findOne({
        where: {
          id_doctor: doctor.id_doctor,
          id_paciente: pacienteId
        }
      });

      if (!asignacion) {
        return res.status(403).json({
          success: false,
          error: 'No tienes acceso a este paciente'
        });
      }
    }

    // Obtener citas del paciente
    const citas = await Cita.findAndCountAll({
      where: { id_paciente: pacienteId },
      include: [
        {
          model: Doctor,
          attributes: ['nombre', 'apellido_paterno', 'apellido_materno'],
          required: false
        }
      ],
      order: [['fecha_cita', sort]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Formatear datos - Usando campos reales de la BD
    const citasFormateadas = citas.rows.map(cita => {
      // Usar campo estado si existe, sino calcular para compatibilidad
      let estado = cita.estado || 'pendiente';
      if (!cita.estado) {
        // Fallback: calcular basado en asistencia (compatibilidad)
        if (cita.asistencia === 1 || cita.asistencia === true) {
          estado = 'atendida';
        } else if (cita.asistencia === 0 || cita.asistencia === false) {
          estado = 'no_asistida';
        }
      }

      return {
        id_cita: cita.id_cita,
        id_paciente: cita.id_paciente,
        id_doctor: cita.id_doctor,
        fecha_cita: cita.fecha_cita,
        estado: estado,
        asistencia: cita.asistencia, // Mantener para compatibilidad
        fecha_reprogramada: cita.fecha_reprogramada,
        motivo_reprogramacion: cita.motivo_reprogramacion,
        motivo: cita.motivo,
        es_primera_consulta: cita.es_primera_consulta,
        observaciones: cita.observaciones,
        doctor_nombre: cita.Doctor ? 
          `${cita.Doctor.nombre} ${cita.Doctor.apellido_paterno}` : 
          'Sin doctor asignado',
        fecha_creacion: cita.fecha_creacion
      };
    });

    logger.info('Citas del paciente obtenidas', {
      pacienteId,
      total: citas.count,
      returned: citasFormateadas.length,
      userRole: req.user.rol
    });

    res.json({
      success: true,
      data: citasFormateadas,
      total: citas.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    logger.error('Error obteniendo citas del paciente:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

/**
 * Obtener signos vitales de un paciente específico
 * GET /api/pacientes/:id/signos-vitales
 */
export const getPacienteSignosVitales = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 10, offset = 0, sort = 'DESC' } = req.query;

    // Validar parámetros
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de paciente inválido'
      });
    }

    const pacienteId = parseInt(id);

    // Verificar que el paciente existe y está activo
    const paciente = await Paciente.findOne({
      where: { id_paciente: pacienteId, activo: true }
    });

    if (!paciente) {
      return res.status(404).json({
        success: false,
        error: 'Paciente no encontrado o inactivo'
      });
    }

    // Si es Doctor, verificar que tiene acceso al paciente
    if (req.user.rol === 'Doctor') {
      const doctor = await Doctor.findOne({ 
        where: { id_usuario: req.user.id } 
      });
      
      if (!doctor) {
        return res.status(403).json({
          success: false,
          error: 'Doctor no encontrado'
        });
      }

      // Verificar asignación
      const asignacion = await DoctorPaciente.findOne({
        where: {
          id_doctor: doctor.id_doctor,
          id_paciente: pacienteId
        }
      });

      if (!asignacion) {
        return res.status(403).json({
          success: false,
          error: 'No tienes acceso a este paciente'
        });
      }
    }

    // Obtener signos vitales del paciente
    const signosVitales = await SignoVital.findAndCountAll({
      where: { id_paciente: pacienteId },
      order: [['fecha_creacion', sort]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      raw: false // Asegurar que retorne instancias de Sequelize para que los hooks funcionen
    });

    // Formatear datos - usar toJSON() para asegurar que los hooks de desencriptación se apliquen
    const signosFormateados = signosVitales.rows.map(signo => {
      try {
        const signoData = signo.toJSON ? signo.toJSON() : signo;
        
        // Desencriptar campos numéricos si están encriptados (fallback si los hooks no funcionaron)
        const numericFields = ['presion_sistolica', 'presion_diastolica', 'glucosa_mg_dl', 
                               'colesterol_mg_dl', 'colesterol_ldl', 'colesterol_hdl', 
                               'trigliceridos_mg_dl', 'hba1c_porcentaje'];
        
        const decryptedData = { ...signoData };
        
        // Desencriptar campos numéricos
        numericFields.forEach(field => {
          const valorOriginal = decryptedData[field];
          
          // Si el valor es null o undefined, mantenerlo así
          if (valorOriginal === null || valorOriginal === undefined) {
            return; // Continuar con el siguiente campo
          }
          
          // Si ya es un número válido, los hooks ya lo desencriptaron correctamente
          if (typeof valorOriginal === 'number') {
            if (!isNaN(valorOriginal) && isFinite(valorOriginal)) {
              // Ya está desencriptado y es un número válido, mantenerlo
              decryptedData[field] = valorOriginal;
            } else {
              // Es NaN o Infinity, establecer a null
              decryptedData[field] = null;
            }
            return; // Continuar con el siguiente campo
          }
          
          // Si es string, procesarlo
          if (typeof valorOriginal === 'string') {
            const valorTrimmed = valorOriginal.trim();
            
            // Si está vacío, establecer a null
            if (valorTrimmed === '') {
              decryptedData[field] = null;
              return; // Continuar con el siguiente campo
            }
            
            // Verificar si es un número válido como string (ya desencriptado por hooks)
            const numValue = parseFloat(valorTrimmed);
            if (!isNaN(numValue) && isFinite(numValue) && valorTrimmed === String(numValue)) {
              // Es un número válido como string, los hooks ya lo desencriptaron
              decryptedData[field] = numValue;
              return; // Continuar con el siguiente campo
            }
            
            // No es un número válido, puede estar encriptado, intentar desencriptar
            const decrypted = decryptFieldIfNeeded(valorTrimmed);
            
            // Si se desencriptó (el valor cambió y no es null)
            if (decrypted !== valorTrimmed && decrypted !== null && decrypted !== undefined) {
              // Intentar convertir a número
              const numValueDecrypted = parseFloat(decrypted);
              if (!isNaN(numValueDecrypted) && isFinite(numValueDecrypted)) {
                decryptedData[field] = numValueDecrypted;
              } else {
                // No se pudo convertir a número, establecer a null para evitar NaN
                logger.warn(`No se pudo convertir a número el campo ${field} desencriptado: ${decrypted}`);
                decryptedData[field] = null;
              }
            } else {
              // No se desencriptó, puede que no esté encriptado o ya esté desencriptado
              // Si parece estar encriptado (formato iv:tag:data o JSON), establecer a null
              const parts = valorTrimmed.split(':');
              const isEncryptedFormat = (parts.length === 3 && parts[0].length > 0 && parts[1].length > 0 && parts[2].length > 0) ||
                                       (valorTrimmed.startsWith('{') && valorTrimmed.includes('encrypted'));
              
              if (isEncryptedFormat) {
                // Parece estar encriptado pero no se pudo desencriptar, establecer a null
                logger.warn(`No se pudo desencriptar el campo ${field}, parece estar encriptado: ${valorTrimmed.substring(0, 50)}`);
                decryptedData[field] = null;
              } else {
                // No parece estar encriptado, intentar convertir a número si es posible
                const numValueOriginal = parseFloat(valorTrimmed);
                if (!isNaN(numValueOriginal) && isFinite(numValueOriginal)) {
                  decryptedData[field] = numValueOriginal;
                } else {
                  // No es un número válido, establecer a null
                  decryptedData[field] = null;
                }
              }
            }
          } else {
            // Otro tipo de dato (boolean, etc.), establecer a null para campos numéricos
            decryptedData[field] = null;
          }
        });
        
        // Desencriptar observaciones
        if (decryptedData.observaciones) {
          decryptedData.observaciones = decryptFieldIfNeeded(decryptedData.observaciones);
        }
        
        return {
          id_signo: decryptedData.id_signo,
          id_paciente: decryptedData.id_paciente,
          id_cita: decryptedData.id_cita,
          fecha_medicion: decryptedData.fecha_medicion,
          peso_kg: decryptedData.peso_kg,
          talla_m: decryptedData.talla_m,
          imc: decryptedData.imc,
          medida_cintura_cm: decryptedData.medida_cintura_cm,
          presion_sistolica: decryptedData.presion_sistolica,
          presion_diastolica: decryptedData.presion_diastolica,
          glucosa_mg_dl: decryptedData.glucosa_mg_dl,
          colesterol_mg_dl: decryptedData.colesterol_mg_dl,
          colesterol_ldl: decryptedData.colesterol_ldl,
          colesterol_hdl: decryptedData.colesterol_hdl,
          trigliceridos_mg_dl: decryptedData.trigliceridos_mg_dl,
          hba1c_porcentaje: decryptedData.hba1c_porcentaje,
          registrado_por: decryptedData.registrado_por,
          observaciones: decryptedData.observaciones,
          fecha_creacion: decryptedData.fecha_creacion
        };
      } catch (mapError) {
        logger.error('Error mapeando signo vital individual', {
          error: mapError.message,
          signoId: signo.id_signo || 'unknown',
          stack: mapError.stack
        });
        // Retornar objeto mínimo para no romper todo el array
        return {
          id_signo: signo.id_signo,
          error: 'Error procesando datos del signo vital'
        };
      }
    });

    logger.info('Signos vitales del paciente obtenidos', {
      pacienteId,
      total: signosVitales.count,
      returned: signosFormateados.length,
      userRole: req.user.rol
    });

    res.json({
      success: true,
      data: signosFormateados,
      total: signosVitales.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    logger.error('Error obteniendo signos vitales del paciente:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

/**
 * Obtener diagnósticos de un paciente específico
 * GET /api/pacientes/:id/diagnosticos
 */
export const getPacienteDiagnosticos = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 10, offset = 0, sort = 'DESC' } = req.query;

    // Validar parámetros
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de paciente inválido'
      });
    }

    const pacienteId = parseInt(id);

    // Verificar que el paciente existe y está activo
    const paciente = await Paciente.findOne({
      where: { id_paciente: pacienteId, activo: true }
    });

    if (!paciente) {
      return res.status(404).json({
        success: false,
        error: 'Paciente no encontrado o inactivo'
      });
    }

    // Si es Doctor, verificar que tiene acceso al paciente
    if (req.user.rol === 'Doctor') {
      const doctor = await Doctor.findOne({ 
        where: { id_usuario: req.user.id } 
      });
      
      if (!doctor) {
        return res.status(403).json({
          success: false,
          error: 'Doctor no encontrado'
        });
      }

      // Verificar asignación
      const asignacion = await DoctorPaciente.findOne({
        where: {
          id_doctor: doctor.id_doctor,
          id_paciente: pacienteId
        }
      });

      if (!asignacion) {
        return res.status(403).json({
          success: false,
          error: 'No tienes acceso a este paciente'
        });
      }
    }

    // Obtener diagnósticos del paciente con información del doctor
    // ✅ CORREGIDO: Incluir diagnósticos con cita del paciente Y diagnósticos sin cita
    // Obtener todas las citas del paciente
    const citasPaciente = await Cita.findAll({
      where: { id_paciente: pacienteId },
      attributes: ['id_cita'],
      raw: true
    });
    const citasIds = citasPaciente.map(c => c.id_cita);

    // Construir condición WHERE
    let whereCondition = {};
    if (citasIds.length > 0) {
      whereCondition = {
        [Op.or]: [
          { id_cita: { [Op.in]: citasIds } },
          { id_cita: null }
        ]
      };
    } else {
      // Si no hay citas, solo mostrar diagnósticos sin cita
      whereCondition = { id_cita: null };
    }

    // Obtener diagnósticos
    const diagnosticos = await Diagnostico.findAndCountAll({
      attributes: ['id_diagnostico', 'id_cita', 'descripcion', 'fecha_registro'],
      where: whereCondition,
      include: [
        {
          model: Cita,
          as: 'Cita',
          required: false, // ✅ LEFT JOIN - incluir diagnósticos sin cita
          where: citasIds.length > 0 ? { id_paciente: pacienteId } : undefined,
          include: [
            {
              model: Doctor,
              required: false, // LEFT JOIN - incluir citas sin doctor
              attributes: ['nombre', 'apellido_paterno', 'apellido_materno']
            }
          ]
        }
      ],
      order: [['fecha_registro', sort]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Formatear datos - usar toJSON() para asegurar que los hooks de desencriptación se apliquen
    const diagnosticosFormateados = diagnosticos.rows.map(diagnostico => {
      try {
        const diagnosticoData = diagnostico.toJSON ? diagnostico.toJSON() : diagnostico;
        
        // Desencriptar descripcion si está encriptada (fallback si los hooks no funcionaron)
        let descripcion = diagnosticoData.descripcion;
        if (descripcion) {
          descripcion = decryptFieldIfNeeded(descripcion);
        }
        
        // Acceder a la estructura Cita.Doctor correctamente
        const doctor = diagnosticoData.Cita?.Doctor;
        const doctor_nombre = doctor 
          ? `${doctor.nombre || ''} ${doctor.apellido_paterno || ''}`.trim()
          : 'Sin doctor asignado';

        return {
          id_diagnostico: diagnosticoData.id_diagnostico,
          id_cita: diagnosticoData.id_cita,
          descripcion: descripcion || null, // Desencriptado si estaba encriptado
          fecha_registro: diagnosticoData.fecha_registro,
          doctor_nombre: doctor_nombre
        };
      } catch (mapError) {
        logger.error('Error mapeando diagnóstico individual', {
          error: mapError.message,
          diagnosticoId: diagnostico.id_diagnostico || 'unknown',
          stack: mapError.stack
        });
        // Retornar objeto mínimo para no romper todo el array
        return {
          id_diagnostico: diagnostico.id_diagnostico,
          error: 'Error procesando datos del diagnóstico'
        };
      }
    });

    logger.info('Diagnósticos del paciente obtenidos', {
      pacienteId,
      total: diagnosticos.count,
      returned: diagnosticosFormateados.length,
      userRole: req.user.rol
    });

    res.json({
      success: true,
      data: diagnosticosFormateados,
      total: diagnosticos.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    logger.error('Error obteniendo diagnósticos del paciente:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

/**
 * Obtener medicamentos de un paciente específico
 * GET /api/pacientes/:id/medicamentos
 */
export const getPacienteMedicamentos = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 10, offset = 0, sort = 'DESC' } = req.query;

    // Validar parámetros
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de paciente inválido'
      });
    }

    const pacienteId = parseInt(id);

    // Verificar que el paciente existe y está activo
    const paciente = await Paciente.findOne({
      where: { id_paciente: pacienteId, activo: true }
    });

    if (!paciente) {
      return res.status(404).json({
        success: false,
        error: 'Paciente no encontrado o inactivo'
      });
    }

    // Si es Doctor, verificar que tiene acceso al paciente
    if (req.user.rol === 'Doctor') {
      const doctor = await Doctor.findOne({ 
        where: { id_usuario: req.user.id } 
      });
      
      if (!doctor) {
        return res.status(403).json({
          success: false,
          error: 'Doctor no encontrado'
        });
      }

      // Verificar asignación
      const asignacion = await DoctorPaciente.findOne({
        where: {
          id_doctor: doctor.id_doctor,
          id_paciente: pacienteId
        }
      });

      if (!asignacion) {
        return res.status(403).json({
          success: false,
          error: 'No tienes acceso a este paciente'
        });
      }
    }

    // Obtener medicamentos del paciente con detalles
    let medicamentos;
    try {
      medicamentos = await PlanMedicacion.findAndCountAll({
        where: { id_paciente: pacienteId },
        include: [
          {
            model: Doctor,
            attributes: ['nombre', 'apellido_paterno', 'apellido_materno'],
            required: false
          },
          {
            model: PlanDetalle,
            include: [
              {
                model: Medicamento,
                attributes: ['id_medicamento', 'nombre_medicamento', 'descripcion']
              }
            ]
          }
        ],
        order: [['fecha_creacion', sort]],
        limit: parseInt(limit),
        offset: parseInt(offset),
        raw: false // Asegurar que retorne instancias de Sequelize para que los hooks funcionen
      });
      
      logger.debug('Medicamentos obtenidos de BD', {
        count: medicamentos.count,
        rowsCount: medicamentos.rows.length,
        firstPlanSample: medicamentos.rows.length > 0 ? {
          id_plan: medicamentos.rows[0].id_plan,
          hasObservaciones: !!medicamentos.rows[0].observaciones,
          observacionesType: typeof medicamentos.rows[0].observaciones,
          observacionesValue: medicamentos.rows[0].observaciones ? medicamentos.rows[0].observaciones.substring(0, 50) + '...' : null
        } : null
      });
    } catch (queryError) {
      logger.error('Error en consulta findAndCountAll de medicamentos', {
        error: queryError.message,
        stack: queryError.stack,
        name: queryError.name,
        originalError: queryError.original?.message || queryError.original,
        sql: queryError.sql || queryError.original?.sql
      });
      throw queryError;
    }

    // Formatear datos - crear un entry por cada medicamento en cada plan
    // IMPORTANTE: Usar toJSON() para asegurar que los hooks de desencriptación se apliquen
    const medicamentosFormateados = [];
    
    medicamentos.rows.forEach(plan => {
      try {
        // Convertir a JSON para que los hooks de desencriptación se apliquen
        const planData = plan.toJSON ? plan.toJSON() : plan;
        
        // Si el plan tiene detalles de medicamentos
        if (planData.PlanDetalles && Array.isArray(planData.PlanDetalles) && planData.PlanDetalles.length > 0) {
          planData.PlanDetalles.forEach(detalle => {
            // Asegurar que detalle también esté en formato JSON
            const detalleData = detalle.toJSON ? detalle.toJSON() : detalle;
            
            // Desencriptar observaciones si están encriptadas (fallback si los hooks no funcionaron)
            let observacionesDetalle = detalleData.observaciones;
            let observacionesPlan = planData.observaciones;
            
            try {
              // Intentar desencriptar si está en formato JSON encriptado
              if (observacionesDetalle && typeof observacionesDetalle === 'string') {
                try {
                  const jsonData = JSON.parse(observacionesDetalle);
                  if (jsonData.encrypted && jsonData.iv && jsonData.authTag) {
                    observacionesDetalle = EncryptionService.decrypt(observacionesDetalle);
                  }
                } catch (e) {
                  // No es JSON, puede estar desencriptado o en otro formato
                }
              }
              
              if (observacionesPlan && typeof observacionesPlan === 'string') {
                try {
                  const jsonData = JSON.parse(observacionesPlan);
                  if (jsonData.encrypted && jsonData.iv && jsonData.authTag) {
                    observacionesPlan = EncryptionService.decrypt(observacionesPlan);
                  }
                } catch (e) {
                  // No es JSON, puede estar desencriptado o en otro formato
                }
              }
            } catch (decryptError) {
              logger.warn('Error desencriptando observaciones en medicamentos', {
                error: decryptError.message,
                planId: planData.id_plan
              });
            }
            
            medicamentosFormateados.push({
              id_plan: planData.id_plan,
              id_medicamento: detalleData.Medicamento?.id_medicamento || null,
              nombre_medicamento: detalleData.Medicamento?.nombre_medicamento || 'Medicamento desconocido',
              descripcion: detalleData.Medicamento?.descripcion || null,
              dosis: detalleData.dosis || null,
              frecuencia: detalleData.frecuencia || null,
              horario: detalleData.horario || null, // Mantener para compatibilidad
              horarios: detalleData.horarios && Array.isArray(detalleData.horarios) ? detalleData.horarios : (detalleData.horario ? [detalleData.horario] : []), // Nuevo campo
              via_administracion: detalleData.via_administracion || null,
              observaciones: observacionesDetalle || observacionesPlan || null, // Desencriptado si estaba encriptado
              fecha_inicio: planData.fecha_inicio,
              fecha_fin: planData.fecha_fin,
              estado: planData.activo ? 'Activo' : 'Inactivo',
              doctor_nombre: planData.Doctor ? 
                `${planData.Doctor.nombre || ''} ${planData.Doctor.apellido_paterno || ''}`.trim() : 
                'Sin doctor asignado'
            });
          });
        } else {
          // Si no hay detalles, mostrar solo el plan
          // Desencriptar observaciones si están encriptadas (fallback si los hooks no funcionaron)
          let observacionesPlan = planData.observaciones;
          
          try {
            if (observacionesPlan && typeof observacionesPlan === 'string') {
              try {
                const jsonData = JSON.parse(observacionesPlan);
                if (jsonData.encrypted && jsonData.iv && jsonData.authTag) {
                  observacionesPlan = EncryptionService.decrypt(observacionesPlan);
                }
              } catch (e) {
                // No es JSON, puede estar desencriptado o en otro formato
              }
            }
          } catch (decryptError) {
            logger.warn('Error desencriptando observaciones del plan', {
              error: decryptError.message,
              planId: planData.id_plan
            });
          }
          
          medicamentosFormateados.push({
            id_plan: planData.id_plan,
            id_medicamento: null,
            nombre_medicamento: 'Plan sin medicamentos especificados',
            descripcion: observacionesPlan || null, // Desencriptado si estaba encriptado
            dosis: null,
            frecuencia: null,
            horario: null,
            via_administracion: null,
            observaciones: observacionesPlan || null, // Desencriptado si estaba encriptado
            fecha_inicio: planData.fecha_inicio,
            fecha_fin: planData.fecha_fin,
            estado: planData.activo ? 'Activo' : 'Inactivo',
            doctor_nombre: planData.Doctor ? 
              `${planData.Doctor.nombre || ''} ${planData.Doctor.apellido_paterno || ''}`.trim() : 
              'Sin doctor asignado'
          });
        }
      } catch (mapError) {
        logger.error('Error mapeando plan de medicación individual', {
          error: mapError.message,
          planId: plan.id_plan || 'unknown',
          stack: mapError.stack
        });
        // Continuar con el siguiente plan en lugar de fallar todo
      }
    });

    logger.info('Medicamentos del paciente obtenidos', {
      pacienteId,
      total: medicamentos.count,
      returned: medicamentosFormateados.length,
      userRole: req.user.rol
    });

    res.json({
      success: true,
      data: medicamentosFormateados,
      total: medicamentos.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    logger.error('Error obteniendo medicamentos del paciente:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

/**
 * Obtener resumen médico completo de un paciente
 * GET /api/pacientes/:id/resumen-medico
 */
export const getPacienteResumenMedico = async (req, res) => {
  try {
    const { id } = req.params;

    // Validar parámetros
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de paciente inválido'
      });
    }

    const pacienteId = parseInt(id);

    // Verificar que el paciente existe y está activo
    const paciente = await Paciente.findOne({
      where: { id_paciente: pacienteId, activo: true }
    });

    if (!paciente) {
      return res.status(404).json({
        success: false,
        error: 'Paciente no encontrado o inactivo'
      });
    }

    // Si es Doctor, verificar que tiene acceso al paciente
    if (req.user.rol === 'Doctor') {
      const doctor = await Doctor.findOne({ 
        where: { id_usuario: req.user.id } 
      });
      
      if (!doctor) {
        return res.status(403).json({
          success: false,
          error: 'Doctor no encontrado'
        });
      }

      // Verificar asignación
      const asignacion = await DoctorPaciente.findOne({
        where: {
          id_doctor: doctor.id_doctor,
          id_paciente: pacienteId
        }
      });

      if (!asignacion) {
        return res.status(403).json({
          success: false,
          error: 'No tienes acceso a este paciente'
        });
      }
    }

    // Obtener datos en paralelo para mejor performance
    const [
      citasCount,
      signosVitalesCount,
      diagnosticosCount,
      medicamentosCount,
      ultimaCita,
      ultimoSignoVital,
      ultimoDiagnostico,
      ultimoMedicamento
    ] = await Promise.all([
      // Conteos
      Cita.count({ where: { id_paciente: pacienteId } }),
      SignoVital.count({ where: { id_paciente: pacienteId } }),
      Diagnostico.count({
        include: [
          {
            model: Cita,
            as: 'Cita',
            where: { id_paciente: pacienteId }
          }
        ]
      }),
      PlanMedicacion.count({ where: { id_paciente: pacienteId } }),
      
      // Últimos registros
      Cita.findOne({
        where: { id_paciente: pacienteId },
        order: [['fecha_cita', 'DESC']],
        include: [{ model: Doctor, attributes: ['nombre', 'apellido_paterno'] }]
      }),
      SignoVital.findOne({
        where: { id_paciente: pacienteId },
        order: [['fecha_creacion', 'DESC']]
      }),
      Diagnostico.findOne({
        include: [
          {
            model: Cita,
            as: 'Cita',
            where: { id_paciente: pacienteId },
            include: [
              {
                model: Doctor,
                attributes: ['nombre', 'apellido_paterno']
              }
            ]
          }
        ],
        order: [['fecha_registro', 'DESC']]
      }),
      PlanMedicacion.findOne({
        where: { id_paciente: pacienteId },
        order: [['fecha_creacion', 'DESC']],
        include: [{ model: Doctor, attributes: ['nombre', 'apellido_paterno'] }]
      })
    ]);

    const resumen = {
      paciente_id: pacienteId,
      resumen: {
        total_citas: citasCount,
        total_signos_vitales: signosVitalesCount,
        total_diagnosticos: diagnosticosCount,
        total_medicamentos: medicamentosCount
      },
      ultimos_registros: {
        ultima_cita: ultimaCita ? {
          fecha: ultimaCita.fecha_cita,
          tipo: ultimaCita.tipo_cita,
          doctor: ultimaCita.Doctor ? 
            `${ultimaCita.Doctor.nombre} ${ultimaCita.Doctor.apellido_paterno}` : 
            'Sin doctor'
        } : null,
        ultimo_signo_vital: ultimoSignoVital ? (() => {
          try {
            const svData = ultimoSignoVital.toJSON ? ultimoSignoVital.toJSON() : ultimoSignoVital;
            const presionSistolica = decryptFieldIfNeeded(String(svData.presion_sistolica || ''));
            const presionDiastolica = decryptFieldIfNeeded(String(svData.presion_diastolica || ''));
            return {
              fecha: svData.fecha_creacion,
              peso: svData.peso_kg,
              presion: `${presionSistolica}/${presionDiastolica}`
            };
          } catch (e) {
            logger.warn('Error desencriptando signo vital en resumen', { error: e.message });
            return {
              fecha: ultimoSignoVital.fecha_creacion,
              peso: ultimoSignoVital.peso_kg,
              presion: `${ultimoSignoVital.presion_sistolica}/${ultimoSignoVital.presion_diastolica}`
            };
          }
        })() : null,
        ultimo_diagnostico: ultimoDiagnostico ? (() => {
          try {
            const diagData = ultimoDiagnostico.toJSON ? ultimoDiagnostico.toJSON() : ultimoDiagnostico;
            const descripcion = decryptFieldIfNeeded(diagData.descripcion || '');
            return {
              fecha: diagData.fecha_registro,
              diagnostico: descripcion,
              doctor: diagData.Cita?.Doctor ? 
                `${diagData.Cita.Doctor.nombre} ${diagData.Cita.Doctor.apellido_paterno}` : 
                'Sin doctor'
            };
          } catch (e) {
            logger.warn('Error desencriptando diagnóstico en resumen', { error: e.message });
            return {
              fecha: ultimoDiagnostico.fecha_registro,
              diagnostico: ultimoDiagnostico.descripcion,
              doctor: ultimoDiagnostico.Cita?.Doctor ? 
                `${ultimoDiagnostico.Cita.Doctor.nombre} ${ultimoDiagnostico.Cita.Doctor.apellido_paterno}` : 
                'Sin doctor'
            };
          }
        })() : null,
        ultimo_medicamento: ultimoMedicamento ? (() => {
          try {
            const medData = ultimoMedicamento.toJSON ? ultimoMedicamento.toJSON() : ultimoMedicamento;
            const observaciones = decryptFieldIfNeeded(medData.observaciones || '');
            return {
              fecha: medData.fecha_creacion,
              plan_id: medData.id_plan,
              observaciones: observaciones,
              doctor: medData.Doctor ? 
                `${medData.Doctor.nombre} ${medData.Doctor.apellido_paterno}` : 
                'Sin doctor'
            };
          } catch (e) {
            logger.warn('Error desencriptando medicamento en resumen', { error: e.message });
            return {
              fecha: ultimoMedicamento.fecha_creacion,
              plan_id: ultimoMedicamento.id_plan,
              observaciones: ultimoMedicamento.observaciones,
              doctor: ultimoMedicamento.Doctor ? 
                `${ultimoMedicamento.Doctor.nombre} ${ultimoMedicamento.Doctor.apellido_paterno}` : 
                'Sin doctor'
            };
          }
        })() : null
      }
    };

    logger.info('Resumen médico del paciente obtenido', {
      pacienteId,
      citas: citasCount,
      signosVitales: signosVitalesCount,
      diagnosticos: diagnosticosCount,
      medicamentos: medicamentosCount,
      userRole: req.user.rol
    });

    res.json({
      success: true,
      data: resumen
    });

  } catch (error) {
    logger.error('Error obteniendo resumen médico del paciente:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

/**
 * Crear signos vitales para un paciente específico
 * POST /api/pacientes/:id/signos-vitales
 * 
 * Body esperado:
 * - peso_kg (number, opcional)
 * - talla_m (number, opcional)
 * - medida_cintura_cm (number, opcional)
 * - presion_sistolica (number, opcional)
 * - presion_diastolica (number, opcional)
 * - glucosa_mg_dl (number, opcional)
 * - colesterol_mg_dl (number, opcional)
 * - trigliceridos_mg_dl (number, opcional)
 * - id_cita (number, opcional)
 * - observaciones (string, opcional)
 */
export const createPacienteSignosVitales = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      peso_kg,
      talla_m,
      medida_cintura_cm,
      presion_sistolica,
      presion_diastolica,
      glucosa_mg_dl,
      colesterol_mg_dl,
      colesterol_ldl,  // ✅ Colesterol LDL
      colesterol_hdl,  // ✅ Colesterol HDL
      trigliceridos_mg_dl,
      hba1c_porcentaje,  // ✅ HbA1c (%)
      edad_paciente_en_medicion,  // ✅ Edad en medición
      id_cita,
      observaciones
    } = req.body;

    // Validar ID de paciente
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de paciente inválido'
      });
    }

    const pacienteId = parseInt(id);

    // Verificar que el paciente existe
    const paciente = await Paciente.findOne({
      where: { id_paciente: pacienteId, activo: true }
    });

    if (!paciente) {
      return res.status(404).json({
        success: false,
        error: 'Paciente no encontrado o inactivo'
      });
    }

    // Verificar autorización para Doctor
    if (req.user.rol === 'Doctor') {
      const doctor = await Doctor.findOne({ 
        where: { id_usuario: req.user.id } 
      });
      
      if (!doctor) {
        return res.status(403).json({
          success: false,
          error: 'Doctor no encontrado'
        });
      }

      // Verificar asignación
      const asignacion = await DoctorPaciente.findOne({
        where: {
          id_doctor: doctor.id_doctor,
          id_paciente: pacienteId
        }
      });

      if (!asignacion) {
        return res.status(403).json({
          success: false,
          error: 'No tienes acceso a este paciente'
        });
      }
    }

    // ✅ Validar colesterol LDL y HDL
    if (colesterol_ldl !== undefined || colesterol_hdl !== undefined) {
      // Verificar que el paciente tenga diagnóstico de Hipercolesterolemia/Dislipidemia
      const hasHipercolesterolemia = await tieneHipercolesterolemia(pacienteId);
      if (!hasHipercolesterolemia) {
        return res.status(400).json({
          success: false,
          error: 'No se puede registrar Colesterol LDL/HDL sin diagnóstico de Hipercolesterolemia o Dislipidemia.'
        });
      }

      // Validar rangos
      const validationError = validarColesterol(colesterol_ldl, colesterol_hdl);
      if (validationError) {
        return res.status(400).json({
          success: false,
          error: validationError
        });
      }
    }

    // ✅ Validar triglicéridos (solo para pacientes con diagnóstico de Hipertrigliceridemia)
    if (trigliceridos_mg_dl !== undefined && trigliceridos_mg_dl !== null && trigliceridos_mg_dl !== '') {
      // Verificar que el paciente tenga diagnóstico de Hipertrigliceridemia
      const hasHipertrigliceridemia = await tieneHipertrigliceridemia(pacienteId);
      if (!hasHipertrigliceridemia) {
        return res.status(400).json({
          success: false,
          error: 'No se puede registrar Triglicéridos sin diagnóstico de Hipertrigliceridemia.'
        });
      }

      // Validar rango de triglicéridos
      const trigliceridosNum = parseFloat(trigliceridos_mg_dl);
      if (isNaN(trigliceridosNum) || trigliceridosNum < 0 || trigliceridosNum > 1000) {
        return res.status(400).json({
          success: false,
          error: 'Triglicéridos debe estar entre 0 y 1000 mg/dL'
        });
      }
    }

    // ✅ Calcular edad en medición automáticamente si no se proporciona
    let edadCalculada = null;
    if (!edad_paciente_en_medicion || edad_paciente_en_medicion === null || edad_paciente_en_medicion === '') {
      // Calcular automáticamente desde fecha_nacimiento del paciente
      if (paciente && paciente.fecha_nacimiento) {
        try {
          // Desencriptar fecha_nacimiento si está encriptada
          let fechaNacStr = paciente.fecha_nacimiento;
          if (typeof fechaNacStr === 'string' && (fechaNacStr.includes('encrypted') || fechaNacStr.includes(':'))) {
            // Intentar desencriptar
            const EncryptionService = (await import('../services/encryptionService.js')).default;
            fechaNacStr = EncryptionService.decryptField(fechaNacStr) || fechaNacStr;
          }
          
          const fechaNac = new Date(fechaNacStr);
          const hoy = new Date();
          edadCalculada = hoy.getFullYear() - fechaNac.getFullYear();
          const mesDiff = hoy.getMonth() - fechaNac.getMonth();
          if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < fechaNac.getDate())) {
            edadCalculada--;
          }
          
          // Validar que la edad calculada sea válida
          if (edadCalculada < 0 || edadCalculada > 120) {
            edadCalculada = null;
          }
        } catch (error) {
          logger.warn('Error calculando edad automáticamente:', error);
          edadCalculada = null;
        }
      }
    } else {
      // Validar edad proporcionada manualmente
      const edadValidationError = validarEdadMedicion(edad_paciente_en_medicion);
      if (edadValidationError) {
        return res.status(400).json({
          success: false,
          error: edadValidationError
        });
      }
      edadCalculada = parseInt(edad_paciente_en_medicion, 10);
    }

    // ✅ Validar HbA1c si se proporciona (usar edad calculada o proporcionada)
    if (hba1c_porcentaje !== undefined && hba1c_porcentaje !== null && hba1c_porcentaje !== '') {
      if (edadCalculada === null) {
        return res.status(400).json({
          success: false,
          error: 'No se puede validar HbA1c sin edad del paciente. Proporcione edad_paciente_en_medicion o asegúrese de que el paciente tenga fecha_nacimiento registrada.'
        });
      }

      const hba1cValidationError = validarHbA1c(hba1c_porcentaje, edadCalculada);
      if (hba1cValidationError) {
        return res.status(400).json({
          success: false,
          error: hba1cValidationError
        });
      }
    }

    // Validar que se proporcione al menos un campo
    if (!peso_kg && !talla_m && !medida_cintura_cm && !presion_sistolica && !glucosa_mg_dl && !colesterol_mg_dl) {
      return res.status(400).json({
        success: false,
        error: 'Debe proporcionar al menos un signo vital'
      });
    }

    // Convertir y validar id_cita si se proporciona
    let citaId = null;
    if (id_cita !== null && id_cita !== undefined && id_cita !== '') {
      citaId = parseInt(id_cita, 10);
      if (isNaN(citaId) || citaId <= 0) {
        return res.status(400).json({
          success: false,
          error: 'id_cita debe ser un número válido'
        });
      }
    }

    // Calcular IMC si se proporcionan peso y talla
    let imc = null;
    if (peso_kg && talla_m && talla_m > 0) {
      imc = parseFloat((peso_kg / (talla_m * talla_m)).toFixed(2));
    }

    // Crear registro de signos vitales (convertir todos los valores numéricos)
    const signoVitalData = {
      id_paciente: pacienteId,
      id_cita: citaId,
      peso_kg: peso_kg ? parseFloat(peso_kg) : null,
      talla_m: talla_m ? parseFloat(talla_m) : null,
      imc: imc,
      medida_cintura_cm: medida_cintura_cm ? parseFloat(medida_cintura_cm) : null,
      presion_sistolica: presion_sistolica ? parseInt(presion_sistolica, 10) : null,
      presion_diastolica: presion_diastolica ? parseInt(presion_diastolica, 10) : null,
      glucosa_mg_dl: glucosa_mg_dl ? parseInt(glucosa_mg_dl, 10) : null,
      colesterol_mg_dl: colesterol_mg_dl ? parseFloat(colesterol_mg_dl) : null,
      colesterol_ldl: colesterol_ldl !== undefined && colesterol_ldl !== null && colesterol_ldl !== '' 
        ? parseFloat(colesterol_ldl) 
        : null,  // ✅ Colesterol LDL
      colesterol_hdl: colesterol_hdl !== undefined && colesterol_hdl !== null && colesterol_hdl !== '' 
        ? parseFloat(colesterol_hdl) 
        : null,  // ✅ Colesterol HDL
      trigliceridos_mg_dl: trigliceridos_mg_dl ? parseInt(trigliceridos_mg_dl, 10) : null,
      hba1c_porcentaje: hba1c_porcentaje !== undefined && hba1c_porcentaje !== null && hba1c_porcentaje !== '' 
        ? parseFloat(hba1c_porcentaje) 
        : null,  // ✅ HbA1c (%)
      edad_paciente_en_medicion: edadCalculada !== null 
        ? edadCalculada 
        : (edad_paciente_en_medicion !== undefined && edad_paciente_en_medicion !== null && edad_paciente_en_medicion !== '' 
          ? parseInt(edad_paciente_en_medicion, 10) 
          : null),  // ✅ Edad en medición (calculada automáticamente si no se proporciona)
      registrado_por: req.user.rol?.toLowerCase() === 'paciente' ? 'paciente' : 'doctor', // Determinar quién registra
      observaciones: observaciones || null,
      fecha_medicion: new Date(),
      fecha_creacion: new Date()
    };

    const signoVital = await SignoVital.create(signoVitalData);

    logger.info('Signos vitales creados exitosamente', {
      id_signo: signoVital.id_signo,
      pacienteId,
      peso_kg: peso_kg || 'N/A',
      imc: imc || 'N/A',
      userRole: req.user.rol
    });

    // Verificar alertas automáticas (no bloquea la creación si hay error)
    let alertasGeneradas = null;
    try {
      const resultadoAlertas = await alertService.verificarSignosVitales(
        signoVitalData,
        pacienteId
      );

      if (resultadoAlertas.tieneAlertas) {
        logger.info('Alertas generadas al registrar signos vitales', {
          pacienteId,
          totalAlertas: resultadoAlertas.alertas.length,
          severidad: resultadoAlertas.alertas[0]?.severidad,
        });
        alertasGeneradas = resultadoAlertas.alertas;
      }
    } catch (alertError) {
      // No fallar la creación si hay error en alertas
      logger.error('Error verificando alertas (no crítico):', alertError);
    }

    // Formatear respuesta
    const signoFormateado = {
      id_signo: signoVital.id_signo,
      id_paciente: signoVital.id_paciente,
      id_cita: signoVital.id_cita,
      fecha_medicion: signoVital.fecha_medicion,
      peso_kg: signoVital.peso_kg,
      talla_m: signoVital.talla_m,
      imc: signoVital.imc,
      medida_cintura_cm: signoVital.medida_cintura_cm,
      presion_sistolica: signoVital.presion_sistolica,
      presion_diastolica: signoVital.presion_diastolica,
      glucosa_mg_dl: signoVital.glucosa_mg_dl,
      colesterol_mg_dl: signoVital.colesterol_mg_dl,
      colesterol_ldl: signoVital.colesterol_ldl,  // ✅ Colesterol LDL
      colesterol_hdl: signoVital.colesterol_hdl,  // ✅ Colesterol HDL
      trigliceridos_mg_dl: signoVital.trigliceridos_mg_dl,
      hba1c_porcentaje: signoVital.hba1c_porcentaje,  // ✅ HbA1c (%)
      edad_paciente_en_medicion: signoVital.edad_paciente_en_medicion,  // ✅ Edad en medición
      registrado_por: signoVital.registrado_por,
      observaciones: signoVital.observaciones,
      fecha_creacion: signoVital.fecha_creacion
    };

    // Emitir eventos WebSocket (no debe fallar la respuesta si hay error)
    try {
      // Emitir evento WebSocket: signos_vitales_registrados
      const signosData = {
        id_signo: signoVital.id_signo,
        id_paciente: pacienteId,
        id_cita: signoVital.id_cita,
        fecha_medicion: signoVital.fecha_medicion,
        imc: signoVital.imc,
        presion_sistolica: signoVital.presion_sistolica,
        presion_diastolica: signoVital.presion_diastolica,
        glucosa_mg_dl: signoVital.glucosa_mg_dl,
        registrado_por: signoVital.registrado_por,
        tiene_alertas: !!alertasGeneradas
      };

      // Notificar al paciente
      if (paciente.id_usuario) {
        realtimeService.sendToUser(paciente.id_usuario, 'signos_vitales_registrados', signosData);
      }

      // Notificar al doctor asignado
      const asignaciones = await DoctorPaciente.findAll({
        where: { id_paciente: pacienteId },
        include: [{ model: Doctor, attributes: ['id_doctor', 'id_usuario'] }]
      });

      for (const asignacion of asignaciones) {
        if (asignacion.Doctor?.id_usuario) {
          realtimeService.sendToUser(asignacion.Doctor.id_usuario, 'signos_vitales_registrados', signosData);
        }
      }

      // Emitir eventos de alertas si existen
      if (alertasGeneradas && alertasGeneradas.length > 0) {
        for (const alerta of alertasGeneradas) {
          const eventoAlerta = alerta.severidad === 'critica' 
            ? 'alerta_signos_vitales_critica' 
            : 'alerta_signos_vitales_moderada';

          const alertaData = {
            id_signo: signoVital.id_signo,
            id_paciente: pacienteId,
            tipo: alerta.tipo,
            severidad: alerta.severidad,
            mensaje: alerta.mensaje,
            valor: alerta.valor,
            rangoNormal: alerta.rangoNormal,
            fecha_medicion: signoVital.fecha_medicion
          };

          // Notificar al paciente
          if (paciente.id_usuario) {
            const enviado = realtimeService.sendToUser(paciente.id_usuario, eventoAlerta, alertaData);
            logger.info(`📤 [WS-BACKEND] Evento ${eventoAlerta} enviado por id_usuario`, {
              id_usuario: paciente.id_usuario,
              enviado,
              severidad: alerta.severidad
            });
          }
          
          // También enviar a la sala del paciente por id_paciente (fallback)
          const enviadoPaciente = realtimeService.sendToPaciente(pacienteId, eventoAlerta, alertaData);
          logger.info(`📤 [WS-BACKEND] Evento ${eventoAlerta} enviado por id_paciente (sala)`, {
            id_paciente: pacienteId,
            enviado: enviadoPaciente,
            severidad: alerta.severidad
          });

          // Notificar a doctores asignados (WebSocket y notificación en BD)
          for (const asignacion of asignaciones) {
            if (asignacion.Doctor?.id_usuario) {
              // Enviar evento WebSocket
              const enviado = realtimeService.sendToUser(asignacion.Doctor.id_usuario, eventoAlerta, alertaData);
              logger.debug(`📤 [WS-BACKEND] Evento ${eventoAlerta} enviado a doctor`, {
                id_doctor: asignacion.Doctor.id_doctor,
                enviado
              });

              // Crear notificación en base de datos para el dashboard
              try {
                const notificacionData = {
                  id_paciente: pacienteId,
                  paciente_nombre: `${paciente.nombre} ${paciente.apellido_paterno}`.trim(),
                  id_signo: signoVital.id_signo,
                  tipo: alerta.tipo,
                  severidad: alerta.severidad,
                  mensaje: alerta.mensaje,
                  valor: alerta.valor,
                  rangoNormal: alerta.rangoNormal,
                  fecha_medicion: signoVital.fecha_medicion
                };

                await crearNotificacionDoctor(
                  asignacion.Doctor.id_doctor,
                  'alerta_signos_vitales',
                  notificacionData
                );

                logger.info('📝 [NOTIFICACION] Notificación de alerta de signos vitales creada en BD', {
                  id_doctor: asignacion.Doctor.id_doctor,
                  id_paciente: pacienteId,
                  severidad: alerta.severidad,
                  tipo: alerta.tipo
                });
              } catch (notifError) {
                // No crítico - no debe fallar la operación principal
                logger.error('❌ [NOTIFICACION] Error creando notificación de alerta en BD (no crítico):', {
                  error: notifError.message,
                  id_doctor: asignacion.Doctor.id_doctor,
                  id_paciente: pacienteId
                });
              }
            }
          }

          // Notificar a administradores si es crítica
          if (alerta.severidad === 'critica') {
            realtimeService.sendToRole('Admin', eventoAlerta, alertaData);
            logger.info(`📤 [WS-BACKEND] Evento ${eventoAlerta} enviado a Admin`, {
              severidad: alerta.severidad
            });
          }
        }
      }
    } catch (wsError) {
      // No fallar la respuesta si hay error en WebSocket
      logger.error('Error enviando eventos WebSocket (no crítico):', {
        error: wsError.message,
        stack: wsError.stack,
        pacienteId
      });
    }

    res.status(201).json({
      success: true,
      message: 'Signos vitales registrados exitosamente',
      data: signoFormateado,
      alertas: alertasGeneradas || null // Incluir alertas en la respuesta
    });

  } catch (error) {
    logger.error('Error creando signos vitales:', {
      error: error.message,
      stack: error.stack,
      pacienteId: req.params.id,
      datos: req.body,
      userRole: req.user?.rol
    });
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      requestId: req.id || Date.now().toString()
    });
  }
};

/**
 * Crear un nuevo diagnóstico para un paciente
 * POST /api/pacientes/:id/diagnosticos
 */
export const createPacienteDiagnostico = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_cita, descripcion } = req.body;

    // Validación básica
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de paciente inválido'
      });
    }

    const pacienteId = parseInt(id);

    // Verificar que el paciente existe y está activo
    const paciente = await Paciente.findOne({
      where: { id_paciente: pacienteId, activo: true }
    });

    if (!paciente) {
      return res.status(404).json({
        success: false,
        error: 'Paciente no encontrado o inactivo'
      });
    }

    // Si es Doctor, verificar que tiene acceso al paciente
    if (req.user.rol === 'Doctor') {
      const doctor = await Doctor.findOne({ 
        where: { id_usuario: req.user.id } 
      });
      
      if (!doctor) {
        return res.status(403).json({
          success: false,
          error: 'Doctor no encontrado'
        });
      }

      // Verificar asignación
      const asignacion = await DoctorPaciente.findOne({
        where: {
          id_doctor: doctor.id_doctor,
          id_paciente: pacienteId
        }
      });

      if (!asignacion) {
        return res.status(403).json({
          success: false,
          error: 'No tienes acceso a este paciente'
        });
      }
    }

    // Validar datos del diagnóstico
    // ✅ id_cita es opcional - solo validar si se proporciona
    if (id_cita !== undefined && id_cita !== null) {
      if (isNaN(id_cita)) {
        return res.status(400).json({
          success: false,
          error: 'ID de cita debe ser un número válido'
        });
      }

      // Verificar que la cita existe solo si se proporciona id_cita
      const cita = await Cita.findOne({
        where: { id_cita: parseInt(id_cita), id_paciente: pacienteId }
      });

      if (!cita) {
        return res.status(404).json({
          success: false,
          error: 'Cita no encontrada o no pertenece a este paciente'
        });
      }
    }

    if (!descripcion || descripcion.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'La descripción del diagnóstico es requerida'
      });
    }

    // Crear el diagnóstico
    const diagnosticoData = {
      id_cita: id_cita || null, // ✅ Asegurar que sea null si no se proporciona
      descripcion: descripcion.trim(),
      fecha_registro: new Date()
    };

    const diagnostico = await Diagnostico.create(diagnosticoData);

    logger.info('Diagnóstico creado exitosamente', {
      id_diagnostico: diagnostico.id_diagnostico,
      pacienteId,
      id_cita,
      descripcionLength: descripcion.length,
      userRole: req.user.rol
    });

    // Formatear respuesta
    const diagnosticoFormateado = {
      id_diagnostico: diagnostico.id_diagnostico,
      id_cita: diagnostico.id_cita,
      descripcion: diagnostico.descripcion,
      fecha_registro: diagnostico.fecha_registro
    };

    res.status(201).json({
      success: true,
      message: 'Diagnóstico registrado exitosamente',
      data: diagnosticoFormateado
    });

  } catch (error) {
    logger.error('Error creando diagnóstico:', {
      error: error.message,
      stack: error.stack,
      pacienteId: req.params.id,
      datos: req.body,
      userRole: req.user?.rol
    });
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      requestId: req.id || Date.now().toString()
    });
  }
};

/**
 * Crear un nuevo plan de medicación para un paciente
 * POST /api/pacientes/:id/planes-medicacion
 */
export const createPacientePlanMedicacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      id_cita, 
      fecha_inicio, 
      fecha_fin, 
      observaciones, 
      medicamentos
    } = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de paciente inválido'
      });
    }

    const pacienteId = parseInt(id);

    // Verificar que el paciente existe y está activo
    const paciente = await Paciente.findOne({
      where: { id_paciente: pacienteId, activo: true }
    });

    if (!paciente) {
      return res.status(404).json({
        success: false,
        error: 'Paciente no encontrado o inactivo'
      });
    }

    // Si es Doctor, verificar que tiene acceso al paciente
    if (req.user.rol === 'Doctor') {
      const doctor = await Doctor.findOne({ 
        where: { id_usuario: req.user.id } 
      });
      
      if (!doctor) {
        return res.status(403).json({
          success: false,
          error: 'Doctor no encontrado'
        });
      }

      const asignacion = await DoctorPaciente.findOne({
        where: {
          id_doctor: doctor.id_doctor,
          id_paciente: pacienteId
        }
      });

      if (!asignacion) {
        return res.status(403).json({
          success: false,
          error: 'No tienes acceso a este paciente'
        });
      }
    }

    // Validar medicamentos
    if (!medicamentos || !Array.isArray(medicamentos) || medicamentos.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Debe proporcionar al menos un medicamento'
      });
    }

    // Validar cada medicamento
    for (const med of medicamentos) {
      if (!med.id_medicamento || isNaN(med.id_medicamento)) {
        return res.status(400).json({
          success: false,
          error: 'ID de medicamento inválido'
        });
      }

      const medicamento = await Medicamento.findByPk(med.id_medicamento);
      if (!medicamento) {
        return res.status(404).json({
          success: false,
          error: `Medicamento con ID ${med.id_medicamento} no encontrado`
        });
      }
    }

    // Si se proporciona id_cita, verificar que existe
    let doctorId = null;
    if (id_cita) {
      const cita = await Cita.findOne({
        where: { id_cita: id_cita, id_paciente: pacienteId },
        include: [{ model: Doctor, attributes: ['id_doctor'] }]
      });

      if (!cita) {
        return res.status(404).json({
          success: false,
          error: 'Cita no encontrada o no pertenece a este paciente'
        });
      }

      doctorId = cita.id_doctor;
    }

    // Crear el plan de medicación
    const planData = {
      id_paciente: pacienteId,
      id_doctor: doctorId,
      id_cita: id_cita || null,
      fecha_inicio: fecha_inicio || null,
      fecha_fin: fecha_fin || null,
      observaciones: observaciones || null,
      activo: true,
      fecha_creacion: new Date()
    };

    const plan = await PlanMedicacion.create(planData);

    // Crear los detalles del plan (medicamentos)
    for (const med of medicamentos) {
      // Procesar horarios: aceptar array o string único
      let horariosArray = [];
      if (med.horarios && Array.isArray(med.horarios)) {
        // Si viene array de horarios, usarlo
        horariosArray = med.horarios.filter(h => h && h.trim());
      } else if (med.horario) {
        // Si viene horario único, convertirlo a array
        horariosArray = [med.horario];
      }

      // Primer horario para compatibilidad (campo horario)
      const primerHorario = horariosArray.length > 0 ? horariosArray[0] : null;

      await PlanDetalle.create({
        id_plan: plan.id_plan,
        id_medicamento: med.id_medicamento,
        dosis: med.dosis || null,
        frecuencia: med.frecuencia || null,
        horario: primerHorario, // Mantener para compatibilidad
        horarios: horariosArray.length > 0 ? horariosArray : null, // Nuevo campo
        via_administracion: med.via_administracion || null,
        observaciones: med.observaciones || null
      });
    }

    logger.info('Plan de medicación creado exitosamente', {
      id_plan: plan.id_plan,
      pacienteId,
      totalMedicamentos: medicamentos.length,
      userRole: req.user.rol
    });

    // ✅ Sincronizar tratamiento farmacológico en paciente_comorbilidad
    try {
      const { sincronizarTratamientoFarmacologico } = await import('../services/sincronizar-tratamiento-farmacologico.js');
      await sincronizarTratamientoFarmacologico(pacienteId);
      logger.info('Tratamiento farmacológico sincronizado después de crear plan', { pacienteId });
    } catch (syncError) {
      logger.warn('Error sincronizando tratamiento farmacológico (no crítico):', syncError);
      // No fallar la operación si la sincronización falla
    }

    // Obtener el plan completo con detalles para la respuesta
    const planCompleto = await PlanMedicacion.findByPk(plan.id_plan, {
      include: [
        {
          model: PlanDetalle,
          include: [
            {
              model: Medicamento,
              attributes: ['id_medicamento', 'nombre_medicamento', 'descripcion']
            }
          ]
        }
      ]
    });

    // Formatear respuesta
    const planFormateado = {
      id_plan: planCompleto.id_plan,
      id_paciente: planCompleto.id_paciente,
      id_doctor: planCompleto.id_doctor,
      id_cita: planCompleto.id_cita,
      fecha_inicio: planCompleto.fecha_inicio,
      fecha_fin: planCompleto.fecha_fin,
      observaciones: planCompleto.observaciones,
      activo: planCompleto.activo,
      fecha_creacion: planCompleto.fecha_creacion,
      medicamentos: planCompleto.PlanDetalles?.map(det => ({
        id_medicamento: det.Medicamento.id_medicamento,
        nombre_medicamento: det.Medicamento.nombre_medicamento,
        descripcion: det.Medicamento.descripcion,
        dosis: det.dosis,
        frecuencia: det.frecuencia,
        horario: det.horario, // Mantener para compatibilidad
        horarios: det.horarios && Array.isArray(det.horarios) ? det.horarios : (det.horario ? [det.horario] : []), // Nuevo campo
        via_administracion: det.via_administracion,
        observaciones: det.observaciones
      })) || []
    };

    res.status(201).json({
      success: true,
      message: 'Plan de medicación registrado exitosamente',
      data: planFormateado
    });

  } catch (error) {
    logger.error('Error creando plan de medicación:', {
      error: error.message,
      stack: error.stack,
      pacienteId: req.params.id,
      datos: req.body,
      userRole: req.user?.rol
    });
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      requestId: req.id || Date.now().toString()
    });
  }
};

/**
 * Actualizar plan de medicación de un paciente
 * PUT /api/pacientes/:id/planes-medicacion/:planId
 */
export const updatePacientePlanMedicacion = async (req, res) => {
  try {
    const { id, planId } = req.params;
    const {
      id_cita,
      fecha_inicio,
      fecha_fin,
      observaciones,
      medicamentos
    } = req.body;

    if (!id || isNaN(id) || !planId || isNaN(planId)) {
      return res.status(400).json({
        success: false,
        error: 'IDs inválidos'
      });
    }

    const pacienteId = parseInt(id);
    const idPlan = parseInt(planId);

    // Verificar acceso al paciente
    const acceso = await verificarAccesoPaciente(req, pacienteId);
    if (acceso.error) {
      return res.status(acceso.status).json({
        success: false,
        error: acceso.error
      });
    }

    // Buscar plan
    const plan = await PlanMedicacion.findOne({
      where: {
        id_plan: idPlan,
        id_paciente: pacienteId
      }
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan de medicación no encontrado'
      });
    }

    // Validar medicamentos (misma lógica que create)
    if (!medicamentos || !Array.isArray(medicamentos) || medicamentos.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Debe proporcionar al menos un medicamento'
      });
    }

    for (const med of medicamentos) {
      if (!med.id_medicamento || isNaN(med.id_medicamento)) {
        return res.status(400).json({
          success: false,
          error: 'ID de medicamento inválido'
        });
      }
      const medicamento = await Medicamento.findByPk(med.id_medicamento);
      if (!medicamento) {
        return res.status(404).json({
          success: false,
          error: `Medicamento con ID ${med.id_medicamento} no encontrado`
        });
      }
    }

    // Si se proporciona id_cita, verificar que existe y obtener doctorId
    let doctorId = plan.id_doctor;
    if (id_cita !== undefined) {
      if (id_cita) {
        const cita = await Cita.findOne({
          where: { id_cita: id_cita, id_paciente: pacienteId },
          include: [{ model: Doctor, attributes: ['id_doctor'] }]
        });
        if (!cita) {
          return res.status(404).json({
            success: false,
            error: 'Cita no encontrada o no pertenece a este paciente'
          });
        }
        doctorId = cita.id_doctor;
      } else {
        doctorId = null;
      }
    }

    // Actualizar cabecera del plan
    if (id_cita !== undefined) plan.id_cita = id_cita || null;
    if (fecha_inicio !== undefined) plan.fecha_inicio = fecha_inicio || null;
    if (fecha_fin !== undefined) plan.fecha_fin = fecha_fin || null;
    if (observaciones !== undefined) plan.observaciones = observaciones?.trim() || null;
    if (id_cita !== undefined) plan.id_doctor = doctorId;
    await plan.save();

    // Reemplazar detalles: eliminar existentes y crear nuevos
    await PlanDetalle.destroy({
      where: { id_plan: idPlan }
    });

    for (const med of medicamentos) {
      let horariosArray = [];
      if (med.horarios && Array.isArray(med.horarios)) {
        horariosArray = med.horarios.filter(h => h && h.trim());
      } else if (med.horario) {
        horariosArray = [med.horario];
      }
      const primerHorario = horariosArray.length > 0 ? horariosArray[0] : null;

      await PlanDetalle.create({
        id_plan: idPlan,
        id_medicamento: med.id_medicamento,
        dosis: med.dosis || null,
        frecuencia: med.frecuencia || null,
        horario: primerHorario,
        horarios: horariosArray.length > 0 ? horariosArray : null,
        via_administracion: med.via_administracion || null,
        observaciones: med.observaciones || null
      });
    }

    logger.info('Plan de medicación actualizado', {
      pacienteId,
      planId: idPlan,
      totalMedicamentos: medicamentos.length,
      userRole: req.user.rol,
      userId: req.user.id
    });

    // Sincronizar tratamiento farmacológico
    try {
      const { sincronizarTratamientoFarmacologico } = await import('../services/sincronizar-tratamiento-farmacologico.js');
      await sincronizarTratamientoFarmacologico(pacienteId);
      logger.info('Tratamiento farmacológico sincronizado después de actualizar plan', { pacienteId });
    } catch (syncError) {
      logger.warn('Error sincronizando tratamiento farmacológico (no crítico):', syncError);
    }

    // Obtener plan completo con detalles para la respuesta
    const planCompleto = await PlanMedicacion.findByPk(idPlan, {
      include: [
        {
          model: PlanDetalle,
          include: [
            {
              model: Medicamento,
              attributes: ['id_medicamento', 'nombre_medicamento', 'descripcion']
            }
          ]
        }
      ]
    });

    const planFormateado = {
      id_plan: planCompleto.id_plan,
      id_paciente: planCompleto.id_paciente,
      id_doctor: planCompleto.id_doctor,
      id_cita: planCompleto.id_cita,
      fecha_inicio: planCompleto.fecha_inicio,
      fecha_fin: planCompleto.fecha_fin,
      observaciones: planCompleto.observaciones,
      activo: planCompleto.activo,
      fecha_creacion: planCompleto.fecha_creacion,
      medicamentos: planCompleto.PlanDetalles?.map(det => ({
        id_medicamento: det.Medicamento.id_medicamento,
        nombre_medicamento: det.Medicamento.nombre_medicamento,
        descripcion: det.Medicamento.descripcion,
        dosis: det.dosis,
        frecuencia: det.frecuencia,
        horario: det.horario,
        horarios: det.horarios && Array.isArray(det.horarios) ? det.horarios : (det.horario ? [det.horario] : []),
        via_administracion: det.via_administracion,
        observaciones: det.observaciones
      })) || []
    };

    res.json({
      success: true,
      message: 'Plan de medicación actualizado exitosamente',
      data: planFormateado
    });

  } catch (error) {
    logger.error('Error actualizando plan de medicación:', {
      error: error.message,
      stack: error.stack,
      pacienteId: req.params.id,
      planId: req.params.planId,
      userRole: req.user?.rol
    });
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      requestId: req.id || Date.now().toString()
    });
  }
};

/**
 * Eliminar plan de medicación de un paciente
 * DELETE /api/pacientes/:id/planes-medicacion/:planId
 */
export const deletePacientePlanMedicacion = async (req, res) => {
  try {
    const { id, planId } = req.params;

    if (!id || isNaN(id) || !planId || isNaN(planId)) {
      return res.status(400).json({
        success: false,
        error: 'IDs inválidos'
      });
    }

    const pacienteId = parseInt(id);
    const idPlan = parseInt(planId);

    // Verificar acceso al paciente (valida que Doctor tenga acceso al paciente asignado)
    const acceso = await verificarAccesoPaciente(req, pacienteId);
    if (acceso.error) {
      return res.status(acceso.status).json({
        success: false,
        error: acceso.error
      });
    }

    // Buscar plan de medicación
    const plan = await PlanMedicacion.findOne({
      where: {
        id_plan: idPlan,
        id_paciente: pacienteId
      }
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan de medicación no encontrado'
      });
    }

    // Eliminar detalles del plan primero (cascade)
    await PlanDetalle.destroy({
      where: { id_plan: idPlan }
    });

    // Eliminar el plan
    await plan.destroy();

    logger.info('Plan de medicación eliminado', {
      pacienteId,
      planId: idPlan,
      userRole: req.user.rol,
      userId: req.user.id
    });

    // ✅ Sincronizar tratamiento farmacológico en paciente_comorbilidad
    try {
      const { sincronizarTratamientoFarmacologico } = await import('../services/sincronizar-tratamiento-farmacologico.js');
      await sincronizarTratamientoFarmacologico(pacienteId);
      logger.info('Tratamiento farmacológico sincronizado después de eliminar plan', { pacienteId });
    } catch (syncError) {
      logger.warn('Error sincronizando tratamiento farmacológico (no crítico):', syncError);
      // No fallar la operación si la sincronización falla
    }

    res.json({
      success: true,
      message: 'Plan de medicación eliminado exitosamente'
    });

  } catch (error) {
    logger.error('Error eliminando plan de medicación:', {
      error: error.message,
      stack: error.stack,
      pacienteId: req.params.id,
      planId: req.params.planId,
      userRole: req.user?.rol
    });
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      requestId: req.id || Date.now().toString()
    });
  }
};

/**
 * Obtener red de apoyo de un paciente específico
 * GET /api/pacientes/:id/red-apoyo
 */
export const getPacienteRedApoyo = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de paciente inválido'
      });
    }

    const pacienteId = parseInt(id);

    // Verificar acceso al paciente
    const acceso = await verificarAccesoPaciente(req, pacienteId);
    if (acceso.error) {
      return res.status(acceso.status).json({
        success: false,
        error: acceso.error
      });
    }

    const redes = await RedApoyo.findAll({
      where: { id_paciente: pacienteId },
      order: [['fecha_creacion', 'DESC']],
      raw: false // Asegurar que retorne instancias de Sequelize para que los hooks funcionen
    });

    // Desencriptar campos encriptados (fallback si los hooks no funcionaron)
    const redesFormateadas = redes.map(red => {
      try {
        const redData = red.toJSON ? red.toJSON() : red;
        
        return {
          ...redData,
          numero_celular: decryptFieldIfNeeded(redData.numero_celular),
          email: decryptFieldIfNeeded(redData.email),
          direccion: decryptFieldIfNeeded(redData.direccion)
        };
      } catch (mapError) {
        logger.error('Error mapeando red de apoyo individual', {
          error: mapError.message,
          redId: red.id_contacto || 'unknown',
          stack: mapError.stack
        });
        return red.toJSON ? red.toJSON() : red;
      }
    });

    res.json({
      success: true,
      data: redesFormateadas
    });

  } catch (error) {
    logger.error('Error obteniendo red de apoyo:', {
      error: error.message,
      stack: error.stack,
      pacienteId: req.params.id,
      userRole: req.user?.rol
    });
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      requestId: req.id || Date.now().toString()
    });
  }
};

/**
 * Crear contacto de red de apoyo
 * POST /api/pacientes/:id/red-apoyo
 */
export const createPacienteRedApoyo = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_contacto, numero_celular, email, direccion, localidad, parentesco } = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de paciente inválido'
      });
    }

    const pacienteId = parseInt(id);

    // Verificar acceso al paciente
    const acceso = await verificarAccesoPaciente(req, pacienteId);
    if (acceso.error) {
      return res.status(acceso.status).json({
        success: false,
        error: acceso.error
      });
    }

    if (!nombre_contacto || nombre_contacto.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'El nombre del contacto es requerido'
      });
    }

    const contacto = await RedApoyo.create({
      id_paciente: pacienteId,
      nombre_contacto: nombre_contacto.trim(),
      numero_celular: numero_celular?.trim() || null,
      email: email?.trim() || null,
      direccion: direccion?.trim() || null,
      localidad: localidad?.trim() || null,
      parentesco: parentesco?.trim() || null,
      fecha_creacion: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Contacto de red de apoyo registrado exitosamente',
      data: contacto
    });

  } catch (error) {
    logger.error('Error creando red de apoyo:', {
      error: error.message,
      stack: error.stack,
      pacienteId: req.params.id,
      datos: req.body,
      userRole: req.user?.rol
    });
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      requestId: req.id || Date.now().toString()
    });
  }
};

/**
 * Obtener esquema de vacunación de un paciente específico
 * GET /api/pacientes/:id/esquema-vacunacion
 */
export const getPacienteEsquemaVacunacion = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de paciente inválido'
      });
    }

    const pacienteId = parseInt(id);

    // Verificar acceso al paciente
    const acceso = await verificarAccesoPaciente(req, pacienteId);
    if (acceso.error) {
      return res.status(acceso.status).json({
        success: false,
        error: acceso.error
      });
    }

    const vacunas = await EsquemaVacunacion.findAll({
      where: { id_paciente: pacienteId },
      order: [['fecha_aplicacion', 'DESC']],
      raw: false // Asegurar que retorne instancias de Sequelize para que los hooks funcionen
    });

    // Desencriptar campos encriptados (fallback si los hooks no funcionaron)
    const vacunasFormateadas = vacunas.map(vacuna => {
      try {
        const vacunaData = vacuna.toJSON ? vacuna.toJSON() : vacuna;
        
        return {
          ...vacunaData,
          observaciones: decryptFieldIfNeeded(vacunaData.observaciones)
        };
      } catch (mapError) {
        logger.error('Error mapeando esquema de vacunación individual', {
          error: mapError.message,
          vacunaId: vacuna.id_vacunacion || 'unknown',
          stack: mapError.stack
        });
        return vacuna.toJSON ? vacuna.toJSON() : vacuna;
      }
    });

    res.json({
      success: true,
      data: vacunasFormateadas
    });

  } catch (error) {
    logger.error('Error obteniendo esquema de vacunación:', {
      error: error.message,
      stack: error.stack,
      pacienteId: req.params.id,
      userRole: req.user?.rol
    });
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      requestId: req.id || Date.now().toString()
    });
  }
};

/**
 * Crear registro de vacunación
 * POST /api/pacientes/:id/esquema-vacunacion
 */
export const createPacienteEsquemaVacunacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { vacuna, fecha_aplicacion, lote, observaciones } = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de paciente inválido'
      });
    }

    const pacienteId = parseInt(id);

    // Verificar acceso al paciente
    const acceso = await verificarAccesoPaciente(req, pacienteId);
    if (acceso.error) {
      return res.status(acceso.status).json({
        success: false,
        error: acceso.error
      });
    }

    if (!vacuna || vacuna.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'El nombre de la vacuna es requerido'
      });
    }

    if (!fecha_aplicacion) {
      return res.status(400).json({
        success: false,
        error: 'La fecha de aplicación es requerida'
      });
    }

    // Validar formato de fecha
    const fecha = new Date(fecha_aplicacion);
    if (isNaN(fecha.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'La fecha de aplicación debe tener un formato válido'
      });
    }

    const registro = await EsquemaVacunacion.create({
      id_paciente: pacienteId,
      vacuna: vacuna.trim(),
      fecha_aplicacion: fecha.toISOString().split('T')[0],
      lote: lote?.trim() || null,
      observaciones: observaciones?.trim() || null,
      fecha_creacion: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Registro de vacunación creado exitosamente',
      data: registro
    });

  } catch (error) {
    logger.error('Error creando esquema de vacunación:', {
      error: error.message,
      stack: error.stack,
      pacienteId: req.params.id,
      datos: req.body,
      userRole: req.user?.rol
    });
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      requestId: req.id || Date.now().toString()
    });
  }
};

/**
 * =====================================================
 * CONTROLADORES UPDATE/DELETE PARA DATOS MÉDICOS
 * =====================================================
 */

/**
 * Actualizar signos vitales de un paciente
 * PUT /api/pacientes/:id/signos-vitales/:signoId
 */
export const updatePacienteSignosVitales = async (req, res) => {
  try {
    const { id, signoId } = req.params;
    const {
      peso_kg,
      talla_m,
      medida_cintura_cm,
      presion_sistolica,
      presion_diastolica,
      glucosa_mg_dl,
      colesterol_mg_dl,
      colesterol_ldl,  // ✅ Colesterol LDL
      colesterol_hdl,  // ✅ Colesterol HDL
      trigliceridos_mg_dl,
      hba1c_porcentaje,  // ✅ HbA1c (%)
      edad_paciente_en_medicion,  // ✅ Edad en medición
      observaciones
    } = req.body;

    if (!id || isNaN(id) || !signoId || isNaN(signoId)) {
      return res.status(400).json({
        success: false,
        error: 'IDs inválidos'
      });
    }

    const pacienteId = parseInt(id);
    const idSigno = parseInt(signoId);

    // Verificar acceso al paciente
    const acceso = await verificarAccesoPaciente(req, pacienteId);
    if (acceso.error) {
      return res.status(acceso.status).json({
        success: false,
        error: acceso.error
      });
    }

    // Buscar signo vital
    const signoVital = await SignoVital.findOne({
      where: {
        id_signo: idSigno,
        id_paciente: pacienteId
      }
    });

    if (!signoVital) {
      return res.status(404).json({
        success: false,
        error: 'Signo vital no encontrado'
      });
    }

    // ✅ Validar colesterol LDL y HDL si se están actualizando
    if (colesterol_ldl !== undefined || colesterol_hdl !== undefined) {
      // Verificar que el paciente tenga diagnóstico de Hipercolesterolemia/Dislipidemia
      const hasHipercolesterolemia = await tieneHipercolesterolemia(pacienteId);
      if (!hasHipercolesterolemia) {
        return res.status(400).json({
          success: false,
          error: 'No se puede registrar Colesterol LDL/HDL sin diagnóstico de Hipercolesterolemia o Dislipidemia.'
        });
      }

      // Validar rangos
      const validationError = validarColesterol(colesterol_ldl, colesterol_hdl);
      if (validationError) {
        return res.status(400).json({
          success: false,
          error: validationError
        });
      }
    }

    // ✅ Validar triglicéridos (solo para pacientes con diagnóstico de Hipertrigliceridemia)
    if (trigliceridos_mg_dl !== undefined && trigliceridos_mg_dl !== null && trigliceridos_mg_dl !== '') {
      // Verificar que el paciente tenga diagnóstico de Hipertrigliceridemia
      const hasHipertrigliceridemia = await tieneHipertrigliceridemia(pacienteId);
      if (!hasHipertrigliceridemia) {
        return res.status(400).json({
          success: false,
          error: 'No se puede registrar Triglicéridos sin diagnóstico de Hipertrigliceridemia.'
        });
      }

      // Validar rango de triglicéridos
      const trigliceridosNum = parseFloat(trigliceridos_mg_dl);
      if (isNaN(trigliceridosNum) || trigliceridosNum < 0 || trigliceridosNum > 1000) {
        return res.status(400).json({
          success: false,
          error: 'Triglicéridos debe estar entre 0 y 1000 mg/dL'
        });
      }
    }

    // ✅ Validar edad en medición si se está actualizando
    if (edad_paciente_en_medicion !== undefined && edad_paciente_en_medicion !== null && edad_paciente_en_medicion !== '') {
      const edadValidationError = validarEdadMedicion(edad_paciente_en_medicion);
      if (edadValidationError) {
        return res.status(400).json({
          success: false,
          error: edadValidationError
        });
      }
    }

    // ✅ Validar HbA1c si se está actualizando
    if (hba1c_porcentaje !== undefined && hba1c_porcentaje !== null && hba1c_porcentaje !== '') {
      // Obtener paciente para calcular edad si es necesario
      const paciente = await Paciente.findByPk(pacienteId);
      let edad = edad_paciente_en_medicion;
      
      // Si no se proporciona edad en medición, calcular desde fecha_nacimiento
      if (!edad || edad === null || edad === '') {
        if (paciente && paciente.fecha_nacimiento) {
          const fechaNac = new Date(paciente.fecha_nacimiento);
          const hoy = new Date();
          edad = hoy.getFullYear() - fechaNac.getFullYear();
          const mesDiff = hoy.getMonth() - fechaNac.getMonth();
          if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < fechaNac.getDate())) {
            edad--;
          }
        }
      } else {
        edad = parseInt(edad, 10);
      }

      const hba1cValidationError = validarHbA1c(hba1c_porcentaje, edad);
      if (hba1cValidationError) {
        return res.status(400).json({
          success: false,
          error: hba1cValidationError
        });
      }
    }

    // Actualizar campos permitidos
    if (peso_kg !== undefined) signoVital.peso_kg = peso_kg ? parseFloat(peso_kg) : null;
    if (talla_m !== undefined) signoVital.talla_m = talla_m ? parseFloat(talla_m) : null;
    if (medida_cintura_cm !== undefined) signoVital.medida_cintura_cm = medida_cintura_cm ? parseFloat(medida_cintura_cm) : null;
    if (presion_sistolica !== undefined) signoVital.presion_sistolica = presion_sistolica ? parseInt(presion_sistolica) : null;
    if (presion_diastolica !== undefined) signoVital.presion_diastolica = presion_diastolica ? parseInt(presion_diastolica) : null;
    if (glucosa_mg_dl !== undefined) signoVital.glucosa_mg_dl = glucosa_mg_dl ? parseInt(glucosa_mg_dl) : null;
    if (colesterol_mg_dl !== undefined) signoVital.colesterol_mg_dl = colesterol_mg_dl ? parseFloat(colesterol_mg_dl) : null;
    if (colesterol_ldl !== undefined) {
      signoVital.colesterol_ldl = colesterol_ldl !== null && colesterol_ldl !== '' 
        ? parseFloat(colesterol_ldl) 
        : null;
    }
    if (colesterol_hdl !== undefined) {
      signoVital.colesterol_hdl = colesterol_hdl !== null && colesterol_hdl !== '' 
        ? parseFloat(colesterol_hdl) 
        : null;
    }
    if (trigliceridos_mg_dl !== undefined) signoVital.trigliceridos_mg_dl = trigliceridos_mg_dl ? parseInt(trigliceridos_mg_dl) : null;
    if (hba1c_porcentaje !== undefined) {
      signoVital.hba1c_porcentaje = hba1c_porcentaje !== null && hba1c_porcentaje !== '' 
        ? parseFloat(hba1c_porcentaje) 
        : null;
    }
    if (edad_paciente_en_medicion !== undefined) {
      signoVital.edad_paciente_en_medicion = edad_paciente_en_medicion !== null && edad_paciente_en_medicion !== '' 
        ? parseInt(edad_paciente_en_medicion, 10) 
        : null;
    }
    if (observaciones !== undefined) signoVital.observaciones = observaciones || null;

    // Recalcular IMC si se actualizaron peso o talla
    if ((peso_kg !== undefined || talla_m !== undefined) && signoVital.peso_kg && signoVital.talla_m && signoVital.talla_m > 0) {
      signoVital.imc = parseFloat((signoVital.peso_kg / (signoVital.talla_m * signoVital.talla_m)).toFixed(2));
    }

    await signoVital.save();

    logger.info('Signos vitales actualizados', {
      pacienteId,
      signoId: idSigno,
      userRole: req.user.rol,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Signos vitales actualizados exitosamente',
      data: signoVital
    });

  } catch (error) {
    logger.error('Error actualizando signos vitales:', {
      error: error.message,
      stack: error.stack,
      pacienteId: req.params.id,
      signoId: req.params.signoId,
      userRole: req.user?.rol
    });
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Eliminar signos vitales de un paciente (solo Admin)
 * DELETE /api/pacientes/:id/signos-vitales/:signoId
 */
export const deletePacienteSignosVitales = async (req, res) => {
  try {
    const { id, signoId } = req.params;

    if (!id || isNaN(id) || !signoId || isNaN(signoId)) {
      return res.status(400).json({
        success: false,
        error: 'IDs inválidos'
      });
    }

    const pacienteId = parseInt(id);
    const idSigno = parseInt(signoId);

    // Verificar acceso al paciente (valida que Doctor tenga acceso al paciente asignado)
    const acceso = await verificarAccesoPaciente(req, pacienteId);
    if (acceso.error) {
      return res.status(acceso.status).json({
        success: false,
        error: acceso.error
      });
    }

    // Buscar y eliminar signo vital
    const signoVital = await SignoVital.findOne({
      where: {
        id_signo: idSigno,
        id_paciente: pacienteId
      }
    });

    if (!signoVital) {
      return res.status(404).json({
        success: false,
        error: 'Signo vital no encontrado'
      });
    }

    await signoVital.destroy();

    logger.info('Signos vitales eliminados', {
      pacienteId,
      signoId: idSigno,
      userRole: req.user.rol,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Signos vitales eliminados exitosamente'
    });

  } catch (error) {
    logger.error('Error eliminando signos vitales:', {
      error: error.message,
      stack: error.stack,
      pacienteId: req.params.id,
      signoId: req.params.signoId,
      userRole: req.user?.rol
    });
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Actualizar diagnóstico de un paciente
 * PUT /api/pacientes/:id/diagnosticos/:diagnosticoId
 */
export const updatePacienteDiagnostico = async (req, res) => {
  try {
    const { id, diagnosticoId } = req.params;
    const { descripcion } = req.body;

    if (!id || isNaN(id) || !diagnosticoId || isNaN(diagnosticoId)) {
      return res.status(400).json({
        success: false,
        error: 'IDs inválidos'
      });
    }

    if (!descripcion || descripcion.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'La descripción debe tener al menos 10 caracteres'
      });
    }

    const pacienteId = parseInt(id);
    const idDiagnostico = parseInt(diagnosticoId);

    // Verificar acceso al paciente
    const acceso = await verificarAccesoPaciente(req, pacienteId);
    if (acceso.error) {
      return res.status(acceso.status).json({
        success: false,
        error: acceso.error
      });
    }

    // Buscar diagnóstico
    const diagnostico = await Diagnostico.findOne({
      where: {
        id_diagnostico: idDiagnostico
      },
      include: [{
        model: Cita,
        as: 'Cita',
        where: { id_paciente: pacienteId }
      }]
    });

    if (!diagnostico) {
      return res.status(404).json({
        success: false,
        error: 'Diagnóstico no encontrado'
      });
    }

    // Actualizar
    diagnostico.descripcion = descripcion.trim();
    await diagnostico.save();

    logger.info('Diagnóstico actualizado', {
      pacienteId,
      diagnosticoId: idDiagnostico,
      userRole: req.user.rol,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Diagnóstico actualizado exitosamente',
      data: diagnostico
    });

  } catch (error) {
    logger.error('Error actualizando diagnóstico:', {
      error: error.message,
      stack: error.stack,
      pacienteId: req.params.id,
      diagnosticoId: req.params.diagnosticoId,
      userRole: req.user?.rol
    });
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Eliminar diagnóstico de un paciente (solo Admin)
 * DELETE /api/pacientes/:id/diagnosticos/:diagnosticoId
 */
export const deletePacienteDiagnostico = async (req, res) => {
  try {
    const { id, diagnosticoId } = req.params;

    if (!id || isNaN(id) || !diagnosticoId || isNaN(diagnosticoId)) {
      return res.status(400).json({
        success: false,
        error: 'IDs inválidos'
      });
    }

    const pacienteId = parseInt(id);
    const idDiagnostico = parseInt(diagnosticoId);

    // Verificar acceso al paciente (valida que Doctor tenga acceso al paciente asignado)
    const acceso = await verificarAccesoPaciente(req, pacienteId);
    if (acceso.error) {
      return res.status(acceso.status).json({
        success: false,
        error: acceso.error
      });
    }

    // Buscar y eliminar diagnóstico
    const diagnostico = await Diagnostico.findOne({
      where: {
        id_diagnostico: idDiagnostico
      },
      include: [{
        model: Cita,
        as: 'Cita',
        where: { id_paciente: pacienteId }
      }]
    });

    if (!diagnostico) {
      return res.status(404).json({
        success: false,
        error: 'Diagnóstico no encontrado'
      });
    }

    await diagnostico.destroy();

    logger.info('Diagnóstico eliminado', {
      pacienteId,
      diagnosticoId: idDiagnostico,
      userRole: req.user.rol,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Diagnóstico eliminado exitosamente'
    });

  } catch (error) {
    logger.error('Error eliminando diagnóstico:', {
      error: error.message,
      stack: error.stack,
      pacienteId: req.params.id,
      diagnosticoId: req.params.diagnosticoId,
      userRole: req.user?.rol
    });
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Actualizar contacto de red de apoyo
 * PUT /api/pacientes/:id/red-apoyo/:contactoId
 */
export const updatePacienteRedApoyo = async (req, res) => {
  try {
    const { id, contactoId } = req.params;
    const { nombre_contacto, parentesco, numero_celular, email, direccion, localidad } = req.body;

    if (!id || isNaN(id) || !contactoId || isNaN(contactoId)) {
      return res.status(400).json({
        success: false,
        error: 'IDs inválidos'
      });
    }

    const pacienteId = parseInt(id);
    const idContacto = parseInt(contactoId);

    // Verificar acceso al paciente
    const acceso = await verificarAccesoPaciente(req, pacienteId);
    if (acceso.error) {
      return res.status(acceso.status).json({
        success: false,
        error: acceso.error
      });
    }

    // Buscar contacto
    const contacto = await RedApoyo.findOne({
      where: {
        id_red_apoyo: idContacto,
        id_paciente: pacienteId
      }
    });

    if (!contacto) {
      return res.status(404).json({
        success: false,
        error: 'Contacto no encontrado'
      });
    }

    // Actualizar campos permitidos
    if (nombre_contacto !== undefined) contacto.nombre_contacto = nombre_contacto?.trim() || null;
    if (parentesco !== undefined) contacto.parentesco = parentesco?.trim() || null;
    if (numero_celular !== undefined) contacto.numero_celular = numero_celular?.trim() || null;
    if (email !== undefined) contacto.email = email?.trim() || null;
    if (direccion !== undefined) contacto.direccion = direccion?.trim() || null;
    if (localidad !== undefined) contacto.localidad = localidad?.trim() || null;

    await contacto.save();

    logger.info('Contacto de red de apoyo actualizado', {
      pacienteId,
      contactoId: idContacto,
      userRole: req.user.rol,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Contacto de red de apoyo actualizado exitosamente',
      data: contacto
    });

  } catch (error) {
    logger.error('Error actualizando contacto de red de apoyo:', {
      error: error.message,
      stack: error.stack,
      pacienteId: req.params.id,
      contactoId: req.params.contactoId,
      userRole: req.user?.rol
    });
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Eliminar contacto de red de apoyo (solo Admin)
 * DELETE /api/pacientes/:id/red-apoyo/:contactoId
 */
export const deletePacienteRedApoyo = async (req, res) => {
  try {
    const { id, contactoId } = req.params;

    if (!id || isNaN(id) || !contactoId || isNaN(contactoId)) {
      return res.status(400).json({
        success: false,
        error: 'IDs inválidos'
      });
    }

    const pacienteId = parseInt(id);
    const idContacto = parseInt(contactoId);

    // Verificar acceso al paciente (valida que Doctor tenga acceso al paciente asignado)
    const acceso = await verificarAccesoPaciente(req, pacienteId);
    if (acceso.error) {
      return res.status(acceso.status).json({
        success: false,
        error: acceso.error
      });
    }

    // Buscar y eliminar contacto
    const contacto = await RedApoyo.findOne({
      where: {
        id_red_apoyo: idContacto,
        id_paciente: pacienteId
      }
    });

    if (!contacto) {
      return res.status(404).json({
        success: false,
        error: 'Contacto no encontrado'
      });
    }

    await contacto.destroy();

    logger.info('Contacto de red de apoyo eliminado', {
      pacienteId,
      contactoId: idContacto,
      userRole: req.user.rol,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Contacto de red de apoyo eliminado exitosamente'
    });

  } catch (error) {
    logger.error('Error eliminando contacto de red de apoyo:', {
      error: error.message,
      stack: error.stack,
      pacienteId: req.params.id,
      contactoId: req.params.contactoId,
      userRole: req.user?.rol
    });
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Actualizar registro de esquema de vacunación
 * PUT /api/pacientes/:id/esquema-vacunacion/:esquemaId
 */
export const updatePacienteEsquemaVacunacion = async (req, res) => {
  try {
    const { id, esquemaId } = req.params;
    const { vacuna, fecha_aplicacion, lote, observaciones } = req.body;

    if (!id || isNaN(id) || !esquemaId || isNaN(esquemaId)) {
      return res.status(400).json({
        success: false,
        error: 'IDs inválidos'
      });
    }

    const pacienteId = parseInt(id);
    const idEsquema = parseInt(esquemaId);

    // Verificar acceso al paciente
    const acceso = await verificarAccesoPaciente(req, pacienteId);
    if (acceso.error) {
      return res.status(acceso.status).json({
        success: false,
        error: acceso.error
      });
    }

    // Buscar registro
    const esquema = await EsquemaVacunacion.findOne({
      where: {
        id_esquema: idEsquema,
        id_paciente: pacienteId
      }
    });

    if (!esquema) {
      return res.status(404).json({
        success: false,
        error: 'Registro de vacunación no encontrado'
      });
    }

    // Actualizar campos permitidos
    if (vacuna !== undefined) esquema.vacuna = vacuna?.trim() || null;
    if (fecha_aplicacion !== undefined) {
      const fecha = new Date(fecha_aplicacion);
      if (isNaN(fecha.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'La fecha de aplicación debe tener un formato válido'
        });
      }
      esquema.fecha_aplicacion = fecha.toISOString().split('T')[0];
    }
    if (lote !== undefined) esquema.lote = lote?.trim() || null;
    if (observaciones !== undefined) esquema.observaciones = observaciones?.trim() || null;

    await esquema.save();

    logger.info('Registro de vacunación actualizado', {
      pacienteId,
      esquemaId: idEsquema,
      userRole: req.user.rol,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Registro de vacunación actualizado exitosamente',
      data: esquema
    });

  } catch (error) {
    logger.error('Error actualizando esquema de vacunación:', {
      error: error.message,
      stack: error.stack,
      pacienteId: req.params.id,
      esquemaId: req.params.esquemaId,
      userRole: req.user?.rol
    });
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Eliminar registro de esquema de vacunación (solo Admin)
 * DELETE /api/pacientes/:id/esquema-vacunacion/:esquemaId
 */
export const deletePacienteEsquemaVacunacion = async (req, res) => {
  try {
    const { id, esquemaId } = req.params;

    if (!id || isNaN(id) || !esquemaId || isNaN(esquemaId)) {
      return res.status(400).json({
        success: false,
        error: 'IDs inválidos'
      });
    }

    const pacienteId = parseInt(id);
    const idEsquema = parseInt(esquemaId);

    // Verificar acceso al paciente (valida que Doctor tenga acceso al paciente asignado)
    const acceso = await verificarAccesoPaciente(req, pacienteId);
    if (acceso.error) {
      return res.status(acceso.status).json({
        success: false,
        error: acceso.error
      });
    }

    // Buscar y eliminar registro
    const esquema = await EsquemaVacunacion.findOne({
      where: {
        id_esquema: idEsquema,
        id_paciente: pacienteId
      }
    });

    if (!esquema) {
      return res.status(404).json({
        success: false,
        error: 'Registro de vacunación no encontrado'
      });
    }

    await esquema.destroy();

    logger.info('Registro de vacunación eliminado', {
      pacienteId,
      esquemaId: idEsquema,
      userRole: req.user.rol,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Registro de vacunación eliminado exitosamente'
    });

  } catch (error) {
    logger.error('Error eliminando esquema de vacunación:', {
      error: error.message,
      stack: error.stack,
      pacienteId: req.params.id,
      esquemaId: req.params.esquemaId,
      userRole: req.user?.rol
    });
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * =====================================================
 * GESTIÓN DE COMORBILIDADES DE PACIENTES
 * =====================================================
 */

/**
 * Función auxiliar para verificar acceso al paciente
 * Reutiliza la lógica de verificación de acceso existente
 * Nota: El middleware authorizePatientAccess ya verifica acceso básico,
 * pero esta función permite validaciones adicionales dentro del controlador
 */
const verificarAccesoPaciente = async (req, pacienteId) => {
  // Verificar que el paciente existe y está activo
  const paciente = await Paciente.findOne({
    where: { id_paciente: pacienteId, activo: true }
  });

  if (!paciente) {
    return { error: 'Paciente no encontrado o inactivo', status: 404 };
  }

  // Si es Doctor, verificar que tiene acceso al paciente
  // (Esta verificación ya se hace en authorizePatientAccess, pero la mantenemos
  // para funciones que usan authorizeRoles directamente)
  if (req.user.rol === 'Doctor') {
    const doctor = await Doctor.findOne({ 
      where: { id_usuario: req.user.id } 
    });
    
    if (!doctor) {
      return { error: 'Doctor no encontrado', status: 403 };
    }

    // Verificar asignación
    const asignacion = await DoctorPaciente.findOne({
      where: {
        id_doctor: doctor.id_doctor,
        id_paciente: pacienteId
      }
    });

    if (!asignacion) {
      return { error: 'No tienes acceso a este paciente', status: 403 };
    }
  }

  return { paciente, error: null };
};

/**
 * Obtener comorbilidades de un paciente específico
 * GET /api/pacientes/:id/comorbilidades
 */
export const getPacienteComorbilidades = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    // Validar parámetros
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de paciente inválido'
      });
    }

    const pacienteId = parseInt(id);

    // Verificar acceso al paciente
    const acceso = await verificarAccesoPaciente(req, pacienteId);
    if (acceso.error) {
      return res.status(acceso.status).json({
        success: false,
        error: acceso.error
      });
    }

    // Obtener comorbilidades del paciente
    const pacienteComorbilidades = await PacienteComorbilidad.findAndCountAll({
      where: { id_paciente: pacienteId },
      include: [
        {
          model: Comorbilidad,
          as: 'Comorbilidad',
          attributes: ['id_comorbilidad', 'nombre_comorbilidad', 'descripcion']
        }
      ],
      order: [['fecha_deteccion', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Formatear datos
    const comorbilidadesFormateadas = pacienteComorbilidades.rows.map(pc => ({
      id_comorbilidad: pc.id_comorbilidad,
      nombre_comorbilidad: pc.Comorbilidad?.nombre_comorbilidad,
      nombre: pc.Comorbilidad?.nombre_comorbilidad, // Alias para compatibilidad
      descripcion: pc.Comorbilidad?.descripcion,
      fecha_deteccion: pc.fecha_deteccion,
      observaciones: pc.observaciones,
      anos_padecimiento: pc.anos_padecimiento,
      es_diagnostico_basal: pc.es_diagnostico_basal,
      es_agregado_posterior: pc.es_agregado_posterior,
      año_diagnostico: pc.año_diagnostico,
      recibe_tratamiento_no_farmacologico: pc.recibe_tratamiento_no_farmacologico,
      recibe_tratamiento_farmacologico: pc.recibe_tratamiento_farmacologico
    }));

    logger.info('Comorbilidades del paciente obtenidas', {
      pacienteId,
      total: pacienteComorbilidades.count,
      returned: comorbilidadesFormateadas.length,
      userRole: req.user.rol
    });

    res.json({
      success: true,
      data: comorbilidadesFormateadas,
      total: pacienteComorbilidades.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    logger.error('Error obteniendo comorbilidades del paciente:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Agregar comorbilidad a un paciente
 * POST /api/pacientes/:id/comorbilidades
 */
export const addPacienteComorbilidad = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      id_comorbilidad, 
      fecha_deteccion, 
      observaciones, 
      anos_padecimiento,
      es_diagnostico_basal,
      es_agregado_posterior,
      año_diagnostico,
      recibe_tratamiento_no_farmacologico,
      recibe_tratamiento_farmacologico
    } = req.body;

    // Validar parámetros
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de paciente inválido'
      });
    }

    // Validar y convertir id_comorbilidad
    if (!id_comorbilidad) {
      return res.status(400).json({
        success: false,
        error: 'ID de comorbilidad requerido'
      });
    }

    // Convertir a número (puede venir como string o número)
    const comorbilidadId = typeof id_comorbilidad === 'string' 
      ? parseInt(id_comorbilidad, 10) 
      : Number(id_comorbilidad);

    if (isNaN(comorbilidadId) || comorbilidadId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'ID de comorbilidad inválido'
      });
    }

    const pacienteId = parseInt(id, 10);
    if (isNaN(pacienteId) || pacienteId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'ID de paciente inválido'
      });
    }

    // Verificar acceso al paciente
    const acceso = await verificarAccesoPaciente(req, pacienteId);
    if (acceso.error) {
      return res.status(acceso.status).json({
        success: false,
        error: acceso.error
      });
    }

    // Verificar que la comorbilidad existe
    const comorbilidad = await Comorbilidad.findByPk(comorbilidadId);
    if (!comorbilidad) {
      return res.status(404).json({
        success: false,
        error: 'Comorbilidad no encontrada'
      });
    }

    // Verificar si ya existe la relación
    const existeRelacion = await PacienteComorbilidad.findOne({
      where: {
        id_paciente: pacienteId,
        id_comorbilidad: comorbilidadId
      }
    });

    if (existeRelacion) {
      return res.status(409).json({
        success: false,
        error: 'El paciente ya tiene esta comorbilidad asignada'
      });
    }

    // Validar y formatear fecha_deteccion si está presente
    let fechaDeteccionFormateada = null;
    if (fecha_deteccion) {
      // Si viene como string, validar formato
      const fecha = new Date(fecha_deteccion);
      if (!isNaN(fecha.getTime())) {
        fechaDeteccionFormateada = fecha.toISOString().split('T')[0];
      }
    } else {
      // Si no viene fecha, usar la fecha actual
      fechaDeteccionFormateada = new Date().toISOString().split('T')[0];
    }

    // Validar y convertir anos_padecimiento si está presente
    let anosPadecimientoNum = null;
    if (anos_padecimiento !== undefined && anos_padecimiento !== null && anos_padecimiento !== '') {
      // Convertir a string primero para manejar números y strings
      const anosStr = String(anos_padecimiento).trim();
      if (anosStr !== '') {
        anosPadecimientoNum = parseInt(anosStr, 10);
        if (isNaN(anosPadecimientoNum) || anosPadecimientoNum < 0) {
          return res.status(400).json({
            success: false,
            error: 'Años con padecimiento debe ser un número válido mayor o igual a 0'
          });
        }
      }
    }

    // Validar diagnóstico basal y agregado posterior (mutuamente excluyentes)
    if (es_diagnostico_basal && es_agregado_posterior) {
      return res.status(400).json({
        success: false,
        error: 'Un diagnóstico no puede ser basal y agregado posterior al mismo tiempo'
      });
    }

    // Validar año_diagnostico si se proporciona
    let añoDiagnosticoNum = null;
    if (año_diagnostico !== undefined && año_diagnostico !== null && año_diagnostico !== '') {
      añoDiagnosticoNum = parseInt(año_diagnostico, 10);
      const añoActual = new Date().getFullYear();
      if (isNaN(añoDiagnosticoNum) || añoDiagnosticoNum < 1900 || añoDiagnosticoNum > añoActual) {
        return res.status(400).json({
          success: false,
          error: `Año de diagnóstico debe estar entre 1900 y ${añoActual}`
        });
      }
    }

    // Preparar datos para crear la relación
    const relacionData = {
      id_paciente: pacienteId,
      id_comorbilidad: comorbilidadId,
      fecha_deteccion: fechaDeteccionFormateada,
      observaciones: observaciones && observaciones.trim() ? observaciones.trim() : null,
      es_diagnostico_basal: es_diagnostico_basal === true || es_diagnostico_basal === 'true',
      es_agregado_posterior: es_agregado_posterior === true || es_agregado_posterior === 'true',
      recibe_tratamiento_no_farmacologico: recibe_tratamiento_no_farmacologico === true || recibe_tratamiento_no_farmacologico === 'true',
      recibe_tratamiento_farmacologico: recibe_tratamiento_farmacologico === true || recibe_tratamiento_farmacologico === 'true'
    };

    // Solo agregar campos opcionales si tienen valores válidos
    if (anosPadecimientoNum !== null) {
      relacionData.anos_padecimiento = anosPadecimientoNum;
    }
    if (añoDiagnosticoNum !== null) {
      relacionData.año_diagnostico = añoDiagnosticoNum;
    }

    // Crear relación
    const nuevaRelacion = await PacienteComorbilidad.create(relacionData);

    // Obtener datos completos para respuesta
    const relacionCompleta = await PacienteComorbilidad.findOne({
      where: {
        id_paciente: pacienteId,
        id_comorbilidad: comorbilidadId
      },
      include: [
        {
          model: Comorbilidad,
          as: 'Comorbilidad',
          attributes: ['id_comorbilidad', 'nombre_comorbilidad', 'descripcion']
        }
      ]
    });

    logger.info('Comorbilidad agregada al paciente', {
      pacienteId,
      comorbilidadId,
      nombre: comorbilidad.nombre_comorbilidad,
      userRole: req.user.rol,
      userId: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Comorbilidad agregada exitosamente',
      data: {
        id_comorbilidad: relacionCompleta.id_comorbilidad,
        nombre_comorbilidad: relacionCompleta.Comorbilidad?.nombre_comorbilidad,
        descripcion: relacionCompleta.Comorbilidad?.descripcion,
        fecha_deteccion: relacionCompleta.fecha_deteccion,
        observaciones: relacionCompleta.observaciones,
        anos_padecimiento: relacionCompleta.anos_padecimiento
      }
    });

  } catch (error) {
    logger.error('Error agregando comorbilidad al paciente:', {
      error: error.message,
      stack: error.stack,
      pacienteId: req.params.id,
      datos: req.body,
      userRole: req.user?.rol,
      errorName: error.name,
      errorCode: error.code,
      errorDetails: error.errors || error.parent?.message || error.original?.message
    });
    
    // Si es un error de validación de Sequelize
    if (error.name === 'SequelizeValidationError') {
      const firstError = error.errors?.[0];
      return res.status(400).json({
        success: false,
        error: firstError?.message || 'Error de validación de datos',
        field: firstError?.path,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    // Si es un error de constraint único (duplicado)
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        error: 'El paciente ya tiene esta comorbilidad asignada'
      });
    }
    
    // Si es un error de base de datos
    if (error.name === 'SequelizeDatabaseError' || error.parent) {
      logger.error('Error de base de datos al agregar comorbilidad:', {
        sql: error.sql,
        parameters: error.parameters,
        parentError: error.parent?.message,
        sqlState: error.parent?.sqlState,
        sqlMessage: error.parent?.sqlMessage
      });
      
      // Verificar si es un error de columna desconocida
      if (error.parent?.sqlMessage?.includes('Unknown column')) {
        return res.status(500).json({
          success: false,
          error: 'Error de estructura de base de datos. Contacte al administrador.',
          details: process.env.NODE_ENV === 'development' ? error.parent.sqlMessage : undefined
        });
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      requestId: req.id || Date.now().toString()
    });
  }
};

/**
 * Actualizar comorbilidad de un paciente
 * PUT /api/pacientes/:id/comorbilidades/:comorbilidadId
 */
export const updatePacienteComorbilidad = async (req, res) => {
  try {
    const { id, comorbilidadId } = req.params;
    const { fecha_deteccion, observaciones, anos_padecimiento } = req.body;

    // Validar parámetros
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de paciente inválido'
      });
    }

    if (!comorbilidadId || isNaN(comorbilidadId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de comorbilidad inválido'
      });
    }

    const pacienteId = parseInt(id);
    const idComorbilidad = parseInt(comorbilidadId);

    // Verificar acceso al paciente
    const acceso = await verificarAccesoPaciente(req, pacienteId);
    if (acceso.error) {
      return res.status(acceso.status).json({
        success: false,
        error: acceso.error
      });
    }

    // Buscar relación existente
    const relacion = await PacienteComorbilidad.findOne({
      where: {
        id_paciente: pacienteId,
        id_comorbilidad: idComorbilidad
      },
      include: [
        {
          model: Comorbilidad,
          as: 'Comorbilidad',
          attributes: ['id_comorbilidad', 'nombre_comorbilidad', 'descripcion']
        }
      ]
    });

    if (!relacion) {
      return res.status(404).json({
        success: false,
        error: 'Comorbilidad no encontrada para este paciente'
      });
    }

    // Actualizar campos permitidos
    if (fecha_deteccion !== undefined) {
      relacion.fecha_deteccion = fecha_deteccion || null;
    }
    if (observaciones !== undefined) {
      relacion.observaciones = observaciones || null;
    }
    if (anos_padecimiento !== undefined && anos_padecimiento !== null && anos_padecimiento !== '') {
      const anosPadecimientoNum = parseInt(anos_padecimiento, 10);
      if (isNaN(anosPadecimientoNum) || anosPadecimientoNum < 0) {
        return res.status(400).json({
          success: false,
          error: 'Años con padecimiento debe ser un número válido mayor o igual a 0'
        });
      }
      relacion.anos_padecimiento = anosPadecimientoNum;
    } else if (anos_padecimiento === null || anos_padecimiento === '') {
      relacion.anos_padecimiento = null;
    }

    await relacion.save();

    logger.info('Comorbilidad del paciente actualizada', {
      pacienteId,
      comorbilidadId: idComorbilidad,
      nombre: relacion.Comorbilidad?.nombre_comorbilidad,
      userRole: req.user.rol,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Comorbilidad actualizada exitosamente',
      data: {
        id_comorbilidad: relacion.id_comorbilidad,
        nombre_comorbilidad: relacion.Comorbilidad?.nombre_comorbilidad,
        descripcion: relacion.Comorbilidad?.descripcion,
        fecha_deteccion: relacion.fecha_deteccion,
        observaciones: relacion.observaciones,
        anos_padecimiento: relacion.anos_padecimiento
      }
    });

  } catch (error) {
    logger.error('Error actualizando comorbilidad del paciente:', {
      error: error.message,
      stack: error.stack,
      pacienteId: req.params.id,
      comorbilidadId: req.params.comorbilidadId,
      datos: req.body,
      userRole: req.user?.rol
    });
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Eliminar comorbilidad de un paciente
 * DELETE /api/pacientes/:id/comorbilidades/:comorbilidadId
 */
export const deletePacienteComorbilidad = async (req, res) => {
  try {
    const { id, comorbilidadId } = req.params;

    // Validar parámetros
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de paciente inválido'
      });
    }

    if (!comorbilidadId || isNaN(comorbilidadId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de comorbilidad inválido'
      });
    }

    const pacienteId = parseInt(id);
    const idComorbilidad = parseInt(comorbilidadId);

    // Verificar acceso al paciente
    const acceso = await verificarAccesoPaciente(req, pacienteId);
    if (acceso.error) {
      return res.status(acceso.status).json({
        success: false,
        error: acceso.error
      });
    }

    // Buscar relación existente
    const relacion = await PacienteComorbilidad.findOne({
      where: {
        id_paciente: pacienteId,
        id_comorbilidad: idComorbilidad
      },
      include: [
        {
          model: Comorbilidad,
          attributes: ['nombre_comorbilidad']
        }
      ]
    });

    if (!relacion) {
      return res.status(404).json({
        success: false,
        error: 'Comorbilidad no encontrada para este paciente'
      });
    }

    const nombreComorbilidad = relacion.Comorbilidad?.nombre_comorbilidad;

    // Eliminar relación
    await relacion.destroy();

    logger.info('Comorbilidad eliminada del paciente', {
      pacienteId,
      comorbilidadId: idComorbilidad,
      nombre: nombreComorbilidad,
      userRole: req.user.rol,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Comorbilidad eliminada exitosamente'
    });

  } catch (error) {
    logger.error('Error eliminando comorbilidad del paciente:', {
      error: error.message,
      stack: error.stack,
      pacienteId: req.params.id,
      comorbilidadId: req.params.comorbilidadId,
      userRole: req.user?.rol
    });
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

