import client from './client';
import { API_PATHS, PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX } from '../utils/constants';
import { parsePositiveInt } from '../utils/params';
import { normalizeString } from '../utils/sanitize';
import { toDateString } from '../utils/reportUtils';

const BASE = API_PATHS.ADMIN_AUDITORIA;

/**
 * Lista de auditoría con filtros (solo Admin).
 * @param {{ page?: number, limit?: number, offset?: number, tipo_accion?: string, entidad_afectada?: string, fecha_desde?: string, fecha_hasta?: string, id_usuario?: number, search?: string, severidad?: string }} params
 */
export async function getAuditoria(params = {}) {
  const limit = Math.min(
    parsePositiveInt(params.limit, PAGE_SIZE_DEFAULT),
    PAGE_SIZE_MAX
  );
  const offset = params.offset ?? (parsePositiveInt(params.page, 1) - 1) * limit;

  const q = new URLSearchParams();
  q.set('limit', String(limit));
  q.set('offset', String(offset));
  if (params.tipo_accion) q.set('tipo_accion', normalizeString(params.tipo_accion, { maxLength: 50 }));
  if (params.entidad_afectada) q.set('entidad_afectada', normalizeString(params.entidad_afectada, { maxLength: 50 }));
  if (params.severidad) q.set('severidad', normalizeString(params.severidad, { maxLength: 20 }));
  const fecha_desde = toDateString(params.fecha_desde);
  const fecha_hasta = toDateString(params.fecha_hasta);
  if (fecha_desde) q.set('fecha_desde', fecha_desde);
  if (fecha_hasta) q.set('fecha_hasta', fecha_hasta);
  const id_usuario = parsePositiveInt(params.id_usuario, 0);
  if (id_usuario > 0) q.set('id_usuario', String(id_usuario));
  const search = normalizeString(params.search, { maxLength: 200 });
  if (search) q.set('search', search);

  const { data } = await client.get(`${BASE}?${q.toString()}`);
  const body = data?.data ?? data;
  return body ?? {};
}

/**
 * Detalle de un registro de auditoría (solo Admin).
 * @param {number|string} id
 */
export async function getAuditoriaById(id) {
  const parsed = parsePositiveInt(id, 0);
  if (parsed === 0) throw new Error('ID de auditoría inválido');
  const { data } = await client.get(`${BASE}/${parsed}`);
  return data?.data ?? data;
}

/**
 * Lista de usuarios para filtro de auditoría (solo Admin).
 */
export async function getAuditoriaUsuarios() {
  const { data } = await client.get(`${BASE}/usuarios`);
  const body = data?.data ?? data;
  return body?.usuarios ?? [];
}

/**
 * Estadísticas de auditoría (solo Admin).
 * @param {{ fecha_desde?: string, fecha_hasta?: string }} params
 */
export async function getEstadisticasAuditoria(params = {}) {
  const q = new URLSearchParams();
  const fecha_desde = toDateString(params.fecha_desde);
  const fecha_hasta = toDateString(params.fecha_hasta);
  if (fecha_desde) q.set('fecha_desde', fecha_desde);
  if (fecha_hasta) q.set('fecha_hasta', fecha_hasta);
  const url = q.toString() ? `${BASE}/estadisticas?${q.toString()}` : `${BASE}/estadisticas`;
  const { data } = await client.get(url);
  return data?.data ?? data;
}
