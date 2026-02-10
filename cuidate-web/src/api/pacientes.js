import client from './client';
import { API_PATHS, PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX } from '../utils/constants';
import { parsePositiveInt } from '../utils/params';
import { normalizeString } from '../utils/sanitize';

const BASE = API_PATHS.PACIENTES;

/**
 * Lista de pacientes con paginación y filtros.
 * @param {{ page?: number, limit?: number, offset?: number, sort?: string, estado?: string, comorbilidad?: string, modulo?: number|string }} params
 */
export async function getPacientes(params = {}) {
  const limit = Math.min(
    parsePositiveInt(params.limit, PAGE_SIZE_DEFAULT),
    PAGE_SIZE_MAX
  );
  const offset = params.offset ?? (parsePositiveInt(params.page, 1) - 1) * limit;
  const sort = normalizeString(params.sort, { maxLength: 20 }) || 'recent';
  const estado = normalizeString(params.estado, { maxLength: 20 }) || 'activos';

  const q = new URLSearchParams();
  q.set('limit', String(limit));
  q.set('offset', String(offset));
  q.set('sort', sort);
  q.set('estado', estado);

  const comorbilidad = params.comorbilidad;
  if (comorbilidad != null && comorbilidad !== '' && String(comorbilidad).toLowerCase() !== 'todas') {
    q.set('comorbilidad', String(comorbilidad));
  }

  const modulo = parsePositiveInt(params.modulo, 0);
  if (modulo > 0) {
    q.set('modulo', String(modulo));
  }

  const { data } = await client.get(`${BASE}?${q.toString()}`);
  // Backend envía { success: true, data: { pacientes, total, limit, offset } }
  return data?.data ?? data;
}

/**
 * Detalle de un paciente por ID.
 * @param {number|string} id
 */
export async function getPacienteById(id) {
  const parsed = parsePositiveInt(id, 0);
  if (parsed === 0) throw new Error('ID de paciente inválido');
  const { data } = await client.get(`${BASE}/${parsed}`);
  return data?.data ?? data;
}

/**
 * Crear paciente (Admin/Doctor).
 * @param {Object} body - nombre, apellido_paterno, fecha_nacimiento; opcionales: apellido_materno, curp, numero_celular, estado, id_modulo, etc.
 */
export async function createPaciente(body) {
  const { data } = await client.post(BASE, body);
  return data?.data ?? data;
}

/**
 * Actualizar paciente (Admin/Doctor).
 * @param {number|string} id
 * @param {Object} body - campos a actualizar
 */
export async function updatePaciente(id, body) {
  const parsed = parsePositiveInt(id, 0);
  if (parsed === 0) throw new Error('ID de paciente inválido');
  const { data } = await client.put(`${BASE}/${parsed}`, body);
  return data?.data ?? data;
}

/**
 * Doctores asignados a un paciente.
 * @param {number|string} pacienteId
 */
export async function getPacienteDoctores(pacienteId) {
  const id = parsePositiveInt(pacienteId, 0);
  if (id === 0) throw new Error('ID de paciente inválido');
  const { data } = await client.get(`${BASE}/${id}/doctores`);
  const list = data?.data ?? data?.doctores ?? (Array.isArray(data) ? data : []);
  return Array.isArray(list) ? list : [];
}

/**
 * Asignar doctor a paciente (Admin/Doctor).
 * @param {number|string} pacienteId
 * @param {{ id_doctor: number, observaciones?: string }} body
 */
export async function assignDoctorToPaciente(pacienteId, body) {
  const id = parsePositiveInt(pacienteId, 0);
  const idDoctor = parsePositiveInt(body?.id_doctor, 0);
  if (id === 0 || idDoctor === 0) throw new Error('Paciente y doctor son requeridos');
  const { data } = await client.post(`${BASE}/${id}/doctores`, {
    id_doctor: idDoctor,
    observaciones: body?.observaciones?.trim() || '',
  });
  return data?.data ?? data;
}

/**
 * Desasignar doctor de paciente.
 * @param {number|string} pacienteId
 * @param {number|string} doctorId
 */
export async function unassignDoctorFromPaciente(pacienteId, doctorId) {
  const pid = parsePositiveInt(pacienteId, 0);
  const did = parsePositiveInt(doctorId, 0);
  if (pid === 0 || did === 0) throw new Error('IDs inválidos');
  await client.delete(`${BASE}/${pid}/doctores/${did}`);
}
