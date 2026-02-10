import client from './client';
import { API_PATHS, PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX } from '../utils/constants';
import { parsePositiveInt } from '../utils/params';
import { normalizeString } from '../utils/sanitize';

const BASE = API_PATHS.CITAS;

/**
 * Citas de un paciente (endpoint específico).
 * @param {number|string} pacienteId
 * @param {{ limit?: number, offset?: number }} [params]
 */
export async function getCitasByPaciente(pacienteId, params = {}) {
  const id = parsePositiveInt(pacienteId, 0);
  if (id === 0) throw new Error('ID de paciente inválido');
  const q = new URLSearchParams();
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  const url = `${BASE}/paciente/${id}${q.toString() ? `?${q.toString()}` : ''}`;
  const { data } = await client.get(url);
  const list = data?.data ?? data?.citas ?? data;
  return { citas: Array.isArray(list) ? list : [], total: data?.total ?? (Array.isArray(list) ? list.length : 0) };
}

/**
 * Lista de citas con paginación y filtros.
 * @param {{ page?: number, limit?: number, offset?: number, doctor?: number, paciente?: number, fecha_desde?: string, fecha_hasta?: string, estado?: string, search?: string }} params
 */
export async function getCitas(params = {}) {
  const limit = Math.min(
    parsePositiveInt(params.limit, PAGE_SIZE_DEFAULT),
    PAGE_SIZE_MAX
  );
  const offset = params.offset ?? (parsePositiveInt(params.page, 1) - 1) * limit;

  const q = new URLSearchParams();
  q.set('limit', String(limit));
  q.set('offset', String(offset));

  const doctor = parsePositiveInt(params.doctor, 0);
  if (doctor > 0) q.set('doctor', String(doctor));

  const paciente = parsePositiveInt(params.paciente, 0);
  if (paciente > 0) q.set('paciente', String(paciente));

  const estado = normalizeString(params.estado, { maxLength: 30 });
  if (estado && estado !== 'todas') q.set('estado', estado);

  const search = normalizeString(params.search, { maxLength: 100 });
  if (search) q.set('search', search);

  if (params.fecha_desde) q.set('fecha_desde', String(params.fecha_desde).slice(0, 10));
  if (params.fecha_hasta) q.set('fecha_hasta', String(params.fecha_hasta).slice(0, 10));

  const { data } = await client.get(`${BASE}?${q.toString()}`);
  // Backend envía { success: true, data: { citas, total, limit, offset, hasMore } }
  return data?.data ?? data;
}

/**
 * Detalle de una cita por ID.
 * @param {number|string} id
 */
export async function getCitaById(id) {
  const parsed = parsePositiveInt(id, 0);
  if (parsed === 0) throw new Error('ID de cita inválido');
  const { data } = await client.get(`${BASE}/${parsed}`);
  return data?.data ?? data;
}

const ESTADOS_VALIDOS = ['pendiente', 'atendida', 'no_asistida', 'reprogramada', 'cancelada'];

/**
 * Actualizar estado de una cita.
 * @param {number|string} id
 * @param {{ estado: string, observaciones?: string }} body - estado: uno de ESTADOS_VALIDOS
 */
export async function updateCitaEstado(id, body) {
  const parsed = parsePositiveInt(id, 0);
  if (parsed === 0) throw new Error('ID de cita inválido');
  const estado = body?.estado && ESTADOS_VALIDOS.includes(body.estado) ? body.estado : null;
  if (!estado) throw new Error('Estado de cita inválido');
  const payload = { estado };
  if (body?.observaciones !== undefined) payload.observaciones = String(body.observaciones).slice(0, 2000);
  const { data } = await client.put(`${BASE}/${parsed}/estado`, payload);
  return data?.data ?? data;
}

/**
 * Crear cita (Admin/Doctor).
 * @param {{ id_paciente: number, id_doctor: number, fecha_cita: string, motivo?: string }} body
 */
export async function createCita(body) {
  const idPaciente = parsePositiveInt(body?.id_paciente, 0);
  const idDoctor = parsePositiveInt(body?.id_doctor, 0);
  if (idPaciente === 0 || idDoctor === 0) throw new Error('Paciente y doctor son obligatorios');
  const payload = {
    id_paciente: idPaciente,
    id_doctor: idDoctor,
    fecha_cita: String(body.fecha_cita || '').slice(0, 30),
    motivo: body?.motivo != null ? String(body.motivo).slice(0, 500) : undefined,
  };
  const { data } = await client.post(BASE, payload);
  return data?.data ?? data;
}

const WIZARD_PASOS = ['asistencia', 'signos_vitales', 'observaciones', 'diagnostico', 'plan_medicacion', 'finalizar'];

/**
 * Completar cita con wizard (paso a paso o finalizar).
 * @param {number|string} idCita
 * @param {{ paso: string, asistencia?: boolean, motivo_no_asistencia?: string, signos_vitales?: object, observaciones?: string, diagnostico?: { descripcion: string }, plan_medicacion?: { observaciones?: string, medicamentos?: array }, marcar_como_atendida?: boolean }} body
 */
export async function completarCitaWizard(idCita, body) {
  const id = parsePositiveInt(idCita, 0);
  if (id === 0) throw new Error('ID de cita inválido');
  const paso = body?.paso && WIZARD_PASOS.includes(body.paso) ? body.paso : 'asistencia';
  const payload = { paso };
  if (body?.asistencia !== undefined) payload.asistencia = !!body.asistencia;
  if (body?.motivo_no_asistencia !== undefined) payload.motivo_no_asistencia = String(body.motivo_no_asistencia).slice(0, 500);
  if (body?.signos_vitales && typeof body.signos_vitales === 'object') payload.signos_vitales = body.signos_vitales;
  if (body?.observaciones !== undefined) payload.observaciones = String(body.observaciones).slice(0, 2000);
  if (body?.diagnostico && typeof body.diagnostico === 'object' && body.diagnostico.descripcion) payload.diagnostico = { descripcion: String(body.diagnostico.descripcion).slice(0, 2000) };
  if (body?.plan_medicacion && typeof body.plan_medicacion === 'object') payload.plan_medicacion = body.plan_medicacion;
  if (body?.marcar_como_atendida !== undefined) payload.marcar_como_atendida = !!body.marcar_como_atendida;
  const { data } = await client.post(`${BASE}/${id}/completar-wizard`, payload);
  return data?.data ?? data;
}
