import { SesionEducativa, Paciente, Cita, Doctor, DoctorPaciente } from '../models/associations.js';
import logger from '../utils/logger.js';
import { Op } from 'sequelize';

/**
 * Valores válidos para tipo_sesion según el ENUM del modelo
 */
const TIPOS_SESION_VALIDOS = [
  'nutricional',
  'actividad_fisica',
  'medico_preventiva',
  'trabajo_social',
  'psicologica',
  'odontologica'
];

/**
 * Valida que el tipo de sesión sea válido según el ENUM
 * @param {string} tipo_sesion - Tipo de sesión a validar
 * @returns {string|null} - Mensaje de error o null si es válido
 */
const validarTipoSesion = (tipo_sesion) => {
  if (!tipo_sesion || typeof tipo_sesion !== 'string') {
    return 'Tipo de sesión es requerido';
  }

  const tipoNormalizado = tipo_sesion.trim().toLowerCase();
  if (!TIPOS_SESION_VALIDOS.includes(tipoNormalizado)) {
    return `Tipo de sesión inválido. Valores permitidos: ${TIPOS_SESION_VALIDOS.join(', ')}`;
  }

  return null;
};

/**
 * =====================================================
 * CONTROLADOR PARA SESIONES EDUCATIVAS
 * =====================================================
 * 
 * Maneja endpoints para gestionar sesiones educativas
 * según el formato GAM
 */

/**
 * Obtener todas las sesiones educativas de un paciente
 * GET /api/pacientes/:id/sesiones-educativas
 */
