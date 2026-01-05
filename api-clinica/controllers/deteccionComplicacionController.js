import DeteccionComplicacionService from '../services/deteccionComplicacionService.js';
import { Doctor } from '../models/associations.js';
import logger from '../utils/logger.js';

/**
 * =====================================================
 * CONTROLADOR PARA DETECCIÓN DE COMPLICACIONES
 * =====================================================
 * 
 * Este controlador maneja endpoints para gestionar
 * detecciones de complicaciones médicas relacionadas
 * con comorbilidades de pacientes.
 * 
 * Seguridad:
 * - Autenticación JWT requerida
 * - Autorización por roles (Admin/Doctor/Paciente)
 * - Validación de acceso por doctor asignado
 * - Rate limiting aplicado
 * - Logging de todas las operaciones
 */

const deteccionComplicacionService = new DeteccionComplicacionService();

/**
 * Obtener todas las detecciones de complicaciones de un paciente
 * GET /api/pacientes/:id/detecciones-complicaciones
 */
export const getDeteccionesPaciente = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 100, offset = 0, sort = 'DESC' } = req.query;

    // Validar parámetros
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de paciente inválido'
      });
    }

    const pacienteId = parseInt(id);
    const userRole = req.user.rol;
    let doctorId = null;

    // Obtener ID del doctor si es Doctor
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
    }

    const resultado = await deteccionComplicacionService.getDeteccionesPaciente(
      pacienteId,
      doctorId,
      userRole,
      { limit, offset, sort }
    );

    logger.info('Detecciones de complicaciones obtenidas', {
      pacienteId,
      total: resultado.total,
      userRole
    });

    res.json({
      success: true,
      data: resultado.data,
      total: resultado.total,
      limit: resultado.limit,
      offset: resultado.offset
    });

  } catch (error) {
    logger.error('Error obteniendo detecciones de complicaciones:', error);
    
    if (error.message === 'No tienes acceso a este paciente') {
      return res.status(403).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

/**
 * Obtener una detección específica por ID
 * GET /api/pacientes/:pacienteId/detecciones-complicaciones/:id
 */
export const getDeteccionById = async (req, res) => {
  try {
    const { id, pacienteId } = req.params;

    // Validar parámetros
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de detección inválido'
      });
    }

    const deteccionId = parseInt(id);
    const pacienteIdParam = pacienteId ? parseInt(pacienteId) : null;
    const userRole = req.user.rol;
    let doctorId = null;

    // Obtener ID del doctor si es Doctor
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
    }

    const deteccion = await deteccionComplicacionService.getDeteccionById(
      deteccionId,
      doctorId,
      userRole
    );

    // Verificar que la detección pertenece al paciente especificado (si se proporciona)
    if (pacienteIdParam && deteccion.id_paciente !== pacienteIdParam) {
      return res.status(404).json({
        success: false,
        error: 'Detección no encontrada para este paciente'
      });
    }

    logger.info('Detección de complicación obtenida', {
      id_deteccion: deteccionId,
      userRole
    });

    res.json({
      success: true,
      data: deteccion
    });

  } catch (error) {
    logger.error('Error obteniendo detección de complicación:', error);
    
    if (error.message === 'Detección de complicación no encontrada') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    if (error.message === 'No tienes acceso a este paciente') {
      return res.status(403).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

/**
 * Crear una nueva detección de complicación
 * POST /api/pacientes/:id/detecciones-complicaciones
 */
export const createDeteccion = async (req, res) => {
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
    const userRole = req.user.rol;
    let doctorId = null;

    // Obtener ID del doctor si es Doctor
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
    }

    // Validar microalbuminuria si se proporciona resultado
    if (req.body.microalbuminuria_resultado !== undefined && req.body.microalbuminuria_resultado !== null && req.body.microalbuminuria_resultado !== '') {
      if (!req.body.microalbuminuria_realizada || req.body.microalbuminuria_realizada === false) {
        return res.status(400).json({
          success: false,
          error: 'No se puede registrar resultado de microalbuminuria sin haber realizado el examen'
        });
      }

      const resultado = parseFloat(req.body.microalbuminuria_resultado);
      if (isNaN(resultado) || resultado < 0 || resultado > 1000) {
        return res.status(400).json({
          success: false,
          error: 'Resultado de microalbuminuria debe estar entre 0 y 1000 mg/g'
        });
      }
    }

    // Preparar datos de la detección
    const deteccionData = {
      id_paciente: pacienteId,
      id_comorbilidad: req.body.id_comorbilidad || null,
      id_cita: req.body.id_cita || null,
      id_doctor: req.body.id_doctor || null,
      exploracion_pies: req.body.exploracion_pies === true || req.body.exploracion_pies === 'true',
      exploracion_fondo_ojo: req.body.exploracion_fondo_ojo === true || req.body.exploracion_fondo_ojo === 'true',
      realiza_auto_monitoreo: req.body.realiza_auto_monitoreo === true || req.body.realiza_auto_monitoreo === 'true',
      auto_monitoreo_glucosa: req.body.auto_monitoreo_glucosa === true || req.body.auto_monitoreo_glucosa === 'true',
      auto_monitoreo_presion: req.body.auto_monitoreo_presion === true || req.body.auto_monitoreo_presion === 'true',
      microalbuminuria_realizada: req.body.microalbuminuria_realizada === true || req.body.microalbuminuria_realizada === 'true',
      microalbuminuria_resultado: req.body.microalbuminuria_resultado !== undefined && req.body.microalbuminuria_resultado !== null && req.body.microalbuminuria_resultado !== '' 
        ? parseFloat(req.body.microalbuminuria_resultado) 
        : null,
      fue_referido: req.body.fue_referido === true || req.body.fue_referido === 'true',
      referencia_observaciones: req.body.referencia_observaciones || null,
      tipo_complicacion: req.body.tipo_complicacion || null,
      fecha_deteccion: req.body.fecha_deteccion || new Date().toISOString().split('T')[0],
      fecha_diagnostico: req.body.fecha_diagnostico || null,
      observaciones: req.body.observaciones || null
    };

    const deteccion = await deteccionComplicacionService.createDeteccion(
      deteccionData,
      doctorId,
      userRole
    );

    logger.info('Detección de complicación creada exitosamente', {
      id_deteccion: deteccion.id_deteccion,
      id_paciente: pacienteId,
      userRole
    });

    res.status(201).json({
      success: true,
      message: 'Detección de complicación creada exitosamente',
      data: deteccion
    });

  } catch (error) {
    logger.error('Error creando detección de complicación:', error);
    
    if (error.message === 'No tienes permisos para crear detecciones de complicaciones') {
      return res.status(403).json({
        success: false,
        error: error.message
      });
    }

    if (error.message === 'No tienes acceso a este paciente') {
      return res.status(403).json({
        success: false,
        error: error.message
      });
    }

    if (error.message.includes('Paciente no encontrado') ||
        error.message.includes('Cita no existe') ||
        error.message.includes('Comorbilidad no encontrada') ||
        error.message.includes('Doctor no encontrado') ||
        error.message.includes('fecha') ||
        error.message.includes('auto-monitoreo')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

/**
 * Actualizar una detección de complicación
 * PUT /api/pacientes/:pacienteId/detecciones-complicaciones/:id
 */
export const updateDeteccion = async (req, res) => {
  try {
    const { id, pacienteId } = req.params;

    // Validar parámetros
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de detección inválido'
      });
    }

    const deteccionId = parseInt(id);
    const pacienteIdParam = pacienteId ? parseInt(pacienteId) : null;
    const userRole = req.user.rol;
    let doctorId = null;

    // Obtener ID del doctor si es Doctor
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
    }

    // Validar microalbuminuria si se está actualizando
    if (req.body.microalbuminuria_resultado !== undefined && req.body.microalbuminuria_resultado !== null && req.body.microalbuminuria_resultado !== '') {
      const realizada = req.body.microalbuminuria_realizada !== undefined 
        ? (req.body.microalbuminuria_realizada === true || req.body.microalbuminuria_realizada === 'true')
        : true; // Si se proporciona resultado, asumir que se realizó
      
      if (!realizada) {
        return res.status(400).json({
          success: false,
          error: 'No se puede registrar resultado de microalbuminuria sin haber realizado el examen'
        });
      }

      const resultado = parseFloat(req.body.microalbuminuria_resultado);
      if (isNaN(resultado) || resultado < 0 || resultado > 1000) {
        return res.status(400).json({
          success: false,
          error: 'Resultado de microalbuminuria debe estar entre 0 y 1000 mg/g'
        });
      }
    }

    // Preparar datos de actualización (solo campos permitidos)
    const updateData = {};
    
    if (req.body.id_comorbilidad !== undefined) updateData.id_comorbilidad = req.body.id_comorbilidad || null;
    if (req.body.id_cita !== undefined) updateData.id_cita = req.body.id_cita || null;
    if (req.body.id_doctor !== undefined) updateData.id_doctor = req.body.id_doctor || null;
    if (req.body.exploracion_pies !== undefined) updateData.exploracion_pies = req.body.exploracion_pies === true || req.body.exploracion_pies === 'true';
    if (req.body.exploracion_fondo_ojo !== undefined) updateData.exploracion_fondo_ojo = req.body.exploracion_fondo_ojo === true || req.body.exploracion_fondo_ojo === 'true';
    if (req.body.realiza_auto_monitoreo !== undefined) updateData.realiza_auto_monitoreo = req.body.realiza_auto_monitoreo === true || req.body.realiza_auto_monitoreo === 'true';
    if (req.body.auto_monitoreo_glucosa !== undefined) updateData.auto_monitoreo_glucosa = req.body.auto_monitoreo_glucosa === true || req.body.auto_monitoreo_glucosa === 'true';
    if (req.body.auto_monitoreo_presion !== undefined) updateData.auto_monitoreo_presion = req.body.auto_monitoreo_presion === true || req.body.auto_monitoreo_presion === 'true';
    if (req.body.microalbuminuria_realizada !== undefined) updateData.microalbuminuria_realizada = req.body.microalbuminuria_realizada === true || req.body.microalbuminuria_realizada === 'true';
    if (req.body.microalbuminuria_resultado !== undefined) {
      updateData.microalbuminuria_resultado = req.body.microalbuminuria_resultado !== null && req.body.microalbuminuria_resultado !== '' 
        ? parseFloat(req.body.microalbuminuria_resultado) 
        : null;
    }
    if (req.body.fue_referido !== undefined) updateData.fue_referido = req.body.fue_referido === true || req.body.fue_referido === 'true';
    if (req.body.referencia_observaciones !== undefined) updateData.referencia_observaciones = req.body.referencia_observaciones || null;
    if (req.body.tipo_complicacion !== undefined) updateData.tipo_complicacion = req.body.tipo_complicacion || null;
    if (req.body.fecha_deteccion !== undefined) updateData.fecha_deteccion = req.body.fecha_deteccion;
    if (req.body.fecha_diagnostico !== undefined) updateData.fecha_diagnostico = req.body.fecha_diagnostico || null;
    if (req.body.observaciones !== undefined) updateData.observaciones = req.body.observaciones || null;

    // Verificar que hay datos para actualizar
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionaron datos para actualizar'
      });
    }

    const deteccion = await deteccionComplicacionService.updateDeteccion(
      deteccionId,
      updateData,
      doctorId,
      userRole
    );

    // Verificar que la detección pertenece al paciente especificado (si se proporciona)
    if (pacienteIdParam && deteccion.id_paciente !== pacienteIdParam) {
      return res.status(404).json({
        success: false,
        error: 'Detección no encontrada para este paciente'
      });
    }

    logger.info('Detección de complicación actualizada exitosamente', {
      id_deteccion: deteccionId,
      userRole
    });

    res.json({
      success: true,
      message: 'Detección de complicación actualizada exitosamente',
      data: deteccion
    });

  } catch (error) {
    logger.error('Error actualizando detección de complicación:', error);
    
    if (error.message === 'Detección de complicación no encontrada') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    if (error.message === 'No tienes permisos para actualizar detecciones de complicaciones') {
      return res.status(403).json({
        success: false,
        error: error.message
      });
    }

    if (error.message === 'No tienes acceso a este paciente') {
      return res.status(403).json({
        success: false,
        error: error.message
      });
    }

    if (error.message.includes('fecha') || error.message.includes('auto-monitoreo') || error.message.includes('Cita no existe')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

/**
 * Eliminar una detección de complicación
 * DELETE /api/pacientes/:pacienteId/detecciones-complicaciones/:id
 */
export const deleteDeteccion = async (req, res) => {
  try {
    const { id, pacienteId } = req.params;

    // Validar parámetros
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de detección inválido'
      });
    }

    const deteccionId = parseInt(id);
    const pacienteIdParam = pacienteId ? parseInt(pacienteId) : null;
    const userRole = req.user.rol;

    // Si se proporciona pacienteId, verificar que la detección pertenece a ese paciente
    if (pacienteIdParam) {
      const deteccion = await deteccionComplicacionService.getDeteccionById(
        deteccionId,
        null,
        userRole
      );

      if (deteccion.id_paciente !== pacienteIdParam) {
        return res.status(404).json({
          success: false,
          error: 'Detección no encontrada para este paciente'
        });
      }
    }

    await deteccionComplicacionService.deleteDeteccion(deteccionId, userRole);

    logger.info('Detección de complicación eliminada exitosamente', {
      id_deteccion: deteccionId,
      userRole
    });

    res.json({
      success: true,
      message: 'Detección de complicación eliminada exitosamente'
    });

  } catch (error) {
    logger.error('Error eliminando detección de complicación:', error);
    
    if (error.message === 'Detección de complicación no encontrada') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    if (error.message === 'Solo los administradores pueden eliminar detecciones de complicaciones') {
      return res.status(403).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

