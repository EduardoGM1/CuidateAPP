import { useNavigate } from 'react-router-dom';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { formatDateTime } from '../../utils/format';
import { sanitizeForDisplay } from '../../utils/sanitize';

const sectionStyle = {
  background: 'var(--color-fondo-card)',
  borderRadius: 'var(--radius)',
  padding: '1rem',
  marginBottom: '1rem',
  border: '1px solid var(--color-borde-claro)',
};

const labelStyle = { color: 'var(--color-texto-secundario)', fontSize: '0.9rem' };
const valueStyle = { fontWeight: 600, color: 'var(--color-texto-primario)' };

/**
 * Modal de detalle de alertas para Admin según tipo: valor_critico, cita_perdida, auditoria.
 */
export default function AdminAlertDetailModal({ open, onClose, alerta }) {
  const navigate = useNavigate();
  if (!alerta) return null;

  const tipo = alerta.tipo ?? 'valor_critico';
  const idPaciente = alerta.id_paciente ?? alerta.idPaciente;
  const idCita = alerta.id_cita ?? alerta.idCita;
  const idDoctor = alerta.id_doctor ?? alerta.idDoctor;

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
  const handleEnviarMensaje = () => {
    onClose();
    if (idPaciente) navigate(`/chat/${idPaciente}`);
  };
  const handleIrAuditoria = () => {
    onClose();
    navigate('/admin/auditoria');
  };

  if (tipo === 'valor_critico') {
    const pacienteNombre = alerta.paciente ?? [alerta.nombre, alerta.apellido_paterno].filter(Boolean).join(' ') || '—';
    return (
      <Modal open={open} onClose={onClose} title="Alerta: valor crítico" footer={null} width={460}>
        <div style={sectionStyle}>
          <div style={{ marginBottom: '0.5rem' }}><span style={labelStyle}>Paciente:</span> <span style={valueStyle}>{sanitizeForDisplay(pacienteNombre)}</span></div>
          <div style={{ marginBottom: '0.5rem' }}><span style={labelStyle}>Tipo de alerta:</span> <span style={valueStyle}>{sanitizeForDisplay(alerta.tipo_alerta ?? 'Valor crítico')}</span></div>
          {(alerta.glucosa != null || alerta.glucosa_mg_dl != null) && (
            <div style={{ marginBottom: '0.5rem' }}><span style={labelStyle}>Glucosa:</span> {String(alerta.glucosa ?? alerta.glucosa_mg_dl)} mg/dL</div>
          )}
          {(alerta.presion_sistolica != null || alerta.presion_diastolica != null) && (
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={labelStyle}>Presión:</span> {[alerta.presion_sistolica, alerta.presion_diastolica].filter(Boolean).join('/')} mmHg
            </div>
          )}
          {alerta.fecha_medicion != null && (
            <div><span style={labelStyle}>Fecha medición:</span> {formatDateTime(alerta.fecha_medicion)}</div>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {idPaciente && <Button variant="primary" size="small" onClick={handleVerPaciente}>Ver paciente</Button>}
          {idPaciente && <Button variant="outline" size="small" onClick={handleEnviarMensaje}>Enviar mensaje</Button>}
        </div>
      </Modal>
    );
  }

  if (tipo === 'cita_perdida') {
    const pacienteNombre = alerta.paciente ?? '—';
    return (
      <Modal open={open} onClose={onClose} title="Alerta: cita perdida" footer={null} width={460}>
        <div style={sectionStyle}>
          <div style={{ marginBottom: '0.5rem' }}><span style={labelStyle}>Paciente:</span> <span style={valueStyle}>{sanitizeForDisplay(pacienteNombre)}</span></div>
          <div style={{ marginBottom: '0.5rem' }}><span style={labelStyle}>Fecha:</span> {formatDateTime(alerta.fecha ?? alerta.fecha_cita)}</div>
          {alerta.motivo != null && <div style={{ marginBottom: '0.5rem' }}><span style={labelStyle}>Motivo:</span> {sanitizeForDisplay(alerta.motivo)}</div>}
          {alerta.id_cita != null && <div><span style={labelStyle}>ID cita:</span> {alerta.id_cita}</div>}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {idPaciente && <Button variant="primary" size="small" onClick={handleVerPaciente}>Ver paciente</Button>}
          {idCita && <Button variant="primary" size="small" onClick={handleVerCita}>Ver cita</Button>}
        </div>
      </Modal>
    );
  }

  if (tipo === 'auditoria') {
    return (
      <Modal open={open} onClose={onClose} title="Alerta: auditoría" footer={null} width={460}>
        <div style={sectionStyle}>
          <div style={{ marginBottom: '0.5rem' }}><span style={labelStyle}>Descripción:</span> <span style={valueStyle}>{sanitizeForDisplay(alerta.descripcion ?? '—')}</span></div>
          <div style={{ marginBottom: '0.5rem' }}><span style={labelStyle}>Tipo de acción:</span> {sanitizeForDisplay(alerta.tipo_accion ?? '—')}</div>
          <div style={{ marginBottom: '0.5rem' }}><span style={labelStyle}>Entidad:</span> {sanitizeForDisplay(alerta.entidad_afectada ?? '—')}</div>
          <div style={{ marginBottom: '0.5rem' }}><span style={labelStyle}>Severidad:</span> {sanitizeForDisplay(alerta.severidad ?? '—')}</div>
          {alerta.fecha_creacion != null && <div><span style={labelStyle}>Fecha:</span> {formatDateTime(alerta.fecha_creacion)}</div>}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {alerta.entidad_afectada === 'paciente' && alerta.id_entidad && (
            <Button variant="primary" size="small" onClick={() => { onClose(); navigate(`/pacientes/${alerta.id_entidad}`); }}>Ver paciente</Button>
          )}
          {alerta.entidad_afectada === 'cita' && alerta.id_entidad && (
            <Button variant="primary" size="small" onClick={() => { onClose(); navigate(`/citas/${alerta.id_entidad}`); }}>Ver cita</Button>
          )}
          {alerta.entidad_afectada === 'doctor' && alerta.id_entidad && (
            <Button variant="primary" size="small" onClick={() => { onClose(); navigate(`/doctores/${alerta.id_entidad}`); }}>Ver doctor</Button>
          )}
          <Button variant="outline" size="small" onClick={handleIrAuditoria}>Ir a auditoría</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Detalle de alerta" footer={null} width={440}>
      <p style={{ margin: 0, color: 'var(--color-texto-primario)' }}>{sanitizeForDisplay(alerta.descripcion ?? alerta.mensaje ?? 'Alerta')}</p>
    </Modal>
  );
}
