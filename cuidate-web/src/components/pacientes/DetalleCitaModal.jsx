import Modal from '../ui/Modal';
import LoadingSpinner from '../ui/LoadingSpinner';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { formatDateTime } from '../../utils/format';
import { sanitizeForDisplay } from '../../utils/sanitize';

const ESTADO_CITA = {
  pendiente: 'Pendiente',
  atendida: 'Atendida',
  no_asistida: 'No asistida',
  reprogramada: 'Reprogramada',
  cancelada: 'Cancelada',
};

const BADGE_VARIANT = {
  atendida: 'success',
  pendiente: 'neutral',
  no_asistida: 'error',
  reprogramada: 'neutral',
  cancelada: 'error',
};

function calcularIMC(pesoKg, tallaM) {
  if (!pesoKg || !tallaM || Number(tallaM) === 0) return null;
  const imc = Number(pesoKg) / (Number(tallaM) * Number(tallaM));
  return parseFloat(imc.toFixed(1));
}

/**
 * Modal de detalle de cita (versión web), paridad con la app móvil.
 * Muestra: fecha, estado, doctor, motivo, observaciones, signos vitales y diagnósticos.
 * Incluye acciones: Registrar datos de la cita y Solo Agregar Signos Vitales cuando la cita es editable.
 */
