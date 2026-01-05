import { DeteccionTuberculosis, Paciente, Cita, Doctor, DoctorPaciente } from '../models/associations.js';
import logger from '../utils/logger.js';
import { Op } from 'sequelize';

/**
 * =====================================================
 * CONTROLADOR PARA DETECCIÓN DE TUBERCULOSIS
 * =====================================================
 * 
 * Maneja endpoints para gestionar detecciones de tuberculosis
 * según instrucciones ⑬ del formato GAM
 */

/**
 * Obtener todas las detecciones de tuberculosis de un paciente
 * GET /api/pacientes/:id/detecciones-tuberculosis
 */
export const getDeteccionesTuberculosisPaciente = async (req, res) => {
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
      where.fecha_deteccion = {};
      if (fecha_desde) where.fecha_deteccion[Op.gte] = fecha_desde;
      if (fecha_hasta) where.fecha_deteccion[Op.lte] = fecha_hasta;
    }

    const detecciones = await DeteccionTuberculosis.findAndCountAll({
      where,
      include: [
        {
          model: Cita,
          as: 'Cita',
          attributes: ['id_cita', 'fecha_cita', 'estado'],
          required: false
        }
      ],
      order: [['fecha_deteccion', sort]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    logger.info('Detecciones de tuberculosis obtenidas', {
      pacienteId,
      total: detecciones.count,
      returned: detecciones.rows.length,
      userRole
    });

    res.json({
      success: true,
      data: detecciones.rows,
      total: detecciones.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    logger.error('Error obteniendo detecciones de tuberculosis:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Crear una nueva detección de tuberculosis
 * POST /api/pacientes/:id/detecciones-tuberculosis
 */
export const createDeteccionTuberculosis = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      id_cita,
      fecha_deteccion,
      aplicacion_encuesta,
      baciloscopia_realizada,
      baciloscopia_resultado,
      ingreso_tratamiento,
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
    if (!fecha_deteccion) {
      return res.status(400).json({
        success: false,
        error: 'Fecha de detección es requerida'
      });
    }

    // Validar baciloscopia_resultado si se proporciona
    if (baciloscopia_resultado !== undefined && baciloscopia_resultado !== null && baciloscopia_resultado !== '') {
      const resultadosValidos = ['positivo', 'negativo', 'pendiente', 'no_aplicable'];
      if (!resultadosValidos.includes(baciloscopia_resultado)) {
        return res.status(400).json({
          success: false,
          error: `Resultado de baciloscopia inválido. Debe ser uno de: ${resultadosValidos.join(', ')}`
        });
      }

      // Si se proporciona resultado, debe haberse realizado la baciloscopia
      if (!baciloscopia_realizada || baciloscopia_realizada === false) {
        return res.status(400).json({
          success: false,
          error: 'No se puede registrar resultado de baciloscopia sin haber realizado el examen'
        });
      }
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

    // Crear detección de tuberculosis
    const deteccionData = {
      id_paciente: pacienteId,
      id_cita: citaId,
      fecha_deteccion: fecha_deteccion,
      aplicacion_encuesta: aplicacion_encuesta === true || aplicacion_encuesta === 'true',
      baciloscopia_realizada: baciloscopia_realizada === true || baciloscopia_realizada === 'true',
      baciloscopia_resultado: baciloscopia_resultado && baciloscopia_resultado !== '' ? baciloscopia_resultado : null,
      ingreso_tratamiento: ingreso_tratamiento === true || ingreso_tratamiento === 'true',
      observaciones: observaciones && observaciones.trim() ? observaciones.trim() : null
    };

    const deteccion = await DeteccionTuberculosis.create(deteccionData);

    logger.info('Detección de tuberculosis creada', {
      id_deteccion_tb: deteccion.id_deteccion_tb,
      pacienteId,
      userRole
    });

    res.status(201).json({
      success: true,
      message: 'Detección de tuberculosis creada exitosamente',
      data: deteccion
    });

  } catch (error) {
    logger.error('Error creando detección de tuberculosis:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Actualizar una detección de tuberculosis
 * PUT /api/pacientes/:id/detecciones-tuberculosis/:deteccionId
 */
export const updateDeteccionTuberculosis = async (req, res) => {
  try {
    const { id, deteccionId } = req.params;
    const {
      fecha_deteccion,
      aplicacion_encuesta,
      baciloscopia_realizada,
      baciloscopia_resultado,
      ingreso_tratamiento,
      observaciones
    } = req.body;

    if (!id || isNaN(id) || !deteccionId || isNaN(deteccionId)) {
      return res.status(400).json({
        success: false,
        error: 'IDs inválidos'
      });
    }

    const pacienteId = parseInt(id);
    const idDeteccion = parseInt(deteccionId);
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

    // Buscar detección
    const deteccion = await DeteccionTuberculosis.findOne({
      where: {
        id_deteccion_tb: idDeteccion,
        id_paciente: pacienteId
      }
    });

    if (!deteccion) {
      return res.status(404).json({
        success: false,
        error: 'Detección de tuberculosis no encontrada'
      });
    }

    // Validar baciloscopia_resultado si se está actualizando
    if (baciloscopia_resultado !== undefined && baciloscopia_resultado !== null && baciloscopia_resultado !== '') {
      const resultadosValidos = ['positivo', 'negativo', 'pendiente', 'no_aplicable'];
      if (!resultadosValidos.includes(baciloscopia_resultado)) {
        return res.status(400).json({
          success: false,
          error: `Resultado de baciloscopia inválido. Debe ser uno de: ${resultadosValidos.join(', ')}`
        });
      }

      const realizada = baciloscopia_realizada !== undefined 
        ? (baciloscopia_realizada === true || baciloscopia_realizada === 'true')
        : deteccion.baciloscopia_realizada;
      
      if (!realizada) {
        return res.status(400).json({
          success: false,
          error: 'No se puede registrar resultado de baciloscopia sin haber realizado el examen'
        });
      }
    }

    // Actualizar campos
    if (fecha_deteccion !== undefined) {
      deteccion.fecha_deteccion = fecha_deteccion;
    }
    if (aplicacion_encuesta !== undefined) {
      deteccion.aplicacion_encuesta = aplicacion_encuesta === true || aplicacion_encuesta === 'true';
    }
    if (baciloscopia_realizada !== undefined) {
      deteccion.baciloscopia_realizada = baciloscopia_realizada === true || baciloscopia_realizada === 'true';
      // Si se desmarca baciloscopia_realizada, limpiar resultado
      if (!deteccion.baciloscopia_realizada) {
        deteccion.baciloscopia_resultado = null;
      }
    }
    if (baciloscopia_resultado !== undefined) {
      deteccion.baciloscopia_resultado = baciloscopia_resultado && baciloscopia_resultado !== '' ? baciloscopia_resultado : null;
    }
    if (ingreso_tratamiento !== undefined) {
      deteccion.ingreso_tratamiento = ingreso_tratamiento === true || ingreso_tratamiento === 'true';
    }
    if (observaciones !== undefined) {
      deteccion.observaciones = observaciones && observaciones.trim() ? observaciones.trim() : null;
    }

    await deteccion.save();

    logger.info('Detección de tuberculosis actualizada', {
      id_deteccion_tb: idDeteccion,
      pacienteId,
      userRole
    });

    res.json({
      success: true,
      message: 'Detección de tuberculosis actualizada exitosamente',
      data: deteccion
    });

  } catch (error) {
    logger.error('Error actualizando detección de tuberculosis:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Eliminar una detección de tuberculosis (solo Admin)
 * DELETE /api/pacientes/:id/detecciones-tuberculosis/:deteccionId
 */
export const deleteDeteccionTuberculosis = async (req, res) => {
  try {
    const { id, deteccionId } = req.params;

    if (!id || isNaN(id) || !deteccionId || isNaN(deteccionId)) {
      return res.status(400).json({
        success: false,
        error: 'IDs inválidos'
      });
    }

    const pacienteId = parseInt(id);
    const idDeteccion = parseInt(deteccionId);
    const userRole = req.user.rol;

    // Solo Admin puede eliminar
    if (userRole !== 'Admin' && userRole !== 'admin' && userRole !== 'administrador') {
      return res.status(403).json({
        success: false,
        error: 'Solo los administradores pueden eliminar detecciones de tuberculosis'
      });
    }

    // Buscar detección
    const deteccion = await DeteccionTuberculosis.findOne({
      where: {
        id_deteccion_tb: idDeteccion,
        id_paciente: pacienteId
      }
    });

    if (!deteccion) {
      return res.status(404).json({
        success: false,
        error: 'Detección de tuberculosis no encontrada'
      });
    }

    await deteccion.destroy();

    logger.info('Detección de tuberculosis eliminada', {
      id_deteccion_tb: idDeteccion,
      pacienteId,
      userRole
    });

    res.json({
      success: true,
      message: 'Detección de tuberculosis eliminada exitosamente'
    });

  } catch (error) {
    logger.error('Error eliminando detección de tuberculosis:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

