import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { getAdminSummary, getDoctorSummary } from '../api/dashboard';
import { Card, Button } from '../components/ui';
import { LoadingSpinner } from '../components/ui';
import { sanitizeForDisplay } from '../utils/sanitize';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

/* Iconos para tarjetas de estadísticas (estilo Doct) */
function IconUsers() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function IconTrendingUp() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}
function IconMessageCircle() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}
function IconFileText() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconAlertTriangle() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function StatCard({ icon: Icon, label, value, sublabel }) {
  return (
    <div className="saas-stat-card">
      <div className="saas-stat-icon" aria-hidden="true">
        <Icon />
      </div>
      <div className="saas-stat-value">{value ?? '—'}</div>
      <div className="saas-stat-label">{label}</div>
      {sublabel != null && sublabel !== '' && <div className="saas-stat-sublabel">{sublabel}</div>}
    </div>
  );
}

const CHART_COLORS = {
  primary: '#006657',
  secondary: '#BC955C',
  success: '#0d9488',
  warning: '#d97706',
  error: '#dc2626',
  neutral: '#64748b',
};

export default function Dashboard() {
  const getDisplayName = useAuthStore((s) => s.getDisplayName);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = isAdmin()
        ? await getAdminSummary()
        : await getDoctorSummary();
      setSummary(data);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Error al cargar el resumen');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="saas-page">
        <div className="saas-welcome">
          <h1>Inicio</h1>
          <p>Cargando resumen…</p>
        </div>
        <div style={{ padding: 'var(--space-12)', display: 'flex', justifyContent: 'center' }}>
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  const m = summary?.metrics ?? {};
  const rolLabel = isAdmin() ? 'Administrador' : 'Doctor';

  return (
    <div className="saas-page">
      <section className="saas-welcome" aria-label="Bienvenida">
        <h1>Bienvenido, {sanitizeForDisplay(getDisplayName())}</h1>
        <p>Rol: {rolLabel}</p>
      </section>

      {error && (
        <Card
          className="saas-alert-card"
          style={{ marginBottom: 'var(--space-6)', backgroundColor: 'var(--color-fondo-error-claro)', borderColor: 'var(--color-error)' }}
        >
          <p style={{ margin: 0, color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <IconAlertTriangle />
            {error}
          </p>
          <Button variant="outline" type="button" style={{ marginTop: 'var(--space-3)' }} onClick={load}>
            Reintentar
          </Button>
        </Card>
      )}

      {!error && summary && (
        <>
          <section className="saas-stats" aria-label="Estadísticas">
            {isAdmin() ? (
              <>
                <StatCard icon={IconUsers} label="Total pacientes" value={m.totalPacientes} />
                <StatCard icon={IconUser} label="Total doctores" value={m.totalDoctores} />
                <StatCard
                  icon={IconCalendar}
                  label="Citas hoy"
                  value={m.citasHoy?.total != null ? m.citasHoy.total : m.citasHoy}
                  sublabel={m.citasHoy?.completadas != null ? `Completadas: ${m.citasHoy.completadas}` : ''}
                />
                <StatCard
                  icon={IconTrendingUp}
                  label="Tasa de asistencia"
                  value={m.tasaAsistencia?.tasa_asistencia != null ? `${Number(m.tasaAsistencia.tasa_asistencia).toFixed(1)}%` : (m.tasaAsistencia ?? '—')}
                />
              </>
            ) : (
              <>
                <StatCard icon={IconCalendar} label="Citas hoy" value={m.citasHoy} />
                <StatCard icon={IconUsers} label="Pacientes asignados" value={m.pacientesAsignados} />
                <StatCard icon={IconMessageCircle} label="Mensajes pendientes" value={m.mensajesPendientes} />
                <StatCard icon={IconCalendar} label="Próximas citas" value={m.proximasCitas} />
              </>
            )}
          </section>

          {isAdmin() && Array.isArray(summary.alertas) && summary.alertas.length > 0 && (
            <section className="saas-section" aria-labelledby="alertas-title">
              <Card style={{ marginBottom: 0 }}>
                <h2 id="alertas-title" className="section-title">Alertas recientes</h2>
                <ul style={{ margin: 0, paddingLeft: 'var(--space-5)', color: 'var(--color-texto-primario)' }}>
                  {summary.alertas.slice(0, 5).map((a, i) => (
                    <li key={i}>{sanitizeForDisplay(a.descripcion ?? a.mensaje ?? JSON.stringify(a))}</li>
                  ))}
                </ul>
              </Card>
            </section>
          )}

          {!isAdmin() && Array.isArray(summary.alertas?.signosVitalesCriticos) && summary.alertas.signosVitalesCriticos.length > 0 && (
            <section className="saas-section" aria-labelledby="signos-criticos-title">
              <Card className="saas-alert-card" style={{ marginBottom: 0, borderLeft: '4px solid var(--color-error)' }}>
                <h2 id="signos-criticos-title" style={{ fontSize: 'var(--text-lg)', margin: '0 0 var(--space-3)', color: 'var(--color-error)', fontWeight: 'var(--font-semibold)' }}>
                  Signos vitales críticos
                </h2>
                <ul style={{ margin: 0, paddingLeft: 'var(--space-5)' }}>
                  {summary.alertas.signosVitalesCriticos.slice(0, 5).map((a) => (
                    <li key={a.id_paciente}>
                      {sanitizeForDisplay(a.paciente)} — {a.tipo_alerta ?? 'Alerta'}
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          )}
        </>
      )}

      {!error && summary && (
        <section className="saas-section" aria-labelledby="graficos-title">
          <h2 id="graficos-title" className="saas-section-title">Gráficos y métricas</h2>
          <div className="saas-charts-grid">
            {isAdmin() ? (
              <>
                {Array.isArray(summary.chartData?.citasUltimos7Dias) && summary.chartData.citasUltimos7Dias.length > 0 && (
                  <Card className="saas-chart-card">
                    <h3 className="saas-chart-title">Citas últimos 7 días</h3>
                    <div className="saas-chart-inner">
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={summary.chartData.citasUltimos7Dias} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-borde, #e2e8f0)" />
                          <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="citas" name="Citas" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}
                {Array.isArray(summary.chartData?.pacientesNuevos) && summary.chartData.pacientesNuevos.length > 0 && (
                  <Card className="saas-chart-card">
                    <h3 className="saas-chart-title">Pacientes nuevos (últimos 7 días)</h3>
                    <div className="saas-chart-inner">
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={summary.chartData.pacientesNuevos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-borde, #e2e8f0)" />
                          <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="pacientes" name="Pacientes" fill={CHART_COLORS.secondary} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}
                {summary.charts?.citasPorEstado && (() => {
                  const pieData = Object.entries(summary.charts.citasPorEstado)
                    .filter(([, v]) => Number(v) > 0)
                    .map(([name, value]) => ({ name, value: Number(value) }));
                  const pieColors = [CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.error, CHART_COLORS.neutral, CHART_COLORS.secondary];
                  if (pieData.length === 0) return null;
                  return (
                    <Card className="saas-chart-card" key="citas-estado">
                      <h3 className="saas-chart-title">Citas por estado</h3>
                      <div className="saas-chart-inner">
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                            <Pie
                              data={pieData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="45%"
                              outerRadius={65}
                              label={false}
                            >
                              {pieData.map((_, i) => (
                                <Cell key={i} fill={pieColors[i % pieColors.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  );
                })()}
                {Array.isArray(summary.charts?.doctoresActivos) && summary.charts.doctoresActivos.length > 0 && (
                  <Card className="saas-chart-card">
                    <h3 className="saas-chart-title">Doctores más activos (por citas)</h3>
                    <div className="saas-chart-inner">
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart
                          data={summary.charts.doctoresActivos}
                          layout="vertical"
                          margin={{ top: 8, right: 8, left: 60, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-borde, #e2e8f0)" />
                          <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                          <YAxis type="category" dataKey="nombre" width={55} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="total_citas" name="Citas" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}
              </>
            ) : (
              Array.isArray(summary.chartData?.citasUltimos7Dias) &&
              summary.chartData.citasUltimos7Dias.length > 0 && (
                <Card className="saas-chart-card">
                  <h3 className="saas-chart-title">Mis citas últimos 7 días</h3>
                  <div className="saas-chart-inner">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={summary.chartData.citasUltimos7Dias} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-borde, #e2e8f0)" />
                        <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="citas" name="Citas" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )
            )}
          </div>
        </section>
      )}
    </div>
  );
}
