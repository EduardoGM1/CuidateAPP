import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { formatDateTime } from '../../../utils/format';
import { computeTrend, trendArrow, trendAriaLabel } from '../../../utils/evolucionSignosUtils';

const STRIP_COLORS = { peso: '#004B87', glucosa: '#00695c', pa: '#c62828' };

function miniSeries(signos, key, transform = (v) => v) {
  const sorted = [...(signos || [])].sort(
    (a, b) => new Date(a.fecha_medicion || a.fecha_registro) - new Date(b.fecha_medicion || b.fecha_registro)
  );
  return sorted
    .filter((s) => s[key] != null && s[key] !== '')
    .slice(-14)
    .map((s, i) => ({
      i,
      v: transform(Number(s[key])),
      t: formatDateTime(s.fecha_medicion || s.fecha_registro),
    }));
}

/**
 * KPIs compactos + mini sparklines; enlace a la vista de evolución a pantalla completa.
 */
export default function PatientVitalsSummaryStrip({ pacienteId, signos = [], loading }) {
  if (!pacienteId) return null;

  const pesoS = miniSeries(signos, 'peso_kg');
  const glucS = miniSeries(signos, 'glucosa_mg_dl');
  const paS = miniSeries(signos, 'presion_sistolica');

  const lastPeso = pesoS.length ? pesoS[pesoS.length - 1].v : null;
  const lastGluc = glucS.length ? glucS[glucS.length - 1].v : null;
  const lastPa = paS.length ? paS[paS.length - 1].v : null;

  const pesoTrend = useMemo(() => {
    const sorted = [...(signos || [])].sort(
      (a, b) => new Date(a.fecha_medicion || a.fecha_registro) - new Date(b.fecha_medicion || b.fecha_registro)
    );
    const serie = sorted.filter((s) => s.peso_kg != null && s.peso_kg !== '').map((s) => ({ peso_kg: s.peso_kg }));
    return computeTrend(serie, 'peso_kg');
  }, [signos]);

  const hasAny = pesoS.length > 0 || glucS.length > 0 || paS.length > 0;

  return (
    <div
      style={{
        marginTop: 'var(--space-4)',
        padding: 'var(--space-4)',
        background: 'var(--color-fondo-card)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--color-borde-claro)',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
        <div>
          <h2 style={{ margin: '0 0 0.35rem', fontSize: 'var(--text-base)', fontWeight: 600 }}>Resumen vitales</h2>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-texto-secundario)' }}>
            Tendencias recientes (últimos registros cargados). El detalle completo está en Evolución.
          </p>
        </div>
        <Link
          to={`/pacientes/${pacienteId}/evolucion`}
          style={{
            fontWeight: 600,
            color: 'var(--color-primario)',
            whiteSpace: 'nowrap',
            padding: '0.35rem 0',
          }}
        >
          Abrir evolución a pantalla completa →
        </Link>
      </div>

      {loading && <p style={{ marginTop: '1rem', fontSize: 'var(--text-sm)', color: 'var(--color-texto-secundario)' }}>Cargando…</p>}

      {!loading && !hasAny && (
        <p style={{ marginTop: '1rem', fontSize: 'var(--text-sm)', color: 'var(--color-texto-secundario)' }}>
          Sin mediciones recientes para mini gráficos. Registra signos vitales o abre la vista de evolución.
        </p>
      )}

      {!loading && hasAny && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-4)',
            marginTop: 'var(--space-4)',
          }}
        >
          {pesoS.length > 0 && (
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-texto-secundario)' }}>Peso (kg)</div>
              <div
                style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}
                aria-label={trendAriaLabel(pesoTrend.trend, 'Peso')}
              >
                {lastPeso != null ? `${lastPeso} ${trendArrow(pesoTrend.trend)}` : '—'}
              </div>
              <div style={{ width: '100%', height: 52, marginTop: 6 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={pesoS} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                    <XAxis dataKey="i" hide />
                    <YAxis domain={['auto', 'auto']} hide />
                    <Line type="monotone" dataKey="v" stroke={STRIP_COLORS.peso} strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {glucS.length > 0 && (
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-texto-secundario)' }}>Glucosa (mg/dL)</div>
              <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{lastGluc != null ? lastGluc : '—'}</div>
              <div style={{ width: '100%', height: 52, marginTop: 6 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={glucS} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                    <XAxis dataKey="i" hide />
                    <YAxis domain={['auto', 'auto']} hide />
                    <Line type="monotone" dataKey="v" stroke={STRIP_COLORS.glucosa} strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {paS.length > 0 && (
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-texto-secundario)' }}>PA sistólica</div>
              <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{lastPa != null ? `${lastPa} mmHg` : '—'}</div>
              <div style={{ width: '100%', height: 52, marginTop: 6 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={paS} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                    <XAxis dataKey="i" hide />
                    <YAxis domain={['auto', 'auto']} hide />
                    <Line type="monotone" dataKey="v" stroke={STRIP_COLORS.pa} strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
