import { DataCard } from '../shared';
import { sanitizeForDisplay } from '../../utils/sanitize';
import { formatDateTime } from '../../utils/format';

const SIGNOS_LABELS = {
  peso_kg: 'Peso (kg)',
  talla_m: 'Talla (m)',
  medida_cintura_cm: 'Circunf. cintura (cm)',
  presion_sistolica: 'PA sistólica',
  presion_diastolica: 'PA diastólica',
  glucosa_mg_dl: 'Glucosa (mg/dL)',
  colesterol_mg_dl: 'Colesterol total (mg/dL)',
  colesterol_ldl: 'Colesterol LDL (mg/dL)',
  colesterol_hdl: 'Colesterol HDL (mg/dL)',
  trigliceridos_mg_dl: 'Triglicéridos (mg/dL)',
  hba1c_porcentaje: 'HbA1c (%)',
  edad_paciente_en_medicion: 'Edad en medición (años)',
  observaciones: 'Observaciones (signos)',
};

function fmt(v) {
  if (v == null || v === '') return '—';
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return sanitizeForDisplay(String(v)) || '—';
}

function pickArray(cita, pascal, camel) {
  const arr = cita?.[pascal] ?? cita?.[camel];
  return Array.isArray(arr) ? arr : [];
}

/**
 * Muestra signos vitales, diagnósticos y notas de plan asociados a la cita (respuesta getCita).
 */
export default function CitaConsultaResumen({ cita }) {
  if (!cita) return null;

  const signosList = pickArray(cita, 'SignosVitales', 'signosVitales');
  const diagnosticos = pickArray(cita, 'Diagnosticos', 'diagnosticos');
  const planes = pickArray(cita, 'PlanMedicacions', 'planMedicacions');

  const signo = signosList[0] ?? null;
  const signosItems = signo
    ? Object.entries(SIGNOS_LABELS).map(([key, label]) => ({
        label,
        value: fmt(signo[key]),
      }))
    : [];

  if (signo?.fecha_medicion) {
    signosItems.unshift({
      label: 'Fecha de medición',
      value: formatDateTime(signo.fecha_medicion),
    });
  }

  const dxItems = diagnosticos.length
    ? diagnosticos.map((d, i) => ({
        label: diagnosticos.length > 1 ? `Diagnóstico ${i + 1}` : 'Diagnóstico',
        value: sanitizeForDisplay(d.descripcion) || '—',
      }))
    : [{ label: 'Diagnósticos', value: '—' }];

  const planTexts = planes
    .map((p) => (p.observaciones ? String(p.observaciones).trim() : ''))
    .filter(Boolean);

  const planItems =
    planTexts.length > 0
      ? [
          {
            label: 'Plan / observaciones',
            value: (
              <span style={{ whiteSpace: 'pre-wrap' }}>
                {planTexts.map((t) => sanitizeForDisplay(t)).join('\n\n')}
              </span>
            ),
          },
        ]
      : [{ label: 'Plan de medicación', value: '—' }];

  return (
    <>
      <DataCard title="Signos vitales (esta cita)" items={signosItems.length ? signosItems : [{ label: '—', value: 'No hay signos vitales vinculados a esta cita.' }]} />
      <DataCard title="Diagnósticos" items={dxItems} />
      <DataCard title="Plan de la consulta" items={planItems} />
    </>
  );
}
