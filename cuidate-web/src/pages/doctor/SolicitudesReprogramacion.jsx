import { useState, useEffect, useCallback } from 'react';
import { getSolicitudesReprogramacion, responderSolicitudReprogramacion } from '../../api/solicitudesReprogramacion';
import { useSocketEvent } from '../../contexts/SocketContext';
import { PageHeader } from '../../components/shared';
import { Card, Button, LoadingSpinner, EmptyState, Badge, Modal, Input } from '../../components/ui';
import { formatDateTime, formatDate } from '../../utils/format';
import { fechaCitaApiToDatetimeLocalInput, fechaCitaDatetimeLocalToApi } from '../../utils/fechaCita';

function textoCitaSolicitud(s) {
  const estado = (s.estado || '').toLowerCase();
  const fechaNueva = s.fecha_cita_reprogramada || s.fecha_efectiva_cita || s.fecha_cita_original;
  if (estado === 'aprobada' && fechaNueva) {
    return `Cita confirmada: ${formatDateTime(fechaNueva)}`;
  }
  if (estado === 'rechazada' || estado === 'cancelada') {
    const f = s.fecha_cita_original || s.fecha_efectiva_cita;
    return f ? `Cita (sin reprogramar): ${formatDateTime(f)}` : '—';
  }
  const fechaActual = s.fecha_cita_original || s.fecha_efectiva_cita;
  let linea = fechaActual ? `Cita a reprogramar: ${formatDateTime(fechaActual)}` : '';
  if (s.fecha_solicitada) {
    linea += `${linea ? ' — ' : ''}Fecha solicitada por el paciente: ${formatDate(s.fecha_solicitada)}`;
  }
  return linea || '—';
}
import { sanitizeForDisplay } from '../../utils/sanitize';
import { useOnboardingPageReady } from '../../onboarding/useOnboardingPageReady';

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
  const [aprobarModal, setAprobarModal] = useState(null);
  const [rechazarModal, setRechazarModal] = useState(null);

  useOnboardingPageReady(!loading);

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

  useSocketEvent('solicitud_reprogramacion', load);

  const handleResponder = async (solicitud, accion, extra = {}) => {
    const idCita = solicitud.id_cita;
    const idSolicitud = solicitud.id_solicitud;
    if (!idCita || !idSolicitud) return;
    setSubmitError('');
    setActing(idSolicitud);
    try {
      const body = { accion };
      if (extra.fecha_reprogramada) body.fecha_reprogramada = extra.fecha_reprogramada;
      if (extra.respuesta_doctor != null) body.respuesta_doctor = String(extra.respuesta_doctor).slice(0, 1000);
      await responderSolicitudReprogramacion(idCita, idSolicitud, body);
      setAprobarModal(null);
      setRechazarModal(null);
      load();
    } catch (err) {
      setSubmitError(err?.response?.data?.error || err?.message || 'Error al procesar');
    } finally {
      setActing(null);
    }
  };

  return (
    <div data-tour="section-solicitudes-root">
      <PageHeader title="Solicitudes de reprogramación" showBack backTo="/" />
      <div data-tour="section-solicitudes-filter" style={{ marginBottom: '1rem' }}>
        <label style={{ marginRight: '0.5rem', fontWeight: 600, color: 'var(--color-texto-primario)' }}>Estado:</label>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          style={{
            padding: '0.5rem',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--color-borde-claro)',
            background: 'var(--color-fondo-card)',
            color: 'var(--color-texto-primario)',
          }}
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
        <div data-tour="section-solicitudes-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                      {textoCitaSolicitud(s)}
                    </p>
                    {s.motivo && <p style={{ margin: '0.25rem 0', fontSize: '0.9rem', color: 'var(--color-texto-secundario)' }}>Motivo: {sanitizeForDisplay(s.motivo)}</p>}
                    <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: 'var(--color-texto-secundario)' }}>{formatDateTime(s.fecha_creacion)}</p>
                    <Badge variant={s.estado === 'aprobada' ? 'success' : s.estado === 'rechazada' ? 'error' : 'warning'}>{ESTADO_LABELS[s.estado] || s.estado}</Badge>
                  </div>
                  {isPendiente && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button
                        variant="primary"
                        disabled={acting === s.id_solicitud}
                        onClick={() =>
                          setAprobarModal({
                            solicitud: s,
                            fecha:
                              fechaCitaApiToDatetimeLocalInput(s.fecha_cita_original || s.fecha_efectiva_cita) || '',
                            respuesta: '',
                          })
                        }
                      >
                        Aprobar
                      </Button>
                      <Button variant="danger" disabled={acting === s.id_solicitud} onClick={() => setRechazarModal({ solicitud: s, respuesta: '' })}>Rechazar</Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={!!aprobarModal} onClose={() => { if (!acting) setAprobarModal(null); }} title="Aprobar reprogramación" footer={null} width={420}>
        {aprobarModal && (
          <div>
            <p style={{ marginBottom: '1rem', color: 'var(--color-texto-secundario)' }}>
              {sanitizeForDisplay(aprobarModal.solicitud.paciente_nombre)} — {textoCitaSolicitud(aprobarModal.solicitud)}
            </p>
            <Input
              label="Nueva fecha y hora *"
              type="datetime-local"
              value={aprobarModal.fecha}
              onChange={(e) => setAprobarModal((m) => ({ ...m, fecha: e.target.value }))}
            />
            <Input label="Respuesta para el paciente (opcional)" value={aprobarModal.respuesta} onChange={(e) => setAprobarModal((m) => ({ ...m, respuesta: e.target.value }))} placeholder="Ej: Aprobado para el nuevo horario" />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <Button
                variant="primary"
                disabled={acting}
                onClick={() => {
                  const raw = aprobarModal.fecha?.trim();
                  const fechaIso =
                    raw != null && raw !== ''
                      ? fechaCitaDatetimeLocalToApi(raw.length <= 10 ? `${raw}T12:00:00` : raw)
                      : undefined;
                  handleResponder(aprobarModal.solicitud, 'aprobar', {
                    fecha_reprogramada: fechaIso,
                    respuesta_doctor: aprobarModal.respuesta || undefined,
                  });
                }}
              >
                {acting ? 'Procesando…' : 'Aprobar'}
              </Button>
              <Button variant="outline" onClick={() => setAprobarModal(null)}>Cancelar</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!rechazarModal} onClose={() => { if (!acting) setRechazarModal(null); }} title="Rechazar reprogramación" footer={null} width={420}>
        {rechazarModal && (
          <div>
            <p style={{ marginBottom: '1rem', color: 'var(--color-texto-secundario)' }}>
              {sanitizeForDisplay(rechazarModal.solicitud.paciente_nombre)} — {textoCitaSolicitud(rechazarModal.solicitud)}
            </p>
            <Input label="Motivo o respuesta (opcional)" value={rechazarModal.respuesta} onChange={(e) => setRechazarModal((m) => ({ ...m, respuesta: e.target.value }))} placeholder="Ej: No hay disponibilidad ese día" />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <Button variant="danger" disabled={acting} onClick={() => handleResponder(rechazarModal.solicitud, 'rechazar', { respuesta_doctor: rechazarModal.respuesta || undefined })}>
                {acting ? 'Procesando…' : 'Rechazar'}
              </Button>
              <Button variant="outline" onClick={() => setRechazarModal(null)}>Cancelar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
