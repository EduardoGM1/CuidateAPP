import client from './client';
import { API_PATHS } from '../utils/constants';
import { parsePositiveInt } from '../utils/params';

const BASE = API_PATHS.CITAS;

function norm(res) {
  const d = res?.data ?? res;
  return d?.data ?? d;
}

/**
 * Listar solicitudes de reprogramación (Admin o Doctor; Doctor solo ve las de sus pacientes).
 * @param {{ estado?: string, paciente?: number, doctor?: number }} [params]
 */
export async function getSolicitudesReprogramacion(params = {}) {
  const q = new URLSearchParams();
  if (params.estado) q.set('estado', params.estado);
  if (params.paciente != null) q.set('paciente', String(params.paciente));
  if (params.doctor != null) q.set('doctor', String(params.doctor));
  const url = `${BASE}/solicitudes-reprogramacion${q.toString() ? `?${q.toString()}` : ''}`;
  const { data } = await client.get(url);
  const body = norm(data) ?? data;
  const list = body?.solicitudes ?? (Array.isArray(body) ? body : []);
  return { solicitudes: Array.isArray(list) ? list : [], total: body?.total ?? list.length };
}

/**
 * Aprobar o rechazar una solicitud de reprogramación.
 * @param {number|string} idCita
 * @param {number|string} solicitudId
 * @param {{ accion: 'aprobar'|'rechazar', respuesta_doctor?: string, fecha_reprogramada?: string }} body
 */
export async function responderSolicitudReprogramacion(idCita, solicitudId, body) {
  const cid = parsePositiveInt(idCita, 0);
  const sid = parsePositiveInt(solicitudId, 0);
  if (cid === 0 || sid === 0) throw new Error('ID de cita o solicitud inválido');
  const accion = body?.accion === 'aprobar' || body?.accion === 'rechazar' ? body.accion : null;
  if (!accion) throw new Error('accion debe ser "aprobar" o "rechazar"');
  const payload = { accion };
  if (body?.respuesta_doctor != null) payload.respuesta_doctor = String(body.respuesta_doctor).slice(0, 1000);
  if (body?.fecha_reprogramada != null) payload.fecha_reprogramada = String(body.fecha_reprogramada).slice(0, 30);
  const { data } = await client.put(`${BASE}/${cid}/solicitud-reprogramacion/${sid}`, payload);
  return norm(data) ?? data;
}