export default function DetalleCitaModal({
  open,
  onClose,
  citaDetalle,
  loading = false,
  onVerEnPagina,
  canEditMedical = false,
  onCompletarWizard,
  onSoloSignosVitales,
}) {
  const formatearFecha = formatDateTime;
  const idCita = citaDetalle?.id_cita ?? citaDetalle?.id;
  const puedeCompletar = canEditMedical && idCita && (citaDetalle?.estado === 'pendiente' || citaDetalle?.estado === 'no_asistida');

  return (
    <Modal open={open} onClose={onClose} title="Detalle de cita" footer={null} width={560} destroyOnClose>
      {loading ? (
        <LoadingSpinner />
      ) : !citaDetalle ? (
        <p style={{ color: 'var(--color-texto-secundario)', textAlign: 'center', padding: '1.5rem' }}>
          No se encontró el detalle de la cita.
        </p>
      ) : (
        <div className="patient-section-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Información general */}
          <div
            style={{
              background: 'var(--color-fondo-card)',
              borderRadius: 'var(--radius)',
              padding: '1rem',
              marginBottom: '1rem',
              border: '1px solid var(--color-borde-claro)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <strong style={{ fontSize: '1rem' }}>{formatearFecha(citaDetalle.fecha_cita)}</strong>
              <Badge variant={BADGE_VARIANT[citaDetalle.estado] || 'neutral'}>
                {ESTADO_CITA[citaDetalle.estado] || citaDetalle.estado || '—'}
              </Badge>
            </div>
            {citaDetalle.Doctor && (
              <p style={{ margin: '0.25rem 0', fontSize: '0.9rem', color: 'var(--color-texto-secundario)' }}>
                Dr. {sanitizeForDisplay(citaDetalle.Doctor.nombre)} {sanitizeForDisplay(citaDetalle.Doctor.apellido_paterno || '')}
              </p>
            )}
            {citaDetalle.motivo && (
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>
                <strong>Motivo:</strong> {sanitizeForDisplay(citaDetalle.motivo)}
              </p>
            )}
            {citaDetalle.observaciones && (
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>
                <strong>Observaciones:</strong> {sanitizeForDisplay(citaDetalle.observaciones)}
              </p>
            )}
            {citaDetalle.es_primera_consulta && (
              <span
                style={{
                  display: 'inline-block',
                  marginTop: '0.5rem',
                  padding: '0.2rem 0.5rem',
                  background: 'var(--color-fondo-verde-suave)',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.8rem',
                }}
              >
                Primera consulta
              </span>
            )}
          </div>

          {/* Acciones: Registrar datos de la cita y Solo Agregar Signos Vitales */}
          {puedeCompletar && (onCompletarWizard || onSoloSignosVitales) && (
            <div style={{ marginBottom: '1rem' }}>
              {onCompletarWizard && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => { onClose(); onCompletarWizard(idCita); }}
                    style={{ width: '100%', marginBottom: '0.25rem' }}
                  >
                    Registrar datos de la cita
                  </Button>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-texto-secundario)' }}>
                    Recomendado: Flujo guiado paso a paso con guardado progresivo.
                  </p>
                </div>
              )}
              {onSoloSignosVitales && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { onClose(); onSoloSignosVitales(idCita); }}
                  style={{ width: '100%' }}
                >
                  Solo Agregar Signos Vitales
                </Button>
              )}
            </div>
          )}

          {/* Signos vitales en esta cita - todos en forma de lista */}
          <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>Signos vitales en esta cita</h4>
          {Array.isArray(citaDetalle.SignosVitales) && citaDetalle.SignosVitales.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
              {citaDetalle.SignosVitales.map((signo, idx) => {
                const fechaMedicion = signo.fecha_medicion || signo.fecha_creacion;
                const imcCalculado = signo.imc ?? calcularIMC(signo.peso_kg, signo.talla_m);
                const v = (val, suffix = '') => (val != null && val !== '') ? `${val}${suffix}` : '—';
                const items = [
                  { label: 'Peso', value: v(signo.peso_kg, ' kg') },
                  { label: 'Talla', value: v(signo.talla_m, ' m') },
                  { label: 'IMC', value: imcCalculado != null ? String(imcCalculado) : '—' },
                  { label: 'Circunferencia de cintura', value: v(signo.medida_cintura_cm, ' cm') },
                  { label: 'Presión arterial', value: `${v(signo.presion_sistolica)}/${v(signo.presion_diastolica)} mmHg` },
                  { label: 'Glucosa', value: v(signo.glucosa_mg_dl, ' mg/dL') },
                  { label: 'Colesterol total', value: v(signo.colesterol_mg_dl, ' mg/dL') },
                  { label: 'Colesterol LDL', value: v(signo.colesterol_ldl, ' mg/dL') },
                  { label: 'Colesterol HDL', value: v(signo.colesterol_hdl, ' mg/dL') },
                  { label: 'Triglicéridos', value: v(signo.trigliceridos_mg_dl, ' mg/dL') },
                  { label: 'HbA1c', value: v(signo.hba1c_porcentaje, '%') },
                  { label: 'Edad en medición', value: signo.edad_paciente_en_medicion != null && signo.edad_paciente_en_medicion !== '' ? `${signo.edad_paciente_en_medicion} años` : '—' },
                  { label: 'Registrado por', value: signo.registrado_por === 'doctor' ? 'Médico' : signo.registrado_por === 'paciente' ? 'Paciente' : '—' },
                  { label: 'Observaciones', value: signo.observaciones ? sanitizeForDisplay(signo.observaciones) : '—' },
                ];
                return (
                  <div
                    key={signo.id_signo ?? idx}
                    style={{
                      background: 'var(--color-fondo-card)',
                      borderRadius: 'var(--radius)',
                      padding: '0.75rem',
                      border: '1px solid var(--color-borde-claro)',
                    }}
                  >
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-texto-secundario)', marginBottom: '0.5rem' }}>
                      {formatearFecha(fechaMedicion)}
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', listStyleType: 'disc', fontSize: '0.9rem' }}>
                      {items.map((item, i) => (
                        <li key={i} style={{ marginBottom: '0.2rem' }}>
                          <strong>{item.label}:</strong> {item.value}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: '0.9rem', color: 'var(--color-texto-secundario)', fontStyle: 'italic', marginBottom: '1rem' }}>
              No hay signos vitales registrados en esta cita.
            </p>
          )}

          {/* Diagnósticos */}
          <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>Diagnóstico(s) de la cita</h4>
          {Array.isArray(citaDetalle.Diagnosticos) && citaDetalle.Diagnosticos.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {citaDetalle.Diagnosticos.map((dx, idx) => (
                <div
                  key={dx.id_diagnostico ?? idx}
                  style={{
                    background: 'var(--color-fondo-card)',
                    borderRadius: 'var(--radius)',
                    padding: '0.75rem',
                    border: '1px solid var(--color-borde-claro)',
                  }}
                >
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-texto-secundario)' }}>
                    {dx.fecha_registro ? formatearFecha(dx.fecha_registro) : 'Fecha no disponible'}
                  </div>
                  <div style={{ marginTop: '0.25rem' }}>{sanitizeForDisplay(dx.descripcion) || 'Sin descripción'}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.9rem', color: 'var(--color-texto-secundario)', fontStyle: 'italic', marginBottom: '1rem' }}>
              No hay diagnóstico registrado en esta cita.
            </p>
          )}

          {/* Acción: ver en página */}
          {onVerEnPagina && (citaDetalle.id_cita ?? citaDetalle.id) && (
            <div style={{ borderTop: '1px solid var(--color-borde-claro)', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <Button type="button" variant="outline" onClick={() => { onClose(); onVerEnPagina(citaDetalle.id_cita ?? citaDetalle.id); }}>
                Ver en página de citas
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
