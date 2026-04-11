import { Op } from 'sequelize';
import sequelize from '../config/db.js';
import { Usuario } from '../models/associations.js';
import DataAccessLog from '../models/DataAccessLog.js';
import { sendSuccess, sendError, sendServerError } from '../utils/responseHelpers.js';
import logger from '../utils/logger.js';
import RefreshTokenService from '../services/refreshTokenService.js';
import { buildPacientesAnonimizadoCsv } from '../services/pacienteAnonExportService.js';

export async function getSystemStatus(req, res) {
  try {
    const t0 = Date.now();
    await sequelize.authenticate();
    const dbMs = Date.now() - t0;
    return sendSuccess(res, {
      status: 'ok',
      version: process.env.APP_VERSION || process.env.npm_package_version || '1.0.0',
      gitSha: process.env.GIT_SHA || null,
      node: process.version,
      uptimeSec: Math.floor(process.uptime()),
      database: { ok: true, latencyMs: dbMs },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[adminOperations] system status', { error: error.message });
    return sendSuccess(res, {
      status: 'degraded',
      version: process.env.APP_VERSION || '1.0.0',
      gitSha: process.env.GIT_SHA || null,
      node: process.version,
      uptimeSec: Math.floor(process.uptime()),
      database: { ok: false, error: error.message },
      timestamp: new Date().toISOString(),
    });
  }
}

export async function exportPacientesAnonimizado(req, res) {
  try {
    const { id_modulo, activo } = req.query;
    const csv = await buildPacientesAnonimizadoCsv({ id_modulo, activo });
    const name = `pacientes-anonimos-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    res.send('\uFEFF' + csv);
  } catch (error) {
    logger.error('[adminOperations] export anon', { error: error.message });
    return sendServerError(res, error);
  }
}

export async function listDataAccessLogs(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = parseInt(req.query.offset, 10) || 0;
    const where = {};
    if (req.query.id_usuario) where.id_usuario = parseInt(req.query.id_usuario, 10);
    if (req.query.recurso_tipo) where.recurso_tipo = String(req.query.recurso_tipo).slice(0, 64);
    if (req.query.accion) where.accion = { [Op.like]: `%${String(req.query.accion).slice(0, 48)}%` };

    const { count, rows } = await DataAccessLog.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset,
      include: [
        {
          model: Usuario,
          attributes: ['id_usuario', 'email', 'rol'],
          required: false,
        },
      ],
    });

    const items = rows.map((r) => {
      const j = r.toJSON();
      return {
        id: j.id,
        id_usuario: j.id_usuario,
        usuario_email: j.Usuario?.email ?? null,
        rol: j.rol,
        accion: j.accion,
        recurso_tipo: j.recurso_tipo,
        id_recurso: j.id_recurso,
        ip_address: j.ip_address,
        user_agent: j.user_agent,
        created_at: j.created_at,
      };
    });

    return sendSuccess(res, { items, total: count, limit, offset });
  } catch (error) {
    logger.error('[adminOperations] list data access', { error: error.message });
    return sendServerError(res, error);
  }
}

export async function revokeUserSessions(req, res) {
  try {
    const id = parseInt(req.params.id_usuario, 10);
    if (!id || Number.isNaN(id)) return sendError(res, 'id_usuario inválido', 400);

    const target = await Usuario.findByPk(id, { attributes: ['id_usuario', 'rol', 'email'] });
    if (!target) return sendError(res, 'Usuario no encontrado', 404);

    await RefreshTokenService.revokeAllRefreshTokensForUserId(id);

    logger.info('[adminOperations] Sesiones revocadas por admin', {
      adminId: req.user.id_usuario,
      targetId: id,
    });

    return sendSuccess(res, {
      message: 'Refresh tokens revocados. El acceso caducará al expirar el token actual o al fallar el próximo refresh.',
      id_usuario: id,
    });
  } catch (error) {
    logger.error('[adminOperations] revoke sessions', { error: error.message });
    return sendServerError(res, error);
  }
}
