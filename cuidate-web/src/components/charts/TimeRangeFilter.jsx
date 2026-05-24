/**
 * Filtro de rango de tiempo para gráficos de evolución.
 * Paridad con la app móvil (TimeRangeFilter).
 */

export const FILTROS_TIEMPO = {
  COMPLETO: 'completo',
  AÑO_ACTUAL: 'año_actual',
  ULTIMOS_12_MESES: 'ultimos_12_meses',
  ULTIMOS_6_MESES: 'ultimos_6_meses',
  ULTIMOS_3_MESES: 'ultimos_3_meses',
};

const OPCIONES = [
  { key: FILTROS_TIEMPO.COMPLETO, label: 'Completo' },
  { key: FILTROS_TIEMPO.AÑO_ACTUAL, label: 'Año actual' },
  { key: FILTROS_TIEMPO.ULTIMOS_12_MESES, label: 'Últimos 12 meses' },
  { key: FILTROS_TIEMPO.ULTIMOS_6_MESES, label: 'Últimos 6 meses' },
  { key: FILTROS_TIEMPO.ULTIMOS_3_MESES, label: 'Últimos 3 meses' },
];

/** YYYY-MM-DD en calendario local (evita desfase de toISOString/UTC en query params). */
export function formatYmdLocal(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfLocalDay(date) {
  const d = date instanceof Date ? date : new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfLocalDay(date) {
  const d = date instanceof Date ? date : new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/** Evita desfases por UTC en cadenas YYYY-MM-DD */
function parseFechaMedicion(raw) {
  if (!raw) return null;
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [y, m, day] = raw.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, day, 12, 0, 0, 0);
  }
  const f = new Date(raw);
  return Number.isNaN(f.getTime()) ? null : f;
}

function getSignoFecha(signo) {
  const raw = signo?.fecha_medicion || signo?.fecha_registro || signo?.fecha_creacion;
  return parseFechaMedicion(raw);
}

/**
 * Rango de fechas para un filtro (útil para consultas API con fechaInicio/fechaFin).
 * @param {string} filtro
 * @param {Date} [referencia] - Fecha de referencia (por defecto: ahora)
 * @returns {{ fechaInicio: Date|null, fechaFin: Date|null }}
 */
export function getDateRangeForFilter(filtro, referencia = new Date()) {
  const ahora = new Date(referencia);
  const finDia = endOfLocalDay(ahora);

  switch (filtro) {
    case FILTROS_TIEMPO.COMPLETO:
      return { fechaInicio: null, fechaFin: null };
    case FILTROS_TIEMPO.AÑO_ACTUAL:
      return {
        fechaInicio: startOfLocalDay(new Date(ahora.getFullYear(), 0, 1)),
        fechaFin: finDia,
      };
    case FILTROS_TIEMPO.ULTIMOS_3_MESES: {
      const d = new Date(ahora);
      d.setMonth(d.getMonth() - 3);
      return { fechaInicio: startOfLocalDay(d), fechaFin: finDia };
    }
    case FILTROS_TIEMPO.ULTIMOS_6_MESES: {
      const d = new Date(ahora);
      d.setMonth(d.getMonth() - 6);
      return { fechaInicio: startOfLocalDay(d), fechaFin: finDia };
    }
    case FILTROS_TIEMPO.ULTIMOS_12_MESES: {
      const d = new Date(ahora);
      d.setMonth(d.getMonth() - 12);
      return { fechaInicio: startOfLocalDay(d), fechaFin: finDia };
    }
    default:
      return { fechaInicio: null, fechaFin: null };
  }
}

/** Etiquetas para mostrar en UI */
export const FILTRO_LABELS = {
  [FILTROS_TIEMPO.COMPLETO]: 'Completo',
  [FILTROS_TIEMPO.AÑO_ACTUAL]: 'Año actual',
  [FILTROS_TIEMPO.ULTIMOS_12_MESES]: 'Últimos 12 meses',
  [FILTROS_TIEMPO.ULTIMOS_6_MESES]: 'Últimos 6 meses',
  [FILTROS_TIEMPO.ULTIMOS_3_MESES]: 'Últimos 3 meses',
};

function enRango(fecha, inicio, fin) {
  if (!fecha) return false;
  if (inicio && fecha < inicio) return false;
  if (fin && fecha > fin) return false;
  return true;
}

/**
 * Filtra un array de signos vitales por el rango de tiempo seleccionado.
 * @param {Array} signos - Array de registros con fecha_medicion (o fecha_registro/fecha_creacion)
 * @param {string} filtro - Uno de FILTROS_TIEMPO
 * @param {Date} [referencia] - Fecha de referencia para rangos relativos
 * @returns {Array}
 */
export function filterSignosByTimeRange(signos, filtro, referencia = new Date()) {
  if (!Array.isArray(signos) || signos.length === 0) return [];
  if (filtro === FILTROS_TIEMPO.COMPLETO) return signos;

  const { fechaInicio, fechaFin } = getDateRangeForFilter(filtro, referencia);
  return signos.filter((s) => enRango(getSignoFecha(s), fechaInicio, fechaFin));
}

export default function TimeRangeFilter({ value, onChange }) {
  return (
    <div
      style={{
        marginBottom: 'var(--space-4)',
        padding: 'var(--space-3)',
        background: 'var(--color-fondo-card)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--color-borde-claro)',
      }}
    >
      <span
        style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
          color: 'var(--color-texto-secundario)',
          marginRight: 'var(--space-3)',
          display: 'inline-block',
          marginBottom: 'var(--space-2)',
        }}
      >
        Período:
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        {OPCIONES.map((opt) => {
          const active = value === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.key)}
              style={{
                padding: 'var(--space-1) var(--space-3)',
                borderRadius: 'var(--radius)',
                border: `1px solid ${active ? 'var(--color-primario)' : 'var(--color-borde-claro)'}`,
                background: active ? 'var(--color-primario)' : 'var(--color-fondo)',
                color: active ? 'var(--color-texto-sobre-primario, #fff)' : 'var(--color-texto-secundario)',
                fontSize: 'var(--text-sm)',
                fontWeight: active ? 600 : 500,
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
