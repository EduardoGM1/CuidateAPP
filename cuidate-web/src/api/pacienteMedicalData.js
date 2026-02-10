import client from './client';
import { API_PATHS } from '../utils/constants';
import { parsePositiveInt } from '../utils/params';
import { normalizeString } from '../utils/sanitize';

const BASE = API_PATHS.PACIENTES;

function toListAndTotal(response) {
  const body = response?.data ?? response;
  const arr = Array.isArray(body?.data) ? body.data : (Array.isArray(body) ? body : []);
  return { data: arr, total: body?.total ?? arr.length };
}

/**
 * Citas del paciente.
 * @param {number|string} pacienteId
 * @param {{ limit?: number, offset?: number, sort?: string }} [params]
 */
export async function getPacienteCitas(pacienteId, params = {}) {
  const id = parsePositiveInt(pacienteId, 0);
  if (id === 0) throw new Error('ID de paciente inválido');
  const limit = parsePositiveInt(params.limit, 10);
  const offset = parsePositiveInt(params.offset, 0);
  const sort = normalizeString(params.sort, { maxLength: 10 }) || 'DESC';
  const q = new URLSearchParams({ limit: String(limit), offset: String(offset), sort });
  const { data } = await client.get(`${BASE}/${id}/citas?${q.toString()}`);
  return toListAndTotal(data);
}

/**
 * Resumen médico del paciente (contadores y últimos registros).
 * GET /api/pacientes/:id/resumen-medico
 */
export async function getPacienteResumenMedico(pacienteId) {
  const id = parsePositiveInt(pacienteId, 0);
  if (id === 0) throw new Error('ID de paciente inválido');
  const { data } = await client.get(`${BASE}/${id}/resumen-medico`);
  return data;
}

/**
 * Signos vitales del paciente.
 * @param {number|string} pacienteId
 * @param {{ limit?: number, offset?: number, sort?: string, fechaInicio?: string, fechaFin?: string }} [params]
 */
export async function getPacienteSignosVitales(pacienteId, params = {}) {
  const id = parsePositiveInt(pacienteId, 0);
  if (id === 0) throw new Error('ID de paciente inválido');
  const q = new URLSearchParams();
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  if (params.sort) q.set('sort', params.sort);
  if (params.fechaInicio) q.set('fechaInicio', String(params.fechaInicio).slice(0, 10));
  if (params.fechaFin) q.set('fechaFin', String(params.fechaFin).slice(0, 10));
  const { data } = await client.get(`${BASE}/${id}/signos-vitales?${q.toString()}`);
  return toListAndTotal(data);
}

/**
 * Diagnósticos del paciente.
 */
export async function getPacienteDiagnosticos(pacienteId, params = {}) {
  const id = parsePositiveInt(pacienteId, 0);
  if (id === 0) throw new Error('ID de paciente inválido');
  const q = new URLSearchParams();
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  if (params.sort) q.set('sort', params.sort);
  const { data } = await client.get(`${BASE}/${id}/diagnosticos?${q.toString()}`);
  return toListAndTotal(data);
}

/**
 * Planes de medicación / medicamentos del paciente.
 */
export async function getPacienteMedicamentos(pacienteId, params = {}) {
  const id = parsePositiveInt(pacienteId, 0);
  if (id === 0) throw new Error('ID de paciente inválido');
  const q = new URLSearchParams();
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  const { data } = await client.get(`${BASE}/${id}/medicamentos?${q.toString()}`);
  return toListAndTotal(data);
}

/**
 * Red de apoyo del paciente.
 */
export async function getPacienteRedApoyo(pacienteId, params = {}) {
  const id = parsePositiveInt(pacienteId, 0);
  if (id === 0) throw new Error('ID de paciente inválido');
  const q = params.limit != null ? `?limit=${params.limit}&offset=${params.offset || 0}` : '';
  const { data } = await client.get(`${BASE}/${id}/red-apoyo${q}`);
  return toListAndTotal(data);
}

