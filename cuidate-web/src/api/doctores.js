import client from './client';
import { API_PATHS, PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX } from '../utils/constants';
import { parsePositiveInt } from '../utils/params';
import { normalizeString } from '../utils/sanitize';

const BASE = API_PATHS.DOCTORES;

/**
 * Lista de doctores (Admin: todos; Doctor: solo el propio).
 * @param {{ page?: number, limit?: number, offset?: number, sort?: string, estado?: string, modulo?: number }} params
 * @returns {Promise<Array>} Array de doctores (el backend no devuelve total)
 */
export async function getDoctores(params = {}) {
  const limit = Math.min(
    parsePositiveInt(params.limit, PAGE_SIZE_DEFAULT),
    PAGE_SIZE_MAX
  );
  const offset = params.offset ?? (parsePositiveInt(params.page, 1) - 1) * limit;
  const sort = normalizeString(params.sort, { maxLength: 20 }) || 'recent';
  const estado = normalizeString(params.estado, { maxLength: 20 }) || 'activos';
  const modulo = parsePositiveInt(params.modulo, 0);

  const q = new URLSearchParams();
  q.set('limit', String(limit));
  q.set('offset', String(offset));
  q.set('sort', sort);
  q.set('estado', estado);
  if (modulo > 0) q.set('modulo', String(modulo));

  const { data } = await client.get(`${BASE}?${q.toString()}`);
  const list = data?.data ?? data;
  return Array.isArray(list) ? list : [];
}

/**
 * Detalle de un doctor por ID.
 * @param {number|string} id
 */
export async function getDoctorById(id) {
  const parsed = parsePositiveInt(id, 0);
  if (parsed === 0) throw new Error('ID de doctor inválido');
  const { data } = await client.get(`${BASE}/${parsed}`);
  return data?.data ?? data;
}

/**
 * Crear doctor (solo Admin). Requiere id_usuario (crear usuario antes con createUsuario).
 * @param {Object} body - nombre, apellido_paterno, apellido_materno, id_usuario, id_modulo?, telefono?, etc.
 */
export async function createDoctor(body) {
  const { data } = await client.post(BASE, body);
  return data?.data ?? data;
}

/**
 * Actualizar doctor (solo Admin).
 * @param {number|string} id
 * @param {Object} body - email?, nombre?, apellido_paterno?, apellido_materno?, id_modulo?, telefono?, etc.
 */
export async function updateDoctor(id, body) {
  const parsed = parsePositiveInt(id, 0);
  if (parsed === 0) throw new Error('ID de doctor inválido');
  const { data } = await client.put(`${BASE}/${parsed}`, body);
  return data?.data ?? data;
}

/**
 * Eliminar doctor (soft delete, solo Admin).
 * @param {number|string} id
 */
export async function deleteDoctor(id) {
  const parsed = parsePositiveInt(id, 0);
  if (parsed === 0) throw new Error('ID de doctor inválido');
  await client.delete(`${BASE}/${parsed}`);
}
