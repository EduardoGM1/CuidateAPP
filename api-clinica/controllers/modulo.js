import { Modulo } from '../models/associations.js';
import { sendSuccess, sendError, sendNotFound, sendServerError } from '../utils/responseHelpers.js';
import logger from '../utils/logger.js';

/**
 * Obtener todos los módulos
 * GET /api/modulos
 */
export const getModulos = async (req, res) => {
  try {
    logger.info('ModuloController: Obteniendo lista de módulos');

    // Importar el modelo directamente para evitar problemas de importación
    const { Modulo } = await import('../models/associations.js');
    
    if (!Modulo) {
      logger.error('ModuloController: Modelo Modulo no encontrado');
      return res.status(500).json({
        success: false,
        error: 'Modelo Modulo no encontrado'
      });
    }

    const modulos = await Modulo.findAll({
      attributes: ['id_modulo', 'nombre_modulo', 'created_at'],
      order: [['nombre_modulo', 'ASC']]
    });

    logger.info(`ModuloController: ${modulos.length} módulos encontrados`);

    return res.status(200).json({
      success: true,
      data: {
        modulos: modulos || [],
        total: modulos ? modulos.length : 0
      },
      message: 'Módulos obtenidos exitosamente'
    });

  } catch (error) {
    logger.error('ModuloController: Error obteniendo módulos', error);
    logger.error('ModuloController: Error details', { 
      message: error.message, 
      stack: error.stack 
    });
    return res.status(500).json({
      success: false,
      error: `Error interno del servidor: ${error.message}`
    });
  }
};

/**
 * Obtener un módulo por ID
 * GET /api/modulos/:id
 */
export const getModuloById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return sendError(res, 'ID de módulo inválido', 400);
    }

    logger.info(`ModuloController: Obteniendo módulo con ID ${id}`);

    const modulo = await Modulo.findByPk(id, {
      attributes: ['id_modulo', 'nombre_modulo', 'created_at', 'updated_at']
    });

    if (!modulo) {
      logger.warn(`ModuloController: Módulo con ID ${id} no encontrado`);
      return sendNotFound(res, 'Módulo no encontrado');
    }

    logger.info(`ModuloController: Módulo ${modulo.nombre_modulo} encontrado`);

    return sendSuccess(res, { modulo });

  } catch (error) {
    logger.error('ModuloController: Error obteniendo módulo por ID', error);
    return sendServerError(res, 'Error interno del servidor al obtener módulo');
  }
};

/**
 * Crear nuevo módulo (solo para administradores)
 * POST /api/modulos
 */
export const createModulo = async (req, res) => {
  try {
    const { nombre_modulo } = req.body;

    // Validaciones
    if (!nombre_modulo || typeof nombre_modulo !== 'string' || nombre_modulo.trim().length === 0) {
      return sendError(res, 'El nombre del módulo es requerido', 400);
    }

    if (nombre_modulo.trim().length > 50) {
      return sendError(res, 'El nombre del módulo no puede exceder 50 caracteres', 400);
    }

    logger.info(`ModuloController: Creando módulo ${nombre_modulo.trim()}`);

    // Verificar si ya existe
    const moduloExistente = await Modulo.findOne({
      where: { nombre_modulo: nombre_modulo.trim() }
    });

    if (moduloExistente) {
      logger.warn(`ModuloController: Módulo ${nombre_modulo.trim()} ya existe`);
      return sendError(res, 'Ya existe un módulo con ese nombre', 409);
    }

    // Crear módulo
    const nuevoModulo = await Modulo.create({
      nombre_modulo: nombre_modulo.trim()
    });

    logger.info(`ModuloController: Módulo ${nuevoModulo.nombre_modulo} creado con ID ${nuevoModulo.id_modulo}`);

    return sendSuccess(res, { 
      modulo: {
        id_modulo: nuevoModulo.id_modulo,
        nombre_modulo: nuevoModulo.nombre_modulo,
        created_at: nuevoModulo.created_at
      }
    }, 201);

  } catch (error) {
    logger.error('ModuloController: Error creando módulo', error);
    return sendServerError(res, 'Error interno del servidor al crear módulo');
  }
};

/**
 * Actualizar módulo (solo para administradores)
 * PUT /api/modulos/:id
 */
export const updateModulo = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_modulo } = req.body;

    if (!id || isNaN(id)) {
      return sendError(res, 'ID de módulo inválido', 400);
    }

    if (!nombre_modulo || typeof nombre_modulo !== 'string' || nombre_modulo.trim().length === 0) {
      return sendError(res, 'El nombre del módulo es requerido', 400);
    }

    if (nombre_modulo.trim().length > 50) {
      return sendError(res, 'El nombre del módulo no puede exceder 50 caracteres', 400);
    }

    logger.info(`ModuloController: Actualizando módulo ID ${id}`);

    const modulo = await Modulo.findByPk(id);

    if (!modulo) {
      logger.warn(`ModuloController: Módulo con ID ${id} no encontrado`);
      return sendNotFound(res, 'Módulo no encontrado');
    }

    // Verificar si el nuevo nombre ya existe
    const { Op } = await import('sequelize');
    const moduloExistente = await Modulo.findOne({
      where: { 
        nombre_modulo: nombre_modulo.trim(),
        id_modulo: { [Op.ne]: id }
      }
    });

    if (moduloExistente) {
      logger.warn(`ModuloController: Módulo ${nombre_modulo.trim()} ya existe`);
      return sendError(res, 'Ya existe un módulo con ese nombre', 409);
    }

    // Actualizar módulo
    await modulo.update({
      nombre_modulo: nombre_modulo.trim()
    });

    logger.info(`ModuloController: Módulo ID ${id} actualizado a ${modulo.nombre_modulo}`);

    return sendSuccess(res, { 
      modulo: {
        id_modulo: modulo.id_modulo,
        nombre_modulo: modulo.nombre_modulo,
        created_at: modulo.created_at,
        updated_at: modulo.updated_at
      }
    });

  } catch (error) {
    logger.error('ModuloController: Error actualizando módulo', error);
    return sendServerError(res, 'Error interno del servidor al actualizar módulo');
  }
};

/**
 * Eliminar módulo (solo para administradores)
 * DELETE /api/modulos/:id
 */
export const deleteModulo = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return sendError(res, 'ID de módulo inválido', 400);
    }

    logger.info(`ModuloController: Eliminando módulo ID ${id}`);

    const modulo = await Modulo.findByPk(id);

    if (!modulo) {
      logger.warn(`ModuloController: Módulo con ID ${id} no encontrado`);
      return sendNotFound(res, 'Módulo no encontrado');
    }

    // Verificar si el módulo está siendo usado por doctores
    const { Doctor } = await import('../models/associations.js');
    const doctoresUsandoModulo = await Doctor.count({
      where: { id_modulo: id }
    });

    if (doctoresUsandoModulo > 0) {
      logger.warn(`ModuloController: No se puede eliminar módulo ID ${id}, está siendo usado por ${doctoresUsandoModulo} doctores`);
      return sendError(res, `No se puede eliminar el módulo porque está siendo usado por ${doctoresUsandoModulo} doctores`, 409);
    }

    // Eliminar módulo
    await modulo.destroy();

    logger.info(`ModuloController: Módulo ${modulo.nombre_modulo} eliminado exitosamente`);

    return sendSuccess(res, { message: 'Módulo eliminado exitosamente' });

  } catch (error) {
    logger.error('ModuloController: Error eliminando módulo', error);
    return sendServerError(res, 'Error interno del servidor al eliminar módulo');
  }
};
