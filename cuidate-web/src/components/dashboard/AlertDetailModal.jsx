import { useNavigate } from 'react-router-dom';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { sanitizeForDisplay } from '../../utils/sanitize';

/**
 * Modal de detalle de alerta con navegación a paciente, cita o doctor cuando existan IDs.
 * Reutilizable para alertas del dashboard (admin y doctor).
 */
export default function AlertDetailModal({ open, onClose, alerta }) {
  const navigate = useNavigate();
  if (!alerta) return null;

  const idPaciente = alerta.id_paciente ?? alerta.idPaciente;
  const idCita = alerta.id_cita ?? alerta.idCita;
  const idDoctor = alerta.id_doctor ?? alerta.idDoctor;
  const texto = sanitizeForDisplay(alerta.descripcion ?? alerta.mensaje ?? alerta.tipo_alerta ?? 'Alerta');

  const handleVerPaciente = () => {
    onClose();
    if (idPaciente) navigate(`/pacientes/${idPaciente}`);
  };
  const handleVerCita = () => {
    onClose();
    if (idCita) navigate(`/citas/${idCita}`);
  };
  const handleVerDoctor = () => {
    onClose();
    if (idDoctor) navigate(`/doctores/${idDoctor}`);
  };

  return (
    <Modal open={open} onClose={onClose} title="Detalle de alerta" footer={null} width={440}>
      <p style={{ margin: '0 0 1rem', color: 'var(--color-texto-primario)' }}>{texto}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {idPaciente && (
          <Button variant="primary" size="small" onClick={handleVerPaciente}>
            Ver paciente
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
