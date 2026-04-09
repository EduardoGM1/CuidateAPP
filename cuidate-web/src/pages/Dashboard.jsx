import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { getAdminSummary, getDoctorSummary } from '../api/dashboard';
import { getNotificacionesDoctor, marcarNotificacionLeida } from '../api/notificaciones';
import { getCitaById } from '../api/citas';
import { connect, on, off } from '../api/socket';
import { STORAGE_KEYS } from '../utils/constants';
import { useCurrentDoctorId } from '../hooks/useCurrentDoctorId';
import { formatDateWithWeekday, formatTime } from '../utils/format';
import { sanitizeForDisplay, displayText } from '../utils/sanitize';
import AlertDetailModal from '../components/dashboard/AlertDetailModal';
import AdminAlertDetailModal from '../components/dashboard/AdminAlertDetailModal';
import DetalleNotificacionModal from '../components/doctor/DetalleNotificacionModal';
import DetalleCitaModal from '../components/pacientes/DetalleCitaModal';
import StatCard, { IconUsers, IconUser, IconCalendar, IconTrendingUp, IconMessageCircle, IconAlertTriangle } from '../components/dashboard/StatCard';
import { Card, Button } from '../components/ui';
import { LoadingSpinner } from '../components/ui';
import { CHART_COLORS } from '../components/reportes/chartConfig';
import { useOnboardingPageReady } from '../onboarding/useOnboardingPageReady';
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

/** Unifica alertas admin (valoresCriticos, citasPerdidas, alertasAuditoria) en una lista con tipo y fecha para ordenar. */
function buildAlertasUnificadas(alertas) {
  if (!alertas) return [];
  const out = [];
  (alertas.valoresCriticos || []).forEach((a) => {
    out.push({ tipo: 'valor_critico', fecha: a.fecha_medicion ? new Date(a.fecha_medicion) : new Date(), ...a });
  });
  (alertas.citasPerdidas || []).forEach((a) => {
    out.push({ tipo: 'cita_perdida', fecha: a.fecha ? new Date(a.fecha) : new Date(), ...a });
  });
  (alertas.alertasAuditoria || []).forEach((a) => {
    out.push({ tipo: 'auditoria', fecha: a.fecha_creacion ? new Date(a.fecha_creacion) : new Date(), ...a });
  });
  out.sort((x, y) => (y.fecha && x.fecha ? y.fecha - x.fecha : 0));
  return out;
}

/** Descripción corta para un ítem de alerta unificada. */
function getAlertaDescripcion(item) {
  if (!item) return '—';
  if (item.tipo === 'valor_critico') return item.tipo_alerta || `${item.paciente ?? ''} - Signos críticos`.trim() || 'Valor crítico';
  if (item.tipo === 'cita_perdida') return `Cita perdida: ${item.paciente ?? 'Paciente'}`;
  if (item.tipo === 'auditoria') return item.descripcion || item.tipo_accion || 'Auditoría';
  return item.descripcion ?? item.mensaje ?? 'Alerta';
}

