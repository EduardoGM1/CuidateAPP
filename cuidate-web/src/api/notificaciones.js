import client from './client';
import { API_PATHS } from '../utils/constants';
import { parsePositiveInt } from '../utils/params';

const BASE = API_PATHS.DOCTORES;

function norm(res) {
  const d = res?.data ?? res;
  return d?.data ?? d;
}

/**
 * Notificaciones de un doctor (Doctor propio o Admin).
 * @param {number|string} doctorId
 * @param {{ page?: number, limit?: number, offset?: number, tipo?: string, estado?: string, incluir_todos?: boolean }} [params]
 */
export async function getNotificacionesDoctor(doctorId, params = {}) {
  const id = parsePositiveInt(doctorId, 0);
  if (id === 0) throw new Error('ID de doctor inválido');
  const q = new URLSearchParams();
  if (params.page != null) q.set('page', String(params.page));
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  if (params.tipo) q.set('tipo', params.tipo);
  if (params.estado) q.set('estado', params.estado);
  if (params.incluir_todos === true) q.set('incluir_todos', 'true');
  const url = `${BASE}/${id}/notificaciones${q.toString() ? `?${q.toString()}` : ''}`;
  const { data } = await client.get(url);
  const body = norm(data) ?? data;
  const list = body?.notificaciones ?? body?.rows ?? (Array.isArray(body) ? body : []);
  return { notificaciones: Array.isArray(list) ? list : [], total: body?.total ?? body?.count ?? list.length, no_leidas: body?.no_leidas };
}

/**
 * Contador de notificaciones no leídas del doctor.
 */
export async function getContadorNotificaciones(doctorId) {
  const id = parsePositiveInt(doctorId, 0);
  if (id === 0) throw new Error('ID de doctor inválido');
  const { data } = await client.get(`${BASE}/${id}/notificaciones/contador`);
  const body = norm(data);
  return body?.contador ?? body?.total ?? 0;
}

/**
 * Marcar notificación como leída.
 */
export async function marcarNotificacionLeida(doctorId, notificacionId) {
  const id = parsePositiveInt(doctorId, 0);
  const nId = parsePositiveInt(notificacionId, 0);
  if (id === 0 || nId === 0) throw new Error('IDs inválidos');
  await client.put(`${BASE}/${id}/notificaciones/${nId}/leida`);
}

/**
 * Archivar notificación.
 */
export async function archivarNotificacion(doctorId, notificacionId) {
  const id = parsePositiveInt(doctorId, 0);
  const nId = parsePositiveInt(notificacionId, 0);
  if (id === 0 || nId === 0) throw new Error('IDs inválidos');
  await client.put(`${BASE}/${id}/notificaciones/${nId}/archivar`);
}
