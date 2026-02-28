/**
 * Formulario de signos vitales compartido (paridad con app móvil).
 * Mismos campos que CompletarCitaWizard y RegistrarSignosVitales en ClinicaMovil.
 * Se usa en: CompletarCitaModal (paso signos) y modal "Solo Agregar Signos Vitales" en PacienteDetail.
 */
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';

export const INITIAL_SIGNOS_VITALES = {
  peso_kg: '',
  talla_m: '',
  medida_cintura_cm: '',
  presion_sistolica: '',
  presion_diastolica: '',
  glucosa_mg_dl: '',
  colesterol_mg_dl: '',
  colesterol_ldl: '',
  colesterol_hdl: '',
  trigliceridos_mg_dl: '',
  hba1c_porcentaje: '',
  edad_paciente_en_medicion: '',
  observaciones: '',
};

const GRID_STYLE = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
  gap: '0.5rem',
  marginBottom: '0.5rem',
};

const INPUT_STYLE = { marginBottom: 0 };

/**
 * Convierte el objeto del formulario a payload para API (solo claves con valor).
 * Excluye cadenas vacías y no envía edadEditable (solo UI en móvil).
 * Si se pasa fechaNacimientoPaciente y no hay edad en el form, se calcula y se incluye (paridad con móvil).
 * @param {Record<string, string>} form
 * @param {string} [fechaNacimientoPaciente] - Opcional; para rellenar edad_paciente_en_medicion si falta
 * @returns {Record<string, number|string|undefined>}
 */
export function signosVitalesToPayload(form, fechaNacimientoPaciente) {
  const num = (v) => (v != null && String(v).trim() !== '' ? (v.includes('.') ? parseFloat(v) : parseInt(v, 10)) : null);
  const payload = {};
  if (form.peso_kg?.trim()) payload.peso_kg = num(form.peso_kg);
  if (form.talla_m?.trim()) payload.talla_m = num(form.talla_m);
  if (form.medida_cintura_cm?.trim()) payload.medida_cintura_cm = num(form.medida_cintura_cm);
  if (form.presion_sistolica?.trim()) payload.presion_sistolica = num(form.presion_sistolica);
  if (form.presion_diastolica?.trim()) payload.presion_diastolica = num(form.presion_diastolica);
  if (form.glucosa_mg_dl?.trim()) payload.glucosa_mg_dl = num(form.glucosa_mg_dl);
  if (form.colesterol_mg_dl?.trim()) payload.colesterol_mg_dl = num(form.colesterol_mg_dl);
  if (form.colesterol_ldl?.trim()) payload.colesterol_ldl = num(form.colesterol_ldl);
  if (form.colesterol_hdl?.trim()) payload.colesterol_hdl = num(form.colesterol_hdl);
  if (form.trigliceridos_mg_dl?.trim()) payload.trigliceridos_mg_dl = num(form.trigliceridos_mg_dl);
  if (form.hba1c_porcentaje?.trim()) payload.hba1c_porcentaje = num(form.hba1c_porcentaje);
  if (form.edad_paciente_en_medicion?.trim()) payload.edad_paciente_en_medicion = num(form.edad_paciente_en_medicion);
  else if (fechaNacimientoPaciente) {
    const ed = calcularEdad(fechaNacimientoPaciente);
    if (ed != null) payload.edad_paciente_en_medicion = ed;
  }
  if (form.observaciones?.trim()) payload.observaciones = String(form.observaciones).trim().slice(0, 2000);
  return payload;
}

/**
 * Calcula edad en años desde fecha de nacimiento (YYYY-MM-DD o ISO).
 * @param {string} fechaNacimiento
 * @returns {number|null}
 */
export function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  try {
    const fechaNac = new Date(fechaNacimiento);
    const hoy = new Date();
    let edad = hoy.getFullYear() - fechaNac.getFullYear();
    const mes = hoy.getMonth() - fechaNac.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) edad--;
    return edad >= 0 && edad <= 150 ? edad : null;
  } catch {
    return null;
  }
}

