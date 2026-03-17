import { useNavigate } from 'react-router-dom';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { formatDateTime, formatNombreCompleto } from '../../utils/format';
import { displayText } from '../../utils/sanitize';
import { getPresionValueStyle, getVitalSignValueStyle } from '../../utils/vitalSignsRanges';

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
  const handleIrAuditoria = () => {
    safeClose();
    navigate('/admin/auditoria');
  };

  if (tipo === 'valor_critico') {
    const pacienteNombre = alerta.paciente ?? (formatNombreCompleto(alerta) || '—');
    return (
      <Modal open={open} onClose={safeClose} title="Alerta: valor crítico" footer={null} width={460}>
        <div style={sectionStyle}>
          <div style={{ marginBottom: '0.5rem' }}><span style={labelStyle}>Paciente:</span> <span style={valueStyle}>{displayText(pacienteNombre)}</span></div>
          <div style={{ marginBottom: '0.5rem' }}><span style={labelStyle}>Tipo de alerta:</span> <span style={valueStyle}>{displayText(alerta.tipo_alerta ?? 'Valor crítico')}</span></div>
          {(alerta.glucosa != null || alerta.glucosa_mg_dl != null) && (
            <div style={{ marginBottom: '0.5rem' }}><span style={labelStyle}>Glucosa:</span>{' '}
              <span style={getVitalSignValueStyle('glucosa_mg_dl', alerta.glucosa ?? alerta.glucosa_mg_dl)}>{String(alerta.glucosa ?? alerta.glucosa_mg_dl)} mg/dL</span>
            </div>
          )}
          {(alerta.presion_sistolica != null || alerta.presion_diastolica != null) && (
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={labelStyle}>Presión:</span>{' '}
              <span style={getPresionValueStyle(alerta.presion_sistolica, alerta.presion_diastolica)}>{[alerta.presion_sistolica, alerta.presion_diastolica].filter(Boolean).join('/')} mmHg</span>
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
      <Modal open={open} onClose={safeClose} title="Alerta: cita perdida" footer={null} width={460}>
        <div style={sectionStyle}>
          <div style={{ marginBottom: '0.5rem' }}><span style={labelStyle}>Paciente:</span> <span style={valueStyle}>{displayText(pacienteNombre)}</span></div>
          <div style={{ marginBottom: '0.5rem' }}><span style={labelStyle}>Fecha:</span> {formatDateTime(alerta.fecha ?? alerta.fecha_cita)}</div>
          {alerta.motivo != null && <div style={{ marginBottom: '0.5rem' }}><span style={labelStyle}>Motivo:</span> {displayText(alerta.motivo)}</div>}
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
      <Modal open={open} onClose={safeClose} title="Alerta: auditoría" footer={null} width={460}>
        <div style={sectionStyle}>
          <div style={{ marginBottom: '0.5rem' }}><span style={labelStyle}>Descripción:</span> <span style={valueStyle}>{displayText(alerta.descripcion ?? '—')}</span></div>
          <div style={{ marginBottom: '0.5rem' }}><span style={labelStyle}>Tipo de acción:</span> {displayText(alerta.tipo_accion ?? '—')}</div>
          <div style={{ marginBottom: '0.5rem' }}><span style={labelStyle}>Entidad:</span> {displayText(alerta.entidad_afectada ?? '—')}</div>
          <div style={{ marginBottom: '0.5rem' }}><span style={labelStyle}>Severidad:</span> {displayText(alerta.severidad ?? '—')}</div>
          {alerta.fecha_creacion != null && <div><span style={labelStyle}>Fecha:</span> {formatDateTime(alerta.fecha_creacion)}</div>}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {alerta.entidad_afectada === 'paciente' && alerta.id_entidad && (
            <Button variant="primary" size="small" onClick={() => { safeClose(); navigate(`/pacientes/${alerta.id_entidad}`); }}>Ver paciente</Button>
          )}
          {alerta.entidad_afectada === 'cita' && alerta.id_entidad && (
            <Button variant="primary" size="small" onClick={() => { safeClose(); navigate(`/citas/${alerta.id_entidad}`); }}>Ver cita</Button>
          )}
          {alerta.entidad_afectada === 'doctor' && alerta.id_entidad && (
            <Button variant="primary" size="small" onClick={() => { safeClose(); navigate(`/doctores/${alerta.id_entidad}`); }}>Ver doctor</Button>
          )}
          <Button variant="outline" size="small" onClick={handleIrAuditoria}>Ir a auditoría</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={safeClose} title="Detalle de alerta" footer={null} width={440}>
      <p style={{ margin: 0, color: 'var(--color-texto-primario)' }}>{displayText(alerta.descripcion ?? alerta.mensaje ?? 'Alerta')}</p>
    </Modal>
  );
}
