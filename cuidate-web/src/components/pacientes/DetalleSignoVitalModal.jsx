import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { formatDateTime } from '../../utils/format';
import { sanitizeForDisplay } from '../../utils/sanitize';

/** Valor para mostrar en celdas de expediente: valor + sufijo o "—" si vacío */
function formatVal(value, suffix = '') {
  if (value == null || value === '') return '—';
  return `${value}${suffix}`;
}

function calcularIMC(pesoKg, tallaM) {
  if (!pesoKg || !tallaM || Number(tallaM) === 0) return null;
  const imc = Number(pesoKg) / (Number(tallaM) * Number(tallaM));
  return parseFloat(imc.toFixed(1));
}

/** Color del IMC según rango (igual que app móvil) */
function getIMCColor(imc) {
  if (imc == null) return 'var(--color-texto-secundario)';
  if (imc < 18.5) return 'var(--color-primario)';
  if (imc < 25) return 'var(--color-exito, #34d399)';
  if (imc < 30) return 'var(--color-advertencia, #fbbf24)';
  return 'var(--color-error, #f87171)';
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
const itemStyle = { fontSize: '0.9rem', color: 'var(--color-texto-secundario)' };
const valueStyle = { fontWeight: 600, color: 'var(--color-texto-primario)' };

/**
 * Vista tipo expediente médico: tablas con todos los datos del registro (estilo NOTAS MÉDICAS).
 */
function VistaExpedienteSignoVital({ signo, formatearFecha, registradoPor, imcCalculado }) {
  const ta = (signo.presion_sistolica != null || signo.presion_diastolica != null)
    ? `${formatVal(signo.presion_sistolica)}/${formatVal(signo.presion_diastolica)} mmHg`
    : '—';
  const vinculadoCita = signo.id_cita ? 'Sí' : 'No';
  const observaciones = signo.observaciones ? sanitizeForDisplay(signo.observaciones) : '—';

  return (
    <div className="detalle-signo-expediente">
      <div className="expediente-header">
        <h2>REGISTRO DE SIGNO VITAL</h2>
        <p>Medición – Signos vitales y antropometría</p>
      </div>

      <div className="expediente-section">
        <strong>Identificación del registro</strong>
        <table className="expediente-table">
          <tbody>
            <tr>
              <th>No. registro</th>
              <td className={signo.id_signo == null ? 'empty' : ''}>{formatVal(signo.id_signo)}</td>
              <th>Fecha y hora</th>
              <td>{formatearFecha(signo.fecha_medicion || signo.fecha_creacion)}</td>
            </tr>
            <tr>
              <th>Registrado por</th>
              <td>{registradoPor}</td>
              <th>Vinculado a cita</th>
              <td>{vinculadoCita}</td>
            </tr>
            <tr>
              <th>Edad en medición</th>
              <td colSpan="3" className={signo.edad_paciente_en_medicion == null ? 'empty' : ''}>
                {formatVal(signo.edad_paciente_en_medicion, ' años')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="expediente-section">
        <strong>Signos vitales y antropometría</strong>
        <table className="expediente-table">
          <thead>
            <tr>
              <th>TA (mmHg)</th>
              <th>Peso</th>
              <th>Talla</th>
              <th>IMC</th>
              <th>Cintura (cm)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={ta === '—' ? 'empty' : ''}>{ta === '—' ? ta : ta.replace(' mmHg', '')}</td>
              <td className={signo.peso_kg == null ? 'empty' : ''}>{formatVal(signo.peso_kg, ' kg')}</td>
              <td className={signo.talla_m == null ? 'empty' : ''}>{formatVal(signo.talla_m, ' m')}</td>
              <td className={imcCalculado == null ? 'empty' : ''}>{formatVal(imcCalculado)}</td>
              <td className={signo.medida_cintura_cm == null ? 'empty' : ''}>{formatVal(signo.medida_cintura_cm)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="expediente-section">
        <strong>Laboratorio</strong>
        <table className="expediente-table">
          <thead>
            <tr>
              <th>Glucosa (mg/dL)</th>
              <th>Colesterol total</th>
              <th>Colesterol LDL</th>
              <th>Colesterol HDL</th>
              <th>Triglicéridos</th>
              <th>HbA1c (%)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={signo.glucosa_mg_dl == null ? 'empty' : ''}>{formatVal(signo.glucosa_mg_dl)}</td>
              <td className={signo.colesterol_mg_dl == null ? 'empty' : ''}>{formatVal(signo.colesterol_mg_dl)}</td>
              <td className={signo.colesterol_ldl == null ? 'empty' : ''}>{formatVal(signo.colesterol_ldl)}</td>
              <td className={signo.colesterol_hdl == null ? 'empty' : ''}>{formatVal(signo.colesterol_hdl)}</td>
              <td className={signo.trigliceridos_mg_dl == null ? 'empty' : ''}>{formatVal(signo.trigliceridos_mg_dl)}</td>
              <td className={signo.hba1c_porcentaje == null ? 'empty' : ''}>{formatVal(signo.hba1c_porcentaje)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="expediente-section">
        <strong>Observaciones</strong>
        <table className="expediente-table">
          <tbody>
            <tr>
              <td className={observaciones === '—' ? 'empty' : ''} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {observaciones}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="expediente-footer">
        Documento generado por CuidateAPP. Información sensible protegida.
      </div>
    </div>
  );
}

/**
 * Vista resumen en cards (diseño original del modal).
 */
function VistaResumenSignoVital({ signo, formatearFecha, registradoPor, imcCalculado }) {
  const fechaMedicion = signo?.fecha_medicion || signo?.fecha_creacion;

  return (
    <div className="patient-section-modal-body">
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>📅 Fecha</div>
        <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{formatearFecha(fechaMedicion)}</p>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: 'var(--color-texto-secundario)' }}>
          Registrado por: {registradoPor}
        </p>
      </div>

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

      {(signo.presion_sistolica != null || signo.presion_diastolica != null) && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>🩺 Presión arterial</div>
          <div style={valueStyle}>
            {signo.presion_sistolica ?? '—'}/{signo.presion_diastolica ?? '—'} mmHg
          </div>
        </div>
      )}

      {(signo.glucosa_mg_dl != null || signo.colesterol_mg_dl != null || signo.colesterol_ldl != null ||
        signo.colesterol_hdl != null || signo.trigliceridos_mg_dl != null || signo.hba1c_porcentaje != null) && (
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

      {signo.observaciones && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Observaciones</div>
          <p style={{ margin: 0, fontSize: '0.9rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {sanitizeForDisplay(signo.observaciones)}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Modal de detalle de un registro de signos vitales.
 * Vista por defecto: expediente médico (tablas, todos los datos). Toggle a vista resumen (cards).
 * Incluye botón Imprimir para guardar como PDF.
 */
export default function DetalleSignoVitalModal({
  open,
  onClose,
  signo,
  canEdit = false,
  onEdit,
}) {
  const [viewMode, setViewMode] = useState('expediente');

  const formatearFecha = formatDateTime;
  const fechaMedicion = signo?.fecha_medicion || signo?.fecha_creacion;
  const imcCalculado = signo?.imc ?? calcularIMC(signo?.peso_kg, signo?.talla_m);
  const registradoPor =
    signo?.registrado_por === 'paciente'
      ? 'Paciente'
      : signo?.registrado_por === 'doctor'
        ? 'Doctor'
        : signo?.registrado_por || 'Sistema';

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal open={open} onClose={onClose} title="Detalle de signo vital" footer={null} width={640} destroyOnClose>
      {!signo ? (
        <p style={{ color: 'var(--color-texto-secundario)', textAlign: 'center', padding: '1.5rem' }}>
          No hay datos del registro.
        </p>
      ) : (
        <>
          <div className="detalle-signo-no-print" style={{ marginBottom: '1rem' }}>
            <div className="ui-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'expediente'}
                className={`ui-tab ${viewMode === 'expediente' ? 'is-active' : ''}`}
                onClick={() => setViewMode('expediente')}
              >
                Expediente
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'resumen'}
                className={`ui-tab ${viewMode === 'resumen' ? 'is-active' : ''}`}
                onClick={() => setViewMode('resumen')}
              >
                Resumen
              </button>
            </div>
          </div>

          <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {viewMode === 'expediente' ? (
              <VistaExpedienteSignoVital
                signo={signo}
                formatearFecha={formatearFecha}
                registradoPor={registradoPor}
                imcCalculado={imcCalculado}
              />
            ) : (
              <VistaResumenSignoVital
                signo={signo}
                formatearFecha={formatearFecha}
                registradoPor={registradoPor}
                imcCalculado={imcCalculado}
              />
            )}
          </div>

          <div
            className="detalle-signo-no-print"
            style={{
              display: 'flex',
              gap: '0.5rem',
              justifyContent: 'flex-end',
              marginTop: '1rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--color-borde-claro)',
            }}
          >
            <Button variant="secondary" size="small" onClick={onClose}>
              Cerrar
            </Button>
            <Button variant="secondary" size="small" onClick={handlePrint}>
              Imprimir
            </Button>
            {canEdit && typeof onEdit === 'function' && (
              <Button variant="primary" size="small" onClick={() => { onEdit(signo); onClose(); }}>
                Editar
              </Button>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
