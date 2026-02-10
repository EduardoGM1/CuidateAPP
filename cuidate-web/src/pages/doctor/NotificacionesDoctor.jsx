import { useState, useEffect, useCallback } from 'react';
import { useCurrentDoctorId } from '../../hooks/useCurrentDoctorId';
import { getNotificacionesDoctor, marcarNotificacionLeida, archivarNotificacion } from '../../api/notificaciones';
import { PageHeader } from '../../components/shared';
import { Card, Button, LoadingSpinner, EmptyState, Badge } from '../../components/ui';
import { formatDateTime } from '../../utils/format';
import { sanitizeForDisplay } from '../../utils/sanitize';

const TIPO_LABELS = {
  alerta_signos_vitales: 'Signos vitales',
  solicitud_reprogramacion: 'Reprogramación',
  nuevo_mensaje: 'Mensaje',
  cita_proxima: 'Cita próxima',
  cita_cancelada: 'Cita cancelada',
};

export default function NotificacionesDoctor() {
  const { idDoctor, loading: loadingDoctor, error: errorDoctor } = useCurrentDoctorId();
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [incluirTodos, setIncluirTodos] = useState(false);
  const [actingId, setActingId] = useState(null);

  const load = useCallback(async () => {
    if (!idDoctor) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getNotificacionesDoctor(idDoctor, { limit: 50, incluir_todos: incluirTodos });
      setList(res.notificaciones ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Error al cargar notificaciones');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [idDoctor, incluirTodos]);

  useEffect(() => {
    load();
  }, [load]);

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
    <div>
      <PageHeader title="Notificaciones" showBack backTo="/" />
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={incluirTodos} onChange={(e) => setIncluirTodos(e.target.checked)} />
          Incluir todos los tipos
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {list.map((n) => {
            const id = n.id_notificacion ?? n.id;
            const isLeida = (n.estado || '').toLowerCase() === 'leida';
            return (
              <Card key={id} style={{ opacity: isLeida ? 0.9 : 1 }}>
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
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
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
    </div>
  );
}
