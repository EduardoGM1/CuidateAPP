import client from './client';
import { API_PATHS } from '../utils/constants';

/**
 * Resumen del dashboard para Admin (métricas, gráficos, alertas).
 * @returns {Promise<{ metrics, chartData, charts, alertas }>}
 */
export async function getAdminSummary() {
  const { data } = await client.get(API_PATHS.DASHBOARD_ADMIN_SUMMARY);
  const body = data?.data ?? data;
  return body ?? {};
}

/**
 * Resumen del dashboard para Doctor (citas hoy, pacientes, mensajes, alertas).
 * @param {{ estado?: string, periodo?: string }} [params]
 * @returns {Promise<Object>}
 */
export async function getDoctorSummary(params = {}) {
  const q = new URLSearchParams();
  if (params.estado) q.set('estado', params.estado);
  if (params.periodo) q.set('periodo', params.periodo);
  const url = API_PATHS.DASHBOARD_DOCTOR_SUMMARY + (q.toString() ? `?${q.toString()}` : '');
  const { data } = await client.get(url);
  const body = data?.data ?? data;
  return body ?? {};
}