/**
 * Crear contacto de red de apoyo.
 * @param {number|string} pacienteId
 * @param {{ nombre_contacto: string, numero_celular?: string, email?: string, direccion?: string, localidad?: string, parentesco?: string }} body
 */
export async function createPacienteRedApoyo(pacienteId, body) {
  const id = parsePositiveInt(pacienteId, 0);
  if (id === 0) throw new Error('ID de paciente inválido');
  const { data } = await client.post(`${BASE}/${id}/red-apoyo`, body);
  return data?.data ?? data;
}

/**
 * Actualizar contacto de red de apoyo.
 * @param {number|string} pacienteId
 * @param {number|string} contactoId
 * @param {{ nombre_contacto?: string, numero_celular?: string, email?: string, direccion?: string, localidad?: string, parentesco?: string }} body
 */
export async function updatePacienteRedApoyo(pacienteId, contactoId, body) {
  const pid = parsePositiveInt(pacienteId, 0);
  const cid = parsePositiveInt(contactoId, 0);
  if (pid === 0 || cid === 0) throw new Error('IDs inválidos');
  const { data } = await client.put(`${BASE}/${pid}/red-apoyo/${cid}`, body);
  return data?.data ?? data;
}

/**
 * Eliminar contacto de red de apoyo.
 * @param {number|string} pacienteId
 * @param {number|string} contactoId
 */
export async function deletePacienteRedApoyo(pacienteId, contactoId) {
  const pid = parsePositiveInt(pacienteId, 0);
  const cid = parsePositiveInt(contactoId, 0);
  if (pid === 0 || cid === 0) throw new Error('IDs inválidos');
  await client.delete(`${BASE}/${pid}/red-apoyo/${cid}`);
}

/**
 * Esquema de vacunación del paciente.
 */
export async function getPacienteEsquemaVacunacion(pacienteId, params = {}) {
  const id = parsePositiveInt(pacienteId, 0);
  if (id === 0) throw new Error('ID de paciente inválido');
  const q = params.limit != null ? `?limit=${params.limit}&offset=${params.offset || 0}` : '';
  const { data } = await client.get(`${BASE}/${id}/esquema-vacunacion${q}`);
  return toListAndTotal(data);
}

/**
 * Crear registro de esquema de vacunación para un paciente.
 * @param {number|string} pacienteId
 * @param {{ vacuna: string, fecha_aplicacion: string, lote?: string, observaciones?: string }} body
 */
export async function createPacienteEsquemaVacunacion(pacienteId, body) {
  const id = parsePositiveInt(pacienteId, 0);
  if (id === 0) throw new Error('ID de paciente inválido');
  const { data } = await client.post(`${BASE}/${id}/esquema-vacunacion`, body);
  return data?.data ?? data;
}

/**
 * Actualizar registro de esquema de vacunación.
 * @param {number|string} pacienteId
 * @param {number|string} esquemaId
 * @param {{ vacuna?: string, fecha_aplicacion?: string, lote?: string, observaciones?: string }} body
 */
export async function updatePacienteEsquemaVacunacion(pacienteId, esquemaId, body) {
  const pid = parsePositiveInt(pacienteId, 0);
  const eid = parsePositiveInt(esquemaId, 0);
  if (pid === 0 || eid === 0) throw new Error('IDs inválidos');
  const { data } = await client.put(`${BASE}/${pid}/esquema-vacunacion/${eid}`, body);
  return data?.data ?? data;
}

/**
 * Eliminar registro de esquema de vacunación.
 * @param {number|string} pacienteId
 * @param {number|string} esquemaId
 */
export async function deletePacienteEsquemaVacunacion(pacienteId, esquemaId) {
  const pid = parsePositiveInt(pacienteId, 0);
  const eid = parsePositiveInt(esquemaId, 0);
  if (pid === 0 || eid === 0) throw new Error('IDs inválidos');
  await client.delete(`${BASE}/${pid}/esquema-vacunacion/${eid}`);
}

/**
 * Comorbilidades del paciente (desde datos médicos).
 */
