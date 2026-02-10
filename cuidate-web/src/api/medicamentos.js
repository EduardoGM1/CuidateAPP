import client from './client';
import { API_PATHS } from '../utils/constants';
import { parsePositiveInt } from '../utils/params';

const BASE = API_PATHS.MEDICAMENTOS;

function norm(res) {
  const d = res?.data ?? res;
  return d?.data ?? d;
}

export async function getMedicamentos(params = {}) {
  const q = new URLSearchParams();
  if (params.search) q.set('search', String(params.search).slice(0, 100));
  const url = q.toString() ? `${BASE}?${q.toString()}` : BASE;
  const { data } = await client.get(url);
  const list = norm(data)?.medicamentos ?? (Array.isArray(norm(data)) ? norm(data) : []);
  return Array.isArray(list) ? list : [];
}

export async function getMedicamentoById(id) {
  const parsed = parsePositiveInt(id, 0);
  if (parsed === 0) throw new Error('ID de medicamento inválido');
  const { data } = await client.get(`${BASE}/${parsed}`);
  return norm(data)?.medicamento ?? norm(data);
}

export async function createMedicamento(body) {
  const { data } = await client.post(BASE, body);
  return norm(data)?.medicamento ?? norm(data);
}

export async function updateMedicamento(id, body) {
  const parsed = parsePositiveInt(id, 0);
  if (parsed === 0) throw new Error('ID de medicamento inválido');
  const { data } = await client.put(`${BASE}/${parsed}`, body);
  return norm(data)?.medicamento ?? norm(data);
}

export async function deleteMedicamento(id) {
  const parsed = parsePositiveInt(id, 0);
  if (parsed === 0) throw new Error('ID de medicamento inválido');
  await client.delete(`${BASE}/${parsed}`);
}