export const getSesionesEducativasPaciente = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 100, offset = 0, sort = 'DESC', tipo_sesion, fecha_desde, fecha_hasta } = req.query;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de paciente inválido'
      });
    }

    const pacienteId = parseInt(id);
    const userRole = req.user.rol;
    let doctorId = null;

    // Verificar acceso para Doctor
    if (userRole === 'Doctor') {
      const doctor = await Doctor.findOne({
        where: { id_usuario: req.user.id }
      });

      if (!doctor) {
        return res.status(403).json({
          success: false,
          error: 'Doctor no encontrado'
        });
      }

      doctorId = doctor.id_doctor;

      const asignacion = await DoctorPaciente.findOne({
        where: {
          id_doctor: doctorId,
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

    // Construir filtros
    const where = { id_paciente: pacienteId };
    if (tipo_sesion) {
      where.tipo_sesion = tipo_sesion;
    }
    if (fecha_desde || fecha_hasta) {
      where.fecha_sesion = {};
      if (fecha_desde) where.fecha_sesion[Op.gte] = fecha_desde;
      if (fecha_hasta) where.fecha_sesion[Op.lte] = fecha_hasta;
    }

    const sesiones = await SesionEducativa.findAndCountAll({
      where,
      include: [
        {
          model: Cita,
          as: 'Cita',
          attributes: ['id_cita', 'fecha_cita', 'estado'],
          required: false
        }
      ],
      order: [['fecha_sesion', sort]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    logger.info('Sesiones educativas obtenidas', {
      pacienteId,
      total: sesiones.count,
      returned: sesiones.rows.length,
      userRole
    });

    res.json({
      success: true,
      data: sesiones.rows,
      total: sesiones.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    logger.error('Error obteniendo sesiones educativas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Crear una nueva sesión educativa
 * POST /api/pacientes/:id/sesiones-educativas
 */
export const createSesionEducativa = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      id_cita,
      fecha_sesion,
      asistio,
      tipo_sesion,
      numero_intervenciones,
      observaciones
    } = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de paciente inválido'
      });
    }

    const pacienteId = parseInt(id);
    const userRole = req.user.rol;
    let doctorId = null;

    // Verificar acceso para Doctor
    if (userRole === 'Doctor') {
      const doctor = await Doctor.findOne({
        where: { id_usuario: req.user.id }
      });

      if (!doctor) {
        return res.status(403).json({
          success: false,
          error: 'Doctor no encontrado'
        });
      }

      doctorId = doctor.id_doctor;

      const asignacion = await DoctorPaciente.findOne({
        where: {
          id_doctor: doctorId,
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

    // Validar campos requeridos
    if (!fecha_sesion) {
      return res.status(400).json({
        success: false,
        error: 'Fecha de sesión es requerida'
      });
    }

    // ✅ Validar tipo de sesión contra ENUM
    const tipoSesionValidationError = validarTipoSesion(tipo_sesion);
    if (tipoSesionValidationError) {
      logger.warn('Tipo de sesión inválido', {
        tipo_sesion,
        pacienteId,
        userRole
      });
      return res.status(400).json({
        success: false,
        error: tipoSesionValidationError
      });
    }

    const tiposValidos = ['nutricional', 'actividad_fisica', 'medico_preventiva', 'trabajo_social', 'psicologica', 'odontologica'];
    if (!tiposValidos.includes(tipo_sesion)) {
      return res.status(400).json({
        success: false,
        error: `Tipo de sesión inválido. Debe ser uno de: ${tiposValidos.join(', ')}`
      });
    }

    // Validar id_cita si se proporciona
    let citaId = null;
    if (id_cita !== undefined && id_cita !== null && id_cita !== '') {
      citaId = parseInt(id_cita, 10);
      if (isNaN(citaId) || citaId <= 0) {
        return res.status(400).json({
          success: false,
          error: 'ID de cita inválido'
        });
      }

      // Verificar que la cita existe y pertenece al paciente
      const cita = await Cita.findOne({
        where: {
          id_cita: citaId,
          id_paciente: pacienteId
        }
      });

      if (!cita) {
        return res.status(404).json({
          success: false,
          error: 'Cita no encontrada para este paciente'
        });
      }
    }

    // Validar número de intervenciones
    let numIntervenciones = 1;
    if (numero_intervenciones !== undefined && numero_intervenciones !== null && numero_intervenciones !== '') {
      numIntervenciones = parseInt(numero_intervenciones, 10);
      if (isNaN(numIntervenciones) || numIntervenciones < 1) {
        return res.status(400).json({
          success: false,
          error: 'Número de intervenciones debe ser mayor o igual a 1'
        });
      }
    }

    // Crear sesión educativa
    const sesionData = {
      id_paciente: pacienteId,
      id_cita: citaId,
      fecha_sesion: fecha_sesion,
      asistio: asistio === true || asistio === 'true',
      tipo_sesion: tipo_sesion,
      numero_intervenciones: numIntervenciones,
      observaciones: observaciones && observaciones.trim() ? observaciones.trim() : null
    };

    const sesion = await SesionEducativa.create(sesionData);

    logger.info('Sesión educativa creada', {
      id_sesion: sesion.id_sesion,
      pacienteId,
      tipo_sesion,
      userRole
    });

    res.status(201).json({
      success: true,
      message: 'Sesión educativa creada exitosamente',
      data: sesion
    });

  } catch (error) {
    logger.error('Error creando sesión educativa:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Actualizar una sesión educativa
 * PUT /api/pacientes/:id/sesiones-educativas/:sesionId
 */
export const updateSesionEducativa = async (req, res) => {
  try {
    const { id, sesionId } = req.params;
    const {
      fecha_sesion,
      asistio,
      tipo_sesion,
      numero_intervenciones,
      observaciones
    } = req.body;

    if (!id || isNaN(id) || !sesionId || isNaN(sesionId)) {
      return res.status(400).json({
        success: false,
        error: 'IDs inválidos'
      });
    }

    const pacienteId = parseInt(id);
    const idSesion = parseInt(sesionId);
    const userRole = req.user.rol;

    // Verificar acceso para Doctor
    if (userRole === 'Doctor') {
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

    // Buscar sesión
    const sesion = await SesionEducativa.findOne({
      where: {
        id_sesion: idSesion,
        id_paciente: pacienteId
      }
    });

    if (!sesion) {
      return res.status(404).json({
        success: false,
        error: 'Sesión educativa no encontrada'
      });
    }

    // ✅ Validar tipo de sesión si se está actualizando
    if (tipo_sesion !== undefined && tipo_sesion !== null) {
      const tipoSesionValidationError = validarTipoSesion(tipo_sesion);
      if (tipoSesionValidationError) {
        logger.warn('Tipo de sesión inválido en actualización', {
          tipo_sesion,
          sesionId: idSesion,
          pacienteId,
          userRole
        });
        return res.status(400).json({
          success: false,
          error: tipoSesionValidationError
        });
      }
    }

    // Actualizar campos
    if (fecha_sesion !== undefined) {
      sesion.fecha_sesion = fecha_sesion;
    }
    if (asistio !== undefined) {
      sesion.asistio = asistio === true || asistio === 'true';
    }
    if (tipo_sesion !== undefined) {
      sesion.tipo_sesion = tipo_sesion.trim().toLowerCase();
    }
    if (numero_intervenciones !== undefined) {
      const num = parseInt(numero_intervenciones, 10);
      if (isNaN(num) || num < 1) {
        return res.status(400).json({
          success: false,
          error: 'Número de intervenciones debe ser mayor o igual a 1'
        });
      }
      sesion.numero_intervenciones = num;
    }
    if (observaciones !== undefined) {
      sesion.observaciones = observaciones && observaciones.trim() ? observaciones.trim() : null;
    }

    await sesion.save();

    logger.info('Sesión educativa actualizada', {
      id_sesion: idSesion,
      pacienteId,
      userRole
    });

    res.json({
      success: true,
      message: 'Sesión educativa actualizada exitosamente',
      data: sesion
    });

  } catch (error) {
    logger.error('Error actualizando sesión educativa:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Eliminar una sesión educativa (solo Admin)
 * DELETE /api/pacientes/:id/sesiones-educativas/:sesionId
 */
export const deleteSesionEducativa = async (req, res) => {
  try {
    const { id, sesionId } = req.params;

    if (!id || isNaN(id) || !sesionId || isNaN(sesionId)) {
      return res.status(400).json({
        success: false,
        error: 'IDs inválidos'
      });
    }

    const pacienteId = parseInt(id);
    const idSesion = parseInt(sesionId);
    const userRole = req.user.rol;

    // Solo Admin puede eliminar
    if (userRole !== 'Admin' && userRole !== 'admin' && userRole !== 'administrador') {
      return res.status(403).json({
        success: false,
        error: 'Solo los administradores pueden eliminar sesiones educativas'
      });
    }

    // Buscar sesión
    const sesion = await SesionEducativa.findOne({
      where: {
        id_sesion: idSesion,
        id_paciente: pacienteId
      }
    });

    if (!sesion) {
      return res.status(404).json({
        success: false,
        error: 'Sesión educativa no encontrada'
      });
    }

    await sesion.destroy();

    logger.info('Sesión educativa eliminada', {
      id_sesion: idSesion,
      pacienteId,
      userRole
    });

    res.json({
      success: true,
      message: 'Sesión educativa eliminada exitosamente'
    });

  } catch (error) {
    logger.error('Error eliminando sesión educativa:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

