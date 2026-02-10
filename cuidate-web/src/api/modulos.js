import client from './client';
import { API_PATHS } from '../utils/constants';
import { parsePositiveInt } from '../utils/params';

const BASE = API_PATHS.MODULOS;

/**
 * Lista de módulos (público; usado en dropdowns).
 * @returns {Promise<Array>}
 */
export async function getModulos() {
  const { data } = await client.get(BASE);
  const inner = data?.data ?? data;
  const list = inner?.modulos ?? (Array.isArray(inner) ? inner : data);
  return Array.isArray(list) ? list : [];
}

/**
 * Detalle de un módulo por ID.
 * @param {number|string} id
 */
export async function getModuloById(id) {
  const parsed = parsePositiveInt(id, 0);
  if (parsed === 0) throw new Error('ID de módulo inválido');
  const { data } = await client.get(`${BASE}/${parsed}`);
  return data?.data?.modulo ?? data?.modulo ?? data?.data ?? data;
}

export async function createModulo(body) {
  const { data } = await client.post(BASE, body);
  return data?.data?.modulo ?? data?.modulo ?? data?.data ?? data;
}

export async function updateModulo(id, body) {
  const parsed = parsePositiveInt(id, 0);
  if (parsed === 0) throw new Error('ID de módulo inválido');
  const { data } = await client.put(`${BASE}/${parsed}`, body);
  return data?.data?.modulo ?? data?.modulo ?? data?.data ?? data;
}

export async function deleteModulo(id) {
  const parsed = parsePositiveInt(id, 0);
  if (parsed === 0) throw new Error('ID de módulo inválido');
  await client.delete(`${BASE}/${parsed}`);
}
