import { sanitizeForDisplay } from '../../utils/sanitize';
import { formatDateTime, formatNombreCompleto } from '../../utils/format';
import {
  getVitalSignValueStyle,
  getPresionValueStyle,
  getIMCValueStyle,
} from '../../utils/vitalSignsRanges';
import { Badge } from '../ui';
import styles from './CitaConsultaResumen.module.css';

const ESTADO_CITA_LABEL = {
  pendiente: 'Pendiente',
  atendida: 'Atendida',
  no_asistida: 'No asistida',
  reprogramada: 'Reprogramada',
  cancelada: 'Cancelada',
};

/** Edad en años a partir de fecha de nacimiento; null si la fecha no es válida. */
function edadAniosDesdeNacimiento(fechaNac) {
  if (fechaNac == null || fechaNac === '') return null;
  const birth = new Date(fechaNac);
  if (Number.isNaN(birth.getTime())) return null;
  const ms = Date.now() - birth.getTime();
  if (ms < 0) return null;
  const years = Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000));
  if (!Number.isFinite(years) || years < 0 || years > 130) return null;
  return years;
}

function fmtText(v) {
  if (v == null || v === '') return '—';
  return sanitizeForDisplay(String(v)) || '—';
}

function fmtNum(v, fractionDigits = 2) {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return fmtText(v);
  return n.toFixed(fractionDigits);
}

function pickArray(cita, pascal, camel) {
  const arr = cita?.[pascal] ?? cita?.[camel];
  return Array.isArray(arr) ? arr : [];
}

function computeImc(signo) {
  if (!signo) return null;
  if (signo.imc != null && signo.imc !== '') {
    const n = Number(signo.imc);
    return Number.isNaN(n) ? null : n;
  }
  if (signo.peso_kg == null || signo.talla_m == null) return null;
  const p = Number(signo.peso_kg);
  const t = Number(signo.talla_m);
  if (Number.isNaN(p) || Number.isNaN(t) || t <= 0) return null;
  return p / (t * t);
}

function VitalCell({ campo, valorRaw, children }) {
  const style = campo ? getVitalSignValueStyle(campo, valorRaw) : {};
  return (
    <td className={`${styles.val} ${styles.monoVal}`} style={style}>
      {children}
    </td>
  );
}

function RowThTd({ th, children }) {
  return (
    <tr>
      <th>{th}</th>
      {children}
    </tr>
  );
}

/**
 * Muestra signos vitales, diagnósticos y plan en formato tipo nota médica (PDF/HTML de reportes).
 * Valores numéricos fuera de rango en rojo (misma lógica que el formulario de signos vitales).
 */
