import client from './client';
import { API_PATHS } from '../utils/constants';
import { parsePositiveInt } from '../utils/params';
import { normalizeString } from '../utils/sanitize';

const BASE = API_PATHS.MENSAJES_CHAT;

function norm(res) {
  const d = res?.data ?? res;
  return d?.data ?? d;
}

/**
 * Lista de conversaciones del doctor (pacientes con mensajes).
 * @param {number|string} doctorId
 */
export async function getConversacionesDoctor(doctorId) {
  const id = parsePositiveInt(doctorId, 0);
  if (id === 0) throw new Error('ID de doctor inválido');
  const { data } = await client.get(`${BASE}/doctor/${id}/conversaciones`);
  const body = norm(data) ?? data;
  const list = body?.conversaciones ?? (Array.isArray(body) ? body : []);
  return { conversaciones: Array.isArray(list) ? list : [], total: body?.total ?? list.length };
}

/**
 * Mensajes de una conversación (paciente + doctor).
 * @param {number|string} pacienteId
 * @param {number|string} doctorId
 */
export async function getConversacion(pacienteId, doctorId) {
  const pid = parsePositiveInt(pacienteId, 0);
  const did = parsePositiveInt(doctorId, 0);
  if (pid === 0 || did === 0) throw new Error('ID de paciente o doctor inválido');
  const { data } = await client.get(`${BASE}/paciente/${pid}/doctor/${did}`);
  const body = norm(data) ?? data;
  const list = Array.isArray(body) ? body : (body?.mensajes ?? body?.data ?? []);
  return Array.isArray(list) ? list : [];
}

/**
 * Enviar mensaje (Doctor: id_paciente, remitente: 'Doctor', mensaje_texto; opcional id_doctor).
 * @param {{ id_paciente: number, id_doctor?: number, remitente: 'Doctor'|'Paciente', mensaje_texto: string }} body
 */
export async function createMensaje(body) {
  const id_paciente = parsePositiveInt(body?.id_paciente, 0);
  if (id_paciente === 0) throw new Error('id_paciente es requerido');
  const remitente = body?.remitente === 'Doctor' || body?.remitente === 'Paciente' ? body.remitente : null;
  if (!remitente) throw new Error('remitente debe ser Doctor o Paciente');
  const mensaje_texto = normalizeString(body?.mensaje_texto, { maxLength: 4000 });
  if (!mensaje_texto) throw new Error('mensaje_texto es requerido');
  const payload = { id_paciente, remitente, mensaje_texto };
  if (body?.id_doctor != null) payload.id_doctor = parsePositiveInt(body.id_doctor, 0);
  const { data } = await client.post(BASE, payload);
  return norm(data) ?? data;
}

/**
 * Marcar todos los mensajes de una conversación como leídos.
 */
export async function marcarConversacionLeida(pacienteId, doctorId) {
  const pid = parsePositiveInt(pacienteId, 0);
  const did = parsePositiveInt(doctorId, 0);
  if (pid === 0 || did === 0) throw new Error('IDs inválidos');
  await client.put(`${BASE}/paciente/${pid}/doctor/${did}/leer-todos`);
}
