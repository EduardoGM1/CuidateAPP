import { useState, useEffect, useCallback, useMemo } from 'react';
import { message } from 'antd';
import { useCurrentDoctorId } from '../../hooks/useCurrentDoctorId';
import { getNotificacionesDoctor, marcarNotificacionLeida, archivarNotificacion } from '../../api/notificaciones';
import { useSocketEvent } from '../../contexts/SocketContext';
import { PageHeader } from '../../components/shared';
import { Card, Button, LoadingSpinner, EmptyState, Badge, Input, Select, Modal } from '../../components/ui';
import DetalleNotificacionModal from '../../components/doctor/DetalleNotificacionModal';
import NotificacionEstadoBadge from '../../components/doctor/NotificacionEstadoBadge';
import {
  isNotificacionArchivada,
  isNotificacionNoLeida,
  sortNotificacionesConNoLeidasPrimero,
} from '../../utils/notificacionDisplay';
import { formatDateTime } from '../../utils/format';
import { sanitizeForDisplay } from '../../utils/sanitize';
import { useOnboardingPageReady } from '../../onboarding/useOnboardingPageReady';
import { useDoctorNavBadgesRefresh } from '../../contexts/DoctorNavBadgesContext';

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
  const { refreshDoctorNavBadges } = useDoctorNavBadgesRefresh();
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
  const [incluirTodosTipos, setIncluirTodosTipos] = useState(false);
  const [incluirArchivadas, setIncluirArchivadas] = useState(false);
  const [noLeidasApi, setNoLeidasApi] = useState(0);
  const [actingId, setActingId] = useState(null);
  const [detalleNotificacion, setDetalleNotificacion] = useState(null);
  const [confirmArchivar, setConfirmArchivar] = useState(null);

  const notificacionesListas = !loadingDoctor && (!idDoctor ? true : !loading);
  useOnboardingPageReady(notificacionesListas);

  const load = useCallback(async () => {
    if (!idDoctor) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getNotificacionesDoctor(idDoctor, {
        limit: 50,
        incluir_todos: incluirTodosTipos,
        incluir_archivadas: incluirArchivadas,
        tipo: filtroTipo || undefined,
        estado: filtroEstado || undefined,
        fecha_desde: filtroFechaDesde || undefined,
        fecha_hasta: filtroFechaHasta || undefined,
        search: filtroSearch?.trim() || undefined,
      });
      setList(res.notificaciones ?? []);
      setTotal(res.total ?? 0);
      setNoLeidasApi(res.no_leidas ?? 0);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Error al cargar notificaciones');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [idDoctor, incluirTodosTipos, incluirArchivadas, filtroTipo, filtroEstado, filtroFechaDesde, filtroFechaHasta, filtroSearch]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!idDoctor) return;
    void refreshDoctorNavBadges();
  }, [idDoctor, refreshDoctorNavBadges]);

  useSocketEvent('notificacion_doctor', load, Boolean(idDoctor));

  const handleMarcarLeida = async (notif) => {
    const id = notif.id_notificacion ?? notif.id;
    if (!id || !idDoctor) return;
    setActingId(id);
    try {
      await marcarNotificacionLeida(idDoctor, id);
      await load();
      await refreshDoctorNavBadges();
      message.success('Notificación marcada como leída');
    } catch (err) {
      message.error(err?.response?.data?.error || err?.message || 'No se pudo marcar como leída');
      setActingId(null);
    } finally {
      setActingId(null);
    }
  };

  const solicitarArchivar = (notif) => {
    if (!notif || isNotificacionArchivada(notif)) return;
    setConfirmArchivar(notif);
  };

  const handleArchivarConfirmado = async () => {
    const notif = confirmArchivar;
    const id = notif?.id_notificacion ?? notif?.id;
    if (!id || !idDoctor) return;
    setActingId(id);
    try {
      await archivarNotificacion(idDoctor, id);
      setConfirmArchivar(null);
      if (detalleNotificacion && (detalleNotificacion.id_notificacion ?? detalleNotificacion.id) === id) {
        setDetalleNotificacion(null);
      }
      await load();
      await refreshDoctorNavBadges();
      message.success('Notificación archivada');
    } catch (err) {
      message.error(err?.response?.data?.error || err?.message || 'No se pudo archivar la notificación');
    } finally {
      setActingId(null);
    }
  };

  const handleMarcarLeidaYCerrarDetalle = async (notif) => {
    await handleMarcarLeida(notif);
    setDetalleNotificacion(null);
  };

  const listOrdenada = useMemo(() => sortNotificacionesConNoLeidasPrimero(list), [list]);
  const cantidadNoLeidas = noLeidasApi;

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
          <input type="checkbox" checked={incluirTodosTipos} onChange={(e) => setIncluirTodosTipos(e.target.checked)} />
          Todos los tipos
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.75rem' }}>
          <input type="checkbox" checked={incluirArchivadas} onChange={(e) => setIncluirArchivadas(e.target.checked)} />
          Incluir archivadas
        </label>
      </div>
      {error && (
        <p style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>
          {error} <button type="button" onClick={load} style={{ marginLeft: '0.5rem', textDecoration: 'underline' }}>Reintentar</button>
        </p>
      )}
      {!loading && list.length > 0 && (
        <div className="notificaciones-leyenda" role="note">
          <span className="notificaciones-leyenda__item">
            <span className="notificacion-card__unread-dot" aria-hidden />
            Sin leer ({cantidadNoLeidas})
          </span>
          <span className="notificaciones-leyenda__item">
            <Badge variant="success">Leída</Badge>
          </span>
          <span className="notificaciones-leyenda__item">
            <Badge variant="neutral">Archivada</Badge>
          </span>
        </div>
      )}
      {loading ? (
        <LoadingSpinner />
      ) : list.length === 0 ? (
        <EmptyState message="No hay notificaciones" />
      ) : (
        <div data-tour="section-notificaciones-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {listOrdenada.map((n) => {
            const id = n.id_notificacion ?? n.id;
            const noLeida = isNotificacionNoLeida(n);
            const archivada = isNotificacionArchivada(n);
            return (
              <Card
                key={id}
                className={`notificacion-card ${noLeida ? 'notificacion-card--unread' : 'notificacion-card--read'}`}
                onClick={() => setDetalleNotificacion(n)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="notificacion-card__header">
                      {noLeida && <span className="notificacion-card__unread-dot" title="Sin leer" aria-hidden />}
                      <Badge variant="neutral">{TIPO_LABELS[n.tipo] || n.tipo || '—'}</Badge>
                      <NotificacionEstadoBadge notificacion={n} />
                      <span className="notificacion-card__fecha">{formatDateTime(n.fecha_envio)}</span>
                    </div>
                    <strong className="notificacion-card__title">{sanitizeForDisplay(n.titulo) || 'Sin título'}</strong>
                    <p className="notificacion-card__mensaje">{sanitizeForDisplay(n.mensaje) || '—'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                    {noLeida && (
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
        onArchivar={solicitarArchivar}
        actingId={actingId}
      />

      <Modal
        open={confirmArchivar != null}
        onClose={() => setConfirmArchivar(null)}
        title="Archivar notificación"
        okText="Sí, archivar"
        cancelText="Cancelar"
        onOk={handleArchivarConfirmado}
        confirmLoading={actingId != null}
        width={440}
      >
        <p style={{ margin: 0, color: 'var(--color-texto-secundario)' }}>
          ¿Deseas archivar esta notificación? Dejará de mostrarse en la lista principal (puedes verla activando
          &quot;Incluir archivadas&quot;).
        </p>
        {confirmArchivar && (
          <p style={{ margin: '0.75rem 0 0', fontWeight: 600 }}>
            {sanitizeForDisplay(confirmArchivar.titulo) || 'Sin título'}
          </p>
        )}
      </Modal>
    </div>
  );
}
