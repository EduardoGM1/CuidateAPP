import { InstitucionSalud } from '../models/associations.js';
import { sendSuccess, sendError, sendNotFound, sendServerError } from '../utils/responseHelpers.js';
import logger from '../utils/logger.js';
import { Op } from 'sequelize';

/**
 * Listar instituciones de salud (para dropdowns: solo activas; para admin: todas).
 * GET /api/instituciones-salud
 * Query: activo=true (default en listado público) o sin filtro para admin.
 */
export const getInstitucionesSalud = async (req, res) => {
  try {
    const onlyActive = req.query.activo !== 'false';
    const where = onlyActive ? { activo: true } : {};
    const instituciones = await InstitucionSalud.findAll({
      where,
      attributes: ['id_institucion_salud', 'nombre', 'activo', 'orden', 'created_at', 'updated_at'],
      order: [
        ['orden', 'ASC'],
        ['nombre', 'ASC']
      ]
    });
    return sendSuccess(res, {
      instituciones_salud: instituciones,
      total: instituciones.length
    });
  } catch (error) {
    logger.error('InstitucionSaludController: Error listando instituciones', error);
    return sendServerError(res, 'Error al obtener instituciones de salud');
  }
};

/**
 * Obtener una institución por ID.
 * GET /api/instituciones-salud/:id
 */
export const getInstitucionSaludById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) return sendError(res, 'ID inválido', 400);
    const inst = await InstitucionSalud.findByPk(id);
    if (!inst) return sendNotFound(res, 'Institución de salud no encontrada');
    return sendSuccess(res, { institucion_salud: inst });
  } catch (error) {
    logger.error('InstitucionSaludController: Error obteniendo institución', error);
    return sendServerError(res, 'Error al obtener institución');
  }
};

/**
 * Crear institución (solo Admin).
 * POST /api/instituciones-salud
 */
export const createInstitucionSalud = async (req, res) => {
  try {
    const { nombre, activo = true, orden } = req.body;
    const nombreTrim = typeof nombre === 'string' ? nombre.trim() : '';
    if (!nombreTrim) return sendError(res, 'El nombre es requerido', 400);
    if (nombreTrim.length > 100) return sendError(res, 'El nombre no puede exceder 100 caracteres', 400);

    const existente = await InstitucionSalud.findOne({ where: { nombre: nombreTrim } });
    if (existente) return sendError(res, 'Ya existe una institución con ese nombre', 409);

    const nueva = await InstitucionSalud.create({
      nombre: nombreTrim,
      activo: !!activo,
      orden: orden != null ? parseInt(orden, 10) : 0
    });
    logger.info('InstitucionSaludController: Institución creada', { id: nueva.id_institucion_salud, nombre: nueva.nombre });
    return sendSuccess(res, {
      institucion_salud: {
        id_institucion_salud: nueva.id_institucion_salud,
        nombre: nueva.nombre,
        activo: nueva.activo,
        orden: nueva.orden,
        created_at: nueva.created_at
      }
    }, 201);
  } catch (error) {
    logger.error('InstitucionSaludController: Error creando institución', error);
    return sendServerError(res, 'Error al crear institución');
  }
};

/**
 * Actualizar institución (solo Admin).
 * PUT /api/instituciones-salud/:id
 */
export const updateInstitucionSalud = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) return sendError(res, 'ID inválido', 400);
    const { nombre, activo, orden } = req.body;

    const inst = await InstitucionSalud.findByPk(id);
    if (!inst) return sendNotFound(res, 'Institución de salud no encontrada');

    if (typeof nombre === 'string' && nombre.trim()) {
      const nombreTrim = nombre.trim();
      if (nombreTrim.length > 100) return sendError(res, 'El nombre no puede exceder 100 caracteres', 400);
      const existente = await InstitucionSalud.findOne({
        where: { nombre: nombreTrim, id_institucion_salud: { [Op.ne]: id } }
      });
      if (existente) return sendError(res, 'Ya existe otra institución con ese nombre', 409);
      inst.nombre = nombreTrim;
    }
    if (activo !== undefined) inst.activo = !!activo;
    if (orden !== undefined) inst.orden = parseInt(orden, 10) || 0;
    await inst.save();
    logger.info('InstitucionSaludController: Institución actualizada', { id: inst.id_institucion_salud });
    return sendSuccess(res, { institucion_salud: inst });
  } catch (error) {
    logger.error('InstitucionSaludController: Error actualizando institución', error);
    return sendServerError(res, 'Error al actualizar institución');
  }
};

/**
 * Eliminar institución (solo Admin). No permitir si hay pacientes con esta institución.
 * DELETE /api/instituciones-salud/:id
 */
export const deleteInstitucionSalud = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) return sendError(res, 'ID inválido', 400);

    const inst = await InstitucionSalud.findByPk(id);
    if (!inst) return sendNotFound(res, 'Institución de salud no encontrada');

    const { Paciente } = await import('../models/associations.js');
    const count = await Paciente.count({
      where: { institucion_salud: inst.nombre }
    });
    if (count > 0) {
      return sendError(res, `No se puede eliminar: ${count} paciente(s) tienen esta institución asignada`, 409);
    }

    await inst.destroy();
    logger.info('InstitucionSaludController: Institución eliminada', { id });
    return sendSuccess(res, { message: 'Institución eliminada correctamente' });
  } catch (error) {
    logger.error('InstitucionSaludController: Error eliminando institución', error);
    return sendServerError(res, 'Error al eliminar institución');
  }
};
