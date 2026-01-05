/**
 * Controller para Auditoría del Sistema
 * Endpoints para consultar el historial de auditoría (solo administradores)
 */

import { Op } from 'sequelize';
import { SistemaAuditoria, Usuario } from '../models/associations.js';
import { sendSuccess, sendError, sendServerError } from '../utils/responseHelpers.js';
import logger from '../utils/logger.js';
import exportAuditoriaService from '../services/exportAuditoriaService.js';

/**
 * Obtener historial de auditoría
 * GET /api/admin/auditoria
 */
export const getAuditoria = async (req, res) => {
  try {
    // Solo administradores pueden ver auditoría (el middleware ya verifica, pero por seguridad)
    const userRol = req.user.rol?.toLowerCase();
    if (userRol !== 'admin') {
      return sendError(res, 'No autorizado. Solo administradores pueden ver auditoría.', 403);
    }

    const {
      page,
      offset = 0,
      limit = 50,
      tipo_accion,
      entidad_afectada,
      fecha_desde,
      fecha_hasta,
      id_usuario,
      search,
      severidad,
      ip_address
    } = req.query;

    // Calcular offset: si viene page, calcular; si viene offset, usarlo directamente
    const finalOffset = page ? (parseInt(page) - 1) * parseInt(limit) : parseInt(offset);

    // Construir filtros
    const where = {};
    if (tipo_accion) where.tipo_accion = tipo_accion;
    if (entidad_afectada) where.entidad_afectada = entidad_afectada;
    if (id_usuario) where.id_usuario = parseInt(id_usuario);
    if (severidad) where.severidad = severidad;
    if (ip_address) where.ip_address = { [Op.like]: `%${ip_address.trim()}%` };
    
    if (fecha_desde || fecha_hasta) {
      where.fecha_creacion = {};
      if (fecha_desde) where.fecha_creacion[Op.gte] = new Date(fecha_desde);
      if (fecha_hasta) where.fecha_creacion[Op.lte] = new Date(fecha_hasta);
    }

    // Búsqueda por descripción
    if (search && search.trim()) {
      where.descripcion = {
        [Op.like]: `%${search.trim()}%`
      };
    }

    // Obtener registros con paginación
    const { count, rows } = await SistemaAuditoria.findAndCountAll({
      where,
      include: [
        {
          model: Usuario,
          attributes: ['id_usuario', 'email', 'rol'],
          required: false
        }
      ],
      order: [['fecha_creacion', 'DESC']],
      limit: parseInt(limit),
      offset: finalOffset
    });

    // Formatear datos para incluir información del usuario
    const auditoriaFormateada = rows.map(registro => ({
      ...registro.toJSON(),
      usuario_nombre: registro.Usuario?.email || 'Sistema Automático'
    }));

    return sendSuccess(res, {
      auditoria: auditoriaFormateada,
      total: count,
      hasMore: (finalOffset + parseInt(limit)) < count
    });
  } catch (error) {
    logger.error('Error obteniendo auditoría', error);
    return sendServerError(res, 'Error al obtener el historial de auditoría');
  }
};

/**
 * Obtener detalle de un registro de auditoría
 * GET /api/admin/auditoria/:id
 */
export const getAuditoriaById = async (req, res) => {
  try {
    // Solo administradores pueden ver auditoría (el middleware ya verifica, pero por seguridad)
    const userRol = req.user.rol?.toLowerCase();
    if (userRol !== 'admin') {
      return sendError(res, 'No autorizado', 403);
    }

    const { id } = req.params;
    const registro = await SistemaAuditoria.findByPk(id, {
      include: [
        {
          model: Usuario,
          attributes: ['id_usuario', 'email', 'rol'],
          required: false
        }
      ]
    });

    if (!registro) {
      return sendError(res, 'Registro de auditoría no encontrado', 404);
    }

    return sendSuccess(res, { registro });
  } catch (error) {
    logger.error('Error obteniendo registro de auditoría', error);
    return sendServerError(res, 'Error al obtener el registro de auditoría');
  }
};

/**
 * Obtener lista de usuarios para filtro
 * GET /api/admin/auditoria/usuarios
 */
export const getUsuariosAuditoria = async (req, res) => {
  try {
    const userRol = req.user.rol?.toLowerCase();
    if (userRol !== 'admin') {
      return sendError(res, 'No autorizado', 403);
    }

    const usuarios = await Usuario.findAll({
      attributes: ['id_usuario', 'email', 'rol'],
      where: {
        activo: true
      },
      order: [['email', 'ASC']]
    });

    return sendSuccess(res, { usuarios });
  } catch (error) {
    logger.error('Error obteniendo usuarios para auditoría', error);
    return sendServerError(res, 'Error al obtener usuarios');
  }
};

/**
 * Obtener estadísticas básicas de auditoría
 * GET /api/admin/auditoria/estadisticas
 */
