import { Comorbilidad } from '../models/associations.js';
import { sendSuccess, sendError, sendNotFound, sendServerError } from '../utils/responseHelpers.js';
import logger from '../utils/logger.js';
import { Op } from 'sequelize';

/**
 * =====================================================
 * CONTROLADOR DE COMORBILIDADES
 * =====================================================
 * 
 * Maneja las operaciones CRUD del catálogo de comorbilidades
 * 
 * Seguridad:
 * - Autenticación JWT requerida
 * - Solo Admin puede crear/editar/eliminar
 * - Admin y Doctor pueden leer
 */

/**
 * Obtener todas las comorbilidades
 * GET /api/comorbilidades
 */
export const getComorbilidades = async (req, res) => {
  try {
    logger.info('ComorbilidadController: Obteniendo lista de comorbilidades');
    
    // Verificar que el modelo esté disponible
    if (!Comorbilidad) {
      logger.error('ComorbilidadController: Modelo Comorbilidad no disponible');
      return sendServerError(res, 'Error de configuración: Modelo no disponible');
    }
    
    const { limit = 100, offset = 0, search = '' } = req.query;
    
    let whereCondition = {};
    
    // Búsqueda por nombre si se proporciona
    if (search && search.trim()) {
      whereCondition[Op.or] = [
        { nombre_comorbilidad: { [Op.like]: `%${search.trim()}%` } },
        { descripcion: { [Op.like]: `%${search.trim()}%` } }
      ];
    }
    
    const comorbilidades = await Comorbilidad.findAndCountAll({
      where: Object.keys(whereCondition).length > 0 ? whereCondition : undefined,
      order: [['nombre_comorbilidad', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    logger.info(`ComorbilidadController: ${comorbilidades.rows.length} comorbilidades encontradas`);
    
    return sendSuccess(res, {
      comorbilidades: comorbilidades.rows || [],
      total: comorbilidades.count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    logger.error('ComorbilidadController: Error obteniendo comorbilidades', {
      error: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Enviar más detalles del error en desarrollo
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Error al obtener comorbilidades: ${error.message}`
      : 'Error al obtener comorbilidades';
    
    return sendServerError(res, errorMessage);
  }
};

/**
 * Obtener una comorbilidad por ID
 * GET /api/comorbilidades/:id
 */
export const getComorbilidadById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return sendError(res, 'ID de comorbilidad inválido', 400);
    }
    
    logger.info(`ComorbilidadController: Obteniendo comorbilidad con ID ${id}`);
    
    const comorbilidad = await Comorbilidad.findByPk(id);
    
    if (!comorbilidad) {
      logger.warn(`ComorbilidadController: Comorbilidad con ID ${id} no encontrada`);
      return sendNotFound(res, 'Comorbilidad no encontrada');
    }
    
    logger.info(`ComorbilidadController: Comorbilidad ${comorbilidad.nombre_comorbilidad} encontrada`);
    
    return sendSuccess(res, { comorbilidad }, 'Comorbilidad obtenida exitosamente');
  } catch (error) {
    logger.error('ComorbilidadController: Error obteniendo comorbilidad por ID', error);
    return sendServerError(res, 'Error interno del servidor al obtener comorbilidad');
  }
};

/**
 * Crear nueva comorbilidad (solo para administradores)
 * POST /api/comorbilidades
 */
export const createComorbilidad = async (req, res) => {
  try {
    const { nombre_comorbilidad, descripcion } = req.body;
    
    // Validaciones
    if (!nombre_comorbilidad || typeof nombre_comorbilidad !== 'string' || nombre_comorbilidad.trim().length === 0) {
      return sendError(res, 'El nombre de la comorbilidad es requerido', 400);
    }
    
    if (nombre_comorbilidad.trim().length > 150) {
      return sendError(res, 'El nombre de la comorbilidad no puede exceder 150 caracteres', 400);
    }
    
    logger.info(`ComorbilidadController: Creando comorbilidad ${nombre_comorbilidad.trim()}`);
    
    // Verificar si ya existe
    const comorbilidadExistente = await Comorbilidad.findOne({
      where: { nombre_comorbilidad: nombre_comorbilidad.trim() }
    });
    
    if (comorbilidadExistente) {
      logger.warn(`ComorbilidadController: Comorbilidad ${nombre_comorbilidad.trim()} ya existe`);
      return sendError(res, 'Ya existe una comorbilidad con ese nombre', 409);
    }
    
    // Crear comorbilidad
    const nuevaComorbilidad = await Comorbilidad.create({
      nombre_comorbilidad: nombre_comorbilidad.trim(),
      descripcion: descripcion ? descripcion.trim() : null
    });
    
    logger.info(`ComorbilidadController: Comorbilidad ${nuevaComorbilidad.nombre_comorbilidad} creada con ID ${nuevaComorbilidad.id_comorbilidad}`);
    
    return sendSuccess(res, { 
      comorbilidad: {
        id_comorbilidad: nuevaComorbilidad.id_comorbilidad,
        nombre_comorbilidad: nuevaComorbilidad.nombre_comorbilidad,
        descripcion: nuevaComorbilidad.descripcion
      }
    }, 201);
    
  } catch (error) {
    logger.error('ComorbilidadController: Error creando comorbilidad', error);
    
    // Manejar errores de duplicado específico
    if (error.name === 'SequelizeUniqueConstraintError') {
      return sendError(res, 'Ya existe una comorbilidad con ese nombre', 409);
    }
    
    return sendServerError(res, 'Error interno del servidor al crear comorbilidad');
  }
};

/**
 * Actualizar comorbilidad (solo para administradores)
 * PUT /api/comorbilidades/:id
 */
export const updateComorbilidad = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_comorbilidad, descripcion } = req.body;
    
    if (!id || isNaN(id)) {
      return sendError(res, 'ID de comorbilidad inválido', 400);
    }
    
    if (!nombre_comorbilidad || typeof nombre_comorbilidad !== 'string' || nombre_comorbilidad.trim().length === 0) {
      return sendError(res, 'El nombre de la comorbilidad es requerido', 400);
    }
    
    if (nombre_comorbilidad.trim().length > 150) {
      return sendError(res, 'El nombre de la comorbilidad no puede exceder 150 caracteres', 400);
    }
    
    logger.info(`ComorbilidadController: Actualizando comorbilidad ID ${id}`);
    
    const comorbilidad = await Comorbilidad.findByPk(id);
    
    if (!comorbilidad) {
      logger.warn(`ComorbilidadController: Comorbilidad con ID ${id} no encontrada`);
      return sendNotFound(res, 'Comorbilidad no encontrada');
    }
    
    // Verificar si el nuevo nombre ya existe
    const comorbilidadExistente = await Comorbilidad.findOne({
      where: { 
        nombre_comorbilidad: nombre_comorbilidad.trim(),
        id_comorbilidad: { [Op.ne]: id }
      }
    });
    
    if (comorbilidadExistente) {
      logger.warn(`ComorbilidadController: Comorbilidad ${nombre_comorbilidad.trim()} ya existe`);
      return sendError(res, 'Ya existe una comorbilidad con ese nombre', 409);
    }
    
    // Actualizar comorbilidad
    await comorbilidad.update({
      nombre_comorbilidad: nombre_comorbilidad.trim(),
      descripcion: descripcion !== undefined ? (descripcion ? descripcion.trim() : null) : comorbilidad.descripcion
    });
    
    logger.info(`ComorbilidadController: Comorbilidad ID ${id} actualizada a ${comorbilidad.nombre_comorbilidad}`);
    
    return sendSuccess(res, { 
      comorbilidad: {
        id_comorbilidad: comorbilidad.id_comorbilidad,
        nombre_comorbilidad: comorbilidad.nombre_comorbilidad,
        descripcion: comorbilidad.descripcion
      }
    });
    
  } catch (error) {
    logger.error('ComorbilidadController: Error actualizando comorbilidad', error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return sendError(res, 'Ya existe una comorbilidad con ese nombre', 409);
    }
    
    return sendServerError(res, 'Error interno del servidor al actualizar comorbilidad');
  }
};

/**
 * Eliminar comorbilidad (solo para administradores)
 * DELETE /api/comorbilidades/:id
 */
export const deleteComorbilidad = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return sendError(res, 'ID de comorbilidad inválido', 400);
    }
    
    logger.info(`ComorbilidadController: Eliminando comorbilidad ID ${id}`);
    
    const comorbilidad = await Comorbilidad.findByPk(id);
    
    if (!comorbilidad) {
      logger.warn(`ComorbilidadController: Comorbilidad con ID ${id} no encontrada`);
      return sendNotFound(res, 'Comorbilidad no encontrada');
    }
    
    // Verificar si la comorbilidad está siendo usada por pacientes
    const { PacienteComorbilidad } = await import('../models/associations.js');
    const pacientesConComorbilidad = await PacienteComorbilidad.count({
      where: { id_comorbilidad: id }
    });
    
    if (pacientesConComorbilidad > 0) {
      logger.warn(`ComorbilidadController: No se puede eliminar comorbilidad ID ${id}, está siendo usada por ${pacientesConComorbilidad} pacientes`);
      return sendError(res, `No se puede eliminar la comorbilidad porque está siendo usada por ${pacientesConComorbilidad} pacientes`, 409);
    }
    
    // Eliminar comorbilidad
    const nombreComorbilidad = comorbilidad.nombre_comorbilidad;
    await comorbilidad.destroy();
    
    logger.info(`ComorbilidadController: Comorbilidad ${nombreComorbilidad} eliminada exitosamente`);
    
    return sendSuccess(res, { message: 'Comorbilidad eliminada exitosamente' });
    
  } catch (error) {
    logger.error('ComorbilidadController: Error eliminando comorbilidad', error);
    return sendServerError(res, 'Error interno del servidor al eliminar comorbilidad');
  }
};