/** Gráfico de barras: citas por día (últimos 7 días). Un solo bloque reutilizable para admin y doctor. */
function ChartCitasUltimos7Dias({ data, title, height = 220 }) {
  if (!Array.isArray(data) || data.length === 0) return null;
  return (
    <Card className="saas-chart-card">
      <h3 className="saas-chart-title">{title}</h3>
      <div className="saas-chart-inner">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-borde-claro)" />
            <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="citas" name="Citas" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const getDisplayNameRaw = useAuthStore((s) => s.getDisplayName);
  const isAdminRaw = useAuthStore((s) => s.isAdmin);
  const getDisplayName = typeof getDisplayNameRaw === 'function' ? getDisplayNameRaw : () => '';
  const isAdmin = typeof isAdminRaw === 'function' ? isAdminRaw : () => false;
  const { idDoctor } = useCurrentDoctorId();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [alertaSeleccionada, setAlertaSeleccionada] = useState(null);
  const [notifSeleccionada, setNotifSeleccionada] = useState(null);
  const [notificaciones, setNotificaciones] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [actingId, setActingId] = useState(null);
  const [citaDetalleId, setCitaDetalleId] = useState(null);
  const [citaDetalle, setCitaDetalle] = useState(null);
  const [citaDetalleLoading, setCitaDetalleLoading] = useState(false);

  useOnboardingPageReady(!loading);

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

  const loadNotificaciones = useCallback(async () => {
    if (!idDoctor) return;
    setNotifLoading(true);
    try {
      const res = await getNotificacionesDoctor(idDoctor, { limit: 5, estado: 'enviada' });
      setNotificaciones(res.notificaciones ?? []);
    } catch {
      setNotificaciones([]);
    } finally {
      setNotifLoading(false);
    }
  }, [idDoctor]);

  useEffect(() => {
    if (idDoctor && !isAdmin()) loadNotificaciones();
  }, [idDoctor, isAdmin, loadNotificaciones]);

  const handleMarcarNotifLeida = useCallback(async (notif) => {
    const id = notif.id_notificacion ?? notif.id;
    if (!id || !idDoctor) return;
    setActingId(id);
    try {
      await marcarNotificacionLeida(idDoctor, id);
      loadNotificaciones();
    } finally {
      setActingId(null);
    }
  }, [idDoctor, loadNotificaciones]);

  const openDetalleCita = useCallback((id) => {
    if (!id) return;
    setCitaDetalleId(id);
    setCitaDetalle(null);
    setCitaDetalleLoading(true);
    getCitaById(id)
      .then((data) => setCitaDetalle(data))
      .catch(() => setCitaDetalle(null))
      .finally(() => setCitaDetalleLoading(false));
  }, []);
  const closeDetalleCita = useCallback(() => {
    setCitaDetalleId(null);
    setCitaDetalle(null);
  }, []);

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
    if (idDoctor) on('notificacion_doctor', loadNotificaciones);
    return () => {
      off('patient_created', load);
      off('patient_assigned', load);
      off('cita_creada', load);
      off('cita_actualizada', load);
      off('cita_reprogramada', load);
      off('doctor_created', load);
      if (idDoctor) off('notificacion_doctor', loadNotificaciones);
    };
  }, [token, load, idDoctor, loadNotificaciones]);

  if (loading) {
    return (
      <div className="saas-page" data-tour="section-dashboard-root">
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
    <div className="saas-page" data-tour="section-dashboard-root">
      <section className="saas-welcome" aria-label="Bienvenida" data-tour="section-dashboard-welcome">
        <h1>Bienvenido, {sanitizeForDisplay(getDisplayName())}</h1>
        <p>Rol: {rolLabel} · {formatDateWithWeekday(new Date())}</p>
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
          <section className="saas-stats" aria-label="Estadísticas" data-tour="section-dashboard-stats">
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
                {(() => {
                  const alertasUnif = buildAlertasUnificadas(summary.alertas);
                  const pendientes = alertasUnif.length;
                  return (
                    <StatCard
                      icon={IconAlertTriangle}
                      label="Alertas pendientes"
                      value={pendientes}
                      sublabel={pendientes > 0 ? 'Revisar ahora' : ''}
                    />
                  );
                })()}
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

          {isAdmin() && (() => {
            const alertasUnif = buildAlertasUnificadas(summary.alertas);
            const hayCriticas = alertasUnif.some((a) => a.tipo === 'valor_critico' || a.tipo === 'cita_perdida');
            return (
              <>
                {hayCriticas && (
                  <Card className="saas-alert-card" style={{ marginBottom: 'var(--space-4)', borderLeft: '4px solid var(--color-error)', backgroundColor: 'var(--color-fondo-error-claro)' }}>
                    <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <IconAlertTriangle />
                      <span>Hay alertas críticas (valores fuera de rango o citas perdidas).</span>
                      <Link to="/admin/auditoria" style={{ marginLeft: 'auto', color: 'var(--color-primario)', textDecoration: 'underline' }}>Ver auditoría</Link>
                    </p>
                  </Card>
                )}
                {alertasUnif.length > 0 && (
                  <section className="saas-section" aria-labelledby="alertas-title">
                    <Card style={{ marginBottom: 0 }}>
                      <h2 id="alertas-title" className="section-title">Notificaciones importantes</h2>
                      <ul style={{ margin: 0, paddingLeft: 'var(--space-5)', color: 'var(--color-texto-primario)' }}>
                        {alertasUnif.slice(0, 10).map((a, i) => (
                          <li key={`${a.tipo}-${i}`}>
                            <button
                              type="button"
                              onClick={() => setAlertaSeleccionada(a)}
                              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', color: 'inherit', textDecoration: 'underline' }}
                            >
                              {displayText(getAlertaDescripcion(a))}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  </section>
                )}
                <AdminAlertDetailModal open={!!alertaSeleccionada && isAdmin()} onClose={() => setAlertaSeleccionada(null)} alerta={alertaSeleccionada} />
              </>
            );
          })()}

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

          {!error && summary && isAdmin() && (
            <section className="saas-section" aria-labelledby="graficos-title">
              <h2 id="graficos-title" className="saas-section-title">Gráficos y métricas</h2>
              <div className="saas-charts-grid">
                {(
                  <>
                    <ChartCitasUltimos7Dias data={summary.chartData?.citasUltimos7Dias} title="Citas últimos 7 días" />
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
                )}
              </div>
            </section>
          )}

          {!isAdmin() && (
            <>
              {Array.isArray(summary.citasHoy) && summary.citasHoy.length > 0 && (
                <section className="saas-section" aria-labelledby="citas-hoy-title">
                  <Card style={{ marginBottom: 'var(--space-4)' }}>
                    <h2 id="citas-hoy-title" className="section-title">Citas de hoy</h2>
                    <ul style={{ margin: 0, paddingLeft: 'var(--space-5)' }}>
                      {summary.citasHoy.slice(0, 5).map((c) => (
                        <li key={c.id} style={{ marginBottom: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => openDetalleCita(c.id)}
                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', color: 'inherit', textDecoration: 'underline', font: 'inherit', width: '100%' }}
                          >
                            <strong>{sanitizeForDisplay(c.paciente)}</strong> · {formatTime(c.hora)} · {sanitizeForDisplay(c.motivo)} · {c.estado ?? '—'}
                          </button>
                        </li>
                      ))}
                    </ul>
                    <p style={{ margin: '0.75rem 0 0', fontSize: '0.9rem' }}>
                      <Link to="/citas">Ver todas</Link>
                    </p>
                  </Card>
                </section>
              )}
              {Array.isArray(summary.chartData?.citasUltimos7Dias) && summary.chartData.citasUltimos7Dias.length > 0 && (
                <section className="saas-section" aria-labelledby="graficos-doctor-title">
                  <h2 id="graficos-doctor-title" className="saas-section-title">Gráficos y métricas</h2>
                  <div className="saas-charts-grid">
                    <ChartCitasUltimos7Dias data={summary.chartData.citasUltimos7Dias} title="Mis citas últimos 7 días" />
                  </div>
                </section>
              )}
              <DetalleCitaModal
                open={!!citaDetalleId}
                onClose={closeDetalleCita}
                citaDetalle={citaDetalle}
                loading={citaDetalleLoading}
                onVerEnPagina={(idCita) => { closeDetalleCita(); navigate(`/citas/${idCita}`); }}
              />
              <section className="saas-section" aria-labelledby="notif-doctor-title">
                <Card style={{ marginBottom: 0 }}>
                  <h2 id="notif-doctor-title" className="section-title">Notificaciones</h2>
                  {notifLoading ? (
                    <LoadingSpinner />
                  ) : notificaciones.length === 0 ? (
                    <p style={{ margin: 0, color: 'var(--color-texto-secundario)' }}>No hay notificaciones nuevas.</p>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: 'var(--space-5)' }}>
                      {notificaciones.map((n) => (
                        <li key={n.id_notificacion ?? n.id} style={{ marginBottom: '0.35rem' }}>
                          <button
                            type="button"
                            onClick={() => setNotifSeleccionada(n)}
                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', color: 'inherit', textDecoration: 'underline' }}
                          >
                            {sanitizeForDisplay(n.titulo ?? n.mensaje ?? 'Notificación')}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </section>
              <DetalleNotificacionModal
                open={!!notifSeleccionada}
                onClose={() => setNotifSeleccionada(null)}
                notificacion={notifSeleccionada}
                onMarcarLeida={handleMarcarNotifLeida}
                actingId={actingId}
              />
            </>
          )}

          {!isAdmin() && alertaSeleccionada && (
            <AlertDetailModal open onClose={() => setAlertaSeleccionada(null)} alerta={alertaSeleccionada} />
          )}
        </>
      )}
    </div>
  );
}
