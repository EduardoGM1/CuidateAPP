import client from './client';
import { API_PATHS } from '../utils/constants';
import { parsePositiveInt } from '../utils/params';

const BASE = API_PATHS.INSTITUCIONES_SALUD;

/**
 * Lista de instituciones de salud (para dropdowns: activas; para admin: ?activo=false todas).
 * @param {{ activo?: boolean }} params - activo=false para incluir inactivas
 * @returns {Promise<Array>}
 */
export async function getInstitucionesSalud(params = {}) {
  const { data } = await client.get(BASE, { params });
  const inner = data?.data ?? data;
  const list = inner?.instituciones_salud ?? (Array.isArray(inner) ? inner : []);
  return Array.isArray(list) ? list : [];
}

/**
 * Una institución por ID.
 * @param {number|string} id
 */
export async function getInstitucionSaludById(id) {
  const parsed = parsePositiveInt(id, 0);
  if (parsed === 0) throw new Error('ID de institución inválido');
  const { data } = await client.get(`${BASE}/${parsed}`);
  return data?.data?.institucion_salud ?? data?.institucion_salud ?? data?.data ?? data;
}

export async function createInstitucionSalud(body) {
  const { data } = await client.post(BASE, body);
  return data?.data?.institucion_salud ?? data?.institucion_salud ?? data?.data ?? data;
}

export async function updateInstitucionSalud(id, body) {
  const parsed = parsePositiveInt(id, 0);
  if (parsed === 0) throw new Error('ID de institución inválido');
  const { data } = await client.put(`${BASE}/${parsed}`, body);
  return data?.data?.institucion_salud ?? data?.institucion_salud ?? data?.data ?? data;
}

export async function deleteInstitucionSalud(id) {
  const parsed = parsePositiveInt(id, 0);
  if (parsed === 0) throw new Error('ID de institución inválido');
  await client.delete(`${BASE}/${parsed}`);
}