export async function getPacienteComorbilidades(pacienteId) {
  const id = parsePositiveInt(pacienteId, 0);
  if (id === 0) throw new Error('ID de paciente inválido');
  const { data } = await client.get(`${BASE}/${id}/comorbilidades`);
  return toListAndTotal(data);
}

/**
 * Agregar comorbilidad a un paciente.
 * POST /api/pacientes/:id/comorbilidades
 * @param {number|string} pacienteId
 * @param {{ id_comorbilidad: number|string, fecha_deteccion?: string, observaciones?: string, anos_padecimiento?: number|string, es_diagnostico_basal?: boolean, es_agregado_posterior?: boolean, año_diagnostico?: number|string, recibe_tratamiento_no_farmacologico?: boolean, recibe_tratamiento_farmacologico?: boolean }} body
 */
export async function addPacienteComorbilidad(pacienteId, body) {
  const id = parsePositiveInt(pacienteId, 0);
  if (id === 0) throw new Error('ID de paciente inválido');
  const { data } = await client.post(`${BASE}/${id}/comorbilidades`, body);
  return data?.data ?? data;
}

/**
 * Eliminar comorbilidad de un paciente.
 * DELETE /api/pacientes/:id/comorbilidades/:comorbilidadId
 * @param {number|string} pacienteId
 * @param {number|string} comorbilidadId
 */
export async function deletePacienteComorbilidad(pacienteId, comorbilidadId) {
  const pid = parsePositiveInt(pacienteId, 0);
  const cid = parsePositiveInt(comorbilidadId, 0);
  if (pid === 0 || cid === 0) throw new Error('IDs inválidos');
  await client.delete(`${BASE}/${pid}/comorbilidades/${cid}`);
}

/**
 * Detecciones de complicaciones del paciente.
 */
export async function getPacienteDeteccionesComplicaciones(pacienteId, params = {}) {
  const id = parsePositiveInt(pacienteId, 0);
  if (id === 0) throw new Error('ID de paciente inválido');
  const q = new URLSearchParams();
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  if (params.sort) q.set('sort', params.sort);
  const { data } = await client.get(`${BASE}/${id}/detecciones-complicaciones?${q.toString()}`);
  return toListAndTotal(data);
}

/**
 * Sesiones educativas del paciente.
 */
export async function getPacienteSesionesEducativas(pacienteId, params = {}) {
  const id = parsePositiveInt(pacienteId, 0);
  if (id === 0) throw new Error('ID de paciente inválido');
  const q = new URLSearchParams();
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  if (params.sort) q.set('sort', params.sort);
  const { data } = await client.get(`${BASE}/${id}/sesiones-educativas?${q.toString()}`);
  return toListAndTotal(data);
}

/**
 * Crear sesión educativa.
 * @param {number|string} pacienteId
 * @param {{ id_cita?: number|string, fecha_sesion: string, asistio?: boolean, tipo_sesion: string, numero_intervenciones?: number|string, observaciones?: string }} body
 */
export async function createSesionEducativa(pacienteId, body) {
  const id = parsePositiveInt(pacienteId, 0);
  if (id === 0) throw new Error('ID de paciente inválido');
  const { data } = await client.post(`${BASE}/${id}/sesiones-educativas`, body);
  return data?.data ?? data;
}

/**
 * Eliminar sesión educativa.
 * @param {number|string} pacienteId
 * @param {number|string} sesionId
 */
export async function deleteSesionEducativa(pacienteId, sesionId) {
  const pid = parsePositiveInt(pacienteId, 0);
  const sid = parsePositiveInt(sesionId, 0);
  if (pid === 0 || sid === 0) throw new Error('IDs inválidos');
  await client.delete(`${BASE}/${pid}/sesiones-educativas/${sid}`);
}

/**
 * Salud bucal del paciente.
 */
export async function getPacienteSaludBucal(pacienteId, params = {}) {
  const id = parsePositiveInt(pacienteId, 0);
  if (id === 0) throw new Error('ID de paciente inválido');
  const q = new URLSearchParams();
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  if (params.sort) q.set('sort', params.sort);
  const { data } = await client.get(`${BASE}/${id}/salud-bucal?${q.toString()}`);
  return toListAndTotal(data);
}

