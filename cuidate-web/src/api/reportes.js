import client from './client';
import { API_PATHS } from '../utils/constants';
import { parsePositiveInt } from '../utils/params';
import { toDateString } from '../utils/reportUtils';

const REPORTES = API_PATHS.REPORTES;
const ESTADISTICAS_HTML = API_PATHS.REPORTES_ESTADISTICAS_HTML;
const REPORTES_FORMA = API_PATHS.REPORTES_FORMA;
const REPORTES_FORMA_MESES_DISPONIBLES = API_PATHS.REPORTES_FORMA_MESES_DISPONIBLES;

/**
 * Obtiene el reporte de estadísticas en HTML (Admin/Doctor).
 * @param {{ modulo?: number, fechaInicio?: string, fechaFin?: string }} [params]
 * @returns {Promise<string>} HTML del reporte
 */
export async function getReporteEstadisticasHTML(params = {}) {
  const q = new URLSearchParams();
  if (params.modulo != null && params.modulo > 0) q.set('modulo', String(params.modulo));
  if (params.fechaInicio) q.set('fechaInicio', toDateString(params.fechaInicio));
  if (params.fechaFin) q.set('fechaFin', toDateString(params.fechaFin));
  const url = q.toString() ? `${ESTADISTICAS_HTML}?${q.toString()}` : ESTADISTICAS_HTML;
  const { data } = await client.get(url, { responseType: 'text' });
  return typeof data === 'string' ? data : '';
}

/**
 * Obtiene el expediente médico completo en HTML para un paciente.
 * @param {number|string} idPaciente
 * @param {{ fechaInicio?: string, fechaFin?: string }} [params]
 * @returns {Promise<string>} HTML del expediente
 */
export async function getExpedienteHTML(idPaciente, params = {}) {
  const id = parsePositiveInt(idPaciente, 0);
  if (id === 0) throw new Error('ID de paciente inválido');

  const query = new URLSearchParams();
  const fechaInicio = toDateString(params.fechaInicio);
  const fechaFin = toDateString(params.fechaFin);
  if (fechaInicio) query.set('fechaInicio', fechaInicio);
  if (fechaFin) query.set('fechaFin', fechaFin);

  const url =
    API_PATHS.REPORTES_EXPEDIENTE_HTML(id) + (query.toString() ? `?${query.toString()}` : '');
  const { data } = await client.get(url, { responseType: 'text' });
  return typeof data === 'string' ? data : '';
}

/**
 * Descarga el expediente médico completo en PDF para un paciente.
 * Usa el endpoint de compatibilidad `/api/reportes/expediente/:idPaciente/pdf`.
 * @param {number|string} idPaciente
 * @returns {Promise<Blob>} Blob PDF
 */
export async function downloadExpedientePDF(idPaciente) {
  const id = parsePositiveInt(idPaciente, 0);
  if (id === 0) throw new Error('ID de paciente inválido');
  const url = `${REPORTES}/expediente/${id}/pdf`;
  const response = await client.get(url, { responseType: 'blob' });
  return response.data;
}

/**
 * Obtiene datos para el FORMA (Formato de Registro Mensual GAM - SIC).
 * Solo uso en web app; la app móvil no usa este endpoint.
 * Datos de un solo paciente para el mes/año seleccionado.
 * @param {{ idPaciente: number, mes: number, anio: number }} params
 * @returns {Promise<{ cabecera: object, filas: object[] }>}
 */
export async function getFormaData(params) {
  const id = params.idPaciente;
  if (!id) throw new Error('idPaciente es requerido');
  const q = new URLSearchParams();
  if (params.mes != null) q.set('mes', String(params.mes));
  if (params.anio != null) q.set('anio', String(params.anio));
  const url = `${REPORTES_FORMA(id)}?${q.toString()}`;
  const { data } = await client.get(url, { timeout: 60000 });
  return data;
}

/**
 * Obtiene los periodos (mes/año) con registros del paciente para FORMA. Solo web.
 * @param {number} idPaciente
 * @returns {Promise<{ periodos: Array<{ mes, anio, value, label }> }>}
 */
export async function getFormaMesesDisponibles(idPaciente) {
  const id = parsePositiveInt(idPaciente, 0);
  if (id === 0) throw new Error('ID de paciente inválido');
  const { data } = await client.get(REPORTES_FORMA_MESES_DISPONIBLES(id));
  return data;
}