/**
 * Formulario de signos vitales (mismos campos que la app móvil).
 * @param {{ value: Record<string, string>, onChange: (v: Record<string, string>) => void, showImc?: boolean, fechaNacimientoPaciente?: string }}
 */
export default function SignosVitalesForm({ value, onChange, showImc = true, fechaNacimientoPaciente }) {
  const update = (key, val) => onChange({ ...value, [key]: val });

  const peso = value.peso_kg?.trim() ? parseFloat(value.peso_kg) : null;
  const talla = value.talla_m?.trim() ? parseFloat(value.talla_m) : null;
  const imc = showImc && peso != null && talla != null && talla > 0 ? (peso / (talla * talla)).toFixed(2) : null;

  // Rellenar edad desde fecha de nacimiento si no está editada
  const edadCalculada = fechaNacimientoPaciente ? calcularEdad(fechaNacimientoPaciente) : null;
  const edadDisplay = value.edad_paciente_en_medicion !== '' ? value.edad_paciente_en_medicion : (edadCalculada != null ? String(edadCalculada) : '');

  return (
    <div>
      <div style={GRID_STYLE}>
        <Input type="number" placeholder="Peso (kg)" value={value.peso_kg} onChange={(e) => update('peso_kg', e.target.value)} style={INPUT_STYLE} />
        <Input type="number" placeholder="Talla (m)" value={value.talla_m} onChange={(e) => update('talla_m', e.target.value)} style={INPUT_STYLE} />
        <Input type="number" placeholder="Cintura (cm)" value={value.medida_cintura_cm} onChange={(e) => update('medida_cintura_cm', e.target.value)} style={INPUT_STYLE} />
        <Input type="number" placeholder="PA sist." value={value.presion_sistolica} onChange={(e) => update('presion_sistolica', e.target.value)} style={INPUT_STYLE} />
        <Input type="number" placeholder="PA diast." value={value.presion_diastolica} onChange={(e) => update('presion_diastolica', e.target.value)} style={INPUT_STYLE} />
        <Input type="number" placeholder="Glucosa (mg/dL)" value={value.glucosa_mg_dl} onChange={(e) => update('glucosa_mg_dl', e.target.value)} style={INPUT_STYLE} />
        <Input type="number" placeholder="Colesterol total" value={value.colesterol_mg_dl} onChange={(e) => update('colesterol_mg_dl', e.target.value)} style={INPUT_STYLE} />
        <Input type="number" placeholder="LDL" value={value.colesterol_ldl} onChange={(e) => update('colesterol_ldl', e.target.value)} style={INPUT_STYLE} />
        <Input type="number" placeholder="HDL" value={value.colesterol_hdl} onChange={(e) => update('colesterol_hdl', e.target.value)} style={INPUT_STYLE} />
        <Input type="number" placeholder="Triglicéridos" value={value.trigliceridos_mg_dl} onChange={(e) => update('trigliceridos_mg_dl', e.target.value)} style={INPUT_STYLE} />
        <Input type="number" placeholder="HbA1c (%)" value={value.hba1c_porcentaje} onChange={(e) => update('hba1c_porcentaje', e.target.value)} style={INPUT_STYLE} />
        <Input
          type="number"
          placeholder="Edad en medición"
          value={edadDisplay}
          onChange={(e) => update('edad_paciente_en_medicion', e.target.value)}
          style={INPUT_STYLE}
          title={fechaNacimientoPaciente ? 'Calculado desde fecha de nacimiento' : 'Años para validar rangos HbA1c'}
        />
      </div>
      {imc != null && (
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: 'var(--color-primario)', fontWeight: 600 }}>
          IMC: {imc}
        </p>
      )}
      <TextArea
        placeholder="Observaciones (opcional)"
        value={value.observaciones}
        onChange={(e) => update('observaciones', e.target.value.slice(0, 2000))}
        rows={2}
        maxLength={2000}
        style={{ marginBottom: 0 }}
      />
    </div>
  );
}
