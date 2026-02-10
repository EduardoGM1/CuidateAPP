import client from './client';
import { API_PATHS } from '../utils/constants';
import { parsePositiveInt } from '../utils/params';

const BASE = API_PATHS.COMORBILIDADES;

function norm(res) {
  const d = res?.data ?? res;
  return d?.data ?? d;
}

export async function getComorbilidades(params = {}) {
  const q = new URLSearchParams();
  if (params.search) q.set('search', String(params.search).slice(0, 100));
  const url = q.toString() ? `${BASE}?${q.toString()}` : BASE;
  const { data } = await client.get(url);
  const list = norm(data)?.comorbilidades ?? (Array.isArray(norm(data)) ? norm(data) : []);
  return Array.isArray(list) ? list : [];
}

export async function getComorbilidadById(id) {
  const parsed = parsePositiveInt(id, 0);
  if (parsed === 0) throw new Error('ID de comorbilidad inválido');
  const { data } = await client.get(`${BASE}/${parsed}`);
  return norm(data)?.comorbilidad ?? norm(data);
}

export async function createComorbilidad(body) {
  const { data } = await client.post(BASE, body);
  return norm(data)?.comorbilidad ?? norm(data);
}

export async function updateComorbilidad(id, body) {
  const parsed = parsePositiveInt(id, 0);
  if (parsed === 0) throw new Error('ID de comorbilidad inválido');
  const { data } = await client.put(`${BASE}/${parsed}`, body);
  return norm(data)?.comorbilidad ?? norm(data);
}

export async function deleteComorbilidad(id) {
  const parsed = parsePositiveInt(id, 0);
  if (parsed === 0) throw new Error('ID de comorbilidad inválido');
  await client.delete(`${BASE}/${parsed}`);
}
