import client from './client';
import { API_PATHS } from '../utils/constants';

const BASE = API_PATHS.TICKETS;

export async function createTicket(body) {
  const { data } = await client.post(BASE, body);
  return data?.data ?? data;
}

export async function getMyTickets() {
  const { data } = await client.get(`${BASE}/mios`);
  return data?.data ?? data;
}

export async function getAdminTickets(params = {}) {
  const q = new URLSearchParams();
  if (params.estado) q.set('estado', params.estado);
  const url = q.toString() ? `${BASE}/admin/lista?${q}` : `${BASE}/admin/lista`;
  const { data } = await client.get(url);
  return data?.data ?? data;
}

export async function getTicket(id) {
  const { data } = await client.get(`${BASE}/${id}`);
  return data?.data ?? data;
}

export async function postTicketMessage(id, cuerpo) {
  const { data } = await client.post(`${BASE}/${id}/mensajes`, { cuerpo });
  return data?.data ?? data;
}

export async function patchTicket(id, body) {
  const { data } = await client.patch(`${BASE}/${id}`, body);
  return data?.data ?? data;
}
