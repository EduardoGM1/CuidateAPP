import { describe, it, expect } from 'vitest';
import {
  FILTROS_TIEMPO,
  filterSignosByTimeRange,
  getDateRangeForFilter,
} from './TimeRangeFilter';

const ref = new Date('2026-05-18T12:00:00');

function signo(fecha) {
  return { fecha_medicion: fecha };
}

describe('filterSignosByTimeRange', () => {
  const datos = [
    signo('2022-03-10'),
    signo('2024-08-15'),
    signo('2026-01-20'),
    signo('2026-05-10'),
    signo('2026-06-01'),
  ];

  it('completo devuelve todos los registros', () => {
    expect(filterSignosByTimeRange(datos, FILTROS_TIEMPO.COMPLETO, ref)).toHaveLength(5);
  });

  it('año actual solo incluye registros del año de referencia hasta hoy', () => {
    const r = filterSignosByTimeRange(datos, FILTROS_TIEMPO.AÑO_ACTUAL, ref);
    expect(r.map((s) => s.fecha_medicion)).toEqual(['2026-01-20', '2026-05-10']);
  });

  it('últimos 3 meses excluye registros anteriores al límite', () => {
    const r = filterSignosByTimeRange(datos, FILTROS_TIEMPO.ULTIMOS_3_MESES, ref);
    expect(r.every((s) => new Date(s.fecha_medicion) >= new Date('2026-02-18'))).toBe(true);
    expect(r.some((s) => s.fecha_medicion === '2024-08-15')).toBe(false);
  });

  it('últimos 6 meses incluye desde noviembre 2025', () => {
    const r = filterSignosByTimeRange(datos, FILTROS_TIEMPO.ULTIMOS_6_MESES, ref);
    expect(r.map((s) => s.fecha_medicion)).toEqual(['2026-01-20', '2026-05-10']);
  });

  it('últimos 12 meses excluye 2022 y 2024', () => {
    const r = filterSignosByTimeRange(datos, FILTROS_TIEMPO.ULTIMOS_12_MESES, ref);
    expect(r.map((s) => s.fecha_medicion)).toEqual(['2026-01-20', '2026-05-10']);
  });

  it('excluye fechas futuras respecto a la referencia', () => {
    const r = filterSignosByTimeRange(datos, FILTROS_TIEMPO.ULTIMOS_3_MESES, ref);
    expect(r.some((s) => s.fecha_medicion === '2026-06-01')).toBe(false);
  });
});

describe('getDateRangeForFilter', () => {
  it('año actual inicia en enero del año de referencia', () => {
    const { fechaInicio, fechaFin } = getDateRangeForFilter(FILTROS_TIEMPO.AÑO_ACTUAL, ref);
    expect(fechaInicio.getFullYear()).toBe(2026);
    expect(fechaInicio.getMonth()).toBe(0);
    expect(fechaFin.getDate()).toBe(18);
  });
});
