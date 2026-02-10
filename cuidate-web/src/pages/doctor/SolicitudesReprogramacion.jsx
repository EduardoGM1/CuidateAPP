import { useState, useEffect, useCallback } from 'react';
import { getSolicitudesReprogramacion, responderSolicitudReprogramacion } from '../../api/solicitudesReprogramacion';
import { PageHeader } from '../../components/shared';
import { Card, Button, LoadingSpinner, EmptyState, Badge } from '../../components/ui';
import { formatDateTime, formatDate } from '../../utils/format';
import { sanitizeForDisplay } from '../../utils/sanitize';

const ESTADO_LABELS = {
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  cancelada: 'Cancelada',
};

export default function SolicitudesReprogramacion() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [acting, setActing] = useState(null);
  const [submitError, setSubmitError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = filtroEstado ? { estado: filtroEstado } : {};
      const res = await getSolicitudesReprogramacion(params);
      setList(res.solicitudes ?? []);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Error al cargar solicitudes');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [filtroEstado]);

  useEffect(() => {
    load();
  }, [load]);

  const handleResponder = async (solicitud, accion) => {
    const idCita = solicitud.id_cita;
    const idSolicitud = solicitud.id_solicitud;
    if (!idCita || !idSolicitud) return;
    setSubmitError('');
    setActing(idSolicitud);
    try {
      await responderSolicitudReprogramacion(idCita, idSolicitud, { accion });
      load();
    } catch (err) {
      setSubmitError(err?.response?.data?.error || err?.message || 'Error al procesar');
    } finally {
      setActing(null);
    }
  };

  return (
    <div>
      <PageHeader title="Solicitudes de reprogramación" showBack backTo="/" />
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ marginRight: '0.5rem', fontWeight: 600 }}>Estado:</label>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-borde-claro)' }}
        >
          <option value="">Todos</option>
          <option value="pendiente">Pendientes</option>
          <option value="aprobada">Aprobadas</option>
          <option value="rechazada">Rechazadas</option>
        </select>
      </div>
      {submitError && <p style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>{submitError}</p>}
      {error && (
        <p style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>
          {error} <button type="button" onClick={load} style={{ marginLeft: '0.5rem', textDecoration: 'underline' }}>Reintentar</button>
        </p>
      )}
      {loading ? (
        <LoadingSpinner />
      ) : list.length === 0 ? (
        <EmptyState message="No hay solicitudes de reprogramación" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {list.map((s) => {
            const isPendiente = (s.estado || '').toLowerCase() === 'pendiente';
            return (
              <Card key={s.id_solicitud}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ marginBottom: '0.35rem' }}>
                      <strong>{sanitizeForDisplay(s.paciente_nombre) || 'Paciente'}</strong>
                      {s.doctor_nombre && <span style={{ color: 'var(--color-texto-secundario)', marginLeft: '0.5rem' }}> · Dr. {sanitizeForDisplay(s.doctor_nombre)}</span>}
                    </div>
                    <p style={{ margin: '0.25rem 0', fontSize: '0.95rem' }}>
                      Cita original: {formatDateTime(s.fecha_cita_original)} — Nueva fecha solicitada: {formatDate(s.fecha_solicitada) || '—'}
                    </p>
                    {s.motivo && <p style={{ margin: '0.25rem 0', fontSize: '0.9rem', color: 'var(--color-texto-secundario)' }}>Motivo: {sanitizeForDisplay(s.motivo)}</p>}
                    <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: 'var(--color-texto-secundario)' }}>{formatDateTime(s.fecha_creacion)}</p>
                    <Badge variant={s.estado === 'aprobada' ? 'success' : s.estado === 'rechazada' ? 'error' : 'warning'}>{ESTADO_LABELS[s.estado] || s.estado}</Badge>
                  </div>
                  {isPendiente && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button variant="primary" disabled={acting === s.id_solicitud} onClick={() => handleResponder(s, 'aprobar')}>Aprobar</Button>
                      <Button variant="danger" disabled={acting === s.id_solicitud} onClick={() => handleResponder(s, 'rechazar')}>Rechazar</Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
