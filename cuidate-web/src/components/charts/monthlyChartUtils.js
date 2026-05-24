/**
 * Utilidades para gráfico mensual de signos vitales (registros por mes).
 * Paridad con lógica de MonthlyVitalSignsBarChart en móvil.
 */

import { parseFechaMedicion } from './TimeRangeFilter';

const MESES_ABREV = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function startOfMonth(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/**
 * Agrupa signos vitales por mes (yyyy-MM). Incluye array de signos por mes para desglose al hacer clic (paridad con app móvil).
 * @param {Array} signos - Array de registros con fecha_medicion / fecha_registro / fecha_creacion
 * @returns {Array} [{ mesKey, mesLabel, fecha, totalRegistros, signos }, ...] ordenado cronológicamente
 */
export function aggregateSignosByMonth(signos) {
  if (!Array.isArray(signos) || signos.length === 0) return [];

  const byMonth = {};
  signos.forEach((s) => {
    const raw = s.fecha_medicion || s.fecha_registro || s.fecha_creacion;
    const d = parseFechaMedicion(raw);
    if (!d) return;
    const start = startOfMonth(d);
    const mesKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
    if (!byMonth[mesKey]) {
      byMonth[mesKey] = { mesKey, fecha: start, totalRegistros: 0, signos: [] };
    }
    byMonth[mesKey].totalRegistros += 1;
    byMonth[mesKey].signos.push(s);
  });

  const list = Object.values(byMonth).sort((a, b) => a.fecha - b.fecha);
  return list.map((item) => ({
    ...item,
    mesLabel: `${MESES_ABREV[item.fecha.getMonth()]} ${item.fecha.getFullYear()}`,
    registros: item.totalRegistros,
  }));
}
