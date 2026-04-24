/**
 * Formulario de signos vitales compartido (paridad con app móvil).
 * Mismos campos que CompletarCitaWizard y RegistrarSignosVitales en ClinicaMovil.
 * Se usa en: CompletarCitaModal (paso signos) y modal "Solo Agregar Signos Vitales" en PacienteDetail.
 * Los valores fuera de rango se muestran en rojo.
 */
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import { getVitalSignValueStyle, getPresionValueStyle, getIMCValueStyle } from '../../utils/vitalSignsRanges';

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

/** Permite decimales en inputs type="number" (evita que el navegador solo acepte enteros). */
const DECIMAL_INPUT_PROPS = { step: 'any' };

/**
 * Número opcional con soporte de coma decimal (es-ES) y punto.
 * @param {string|number|null|undefined} v
 * @returns {number|null}
 */
function parseOptionalDecimal(v) {
  if (v == null) return null;
  const s = String(v).trim().replace(/\s/g, '').replace(',', '.');
  if (s === '') return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Entero opcional (presión, edad en años).
 * @param {string|number|null|undefined} v
 * @returns {number|null}
 */
function parseOptionalIntField(v) {
  const n = parseOptionalDecimal(v);
  if (n == null) return null;
  return Math.round(n);
}

/**
 * Convierte el objeto del formulario a payload para API (solo claves con valor).
 * Excluye cadenas vacías y no envía edadEditable (solo UI en móvil).
 * Si se pasa fechaNacimientoPaciente y el usuario ingresó al menos una medición u observaciones,
 * se calcula la edad y se incluye (paridad con móvil). Si todo va vacío, no se añade edad al payload.
 * @param {Record<string, string>} form
 * @param {string} [fechaNacimientoPaciente] - Opcional; para rellenar edad_paciente_en_medicion si falta
 * @returns {Record<string, number|string|undefined>}
 */
export function signosVitalesToPayload(form, fechaNacimientoPaciente) {
  const payload = {};
  const putDec = (key, raw) => {
    if (!raw?.trim()) return;
    const v = parseOptionalDecimal(raw);
    if (v !== null) payload[key] = v;
  };
  const putInt = (key, raw) => {
    if (!raw?.trim()) return;
    const v = parseOptionalIntField(raw);
    if (v !== null) payload[key] = v;
  };
  putDec('peso_kg', form.peso_kg);
  putDec('talla_m', form.talla_m);
  putDec('medida_cintura_cm', form.medida_cintura_cm);
  putInt('presion_sistolica', form.presion_sistolica);
  putInt('presion_diastolica', form.presion_diastolica);
  putDec('glucosa_mg_dl', form.glucosa_mg_dl);
  putDec('colesterol_mg_dl', form.colesterol_mg_dl);
  putDec('colesterol_ldl', form.colesterol_ldl);
  putDec('colesterol_hdl', form.colesterol_hdl);
  putDec('trigliceridos_mg_dl', form.trigliceridos_mg_dl);
  putDec('hba1c_porcentaje', form.hba1c_porcentaje);
  const hasTypedMeasurement =
    !!form.peso_kg?.trim() ||
    !!form.talla_m?.trim() ||
    !!form.medida_cintura_cm?.trim() ||
    !!form.presion_sistolica?.trim() ||
    !!form.presion_diastolica?.trim() ||
    !!form.glucosa_mg_dl?.trim() ||
    !!form.colesterol_mg_dl?.trim() ||
    !!form.colesterol_ldl?.trim() ||
    !!form.colesterol_hdl?.trim() ||
    !!form.trigliceridos_mg_dl?.trim() ||
    !!form.hba1c_porcentaje?.trim() ||
    !!form.edad_paciente_en_medicion?.trim();
  const hasObservaciones = !!form.observaciones?.trim();
  if (form.edad_paciente_en_medicion?.trim()) {
    putInt('edad_paciente_en_medicion', form.edad_paciente_en_medicion);
  } else if (fechaNacimientoPaciente && (hasTypedMeasurement || hasObservaciones)) {
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
 * Paridad: opción "edad editable" para desbloquear y editar la edad en medición cuando no coincida con la calculada.
 * @param {{ value: Record<string, string>, onChange: (v: Record<string, string>) => void, showImc?: boolean, fechaNacimientoPaciente?: string, showEdadEditableCheckbox?: boolean }}
 */
export default function SignosVitalesForm({ value, onChange, showImc = true, fechaNacimientoPaciente, showEdadEditableCheckbox = true }) {
  const update = (key, val) => onChange({ ...value, [key]: val });

  const peso = value.peso_kg?.trim() ? parseFloat(value.peso_kg) : null;
  const talla = value.talla_m?.trim() ? parseFloat(value.talla_m) : null;
  const imc = showImc && peso != null && talla != null && talla > 0 ? (peso / (talla * talla)).toFixed(2) : null;

  const edadCalculada = fechaNacimientoPaciente ? calcularEdad(fechaNacimientoPaciente) : null;
  const usuarioEditoEdad = value.edad_paciente_en_medicion !== '' && value.edad_paciente_en_medicion !== (edadCalculada != null ? String(edadCalculada) : '');
  const edadEditable = showEdadEditableCheckbox && usuarioEditoEdad ? true : (value._edadEditable === true);
  const puedeMostrarCheckbox = showEdadEditableCheckbox && fechaNacimientoPaciente && edadCalculada != null;
  const edadBloqueada = puedeMostrarCheckbox && !edadEditable;
  const edadDisplay = edadBloqueada
    ? String(edadCalculada)
    : (value.edad_paciente_en_medicion !== '' ? value.edad_paciente_en_medicion : (edadCalculada != null ? String(edadCalculada) : ''));

  const toggleEdadEditable = () => {
    const next = !edadEditable;
    onChange({ ...value, _edadEditable: next, edad_paciente_en_medicion: next ? edadDisplay : '' });
  };

  const inputStyle = (campo, val) => ({ ...INPUT_STYLE, ...getVitalSignValueStyle(campo, val != null && val !== '' ? Number(val) : null) });
  const paSistStyle = getPresionValueStyle(value.presion_sistolica?.trim() ? Number(value.presion_sistolica) : null, value.presion_diastolica?.trim() ? Number(value.presion_diastolica) : null);

  return (
    <div>
      <div style={GRID_STYLE}>
        <Input type="number" placeholder="Peso (kg)" value={value.peso_kg} onChange={(e) => update('peso_kg', e.target.value)} style={INPUT_STYLE} {...DECIMAL_INPUT_PROPS} />
        <Input type="number" placeholder="Talla (m)" value={value.talla_m} onChange={(e) => update('talla_m', e.target.value)} style={INPUT_STYLE} {...DECIMAL_INPUT_PROPS} />
        <Input type="number" placeholder="Cintura (cm)" value={value.medida_cintura_cm} onChange={(e) => update('medida_cintura_cm', e.target.value)} style={inputStyle('medida_cintura_cm', value.medida_cintura_cm)} {...DECIMAL_INPUT_PROPS} />
        <Input type="number" placeholder="PA sist." value={value.presion_sistolica} onChange={(e) => update('presion_sistolica', e.target.value)} style={{ ...INPUT_STYLE, ...paSistStyle }} step={1} />
        <Input type="number" placeholder="PA diast." value={value.presion_diastolica} onChange={(e) => update('presion_diastolica', e.target.value)} style={{ ...INPUT_STYLE, ...paSistStyle }} step={1} />
        <Input type="number" placeholder="Glucosa (mg/dL)" value={value.glucosa_mg_dl} onChange={(e) => update('glucosa_mg_dl', e.target.value)} style={inputStyle('glucosa_mg_dl', value.glucosa_mg_dl)} {...DECIMAL_INPUT_PROPS} />
        <Input type="number" placeholder="Colesterol total" value={value.colesterol_mg_dl} onChange={(e) => update('colesterol_mg_dl', e.target.value)} style={inputStyle('colesterol_mg_dl', value.colesterol_mg_dl)} {...DECIMAL_INPUT_PROPS} />
        <Input type="number" placeholder="LDL" value={value.colesterol_ldl} onChange={(e) => update('colesterol_ldl', e.target.value)} style={inputStyle('colesterol_ldl', value.colesterol_ldl)} {...DECIMAL_INPUT_PROPS} />
        <Input type="number" placeholder="HDL" value={value.colesterol_hdl} onChange={(e) => update('colesterol_hdl', e.target.value)} style={inputStyle('colesterol_hdl', value.colesterol_hdl)} {...DECIMAL_INPUT_PROPS} />
        <Input type="number" placeholder="Triglicéridos" value={value.trigliceridos_mg_dl} onChange={(e) => update('trigliceridos_mg_dl', e.target.value)} style={inputStyle('trigliceridos_mg_dl', value.trigliceridos_mg_dl)} {...DECIMAL_INPUT_PROPS} />
        <Input type="number" placeholder="HbA1c (%)" value={value.hba1c_porcentaje} onChange={(e) => update('hba1c_porcentaje', e.target.value)} style={inputStyle('hba1c_porcentaje', value.hba1c_porcentaje)} {...DECIMAL_INPUT_PROPS} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Input
            type="number"
            placeholder="Edad en medición"
            value={edadDisplay}
            onChange={(e) => update('edad_paciente_en_medicion', e.target.value)}
            style={INPUT_STYLE}
            title={fechaNacimientoPaciente ? (edadBloqueada ? 'Desmarca "Edad editable" para usar la calculada' : 'Años para validar rangos HbA1c') : 'Años para validar rangos HbA1c'}
            disabled={edadBloqueada}
            step={1}
          />
          {puedeMostrarCheckbox && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--color-texto-secundario)', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!edadEditable} onChange={toggleEdadEditable} />
              <span>Edad en medición editable</span>
            </label>
          )}
        </div>
      </div>
      {imc != null && (
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 600, ...getIMCValueStyle(parseFloat(imc)) }}>
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