export default function CitaConsultaResumen({ cita }) {
  if (!cita) return null;

  const p = cita.Paciente ?? cita.paciente;
  const d = cita.Doctor ?? cita.doctor;
  const nombrePaciente = p ? formatNombreCompleto(p) || fmtText(cita.paciente_nombre) : fmtText(cita.paciente_nombre);
  const nombreDoctor = d ? `Dr. ${formatNombreCompleto(d)}` : fmtText(cita.doctor_nombre);
  const expedienteRaw =
    p?.numero_expediente ||
    p?.codigo_paciente ||
    (p?.id_paciente != null ? String(p.id_paciente) : '') ||
    (cita.id_paciente != null ? String(cita.id_paciente) : '');
  const expediente = sanitizeForDisplay(String(expedienteRaw).trim()) || '—';

  const signosList = pickArray(cita, 'SignosVitales', 'signosVitales');
  const diagnosticos = pickArray(cita, 'Diagnosticos', 'diagnosticos');
  const planes = pickArray(cita, 'PlanMedicacions', 'planMedicacions');

  const signo = signosList[0] ?? null;

  const fechaNac = p?.fecha_nacimiento ?? cita.fecha_nacimiento ?? null;
  let edadPac = edadAniosDesdeNacimiento(fechaNac);
  if (edadPac == null && signo?.edad_paciente_en_medicion != null && signo.edad_paciente_en_medicion !== '') {
    const e = Number(signo.edad_paciente_en_medicion);
    if (Number.isFinite(e) && e >= 0 && e <= 130) edadPac = Math.round(e);
  }

  const sexoRaw = p?.sexo;
  const sexo =
    sexoRaw === 'Mujer' || sexoRaw === 'Femenino'
      ? 'Femenino'
      : sexoRaw === 'Hombre' || sexoRaw === 'Masculino'
        ? 'Masculino'
        : sexoRaw === 'F' || sexoRaw === 'M'
          ? sexoRaw === 'F'
            ? 'Femenino'
            : 'Masculino'
          : sexoRaw
            ? fmtText(sexoRaw)
            : '—';

  const estadoKey = String(cita.estado ?? '').toLowerCase();
  const estadoLabel = ESTADO_CITA_LABEL[estadoKey] || sanitizeForDisplay(cita.estado) || '—';

  const imc = computeImc(signo);

  const sis = signo?.presion_sistolica;
  const dias = signo?.presion_diastolica;
  const taText =
    sis != null && sis !== '' && dias != null && dias !== ''
      ? `${fmtNum(sis, 0)}/${fmtNum(dias, 0)}`
      : '—';
  const taStyle = getPresionValueStyle(sis, dias);

  const planTexts = planes
    .map((pl) => (pl.observaciones ? String(pl.observaciones).trim() : ''))
    .filter(Boolean);
  const planBody =
    planTexts.length > 0 ? planTexts.map((t) => sanitizeForDisplay(t)).join('\n\n') : '—';

  const dxRows =
    diagnosticos.length > 0
      ? diagnosticos.map((dx, i) => (
          <tr key={dx.id_diagnostico ?? i}>
            <td className={styles.val} style={{ whiteSpace: 'pre-wrap' }}>
              {sanitizeForDisplay(dx.descripcion) || '—'}
            </td>
          </tr>
        ))
      : [
          <tr key="empty-dx">
            <td className={styles.val}>—</td>
          </tr>,
        ];

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h2>NOTA MÉDICA</h2>
        <p>Resumen de la consulta (esta cita)</p>
      </div>

      <table className={styles.table}>
        <tbody>
          <tr>
            <th>Nombre</th>
            <td className={styles.val}>{nombrePaciente}</td>
            <th>Edad</th>
            <td className={styles.val}>{edadPac != null && Number.isFinite(edadPac) ? String(edadPac) : '—'}</td>
            <th>Sexo</th>
            <td className={styles.val}>{fmtText(sexo)}</td>
          </tr>
          <tr>
            <th>No. expediente</th>
            <td className={styles.val}>{fmtText(expediente)}</td>
            <th>Fecha y hora (cita)</th>
            <td colSpan={3} className={styles.val}>
              {cita.fecha_cita ? formatDateTime(cita.fecha_cita) : '—'}
            </td>
          </tr>
          <tr>
            <th>Profesional</th>
            <td colSpan={5} className={styles.val}>
              {nombreDoctor}
            </td>
          </tr>
          <tr>
            <th>Motivo</th>
            <td colSpan={5} className={styles.val}>
              {fmtText(cita.motivo)}
            </td>
          </tr>
          <tr>
            <th>Estado actual</th>
            <td colSpan={5} className={styles.val}>
              <Badge
                variant={
                  estadoKey === 'atendida'
                    ? 'success'
                    : estadoKey === 'cancelada' || estadoKey === 'no_asistida'
                      ? 'error'
                      : estadoKey === 'reprogramada'
                        ? 'warning'
                        : 'neutral'
                }
              >
                {estadoLabel}
              </Badge>
            </td>
          </tr>
          <tr>
            <th>Observaciones (cita)</th>
            <td colSpan={5} className={styles.val} style={{ whiteSpace: 'pre-wrap' }}>
              {cita.observaciones != null && String(cita.observaciones).trim()
                ? sanitizeForDisplay(String(cita.observaciones))
                : '—'}
            </td>
          </tr>
        </tbody>
      </table>

      <div className={styles.section}>Signos vitales y antropometría</div>
      {signo ? (
        <table className={styles.table}>
          <tbody>
            {signo.fecha_medicion ? (
              <RowThTd th="Fecha de medición">
                <td colSpan={1} className={styles.val}>
                  {formatDateTime(signo.fecha_medicion)}
                </td>
              </RowThTd>
            ) : null}
            <RowThTd th="TA (mmHg)">
              <td className={styles.val} style={taStyle}>
                <span className={styles.monoVal}>{taText}</span>
              </td>
            </RowThTd>
            <RowThTd th="Peso (kg)">
              <td className={`${styles.val} ${styles.monoVal}`}>{fmtNum(signo.peso_kg, 2)}</td>
            </RowThTd>
            <RowThTd th="Talla (m)">
              <td className={`${styles.val} ${styles.monoVal}`}>{fmtNum(signo.talla_m, 2)}</td>
            </RowThTd>
            <RowThTd th="IMC (kg/m²)">
              <td className={`${styles.val} ${styles.monoVal}`} style={getIMCValueStyle(imc)}>
                {imc != null ? imc.toFixed(2) : '—'}
              </td>
            </RowThTd>
            <RowThTd th="Circunf. cintura (cm)">
              <VitalCell campo="medida_cintura_cm" valorRaw={signo.medida_cintura_cm}>
                {fmtNum(signo.medida_cintura_cm, 2)}
              </VitalCell>
            </RowThTd>
            <RowThTd th="PA sistólica (mmHg)">
              <VitalCell campo="presion_sistolica" valorRaw={sis}>
                {sis != null && sis !== '' ? fmtNum(sis, 0) : '—'}
              </VitalCell>
            </RowThTd>
            <RowThTd th="PA diastólica (mmHg)">
              <VitalCell campo="presion_diastolica" valorRaw={dias}>
                {dias != null && dias !== '' ? fmtNum(dias, 0) : '—'}
              </VitalCell>
            </RowThTd>
            <RowThTd th="Glucosa (mg/dL)">
              <VitalCell campo="glucosa_mg_dl" valorRaw={signo.glucosa_mg_dl}>
                {fmtNum(signo.glucosa_mg_dl, 0)}
              </VitalCell>
            </RowThTd>
            <RowThTd th="Colesterol total (mg/dL)">
              <VitalCell campo="colesterol_mg_dl" valorRaw={signo.colesterol_mg_dl}>
                {fmtNum(signo.colesterol_mg_dl, 0)}
              </VitalCell>
            </RowThTd>
            <RowThTd th="Colesterol LDL (mg/dL)">
              <VitalCell campo="colesterol_ldl" valorRaw={signo.colesterol_ldl}>
                {fmtNum(signo.colesterol_ldl, 0)}
              </VitalCell>
            </RowThTd>
            <RowThTd th="Colesterol HDL (mg/dL)">
              <VitalCell campo="colesterol_hdl" valorRaw={signo.colesterol_hdl}>
                {fmtNum(signo.colesterol_hdl, 0)}
              </VitalCell>
            </RowThTd>
            <RowThTd th="Triglicéridos (mg/dL)">
              <VitalCell campo="trigliceridos_mg_dl" valorRaw={signo.trigliceridos_mg_dl}>
                {fmtNum(signo.trigliceridos_mg_dl, 0)}
              </VitalCell>
            </RowThTd>
            <RowThTd th="HbA1c (%)">
              <VitalCell campo="hba1c_porcentaje" valorRaw={signo.hba1c_porcentaje}>
                {fmtNum(signo.hba1c_porcentaje, 1)}
              </VitalCell>
            </RowThTd>
            <RowThTd th="Edad en medición (años)">
              <td className={`${styles.val} ${styles.monoVal}`}>{fmtNum(signo.edad_paciente_en_medicion, 0)}</td>
            </RowThTd>
            <RowThTd th="Observaciones (signos)">
              <td className={styles.val} style={{ whiteSpace: 'pre-wrap' }}>
                {signo.observaciones != null && String(signo.observaciones).trim()
                  ? sanitizeForDisplay(String(signo.observaciones))
                  : '—'}
              </td>
            </RowThTd>
          </tbody>
        </table>
      ) : (
        <table className={styles.table}>
          <tbody>
            <tr>
              <td className={styles.val}>No hay signos vitales vinculados a esta cita.</td>
            </tr>
          </tbody>
        </table>
      )}

      <div className={styles.section}>Diagnósticos / valoraciones</div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Diagnóstico</th>
          </tr>
        </thead>
        <tbody>{dxRows}</tbody>
      </table>

      <div className={styles.section}>Plan de la consulta</div>
      <table className={styles.table}>
        <tbody>
          <tr>
            <th>Plan / observaciones</th>
          </tr>
          <tr>
            <td className={styles.val} style={{ whiteSpace: 'pre-wrap' }}>
              {planBody}
            </td>
          </tr>
        </tbody>
      </table>

      <p className={styles.footerNote}>
        Documento de referencia en pantalla (mismo criterio de rangos que el registro de signos vitales). La nota
        oficial para archivo puede generarse desde el expediente del paciente.
      </p>
    </div>
  );
}
