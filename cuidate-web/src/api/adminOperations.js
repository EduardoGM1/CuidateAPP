import client from './client';
import { API_PATHS } from '../utils/constants';

const BASE = API_PATHS.ADMIN_OPERATIONS;

export async function getAdminSystemStatus() {
  const { data } = await client.get(`${BASE}/system/status`);
  return data?.data ?? data;
}

export async function downloadPacientesAnonimosCsv(params = {}) {
  const q = new URLSearchParams();
  if (params.id_modulo) q.set('id_modulo', String(params.id_modulo));
  if (params.activo != null && params.activo !== '') q.set('activo', String(params.activo));
  const url = q.toString() ? `${BASE}/export/pacientes-anonimo?${q}` : `${BASE}/export/pacientes-anonimo`;
  const { data } = await client.get(url, { responseType: 'blob' });
  return data;
}

export async function getDataAccessLogs(params = {}) {
  const q = new URLSearchParams();
  q.set('limit', String(params.limit || 50));
  q.set('offset', String(params.offset || 0));
  if (params.id_usuario) q.set('id_usuario', String(params.id_usuario));
  if (params.recurso_tipo) q.set('recurso_tipo', params.recurso_tipo);
  if (params.accion) q.set('accion', params.accion);
  const { data } = await client.get(`${BASE}/data-access-logs?${q.toString()}`);
  return data?.data ?? data;
}

export async function revokeUserSessions(idUsuario) {
  const { data } = await client.post(`${BASE}/users/${idUsuario}/revoke-sessions`);
  return data?.data ?? data;
}
