import { useState, useEffect, useCallback } from 'react';
import { useCurrentDoctorId } from '../../hooks/useCurrentDoctorId';
import { getNotificacionesDoctor, marcarNotificacionLeida, archivarNotificacion } from '../../api/notificaciones';
import { connect, on, off } from '../../api/socket';
import { useAuthStore } from '../../stores/authStore';
import { STORAGE_KEYS } from '../../utils/constants';
import { PageHeader } from '../../components/shared';
import { Card, Button, LoadingSpinner, EmptyState, Badge, Input, Select } from '../../components/ui';
import DetalleNotificacionModal from '../../components/doctor/DetalleNotificacionModal';
import { formatDateTime } from '../../utils/format';
import { sanitizeForDisplay } from '../../utils/sanitize';
import { useOnboardingPageReady } from '../../onboarding/useOnboardingPageReady';

const TIPO_LABELS = {
  alerta_signos_vitales: 'Signos vitales',
  solicitud_reprogramacion: 'Reprogramación',
  nuevo_mensaje: 'Mensaje',
  cita_proxima: 'Cita próxima',
  cita_cancelada: 'Cita cancelada',
  cita_actualizada: 'Cita actualizada',
  cita_reprogramada: 'Cita reprogramada',
  paciente_registro_signos: 'Registro signos',
};

const TIPO_OPCIONES = [
  { value: '', label: 'Todos los tipos' },
  ...Object.entries(TIPO_LABELS).map(([value, label]) => ({ value, label })),
];

const ESTADO_OPCIONES = [
  { value: '', label: 'Todos' },
  { value: 'enviada', label: 'Enviada' },
  { value: 'leida', label: 'Leída' },
  { value: 'archivada', label: 'Archivada' },
];

