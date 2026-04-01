import client from './client';
import { API_PATHS, PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX } from '../utils/constants';
import { parsePositiveInt } from '../utils/params';
import { normalizeString } from '../utils/sanitize';

const BASE = API_PATHS.DOCTORES;

/**
 * Lista de doctores (Admin: todos; Doctor: solo el propio).
 * @param {{ page?: number, limit?: number, offset?: number, sort?: string, estado?: string, modulo?: number, search?: string }} params
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
  const search = normalizeString(params.search, { maxLength: 100 });

  const q = new URLSearchParams();
  q.set('limit', String(limit));
  q.set('offset', String(offset));
  q.set('sort', sort);
  q.set('estado', estado);
  if (modulo > 0) q.set('modulo', String(modulo));
  if (search) q.set('search', search);

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

/**
 * Reactivar doctor (solo Admin).
 * @param {number|string} id
 */
export async function reactivateDoctor(id) {
  const parsed = parsePositiveInt(id, 0);
  if (parsed === 0) throw new Error('ID de doctor inválido');
  const { data } = await client.post(`${BASE}/${parsed}/reactivar`);
  return data?.data ?? data;
}

/**
 * Eliminar doctor permanentemente (solo Admin).
 * @param {number|string} id
 */
export async function hardDeleteDoctor(id) {
  const parsed = parsePositiveInt(id, 0);
  if (parsed === 0) throw new Error('ID de doctor inválido');
  await client.delete(`${BASE}/${parsed}/permanente`);
}

/**
 * Dashboard del doctor: doctor, pacientesAsignados, citasHoy, citasRecientes (solo Admin).
 * @param {number|string} id - id_doctor
 */
export async function getDoctorDashboard(id) {
  const parsed = parsePositiveInt(id, 0);
  if (parsed === 0) throw new Error('ID de doctor inválido');
  const { data } = await client.get(`${BASE}/${parsed}/dashboard`);
  return data?.data ?? data;
}

/**
 * Pacientes disponibles para asignar a un doctor (solo Admin).
 * @param {number|string} doctorId
 */
export async function getAvailablePatientsForDoctor(doctorId) {
  const parsed = parsePositiveInt(doctorId, 0);
  if (parsed === 0) throw new Error('ID de doctor inválido');
  const { data } = await client.get(`${BASE}/${parsed}/available-patients`);
  const list = data?.data ?? data?.pacientes ?? (Array.isArray(data) ? data : []);
  return Array.isArray(list) ? list : [];
}

/**
 * Asignar paciente a doctor (solo Admin).
 * @param {number|string} doctorId
 * @param {number|string} pacienteId
 * @param {{ observaciones?: string }} [body]
 */
export async function assignPatientToDoctor(doctorId, pacienteId, body = {}) {
  const d = parsePositiveInt(doctorId, 0);
  const p = parsePositiveInt(pacienteId, 0);
  if (d === 0 || p === 0) throw new Error('ID de doctor y paciente requeridos');
  const { data } = await client.post(`${BASE}/${d}/assign-patient`, {
    id_paciente: p,
    observaciones: body?.observaciones ?? '',
  });
  return data?.data ?? data;
}

/**
 * Desasignar paciente de doctor (solo Admin).
 * @param {number|string} doctorId
 * @param {number|string} pacienteId
 */
export async function unassignPatientFromDoctor(doctorId, pacienteId) {
  const d = parsePositiveInt(doctorId, 0);
  const p = parsePositiveInt(pacienteId, 0);
  if (d === 0 || p === 0) throw new Error('ID de doctor y paciente requeridos');
  await client.delete(`${BASE}/${d}/assign-patient/${p}`);
}