/**
 * Crear registro de salud bucal.
 * @param {number|string} pacienteId
 * @param {{ id_cita?: number|string, fecha_registro: string, presenta_enfermedades_odontologicas?: boolean, recibio_tratamiento_odontologico?: boolean, observaciones?: string }} body
 */
export async function createSaludBucal(pacienteId, body) {
  const id = parsePositiveInt(pacienteId, 0);
  if (id === 0) throw new Error('ID de paciente inválido');
  const { data } = await client.post(`${BASE}/${id}/salud-bucal`, body);
  return data?.data ?? data;
}

/**
 * Eliminar registro de salud bucal.
 * @param {number|string} pacienteId
 * @param {number|string} saludId
 */
export async function deleteSaludBucal(pacienteId, saludId) {
  const pid = parsePositiveInt(pacienteId, 0);
  const sid = parsePositiveInt(saludId, 0);
  if (pid === 0 || sid === 0) throw new Error('IDs inválidos');
  await client.delete(`${BASE}/${pid}/salud-bucal/${sid}`);
}

/**
 * Detecciones de tuberculosis del paciente.
 */
export async function getPacienteDeteccionesTuberculosis(pacienteId, params = {}) {
  const id = parsePositiveInt(pacienteId, 0);
  if (id === 0) throw new Error('ID de paciente inválido');
  const q = new URLSearchParams();
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  if (params.sort) q.set('sort', params.sort);
  const { data } = await client.get(`${BASE}/${id}/detecciones-tuberculosis?${q.toString()}`);
  return toListAndTotal(data);
}

/**
 * Crear detección de tuberculosis.
 * @param {number|string} pacienteId
 * @param {{ id_cita?: number|string, fecha_deteccion: string, aplicacion_encuesta?: boolean, baciloscopia_realizada?: boolean, baciloscopia_resultado?: string, ingreso_tratamiento?: boolean, observaciones?: string }} body
 */
export async function createDeteccionTuberculosis(pacienteId, body) {
  const id = parsePositiveInt(pacienteId, 0);
  if (id === 0) throw new Error('ID de paciente inválido');
  const { data } = await client.post(`${BASE}/${id}/detecciones-tuberculosis`, body);
  return data?.data ?? data;
}

/**
 * Eliminar detección de tuberculosis.
 * @param {number|string} pacienteId
 * @param {number|string} detId
 */
export async function deleteDeteccionTuberculosis(pacienteId, detId) {
  const pid = parsePositiveInt(pacienteId, 0);
  const did = parsePositiveInt(detId, 0);
  if (pid === 0 || did === 0) throw new Error('IDs inválidos');
  await client.delete(`${BASE}/${pid}/detecciones-tuberculosis/${did}`);
}

// --- Signos vitales CRUD ---

/**
 * Crear signos vitales.
 * @param {number|string} pacienteId
 * @param {Object} body - peso_kg, talla_m, medida_cintura_cm, presion_sistolica, presion_diastolica, glucosa_mg_dl, colesterol_mg_dl, colesterol_ldl, colesterol_hdl, trigliceridos_mg_dl, hba1c_porcentaje, id_cita?, observaciones?
 */
export async function createSignosVitales(pacienteId, body) {
  const id = parsePositiveInt(pacienteId, 0);
  if (id === 0) throw new Error('ID de paciente inválido');
  const { data } = await client.post(`${BASE}/${id}/signos-vitales`, body);
  return data?.data ?? data;
}

/**
 * Actualizar signos vitales.
 */
export async function updateSignosVitales(pacienteId, signoId, body) {
  const pid = parsePositiveInt(pacienteId, 0);
  const sid = parsePositiveInt(signoId, 0);
  if (pid === 0 || sid === 0) throw new Error('IDs inválidos');
  const { data } = await client.put(`${BASE}/${pid}/signos-vitales/${sid}`, body);
  return data?.data ?? data;
}

/**
 * Eliminar signos vitales.
 */