export default function NotificacionesDoctor() {
  const { idDoctor, loading: loadingDoctor, error: errorDoctor } = useCurrentDoctorId();
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [filtroSearch, setFiltroSearch] = useState('');
  const [incluirTodos, setIncluirTodos] = useState(false);
  const [actingId, setActingId] = useState(null);
  const [detalleNotificacion, setDetalleNotificacion] = useState(null);

  const notificacionesListas = !loadingDoctor && (!idDoctor ? true : !loading);
  useOnboardingPageReady(notificacionesListas);

  const load = useCallback(async () => {
    if (!idDoctor) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getNotificacionesDoctor(idDoctor, {
        limit: 50,
        incluir_todos: incluirTodos,
        tipo: filtroTipo || undefined,
        estado: filtroEstado || undefined,
        fecha_desde: filtroFechaDesde || undefined,
        fecha_hasta: filtroFechaHasta || undefined,
        search: filtroSearch?.trim() || undefined,
      });
      setList(res.notificaciones ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Error al cargar notificaciones');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [idDoctor, incluirTodos, filtroTipo, filtroEstado, filtroFechaDesde, filtroFechaHasta, filtroSearch]);

  useEffect(() => {
    load();
  }, [load]);

  // Tiempo real: actualizar notificaciones cuando llega una nueva
  const token = useAuthStore((s) => s.token ?? (typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null));
  useEffect(() => {
    if (!token || !idDoctor) return;
    connect(token);
    on('notificacion_doctor', load);
    return () => off('notificacion_doctor', load);
  }, [token, idDoctor, load]);

  const handleMarcarLeida = async (notif) => {
    const id = notif.id_notificacion ?? notif.id;
    if (!id || !idDoctor) return;
    setActingId(id);
    try {
      await marcarNotificacionLeida(idDoctor, id);
      load();
    } catch {
      setActingId(null);
    } finally {
      setActingId(null);
    }
  };

  const handleArchivar = async (notif) => {
    const id = notif.id_notificacion ?? notif.id;
    if (!id || !idDoctor) return;
    setActingId(id);
    try {
      await archivarNotificacion(idDoctor, id);
      load();
    } catch {
      setActingId(null);
    } finally {
      setActingId(null);
    }
  };

  const handleMarcarLeidaYCerrarDetalle = async (notif) => {
    await handleMarcarLeida(notif);
    setDetalleNotificacion(null);
  };

  const handleArchivarYCerrarDetalle = async (notif) => {
    await handleArchivar(notif);
    setDetalleNotificacion(null);
  };

  if (loadingDoctor || errorDoctor) {
    return (
      <div>
        <PageHeader title="Notificaciones" showBack backTo="/" />
        {errorDoctor ? <p style={{ color: 'var(--color-error)' }}>{errorDoctor}</p> : <LoadingSpinner />}
      </div>
    );
  }

  if (!idDoctor) {
    return (
      <div>
        <PageHeader title="Notificaciones" showBack backTo="/" />
        <p style={{ color: 'var(--color-texto-secundario)' }}>Solo los doctores pueden ver notificaciones.</p>
      </div>
    );
  }

  return (
    <div data-tour="section-notificaciones-root">
      <PageHeader title="Notificaciones" showBack backTo="/" />
      <div data-tour="section-notificaciones-filters" style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 180 }}>
          <Select label="Tipo" value={filtroTipo} onChange={(v) => setFiltroTipo(v ?? '')} options={TIPO_OPCIONES} placeholder="Todos" />
        </div>
        <div style={{ minWidth: 140 }}>
          <Select label="Estado" value={filtroEstado} onChange={(v) => setFiltroEstado(v ?? '')} options={ESTADO_OPCIONES} placeholder="Todos" />
        </div>
        <Input label="Desde" type="date" value={filtroFechaDesde} onChange={(e) => setFiltroFechaDesde(e.target.value)} style={{ marginBottom: 0, minWidth: 140 }} />
        <Input label="Hasta" type="date" value={filtroFechaHasta} onChange={(e) => setFiltroFechaHasta(e.target.value)} style={{ marginBottom: 0, minWidth: 140 }} />
        <Input label="Buscar" value={filtroSearch} onChange={(e) => setFiltroSearch(e.target.value)} placeholder="Texto en título o mensaje" style={{ marginBottom: 0, minWidth: 200 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.75rem' }}>
          <input type="checkbox" checked={incluirTodos} onChange={(e) => setIncluirTodos(e.target.checked)} />
          Incluir archivadas
        </label>
      </div>
      {error && (
        <p style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>
          {error} <button type="button" onClick={load} style={{ marginLeft: '0.5rem', textDecoration: 'underline' }}>Reintentar</button>
        </p>
      )}
      {loading ? (
        <LoadingSpinner />
      ) : list.length === 0 ? (
        <EmptyState message="No hay notificaciones" />
      ) : (
        <div data-tour="section-notificaciones-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {list.map((n) => {
            const id = n.id_notificacion ?? n.id;
            const isLeida = (n.estado || '').toLowerCase() === 'leida';
            return (
              <Card
                key={id}
                style={{ opacity: isLeida ? 0.9 : 1, cursor: 'pointer' }}
                onClick={() => setDetalleNotificacion(n)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <Badge variant="neutral">{TIPO_LABELS[n.tipo] || n.tipo || '—'}</Badge>
                      {!isLeida && <Badge variant="primary">Nueva</Badge>}
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-texto-secundario)' }}>{formatDateTime(n.fecha_envio)}</span>
                    </div>
                    <strong style={{ display: 'block', marginBottom: '0.25rem' }}>{sanitizeForDisplay(n.titulo) || 'Sin título'}</strong>
                    <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-texto-secundario)', whiteSpace: 'pre-wrap' }}>{sanitizeForDisplay(n.mensaje) || '—'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                    {!isLeida && (
                      <Button variant="outline" disabled={actingId === id} onClick={() => handleMarcarLeida(n)}>
                        Marcar leída
                      </Button>
                    )}
                    <Button variant="outline" disabled={actingId === id} onClick={() => handleArchivar(n)}>
                      Archivar
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {!loading && list.length > 0 && total > list.length && (
        <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--color-texto-secundario)' }}>Total: {total}</p>
      )}

      <DetalleNotificacionModal
        open={detalleNotificacion != null}
        onClose={() => setDetalleNotificacion(null)}
        notificacion={detalleNotificacion}
        onMarcarLeida={handleMarcarLeidaYCerrarDetalle}
        onArchivar={handleArchivarYCerrarDetalle}
        actingId={actingId}
      />
    </div>
  );
}
