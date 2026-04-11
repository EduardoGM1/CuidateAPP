import DataAccessLog from '../models/DataAccessLog.js';
import logger from '../utils/logger.js';

/**
 * Registra acceso a datos sensibles (no bloquea la petición si falla el insert).
 */
export async function logDataAccess({
  id_usuario,
  rol,
  accion,
  recurso_tipo,
  id_recurso,
  ip_address,
  user_agent,
}) {
  try {
    await DataAccessLog.create({
      id_usuario: id_usuario ?? null,
      rol: rol ? String(rol).slice(0, 32) : null,
      accion: String(accion || 'READ').slice(0, 64),
      recurso_tipo: String(recurso_tipo || 'unknown').slice(0, 64),
      id_recurso: id_recurso != null ? parseInt(id_recurso, 10) : null,
      ip_address: ip_address ? String(ip_address).slice(0, 64) : null,
      user_agent: user_agent ? String(user_agent).slice(0, 512) : null,
    });
  } catch (err) {
    logger.warn('[dataAccessLog] No se pudo registrar acceso', { error: err.message });
  }
}