export async function deleteSignosVitales(pacienteId, signoId) {
  const pid = parsePositiveInt(pacienteId, 0);
  const sid = parsePositiveInt(signoId, 0);
  if (pid === 0 || sid === 0) throw new Error('IDs inválidos');
  await client.delete(`${BASE}/${pid}/signos-vitales/${sid}`);
}

// --- Diagnósticos CRUD ---

/**
 * Crear diagnóstico.
 * @param {number|string} pacienteId
 * @param {{ descripcion: string, id_cita?: number }} body
 */
export async function createDiagnostico(pacienteId, body) {
  const id = parsePositiveInt(pacienteId, 0);
  if (id === 0) throw new Error('ID de paciente inválido');
  const { data } = await client.post(`${BASE}/${id}/diagnosticos`, body);
  return data?.data ?? data;
}

/**
 * Actualizar diagnóstico.
 */
export async function updateDiagnostico(pacienteId, diagnosticoId, body) {
  const pid = parsePositiveInt(pacienteId, 0);
  const did = parsePositiveInt(diagnosticoId, 0);
  if (pid === 0 || did === 0) throw new Error('IDs inválidos');
  const { data } = await client.put(`${BASE}/${pid}/diagnosticos/${did}`, body);
  return data?.data ?? data;
}

/**
 * Eliminar diagnóstico.
 */
export async function deleteDiagnostico(pacienteId, diagnosticoId) {
  const pid = parsePositiveInt(pacienteId, 0);
  const did = parsePositiveInt(diagnosticoId, 0);
  if (pid === 0 || did === 0) throw new Error('IDs inválidos');
  await client.delete(`${BASE}/${pid}/diagnosticos/${did}`);
}

/**
 * Crear plan de medicación para un paciente.
 * POST /api/pacientes/:id/planes-medicacion
 * @param {number|string} pacienteId
 * @param {{ id_cita?: number|string, fecha_inicio?: string, fecha_fin?: string, observaciones?: string, medicamentos: Array<{ id_medicamento: number|string, dosis?: string, frecuencia?: string, horario?: string, via_administracion?: string, observaciones?: string }> }} body
 */
export async function createPacientePlanMedicacion(pacienteId, body) {
  const id = parsePositiveInt(pacienteId, 0);
  if (id === 0) throw new Error('ID de paciente inválido');
  const medicamentos = Array.isArray(body?.medicamentos) ? body.medicamentos : [];
  if (medicamentos.length === 0) throw new Error('Debe incluir al menos un medicamento');
  const payload = {
    id_cita: body?.id_cita ? parsePositiveInt(body.id_cita, 0) || undefined : undefined,
    fecha_inicio: (body?.fecha_inicio || '').toString().trim() || undefined,
    fecha_fin: (body?.fecha_fin || '').toString().trim() || undefined,
    observaciones: (body?.observaciones || '').toString().trim().slice(0, 2000) || undefined,
    medicamentos: medicamentos.map((m) => ({
      id_medicamento: parsePositiveInt(m.id_medicamento, 0),
      dosis: (m.dosis || '').toString().trim().slice(0, 200) || undefined,
      frecuencia: (m.frecuencia || '').toString().trim().slice(0, 200) || undefined,
      horario: (m.horario || '').toString().trim().slice(0, 200) || undefined,
      via_administracion: (m.via_administracion || '').toString().trim().slice(0, 100) || undefined,
      observaciones: (m.observaciones || '').toString().trim().slice(0, 500) || undefined,
    })),
  };
  const { data } = await client.post(`${BASE}/${id}/planes-medicacion`, payload);
  return data?.data ?? data;
}

/**
 * Eliminar plan de medicación.
 * DELETE /api/pacientes/:id/planes-medicacion/:planId
 */
export async function deletePacientePlanMedicacion(pacienteId, planId) {
  const pid = parsePositiveInt(pacienteId, 0);
  const plan = parsePositiveInt(planId, 0);
  if (pid === 0 || plan === 0) throw new Error('IDs inválidos');
  await client.delete(`${BASE}/${pid}/planes-medicacion/${plan}`);
}
