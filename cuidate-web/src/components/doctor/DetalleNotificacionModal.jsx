import { useNavigate } from 'react-router-dom';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import NotificacionEstadoBadge from './NotificacionEstadoBadge';
import { isNotificacionArchivada, isNotificacionNoLeida } from '../../utils/notificacionDisplay';
import { formatDateTime } from '../../utils/format';
import { sanitizeForDisplay } from '../../utils/sanitize';

const TIPO_LABELS = {
  alerta_signos_vitales: 'Signos vitales',
  solicitud_reprogramacion: 'Reprogramación',
  nuevo_mensaje: 'Mensaje',
  cita_proxima: 'Cita próxima',
  cita_cancelada: 'Cita cancelada',
  cita_actualizada: 'Cita actualizada',
  cita_reprogramada: 'Cita reprogramada',
  paciente_registro_signos: 'Registro de signos',
};

const sectionStyle = {
  background: 'var(--color-fondo-card)',
  borderRadius: 'var(--radius)',
  padding: '1rem',
  marginBottom: '1rem',
  border: '1px solid var(--color-borde-claro)',
};

const sectionTitleStyle = {
  fontSize: '0.95rem',
  fontWeight: 600,
  color: 'var(--color-texto-primario)',
  marginBottom: '0.5rem',
};

const itemStyle = {
  fontSize: '0.9rem',
  color: 'var(--color-texto-secundario)',
};

const valueStyle = {
  fontWeight: 600,
  color: 'var(--color-texto-primario)',
};

/**
 * Modal de detalle de una notificación (versión web), equivalente a la información
 * mostrada en la app móvil: tipo, estado, fecha, título, mensaje, paciente y datos adicionales.
 */
export default function DetalleNotificacionModal({
  open,
  onClose,
  notificacion,
  onMarcarLeida,
  onArchivar,
  actingId,
}) {
  const navigate = useNavigate();
  const safeClose = () => { if (typeof onClose === 'function') onClose(); };

  if (!notificacion) {
    return (
      <Modal open={open} onClose={safeClose} title="Detalle de notificación" footer={null} width={520} destroyOnClose>
        <p style={{ color: 'var(--color-texto-secundario)', textAlign: 'center', padding: '1.5rem' }}>
          No hay datos de la notificación.
        </p>
      </Modal>
    );
  }

  const id = notificacion.id_notificacion ?? notificacion.id;
  const noLeida = isNotificacionNoLeida(notificacion);
  const archivada = isNotificacionArchivada(notificacion);
  const tipoLabel = TIPO_LABELS[notificacion.tipo] || notificacion.tipo || '—';
  const datos = notificacion.datos_adicionales || {};
  const hasDatos = Object.keys(datos).length > 0;
  const pacienteNombre = notificacion.paciente_nombre ?? datos.paciente_nombre;

  const idPaciente = notificacion.id_paciente ?? notificacion.datos_adicionales?.id_paciente;
  const handleIrAlChat = () => {
    safeClose();
    if (idPaciente) navigate(`/chat/${idPaciente}`);
  };
  const handleIrASolicitudes = () => {
    safeClose();
    navigate('/solicitudes-reprogramacion');
  };

  const footer = (
    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
      <Button variant="secondary" size="small" onClick={safeClose}>
        Cerrar
      </Button>
      {idPaciente && (
        <Button variant="outline" size="small" onClick={handleIrAlChat}>
          Ir al chat
        </Button>
      )}
      {notificacion.tipo === 'solicitud_reprogramacion' && (
        <Button variant="outline" size="small" onClick={handleIrASolicitudes}>
          Ir a solicitudes
        </Button>
      )}
      {noLeida && typeof onMarcarLeida === 'function' && (
        <Button
          variant="outline"
          size="small"
          disabled={actingId === id}
          onClick={() => onMarcarLeida(notificacion)}
        >
          Marcar leída
        </Button>
      )}
      {!archivada && typeof onArchivar === 'function' && (
        <Button
          variant="outline"
          size="small"
          disabled={actingId === id}
          onClick={() => onArchivar(notificacion)}
        >
          Archivar
        </Button>
      )}
    </div>
  );

  return (
    <Modal open={open} onClose={safeClose} title="Detalle de notificación" footer={footer} width={520} destroyOnClose>
      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {/* Tipo y estado */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Tipo y estado</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Badge variant="neutral">{tipoLabel}</Badge>
            <NotificacionEstadoBadge notificacion={notificacion} />
          </div>
        </div>

        {/* Fecha */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>📅 Fecha de envío</div>
          <p style={{ margin: 0, fontSize: '1rem', ...valueStyle }}>
            {formatDateTime(notificacion.fecha_envio) || '—'}
          </p>
        </div>

        {/* Título */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Título</div>
          <p style={{ margin: 0, fontSize: '1rem', ...valueStyle }}>
            {sanitizeForDisplay(notificacion.titulo) || 'Sin título'}
          </p>
        </div>

        {/* Mensaje */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Mensaje</div>
          <p
            style={{
              margin: 0,
              fontSize: '0.95rem',
              color: 'var(--color-texto-secundario)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {sanitizeForDisplay(notificacion.mensaje) || '—'}
          </p>
        </div>

        {/* Paciente (si aplica) */}
        {pacienteNombre && (
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Paciente</div>
            <p style={{ margin: 0, fontSize: '1rem', ...valueStyle }}>
              {sanitizeForDisplay(pacienteNombre)}
            </p>
          </div>
        )}

        {/* Datos adicionales (id_cita, id_solicitud, id_paciente, etc.) */}
        {hasDatos && (
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Datos adicionales</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {Object.entries(datos).map(([key, value]) => {
                if (value == null || (typeof value === 'object' && !Array.isArray(value))) return null;
                const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
                return (
                  <div key={key} style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                    <span style={itemStyle}>{key}:</span>
                    <span style={valueStyle}>{sanitizeForDisplay(displayValue)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* IDs de referencia si vienen en la raíz del objeto */}
        {(notificacion.id_cita != null || notificacion.id_paciente != null) && (
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Referencias</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {notificacion.id_cita != null && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={itemStyle}>ID cita:</span>
                  <span style={valueStyle}>{notificacion.id_cita}</span>
                </div>
              )}
              {notificacion.id_paciente != null && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={itemStyle}>ID paciente:</span>
                  <span style={valueStyle}>{notificacion.id_paciente}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
