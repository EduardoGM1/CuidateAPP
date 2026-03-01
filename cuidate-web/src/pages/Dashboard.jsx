import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { getAdminSummary, getDoctorSummary } from '../api/dashboard';
import { connect, on, off } from '../api/socket';
import { STORAGE_KEYS } from '../utils/constants';
import { Card, Button } from '../components/ui';
import { LoadingSpinner } from '../components/ui';
import { sanitizeForDisplay } from '../utils/sanitize';
import AlertDetailModal from '../components/dashboard/AlertDetailModal';
import StatCard, { IconUsers, IconUser, IconCalendar, IconTrendingUp, IconMessageCircle, IconAlertTriangle } from '../components/dashboard/StatCard';
import { CHART_COLORS } from '../components/reportes/chartConfig';
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

export default function Dashboard() {
  const getDisplayName = useAuthStore((s) => s.getDisplayName);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [alertaSeleccionada, setAlertaSeleccionada] = useState(null);

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

  // Tiempo real: actualizar resumen al crear/actualizar pacientes, citas o doctores
  const token = useAuthStore((s) => s.token ?? (typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null));
  useEffect(() => {
    if (!token) return;
    connect(token);
    on('patient_created', load);
    on('patient_assigned', load);
    on('cita_creada', load);
    on('cita_actualizada', load);
    on('cita_reprogramada', load);
    on('doctor_created', load);
    return () => {
      off('patient_created', load);
      off('patient_assigned', load);
      off('cita_creada', load);
      off('cita_actualizada', load);
      off('cita_reprogramada', load);
      off('doctor_created', load);
    };
  }, [token, load]);

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
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => setAlertaSeleccionada(a)}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', color: 'inherit', textDecoration: 'underline' }}
                      >
                        {sanitizeForDisplay(a.descripcion ?? a.mensaje ?? JSON.stringify(a))}
                      </button>
                    </li>
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
                      <button
                        type="button"
                        onClick={() => setAlertaSeleccionada(a)}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', color: 'inherit', textDecoration: 'underline' }}
                      >
                        {sanitizeForDisplay(a.paciente)} — {a.tipo_alerta ?? 'Alerta'}
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          )}

          <AlertDetailModal open={!!alertaSeleccionada} onClose={() => setAlertaSeleccionada(null)} alerta={alertaSeleccionada} />
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
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-borde-claro)" />
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
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-borde-claro)" />
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
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-borde-claro)" />
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
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-borde-claro)" />
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
