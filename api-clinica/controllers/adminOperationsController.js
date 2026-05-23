import { Op } from 'sequelize';
import sequelize from '../config/db.js';
import { Usuario } from '../models/associations.js';
import DataAccessLog from '../models/DataAccessLog.js';
import { sendSuccess, sendError, sendServerError } from '../utils/responseHelpers.js';
import logger from '../utils/logger.js';
import RefreshTokenService from '../services/refreshTokenService.js';
import { buildPacientesAnonimizadoCsv } from '../services/pacienteAnonExportService.js';
import backupService from '../services/backupService.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __adminDir = path.dirname(fileURLToPath(import.meta.url));

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

export async function getBackupStatus(req, res) {
  try {
    return sendSuccess(res, backupService.getStatus());
  } catch (error) {
    logger.error('[adminOperations] backup status', { error: error.message });
    return sendServerError(res, error);
  }
}

export async function runBackup(req, res) {
  try {
    const type = req.body?.type === 'weekly' ? 'weekly' : 'daily';
    const result = await backupService.runBackupNow(type);
    logger.info('[adminOperations] Respaldo solicitado por admin', {
      adminId: req.user?.id_usuario,
      type,
    });
    return sendSuccess(res, result);
  } catch (error) {
    logger.error('[adminOperations] backup run', { error: error.message });
    const status = error.statusCode || 500;
    if (status >= 400 && status < 500) return sendError(res, error.message, status);
    return sendServerError(res, error);
  }
}

export async function downloadBackup(req, res) {
  try {
    const rel = req.query.file ? String(req.query.file) : null;
    const fullPath = backupService.getDownloadablePath(rel);
    if (!fullPath) {
      return sendError(res, 'Respaldo no disponible o ruta inválida', 404);
    }
    logger.info('[adminOperations] Descarga de respaldo', {
      adminId: req.user?.id_usuario,
      file: path.basename(fullPath),
    });
    return res.download(fullPath, path.basename(fullPath));
  } catch (error) {
    logger.error('[adminOperations] backup download', { error: error.message });
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

/** POST /api/admin/operations/seed/qa-paciente — requiere ALLOW_ADMIN_SEED_QA=true en el servidor */
export async function runSeedQaPaciente(req, res) {
  if (process.env.ALLOW_ADMIN_SEED_QA !== 'true') {
    return sendError(res, 'Seed QA deshabilitado (ALLOW_ADMIN_SEED_QA≠true)', 403);
  }

  const pacienteId = String(req.body?.paciente_id || req.query?.paciente_id || '1123');
  const scriptPath = path.join(__adminDir, '../scripts/seed-qa-paciente-datos-evolucion.js');
  const apiRoot = path.join(__adminDir, '..');

  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: apiRoot,
      env: { ...process.env, PACIENTE_ID: pacienteId },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });

    child.on('close', (code) => {
      logger.info('[adminOperations] seed QA paciente', { pacienteId, code });
      if (code === 0) {
        resolve(sendSuccess(res, {
          message: 'Seed QA Paciente ejecutado',
          paciente_id: Number(pacienteId),
          log: stdout.slice(-4000),
        }));
      } else {
        resolve(sendError(res, 'Seed falló', 500, {
          code,
          stderr: stderr.slice(-2000),
          stdout: stdout.slice(-2000),
        }));
      }
    });

    child.on('error', (err) => {
      logger.error('[adminOperations] seed QA spawn', { error: err.message });
      resolve(sendServerError(res, err));
    });
  });
}
