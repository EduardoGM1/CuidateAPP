/**
 * Utilidades para la vista de evolución de signos vitales (tendencias, ejes, comorbilidades).
 */

/** Rangos orientativos para visualización (no sustituyen criterio clínico individual). */
export const REF_RANGES = {
  glucosaAyunas: { y1: 70, y2: 100, label: 'Rango orientativo ayunas (70–100 mg/dL)' },
  glucosaPostprandial: { y1: 70, y2: 140, label: 'Referencia común postprandial (<140 mg/dL)' },
  paSistolicaObjetivo: 130,
  paDiastolicaObjetivo: 80,
  imcNormal: { y1: 18.5, y2: 24.9 },
};

/**
 * @param {Array<{ fecha_medicion?: string }>} series - ordenados por fecha asc
 * @param {string} key - clave numérica en el objeto
 * @returns {{ last: number|null, prev: number|null, trend: 'up'|'down'|'flat'|null }}
 */
export function computeTrend(series, key) {
  const vals = (series || [])
    .map((r) => (r[key] != null && r[key] !== '' ? Number(r[key]) : null))
    .filter((v) => v != null && !Number.isNaN(v));
  if (vals.length === 0) return { last: null, prev: null, trend: null };
  const last = vals[vals.length - 1];
  const prev = vals.length > 1 ? vals[vals.length - 2] : null;
  if (prev == null) return { last, prev: null, trend: null };
  const eps = Math.max(Math.abs(last), Math.abs(prev)) * 0.002 + 0.01;
  if (Math.abs(last - prev) < eps) return { last, prev, trend: 'flat' };
  return { last, prev, trend: last > prev ? 'up' : 'down' };
}

export function trendArrow(trend) {
  if (trend === 'up') return '↑';
  if (trend === 'down') return '↓';
  if (trend === 'flat') return '→';
  return '';
}

export function trendAriaLabel(trend, label) {
  if (!trend) return `${label}: sin comparación previa`;
  if (trend === 'up') return `${label}: aumenta respecto al valor anterior`;
  if (trend === 'down') return `${label}: disminuye respecto al valor anterior`;
  return `${label}: estable respecto al valor anterior`;
}

/**
 * Etiqueta corta para eje X: evita saturación con muchos puntos.
 * @param {string} fechaStr - fecha formateada corta o ISO
 * @param {number} index
 * @param {number} total
 */
export function formatAxisTick(fechaStr, index, total) {
  if (total <= 6) return fechaStr;
  const step = Math.ceil(total / 6);
  if (index % step !== 0 && index !== total - 1) return '';
  return fechaStr;
}

/**
 * Detecta si el paciente tiene DM2 / HTA en texto de comorbilidades (para chips de atajo).
 * @param {string[]} labels
 */
export function inferComorbidityFocus(labels) {
  const t = (labels || []).join(' ').toLowerCase();
  const dm = /diabetes|dm2|dm 2|glucemia|glicemia/i.test(t);
  const hta = /hipertens|presi[oó]n arterial|hta/i.test(t);
  return { diabetes: dm, hipertension: hta };
}
