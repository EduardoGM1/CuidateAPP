import { Vacuna } from '../models/associations.js';
import { sendSuccess, sendError, sendNotFound, sendServerError } from '../utils/responseHelpers.js';
import logger from '../utils/logger.js';
import { Op } from 'sequelize';

/**
 * =====================================================
 * CONTROLADOR DE VACUNAS (CATÁLOGO)
 * =====================================================
 * 
 * Maneja las operaciones CRUD del catálogo de vacunas
 * 
 * Seguridad:
 * - Autenticación JWT requerida
 * - Solo Admin puede crear/editar/eliminar
 * - Admin y Doctor pueden leer
 */

/**
 * Obtener todas las vacunas
 * GET /api/vacunas
 */
export const getVacunas = async (req, res) => {
  try {
    logger.info('VacunaController: Obteniendo lista de vacunas');
    
    // Verificar que el modelo esté disponible
    if (!Vacuna) {
      logger.error('VacunaController: Modelo Vacuna no disponible');
      return sendServerError(res, 'Error de configuración: Modelo no disponible');
    }
    
    const { limit = 100, offset = 0, search = '' } = req.query;
    
    let whereCondition = {};
    
    // Búsqueda por nombre o tipo si se proporciona
    if (search && search.trim()) {
      whereCondition[Op.or] = [
        { nombre_vacuna: { [Op.like]: `%${search.trim()}%` } },
        { tipo: { [Op.like]: `%${search.trim()}%` } },
        { descripcion: { [Op.like]: `%${search.trim()}%` } }
      ];
    }
    
    const vacunas = await Vacuna.findAndCountAll({
      where: Object.keys(whereCondition).length > 0 ? whereCondition : undefined,
      order: [['nombre_vacuna', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    logger.info(`VacunaController: ${vacunas.rows.length} vacunas encontradas`);
    
    return sendSuccess(res, {
      vacunas: vacunas.rows || [],
      total: vacunas.count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    logger.error('VacunaController: Error obteniendo vacunas', {
      error: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Enviar más detalles del error en desarrollo
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Error al obtener vacunas: ${error.message}`
      : 'Error al obtener vacunas';
    
    return sendServerError(res, errorMessage);
  }
};

/**
 * Obtener una vacuna específica
 * GET /api/vacunas/:id
 */
export const getVacunaById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return sendError(res, 'ID de vacuna inválido', 400);
    }
    
    logger.info(`VacunaController: Obteniendo vacuna con ID ${id}`);
    
    const vacuna = await Vacuna.findByPk(id);
    
    if (!vacuna) {
      logger.warn(`VacunaController: Vacuna con ID ${id} no encontrada`);
      return sendNotFound(res, 'Vacuna no encontrada');
    }
    
    logger.info(`VacunaController: Vacuna ${vacuna.nombre_vacuna} encontrada`);
    
    return sendSuccess(res, { vacuna }, 'Vacuna obtenida exitosamente');
  } catch (error) {
    logger.error('VacunaController: Error obteniendo vacuna por ID', error);
    return sendServerError(res, 'Error interno del servidor al obtener vacuna');
  }
};

/**
 * Crear nueva vacuna (solo para administradores)
 * POST /api/vacunas
 */
export const createVacuna = async (req, res) => {
  try {
    const { nombre_vacuna, descripcion, tipo } = req.body;
    
    // Validaciones
    if (!nombre_vacuna || typeof nombre_vacuna !== 'string' || nombre_vacuna.trim().length === 0) {
      return sendError(res, 'El nombre de la vacuna es requerido', 400);
    }
    
    if (nombre_vacuna.trim().length > 150) {
      return sendError(res, 'El nombre de la vacuna no puede exceder 150 caracteres', 400);
    }
    
    if (tipo && tipo.trim().length > 100) {
      return sendError(res, 'El tipo de vacuna no puede exceder 100 caracteres', 400);
    }
    
    logger.info(`VacunaController: Creando vacuna ${nombre_vacuna.trim()}`);
    
    // Verificar si ya existe
    const vacunaExistente = await Vacuna.findOne({
      where: { nombre_vacuna: nombre_vacuna.trim() }
    });
    
    if (vacunaExistente) {
      logger.warn(`VacunaController: Vacuna ${nombre_vacuna.trim()} ya existe`);
      return sendError(res, 'Ya existe una vacuna con ese nombre', 409);
    }
    
    // Crear vacuna
    const nuevaVacuna = await Vacuna.create({
      nombre_vacuna: nombre_vacuna.trim(),
      descripcion: descripcion ? descripcion.trim() : null,
      tipo: tipo ? tipo.trim() : null
    });
    
    logger.info(`VacunaController: Vacuna ${nuevaVacuna.nombre_vacuna} creada con ID ${nuevaVacuna.id_vacuna}`);
    
    return sendSuccess(res, { 
      vacuna: {
        id_vacuna: nuevaVacuna.id_vacuna,
        nombre_vacuna: nuevaVacuna.nombre_vacuna,
        descripcion: nuevaVacuna.descripcion,
        tipo: nuevaVacuna.tipo
      }
    }, 201);
  } catch (error) {
    logger.error('VacunaController: Error creando vacuna', error);
    
    // Manejar errores de duplicado específico
    if (error.name === 'SequelizeUniqueConstraintError') {
      return sendError(res, 'Ya existe una vacuna con ese nombre', 409);
    }
    
    return sendServerError(res, 'Error interno del servidor al crear vacuna');
  }
};

/**
 * Actualizar vacuna (solo para administradores)
 * PUT /api/vacunas/:id
 */
export const updateVacuna = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_vacuna, descripcion, tipo } = req.body;
    
    if (!id || isNaN(id)) {
      return sendError(res, 'ID de vacuna inválido', 400);
    }
    
    if (!nombre_vacuna || typeof nombre_vacuna !== 'string' || nombre_vacuna.trim().length === 0) {
      return sendError(res, 'El nombre de la vacuna es requerido', 400);
    }
    
    if (nombre_vacuna.trim().length > 150) {
      return sendError(res, 'El nombre de la vacuna no puede exceder 150 caracteres', 400);
    }
    
    if (tipo && tipo.trim().length > 100) {
      return sendError(res, 'El tipo de vacuna no puede exceder 100 caracteres', 400);
    }
    
    logger.info(`VacunaController: Actualizando vacuna ID ${id}`);
    
    const vacuna = await Vacuna.findByPk(id);
    
    if (!vacuna) {
      logger.warn(`VacunaController: Vacuna con ID ${id} no encontrada`);
      return sendNotFound(res, 'Vacuna no encontrada');
    }
    
    // Verificar si el nuevo nombre ya existe
    const vacunaExistente = await Vacuna.findOne({
      where: { 
        nombre_vacuna: nombre_vacuna.trim(),
        id_vacuna: { [Op.ne]: id }
      }
    });
    
    if (vacunaExistente) {
      logger.warn(`VacunaController: Vacuna ${nombre_vacuna.trim()} ya existe`);
      return sendError(res, 'Ya existe una vacuna con ese nombre', 409);
    }
    
    // Actualizar vacuna
    await vacuna.update({
      nombre_vacuna: nombre_vacuna.trim(),
      descripcion: descripcion !== undefined ? (descripcion ? descripcion.trim() : null) : vacuna.descripcion,
      tipo: tipo !== undefined ? (tipo ? tipo.trim() : null) : vacuna.tipo
    });
    
    logger.info(`VacunaController: Vacuna ID ${id} actualizada a ${vacuna.nombre_vacuna}`);
    
    return sendSuccess(res, { 
      vacuna: {
        id_vacuna: vacuna.id_vacuna,
        nombre_vacuna: vacuna.nombre_vacuna,
        descripcion: vacuna.descripcion,
        tipo: vacuna.tipo
      }
    });
  } catch (error) {
    logger.error('VacunaController: Error actualizando vacuna', error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return sendError(res, 'Ya existe una vacuna con ese nombre', 409);
    }
    
    return sendServerError(res, 'Error interno del servidor al actualizar vacuna');
  }
};

/**
 * Eliminar vacuna (solo para administradores)
 * DELETE /api/vacunas/:id
 */
export const deleteVacuna = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return sendError(res, 'ID de vacuna inválido', 400);
    }
    
    logger.info(`VacunaController: Eliminando vacuna ID ${id}`);
    
    const vacuna = await Vacuna.findByPk(id);
    
    if (!vacuna) {
      logger.warn(`VacunaController: Vacuna con ID ${id} no encontrada`);
      return sendNotFound(res, 'Vacuna no encontrada');
    }
    
    // Verificar si la vacuna está siendo usada en esquemas de vacunación
    const { EsquemaVacunacion } = await import('../models/associations.js');
    const esquemasConVacuna = await EsquemaVacunacion.count({
      where: { vacuna: vacuna.nombre_vacuna }
    });
    
    if (esquemasConVacuna > 0) {
      logger.warn(`VacunaController: No se puede eliminar vacuna ID ${id}, está siendo usada en ${esquemasConVacuna} esquemas de vacunación`);
      return sendError(res, `No se puede eliminar la vacuna porque está siendo usada en ${esquemasConVacuna} esquemas de vacunación`, 409);
    }
    
    // Eliminar vacuna
    const nombreVacuna = vacuna.nombre_vacuna;
    await vacuna.destroy();
    
    logger.info(`VacunaController: Vacuna ${nombreVacuna} eliminada exitosamente`);
    
    return sendSuccess(res, { message: 'Vacuna eliminada exitosamente' });
  } catch (error) {
    logger.error('VacunaController: Error eliminando vacuna', error);
    return sendServerError(res, 'Error interno del servidor al eliminar vacuna');
  }
};
