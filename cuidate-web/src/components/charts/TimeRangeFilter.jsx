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

/**
 * Filtra un array de signos vitales por el rango de tiempo seleccionado.
 * @param {Array} signos - Array de registros con fecha_medicion (o fecha_registro/fecha_creacion)
 * @param {string} filtro - Uno de FILTROS_TIEMPO
 * @returns {Array}
 */
export function filterSignosByTimeRange(signos, filtro) {
  if (!Array.isArray(signos) || signos.length === 0) return [];
  if (filtro === FILTROS_TIEMPO.COMPLETO) return signos;

  const ahora = new Date();

  let fechaLimite = null;
  let fechaFin = null;

  switch (filtro) {
    case FILTROS_TIEMPO.AÑO_ACTUAL:
      fechaLimite = new Date(ahora.getFullYear(), 0, 1);
      fechaFin = new Date(ahora.getFullYear(), 11, 31, 23, 59, 59);
      return signos.filter((s) => {
        const f = new Date(s.fecha_medicion || s.fecha_registro || s.fecha_creacion);
        return !Number.isNaN(f.getTime()) && f >= fechaLimite && f <= fechaFin;
      });
    case FILTROS_TIEMPO.ULTIMOS_3_MESES:
      fechaLimite = new Date(ahora);
      fechaLimite.setMonth(fechaLimite.getMonth() - 3);
      break;
    case FILTROS_TIEMPO.ULTIMOS_6_MESES:
      fechaLimite = new Date(ahora);
      fechaLimite.setMonth(fechaLimite.getMonth() - 6);
      break;
    case FILTROS_TIEMPO.ULTIMOS_12_MESES:
      fechaLimite = new Date(ahora);
      fechaLimite.setMonth(fechaLimite.getMonth() - 12);
      break;
    default:
      return signos;
  }

  if (!fechaLimite) return signos;
  return signos.filter((s) => {
    const f = new Date(s.fecha_medicion || s.fecha_registro || s.fecha_creacion);
    return !Number.isNaN(f.getTime()) && f >= fechaLimite;
  });
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
              aria-pressed={active}
              aria-label={`Período ${opt.label}`}
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
