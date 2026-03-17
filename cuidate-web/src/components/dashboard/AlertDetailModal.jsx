import { useNavigate } from 'react-router-dom';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { formatDateTime } from '../../utils/format';
import { sanitizeForDisplay } from '../../utils/sanitize';
import { getPresionValueStyle, getVitalSignValueStyle } from '../../utils/vitalSignsRanges';

const sectionStyle = {
  background: 'var(--color-fondo-card)',
  borderRadius: 'var(--radius)',
  padding: '1rem',
  marginBottom: '1rem',
  border: '1px solid var(--color-borde-claro)',
};

/**
 * Modal de detalle de alerta con navegación a paciente, cita o doctor cuando existan IDs.
 * Incluye bloque de signos vitales (glucosa, presión, fecha) y botón Enviar mensaje.
 */
export default function AlertDetailModal({ open, onClose, alerta }) {
  const navigate = useNavigate();
  if (!alerta) return null;

  const idPaciente = alerta.id_paciente ?? alerta.idPaciente;
  const idCita = alerta.id_cita ?? alerta.idCita;
  const idDoctor = alerta.id_doctor ?? alerta.idDoctor;
  const texto = sanitizeForDisplay(alerta.descripcion ?? alerta.mensaje ?? alerta.tipo_alerta ?? 'Alerta');
  const tieneSignos = alerta.glucosa != null || alerta.presion_sistolica != null || alerta.presion_diastolica != null || alerta.fecha_medicion != null;

  const safeClose = () => { if (typeof onClose === 'function') onClose(); };
  const handleVerPaciente = () => {
    safeClose();
    if (idPaciente) navigate(`/pacientes/${idPaciente}`);
  };
  const handleVerCita = () => {
    safeClose();
    if (idCita) navigate(`/citas/${idCita}`);
  };
  const handleVerDoctor = () => {
    safeClose();
    if (idDoctor) navigate(`/doctores/${idDoctor}`);
  };
  const handleEnviarMensaje = () => {
    safeClose();
    if (idPaciente) navigate(`/chat/${idPaciente}`);
  };

  return (
    <Modal open={open} onClose={safeClose} title="Detalle de alerta" footer={null} width={440}>
      <p style={{ margin: '0 0 1rem', color: 'var(--color-texto-primario)' }}>{texto}</p>

      {tieneSignos && (
        <div style={sectionStyle}>
          <strong style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.95rem' }}>Signos vitales</strong>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.9rem' }}>
            {(alerta.glucosa != null || alerta.glucosa_mg_dl != null) && (
              <div><span style={{ color: 'var(--color-texto-secundario)' }}>Glucosa:</span>{' '}
                <span style={getVitalSignValueStyle('glucosa_mg_dl', alerta.glucosa ?? alerta.glucosa_mg_dl)}>
                  {String(alerta.glucosa ?? alerta.glucosa_mg_dl)} mg/dL
                </span>
              </div>
            )}
            {(alerta.presion_sistolica != null || alerta.presion_diastolica != null) && (
              <div>
                <span style={{ color: 'var(--color-texto-secundario)' }}>Presión:</span>{' '}
                <span style={getPresionValueStyle(alerta.presion_sistolica, alerta.presion_diastolica)}>
                  {[alerta.presion_sistolica, alerta.presion_diastolica].filter(Boolean).join('/')} mmHg
                </span>
              </div>
            )}
            {(alerta.fecha_medicion != null) && (
              <div><span style={{ color: 'var(--color-texto-secundario)' }}>Fecha medición:</span> {formatDateTime(alerta.fecha_medicion)}</div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {idPaciente && (
          <Button variant="primary" size="small" onClick={handleVerPaciente}>
            Ver paciente
          </Button>
        )}
        {idPaciente && (
          <Button variant="outline" size="small" onClick={handleEnviarMensaje}>
            Enviar mensaje
          </Button>
        )}
        {idCita && (
          <Button variant="primary" size="small" onClick={handleVerCita}>
            Ver cita
          </Button>
        )}
        {idDoctor && (
          <Button variant="primary" size="small" onClick={handleVerDoctor}>
            Ver doctor
          </Button>
        )}
        {!idPaciente && !idCita && !idDoctor && (
          <span style={{ fontSize: '0.9rem', color: 'var(--color-texto-secundario)' }}>No hay enlaces disponibles para esta alerta.</span>
        )}
      </div>
    </Modal>
  );
}