export const getEstadisticasAuditoria = async (req, res) => {
  try {
    const userRol = req.user.rol?.toLowerCase();
    if (userRol !== 'admin') {
      return sendError(res, 'No autorizado', 403);
    }

    const { fecha_desde, fecha_hasta } = req.query;
    const where = {};

    if (fecha_desde || fecha_hasta) {
      where.fecha_creacion = {};
      if (fecha_desde) where.fecha_creacion[Op.gte] = new Date(fecha_desde);
      if (fecha_hasta) where.fecha_creacion[Op.lte] = new Date(fecha_hasta);
    }

    // Total de registros
    const total = await SistemaAuditoria.count({ where });

    // Por tipo de acción
    const porTipoAccion = await SistemaAuditoria.findAll({
      attributes: [
        'tipo_accion',
        [SistemaAuditoria.sequelize.fn('COUNT', SistemaAuditoria.sequelize.col('id_auditoria')), 'cantidad']
      ],
      where,
      group: ['tipo_accion'],
      raw: true
    });

    // Por severidad
    const porSeveridad = await SistemaAuditoria.findAll({
      attributes: [
        'severidad',
        [SistemaAuditoria.sequelize.fn('COUNT', SistemaAuditoria.sequelize.col('id_auditoria')), 'cantidad']
      ],
      where,
      group: ['severidad'],
      raw: true
    });

    // Top usuarios más activos
    const topUsuarios = await SistemaAuditoria.findAll({
      attributes: [
        'id_usuario',
        [SistemaAuditoria.sequelize.fn('COUNT', SistemaAuditoria.sequelize.col('id_auditoria')), 'cantidad']
      ],
      where: {
        ...where,
        id_usuario: { [Op.ne]: null }
      },
      group: ['id_usuario'],
      order: [[SistemaAuditoria.sequelize.literal('cantidad'), 'DESC']],
      limit: 10,
      include: [{
        model: Usuario,
        attributes: ['email', 'rol'],
        required: false
      }]
    });

    return sendSuccess(res, {
      total,
      porTipoAccion: porTipoAccion.map(item => ({
        tipo: item.tipo_accion,
        cantidad: parseInt(item.cantidad)
      })),
      porSeveridad: porSeveridad.map(item => ({
        severidad: item.severidad,
        cantidad: parseInt(item.cantidad)
      })),
      topUsuarios: topUsuarios.map(item => ({
        id_usuario: item.id_usuario,
        email: item.Usuario?.email || 'Desconocido',
        cantidad: parseInt(item.dataValues.cantidad)
      }))
    });
  } catch (error) {
    logger.error('Error obteniendo estadísticas de auditoría', error);
    return sendServerError(res, 'Error al obtener estadísticas');
  }
};

/**
 * Exportar auditoría
 * POST /api/admin/auditoria/exportar
 */
export const exportarAuditoria = async (req, res) => {
  try {
    const userRol = req.user.rol?.toLowerCase();
    if (userRol !== 'admin') {
      return sendError(res, 'No autorizado', 403);
    }

    const { formato = 'csv', ...filtros } = req.body;

    // Aplicar los mismos filtros que getAuditoria
    const where = {};
    if (filtros.tipo_accion) where.tipo_accion = filtros.tipo_accion;
    if (filtros.entidad_afectada) where.entidad_afectada = filtros.entidad_afectada;
    if (filtros.id_usuario) where.id_usuario = parseInt(filtros.id_usuario);
    if (filtros.severidad) where.severidad = filtros.severidad;
    if (filtros.ip_address) where.ip_address = { [Op.like]: `%${filtros.ip_address.trim()}%` };
    
    if (filtros.fecha_desde || filtros.fecha_hasta) {
      where.fecha_creacion = {};
      if (filtros.fecha_desde) where.fecha_creacion[Op.gte] = new Date(filtros.fecha_desde);
      if (filtros.fecha_hasta) where.fecha_creacion[Op.lte] = new Date(filtros.fecha_hasta);
    }

    if (filtros.search && filtros.search.trim()) {
      where.descripcion = {
        [Op.like]: `%${filtros.search.trim()}%`
      };
    }

    // Obtener todos los registros (sin límite para exportación)
    const registros = await SistemaAuditoria.findAll({
      where,
      include: [{
        model: Usuario,
        attributes: ['id_usuario', 'email', 'rol'],
        required: false
      }],
      order: [['fecha_creacion', 'DESC']]
    });

    // Formatear datos
    const datosFormateados = registros.map(registro => ({
      ...registro.toJSON(),
      usuario_nombre: registro.Usuario?.email || 'Sistema Automático'
    }));

    // Exportar según formato
    let contenido;
    let contentType;
    let extension;

    if (formato === 'excel') {
      contenido = exportAuditoriaService.exportarExcel(datosFormateados, filtros);
      contentType = 'application/vnd.ms-excel';
      extension = 'xls';
    } else {
      contenido = exportAuditoriaService.exportarCSV(datosFormateados, filtros);
      contentType = 'text/csv';
      extension = 'csv';
    }

    const nombreArchivo = exportAuditoriaService.generarNombreArchivo(formato);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.send(contenido);
  } catch (error) {
    logger.error('Error exportando auditoría', error);
    return sendServerError(res, 'Error al exportar auditoría');
  }
};

