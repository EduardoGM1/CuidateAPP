import { useMemo } from 'react';
import { sanitizeForDisplay } from '../../utils/sanitize';

/**
 * Escala de color para la celda según valor normalizado (0-1).
 * Usa la paleta de la web (primario azul).
 */
function getHeatmapColor(normalized) {
  if (normalized <= 0) return 'var(--color-fondo-secundario)';
  if (normalized <= 0.2) return 'rgba(0, 75, 135, 0.15)';
  if (normalized <= 0.4) return 'rgba(0, 75, 135, 0.35)';
  if (normalized <= 0.6) return 'rgba(0, 75, 135, 0.5)';
  if (normalized <= 0.8) return 'rgba(0, 75, 135, 0.7)';
  return 'var(--color-primario)';
}

/**
 * Heatmap de comorbilidades más frecuentes.
 * Muestra una tabla: fila = comorbilidad, columna = frecuencia con color por intensidad.
 *
 * @param {{ datos: Array<{ nombre: string, frecuencia: number }> }} props
 */
export default function ComorbilidadesHeatmap({ datos = [] }) {
  const { list, maxValue } = useMemo(() => {
    const list = (Array.isArray(datos) ? datos : [])
      .map((d) => ({
        nombre: d.nombre ?? d.nombre_comorbilidad ?? '—',
        frecuencia: Number(d.frecuencia ?? d.pacientes_afectados ?? 0) || 0,
      }))
      .filter((d) => d.nombre && d.nombre !== '—')
      .sort((a, b) => b.frecuencia - a.frecuencia)
      .slice(0, 20);
    const maxValue = Math.max(1, ...list.map((d) => d.frecuencia));
    return { list, maxValue };
  }, [datos]);

  if (list.length === 0) {
    return (
      <p style={{ margin: 0, color: 'var(--color-texto-secundario)', fontSize: '0.9rem' }}>
        No hay datos de comorbilidades para mostrar.
      </p>
    );
  }

  return (
    <div className="comorbilidades-heatmap" style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-texto-secundario)', fontWeight: 600 }}>
          Intensidad:
        </span>
        <span
          style={{
            display: 'inline-block',
            width: 24,
            height: 14,
            borderRadius: 4,
            background: 'var(--color-fondo-secundario)',
          }}
          title="Bajo"
        />
        <span style={{ fontSize: '0.75rem', color: 'var(--color-texto-secundario)' }}>Bajo</span>
        <span
          style={{
            display: 'inline-block',
            width: 24,
            height: 14,
            borderRadius: 4,
            background: 'rgba(0, 75, 135, 0.5)',
          }}
          title="Medio"
        />
        <span style={{ fontSize: '0.75rem', color: 'var(--color-texto-secundario)' }}>Medio</span>
        <span
          style={{
            display: 'inline-block',
            width: 24,
            height: 14,
            borderRadius: 4,
            background: 'var(--color-primario)',
          }}
          title="Alto"
        />
        <span style={{ fontSize: '0.75rem', color: 'var(--color-texto-secundario)' }}>Alto</span>
      </div>
      <table
        style={{
          width: '100%',
          minWidth: 280,
          borderCollapse: 'collapse',
          fontSize: '0.875rem',
          color: 'var(--color-texto-primario)',
        }}
        role="grid"
        aria-label="Comorbilidades más frecuentes"
      >
        <thead>
          <tr>
            <th
              style={{
                textAlign: 'left',
                padding: '0.5rem 0.75rem',
                fontWeight: 600,
                color: 'var(--color-texto-secundario)',
                borderBottom: '1px solid var(--color-borde-claro)',
              }}
            >
              Comorbilidad
            </th>
            <th
              style={{
                textAlign: 'right',
                padding: '0.5rem 0.75rem',
                fontWeight: 600,
                color: 'var(--color-texto-secundario)',
                borderBottom: '1px solid var(--color-borde-claro)',
                width: 100,
              }}
            >
              Frecuencia
            </th>
          </tr>
        </thead>
        <tbody>
          {list.map((row, i) => {
            const normalized = maxValue > 0 ? row.frecuencia / maxValue : 0;
            const bg = getHeatmapColor(normalized);
            return (
              <tr key={i} style={{ borderBottom: '1px solid var(--color-borde-claro)' }}>
                <td style={{ padding: '0.5rem 0.75rem' }}>{sanitizeForDisplay(row.nombre) || '—'}</td>
                <td
                  style={{
                    padding: '0.5rem 0.75rem',
                    textAlign: 'right',
                    fontWeight: 600,
                    backgroundColor: bg,
                    color: normalized > 0.6 ? '#fff' : 'var(--color-texto-primario)',
                    borderRadius: 4,
                  }}
                >
                  {row.frecuencia}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
