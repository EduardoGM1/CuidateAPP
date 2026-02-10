import client from './client';
import { API_PATHS } from '../utils/constants';
import { parsePositiveInt } from '../utils/params';

const BASE = API_PATHS.VACUNAS;

function norm(res) {
  const d = res?.data ?? res;
  return d?.data ?? d;
}

export async function getVacunas(params = {}) {
  const q = new URLSearchParams();
  if (params.search) q.set('search', String(params.search).slice(0, 100));
  const url = q.toString() ? `${BASE}?${q.toString()}` : BASE;
  const { data } = await client.get(url);
  const list = norm(data)?.vacunas ?? (Array.isArray(norm(data)) ? norm(data) : []);
  return Array.isArray(list) ? list : [];
}

export async function getVacunaById(id) {
  const parsed = parsePositiveInt(id, 0);
  if (parsed === 0) throw new Error('ID de vacuna inválido');
  const { data } = await client.get(`${BASE}/${parsed}`);
  return norm(data)?.vacuna ?? norm(data);
}

export async function createVacuna(body) {
  const { data } = await client.post(BASE, body);
  return norm(data)?.vacuna ?? norm(data);
}

export async function updateVacuna(id, body) {
  const parsed = parsePositiveInt(id, 0);
  if (parsed === 0) throw new Error('ID de vacuna inválido');
  const { data } = await client.put(`${BASE}/${parsed}`, body);
  return norm(data)?.vacuna ?? norm(data);
}

export async function deleteVacuna(id) {
  const parsed = parsePositiveInt(id, 0);
  if (parsed === 0) throw new Error('ID de vacuna inválido');
  await client.delete(`${BASE}/${parsed}`);
}
