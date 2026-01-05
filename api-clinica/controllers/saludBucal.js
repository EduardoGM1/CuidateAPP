import { SaludBucal, Paciente, Cita, Doctor, DoctorPaciente } from '../models/associations.js';
import logger from '../utils/logger.js';
import { Op } from 'sequelize';

/**
 * =====================================================
 * CONTROLADOR PARA SALUD BUCAL
 * =====================================================
 * 
 * Maneja endpoints para gestionar registros de salud bucal
 * según instrucción ⑫ del formato GAM
 */

/**
 * Obtener todos los registros de salud bucal de un paciente
 * GET /api/pacientes/:id/salud-bucal
 */
export const getSaludBucalPaciente = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 100, offset = 0, sort = 'DESC', fecha_desde, fecha_hasta } = req.query;

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
    if (fecha_desde || fecha_hasta) {
      where.fecha_registro = {};
      if (fecha_desde) where.fecha_registro[Op.gte] = fecha_desde;
      if (fecha_hasta) where.fecha_registro[Op.lte] = fecha_hasta;
    }

    const registros = await SaludBucal.findAndCountAll({
      where,
      include: [
        {
          model: Cita,
          as: 'Cita',
          attributes: ['id_cita', 'fecha_cita', 'estado'],
          required: false
        }
      ],
      order: [['fecha_registro', sort]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    logger.info('Registros de salud bucal obtenidos', {
      pacienteId,
      total: registros.count,
      returned: registros.rows.length,
      userRole
    });

    res.json({
      success: true,
      data: registros.rows,
      total: registros.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    logger.error('Error obteniendo registros de salud bucal:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Crear un nuevo registro de salud bucal
 * POST /api/pacientes/:id/salud-bucal
 */
export const createSaludBucal = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      id_cita,
      fecha_registro,
      presenta_enfermedades_odontologicas,
      recibio_tratamiento_odontologico,
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
    if (!fecha_registro) {
      return res.status(400).json({
        success: false,
        error: 'Fecha de registro es requerida'
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

    // Crear registro de salud bucal
    const registroData = {
      id_paciente: pacienteId,
      id_cita: citaId,
      fecha_registro: fecha_registro,
      presenta_enfermedades_odontologicas: presenta_enfermedades_odontologicas === true || presenta_enfermedades_odontologicas === 'true',
      recibio_tratamiento_odontologico: recibio_tratamiento_odontologico === true || recibio_tratamiento_odontologico === 'true',
      observaciones: observaciones && observaciones.trim() ? observaciones.trim() : null
    };

    const registro = await SaludBucal.create(registroData);

    logger.info('Registro de salud bucal creado', {
      id_salud_bucal: registro.id_salud_bucal,
      pacienteId,
      userRole
    });

    res.status(201).json({
      success: true,
      message: 'Registro de salud bucal creado exitosamente',
      data: registro
    });

  } catch (error) {
    logger.error('Error creando registro de salud bucal:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Actualizar un registro de salud bucal
 * PUT /api/pacientes/:id/salud-bucal/:registroId
 */
export const updateSaludBucal = async (req, res) => {
  try {
    const { id, registroId } = req.params;
    const {
      fecha_registro,
      presenta_enfermedades_odontologicas,
      recibio_tratamiento_odontologico,
      observaciones
    } = req.body;

    if (!id || isNaN(id) || !registroId || isNaN(registroId)) {
      return res.status(400).json({
        success: false,
        error: 'IDs inválidos'
      });
    }

    const pacienteId = parseInt(id);
    const idRegistro = parseInt(registroId);
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

    // Buscar registro
    const registro = await SaludBucal.findOne({
      where: {
        id_salud_bucal: idRegistro,
        id_paciente: pacienteId
      }
    });

    if (!registro) {
      return res.status(404).json({
        success: false,
        error: 'Registro de salud bucal no encontrado'
      });
    }

    // Actualizar campos
    if (fecha_registro !== undefined) {
      registro.fecha_registro = fecha_registro;
    }
    if (presenta_enfermedades_odontologicas !== undefined) {
      registro.presenta_enfermedades_odontologicas = presenta_enfermedades_odontologicas === true || presenta_enfermedades_odontologicas === 'true';
    }
    if (recibio_tratamiento_odontologico !== undefined) {
      registro.recibio_tratamiento_odontologico = recibio_tratamiento_odontologico === true || recibio_tratamiento_odontologico === 'true';
    }
    if (observaciones !== undefined) {
      registro.observaciones = observaciones && observaciones.trim() ? observaciones.trim() : null;
    }

    await registro.save();

    logger.info('Registro de salud bucal actualizado', {
      id_salud_bucal: idRegistro,
      pacienteId,
      userRole
    });

    res.json({
      success: true,
      message: 'Registro de salud bucal actualizado exitosamente',
      data: registro
    });

  } catch (error) {
    logger.error('Error actualizando registro de salud bucal:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Eliminar un registro de salud bucal (solo Admin)
 * DELETE /api/pacientes/:id/salud-bucal/:registroId
 */
export const deleteSaludBucal = async (req, res) => {
  try {
    const { id, registroId } = req.params;

    if (!id || isNaN(id) || !registroId || isNaN(registroId)) {
      return res.status(400).json({
        success: false,
        error: 'IDs inválidos'
      });
    }

    const pacienteId = parseInt(id);
    const idRegistro = parseInt(registroId);
    const userRole = req.user.rol;

    // Solo Admin puede eliminar
    if (userRole !== 'Admin' && userRole !== 'admin' && userRole !== 'administrador') {
      return res.status(403).json({
        success: false,
        error: 'Solo los administradores pueden eliminar registros de salud bucal'
      });
    }

    // Buscar registro
    const registro = await SaludBucal.findOne({
      where: {
        id_salud_bucal: idRegistro,
        id_paciente: pacienteId
      }
    });

    if (!registro) {
      return res.status(404).json({
        success: false,
        error: 'Registro de salud bucal no encontrado'
      });
    }

    await registro.destroy();

    logger.info('Registro de salud bucal eliminado', {
      id_salud_bucal: idRegistro,
      pacienteId,
      userRole
    });

    res.json({
      success: true,
      message: 'Registro de salud bucal eliminado exitosamente'
    });

  } catch (error) {
    logger.error('Error eliminando registro de salud bucal:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

