import { Medicamento } from '../models/associations.js';
import { sendSuccess, sendError, sendNotFound, sendServerError } from '../utils/responseHelpers.js';
import logger from '../utils/logger.js';
import { Op } from 'sequelize';

/**
 * =====================================================
 * CONTROLADOR DE MEDICAMENTOS
 * =====================================================
 * 
 * Maneja las operaciones CRUD del catálogo de medicamentos
 * 
 * Seguridad:
 * - Autenticación JWT requerida
 * - Solo Admin puede crear/editar/eliminar
 * - Admin y Doctor pueden leer
 * - Rate limiting aplicado
 */

/**
 * Obtener todos los medicamentos
 * GET /api/medicamentos
 */
export const getMedicamentos = async (req, res) => {
  try {
    logger.info('Obteniendo lista de medicamentos');
    
    const { limit = 100, offset = 0, search = '' } = req.query;
    
    let whereCondition = {};
    
    // Búsqueda por nombre si se proporciona
    if (search) {
      whereCondition.nombre_medicamento = {
        [Op.like]: `%${search}%`
      };
    }
    
    const medicamentos = await Medicamento.findAndCountAll({
      where: whereCondition,
      order: [['nombre_medicamento', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    logger.info(`Medicamentos obtenidos: ${medicamentos.rows.length}`);
    
    return sendSuccess(res, {
      medicamentos: medicamentos.rows,
      total: medicamentos.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    logger.error('Error obteniendo medicamentos', error);
    return sendServerError(res, 'Error al obtener medicamentos');
  }
};

/**
 * Obtener un medicamento específico
 * GET /api/medicamentos/:id
 */
export const getMedicamento = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return sendError(res, 'ID de medicamento inválido', 400);
    }
    
    logger.info(`Obteniendo medicamento con ID: ${id}`);
    
    const medicamento = await Medicamento.findByPk(id);
    
    if (!medicamento) {
      return sendNotFound(res, 'Medicamento no encontrado');
    }
    
    logger.info(`Medicamento obtenido: ${medicamento.nombre_medicamento}`);
    
    return sendSuccess(res, { medicamento });
  } catch (error) {
    logger.error('Error obteniendo medicamento', error);
    return sendServerError(res, 'Error al obtener medicamento');
  }
};

/**
 * Crear nuevo medicamento
 * POST /api/medicamentos
 */
export const createMedicamento = async (req, res) => {
  try {
    const { nombre_medicamento, descripcion } = req.body;
    
    // Validaciones
    if (!nombre_medicamento || nombre_medicamento.trim().length === 0) {
      return sendError(res, 'El nombre del medicamento es requerido', 400);
    }
    
    if (nombre_medicamento.length > 150) {
      return sendError(res, 'El nombre del medicamento es muy largo (máximo 150 caracteres)', 400);
    }
    
    logger.info(`Creando medicamento: ${nombre_medicamento}`);
    
    // Verificar si ya existe
    const existente = await Medicamento.findOne({
      where: { nombre_medicamento: nombre_medicamento.trim() }
    });
    
    if (existente) {
      return sendError(res, 'Ya existe un medicamento con ese nombre', 409);
    }
    
    const medicamento = await Medicamento.create({
      nombre_medicamento: nombre_medicamento.trim(),
      descripcion: descripcion?.trim() || null
    });
    
    logger.info(`Medicamento creado: ${medicamento.nombre_medicamento} (ID: ${medicamento.id_medicamento})`);
    
    return sendSuccess(res, { medicamento }, 201);
  } catch (error) {
    logger.error('Error creando medicamento', error);
    
    // Manejar errores de duplicado específico
    if (error.name === 'SequelizeUniqueConstraintError') {
      return sendError(res, 'Ya existe un medicamento con ese nombre', 409);
    }
    
    return sendServerError(res, 'Error al crear medicamento');
  }
};

/**
 * Actualizar medicamento
 * PUT /api/medicamentos/:id
 */
export const updateMedicamento = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_medicamento, descripcion } = req.body;
    
    if (!id || isNaN(id)) {
      return sendError(res, 'ID de medicamento inválido', 400);
    }
    
    // Validaciones
    if (nombre_medicamento && nombre_medicamento.trim().length === 0) {
      return sendError(res, 'El nombre del medicamento no puede estar vacío', 400);
    }
    
    if (nombre_medicamento && nombre_medicamento.length > 150) {
      return sendError(res, 'El nombre del medicamento es muy largo (máximo 150 caracteres)', 400);
    }
    
    logger.info(`Actualizando medicamento ID: ${id}`);
    
    // Verificar que existe
    const medicamento = await Medicamento.findByPk(id);
    
    if (!medicamento) {
      return sendNotFound(res, 'Medicamento no encontrado');
    }
    
    // Verificar si el nuevo nombre ya existe (y no es el mismo medicamento)
    if (nombre_medicamento) {
      const existente = await Medicamento.findOne({
        where: { 
          nombre_medicamento: nombre_medicamento.trim(),
          id_medicamento: { [Op.ne]: id }
        }
      });
      
      if (existente) {
        return sendError(res, 'Ya existe otro medicamento con ese nombre', 409);
      }
    }
    
    // Actualizar
    const dataToUpdate = {};
    if (nombre_medicamento) dataToUpdate.nombre_medicamento = nombre_medicamento.trim();
    if (descripcion !== undefined) dataToUpdate.descripcion = descripcion?.trim() || null;
    
    await Medicamento.update(dataToUpdate, {
      where: { id_medicamento: id }
    });
    
    // Obtener el medicamento actualizado
    const medicamentoActualizado = await Medicamento.findByPk(id);
    
    logger.info(`Medicamento actualizado: ${medicamentoActualizado.nombre_medicamento}`);
    
    return sendSuccess(res, { medicamento: medicamentoActualizado });
  } catch (error) {
    logger.error('Error actualizando medicamento', error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return sendError(res, 'Ya existe otro medicamento con ese nombre', 409);
    }
    
    return sendServerError(res, 'Error al actualizar medicamento');
  }
};

/**
 * Eliminar medicamento
 * DELETE /api/medicamentos/:id
 */
export const deleteMedicamento = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return sendError(res, 'ID de medicamento inválido', 400);
    }
    
    logger.info(`Eliminando medicamento ID: ${id}`);
    
    const medicamento = await Medicamento.findByPk(id);
    
    if (!medicamento) {
      return sendNotFound(res, 'Medicamento no encontrado');
    }
    
    const nombreMedicamento = medicamento.nombre_medicamento;
    
    await Medicamento.destroy({
      where: { id_medicamento: id }
    });
    
    logger.info(`Medicamento eliminado: ${nombreMedicamento}`);
    
    return sendSuccess(res, { message: 'Medicamento eliminado exitosamente' });
  } catch (error) {
    logger.error('Error eliminando medicamento', error);
    return sendServerError(res, 'Error al eliminar medicamento');
  }
};