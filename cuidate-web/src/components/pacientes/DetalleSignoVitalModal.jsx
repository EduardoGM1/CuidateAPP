import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { formatDateTime } from '../../utils/format';
import { sanitizeForDisplay } from '../../utils/sanitize';

function calcularIMC(pesoKg, tallaM) {
  if (!pesoKg || !tallaM || Number(tallaM) === 0) return null;
  const imc = Number(pesoKg) / (Number(tallaM) * Number(tallaM));
  return parseFloat(imc.toFixed(1));
}

/** Color del IMC según rango (igual que app móvil): bajo peso, normal, sobrepeso, obesidad */
function getIMCColor(imc) {
  if (imc == null) return 'var(--color-texto-secundario)';
  if (imc < 18.5) return 'var(--color-primario)';
  if (imc < 25) return 'var(--color-success, #52c41a)';
  if (imc < 30) return 'var(--color-warning, #faad14)';
  return 'var(--color-error, #ff4d4f)';
}

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

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
  gap: '0.5rem 1rem',
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
 * Modal de detalle de un registro de signos vitales (versión web), similar a la app móvil.
 * Muestra: fecha, registrado por, antropométricos, presión arterial, laboratorio, observaciones.
 * @param {boolean} [canEdit] - Si se muestra el botón Editar
 * @param {function(object): void} [onEdit] - Al hacer clic en Editar, recibe el signo y cierra el modal
 */
export default function DetalleSignoVitalModal({
  open,
  onClose,
  signo,
  canEdit = false,
  onEdit,
}) {
  const formatearFecha = formatDateTime;
  const fechaMedicion = signo?.fecha_medicion || signo?.fecha_creacion;
  const imcCalculado = signo?.imc ?? calcularIMC(signo?.peso_kg, signo?.talla_m);
  const registradoPor =
    signo?.registrado_por === 'paciente'
      ? 'Paciente'
      : signo?.registrado_por === 'doctor'
        ? 'Doctor'
        : signo?.registrado_por || 'Sistema';

  return (
    <Modal open={open} onClose={onClose} title="Detalle de signo vital" footer={null} width={520} destroyOnClose>
      {!signo ? (
        <p style={{ color: 'var(--color-texto-secundario)', textAlign: 'center', padding: '1.5rem' }}>
          No hay datos del registro.
        </p>
      ) : (
        <div className="patient-section-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Fecha y registrado por */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>📅 Fecha</div>
            <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
              {formatearFecha(fechaMedicion)}
            </p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: 'var(--color-texto-secundario)' }}>
              Registrado por: {registradoPor}
            </p>
          </div>

          {/* Antropométricos */}
          {(signo.peso_kg || signo.talla_m || imcCalculado != null || signo.medida_cintura_cm) && (
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>📏 Antropométricos</div>
              <div style={gridStyle}>
                {signo.peso_kg != null && (
                  <div>
                    <div style={itemStyle}>Peso</div>
                    <div style={valueStyle}>{signo.peso_kg} kg</div>
                  </div>
                )}
                {signo.talla_m != null && (
                  <div>
                    <div style={itemStyle}>Talla</div>
                    <div style={valueStyle}>{signo.talla_m} m</div>
                  </div>
                )}
                {imcCalculado != null && (
                  <div>
                    <div style={itemStyle}>IMC</div>
                    <div style={{ ...valueStyle, color: getIMCColor(imcCalculado) }}>{imcCalculado}</div>
                  </div>
                )}
                {signo.medida_cintura_cm != null && (
                  <div>
                    <div style={itemStyle}>Cintura</div>
                    <div style={valueStyle}>{signo.medida_cintura_cm} cm</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Presión arterial */}
          {(signo.presion_sistolica != null || signo.presion_diastolica != null) && (
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>🩺 Presión arterial</div>
              <div style={valueStyle}>
                {signo.presion_sistolica ?? '—'}/{signo.presion_diastolica ?? '—'} mmHg
              </div>
            </div>
          )}

          {/* Exámenes de laboratorio */}
          {(signo.glucosa_mg_dl != null ||
            signo.colesterol_mg_dl != null ||
            signo.colesterol_ldl != null ||
            signo.colesterol_hdl != null ||
            signo.trigliceridos_mg_dl != null ||
            signo.hba1c_porcentaje != null) && (
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>🧪 Exámenes de laboratorio</div>
              <div style={gridStyle}>
                {signo.glucosa_mg_dl != null && (
                  <div>
                    <div style={itemStyle}>Glucosa</div>
                    <div style={valueStyle}>{signo.glucosa_mg_dl} mg/dL</div>
                  </div>
                )}
                {signo.colesterol_mg_dl != null && (
                  <div>
                    <div style={itemStyle}>Colesterol total</div>
                    <div style={valueStyle}>{signo.colesterol_mg_dl} mg/dL</div>
                  </div>
                )}
                {signo.colesterol_ldl != null && (
                  <div>
                    <div style={itemStyle}>Colesterol LDL</div>
                    <div style={valueStyle}>{signo.colesterol_ldl} mg/dL</div>
                  </div>
                )}
                {signo.colesterol_hdl != null && (
                  <div>
                    <div style={itemStyle}>Colesterol HDL</div>
                    <div style={valueStyle}>{signo.colesterol_hdl} mg/dL</div>
                  </div>
                )}
                {signo.trigliceridos_mg_dl != null && (
                  <div>
                    <div style={itemStyle}>Triglicéridos</div>
                    <div style={valueStyle}>{signo.trigliceridos_mg_dl} mg/dL</div>
                  </div>
                )}
                {signo.hba1c_porcentaje != null && (
                  <div>
                    <div style={itemStyle}>HbA1c</div>
                    <div style={valueStyle}>{signo.hba1c_porcentaje}%</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Observaciones */}
          {signo.observaciones && (
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>Observaciones</div>
              <p style={{ margin: 0, fontSize: '0.9rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {sanitizeForDisplay(signo.observaciones)}
              </p>
            </div>
          )}

          {canEdit && typeof onEdit === 'function' && (
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-borde-claro)' }}>
              <Button variant="secondary" size="small" onClick={onClose}>Cerrar</Button>
              <Button variant="primary" size="small" onClick={() => { onEdit(signo); onClose(); }}>Editar</Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
