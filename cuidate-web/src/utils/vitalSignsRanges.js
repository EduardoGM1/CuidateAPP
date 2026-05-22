/**
 * Rangos de referencia para signos vitales (adultos).
 * Valores fuera de rango o elevados se muestran en rojo en la UI.
 * Basado en OMS, guías clínicas y consensos (presión, glucosa, lípidos, HbA1c, IMC).
 */

const COLOR_NORMAL = 'var(--color-texto-primario)';
const COLOR_FUERA_DE_RANGO = 'var(--color-error, #dc3545)';

/**
 * Rangos normales (adultos). Fuera de estos se considera "elevado" o "bajo" según el indicador.
 * - Presión: OMS/ESH (normal alta 120-139/80-89; hipertensión ≥140/90)
 * - Glucosa ayunas: <70 bajo, 70-99 normal, 100-125 prediabetes, ≥126 elevado
 * - Colesterol total: <200 óptimo, ≥200 elevado
 * - LDL: <100 óptimo, 100-129 normal alto, ≥130 elevado
 * - HDL: <40 bajo (riesgo), ≥40 aceptable
 * - Triglicéridos: <150 normal, ≥150 elevado
 * - HbA1c: <5.7 normal, 5.7-6.4 prediabetes, ≥6.5 elevado
 * - IMC: <18.5 bajo peso, 18.5-24.9 normal, 25-29.9 sobrepeso, ≥30 obesidad
 * - Cintura: >102 cm (hombres) / >88 cm (mujeres) riesgo; usamos >102 para marcar elevado
 */
export const RANGOS = {
  presion_sistolica: { min: 90, max: 120 },       // >120 normal-alta, ≥140 hipertensión → rojo ≥140
  presion_diastolica: { min: 60, max: 80 },     // >80 normal-alta, ≥90 hipertensión → rojo ≥90
  glucosa_mg_dl: { min: 70, max: 126 },         // <70 hipo, >126 elevado
  colesterol_mg_dl: { min: 0, max: 200 },
  colesterol_ldl: { min: 0, max: 130 },
  colesterol_hdl: { min: 40, max: 999 },        // HDL bajo es malo (<40)
  trigliceridos_mg_dl: { min: 0, max: 150 },
  hba1c_porcentaje: { min: 0, max: 999 },        // sin tope en captura; color solo referencial
  imc: { min: 18.5, max: 29.9 },                // <18.5 o ≥30 fuera de rango
  medida_cintura_cm: { min: 0, max: 102 },      // >102 riesgo abdominal
};

/**
 * Indica si un valor numérico está fuera del rango normal para el campo dado.
 * @param {string} campo - Clave del signo (ej: 'glucosa_mg_dl', 'presion_sistolica')
 * @param {number|string|null} valor - Valor a evaluar
 * @returns {boolean}
 */
export function estaFueraDeRango(campo, valor) {
  if (valor === null || valor === undefined || valor === '') return false;
  const num = Number(valor);
  if (Number.isNaN(num)) return false;
  const r = RANGOS[campo];
  if (!r) return false;
  return num < r.min || num > r.max;
}

/**
 * Para presión arterial: true si sistólica o diastólica están fuera de rango.
 */
export function presionFueraDeRango(sistolica, diastolica) {
  return estaFueraDeRango('presion_sistolica', sistolica) || estaFueraDeRango('presion_diastolica', diastolica);
}

/**
 * Devuelve el estilo (color) para mostrar el valor: rojo si está fuera de rango.
 * @param {string} campo - Clave del signo vital
 * @param {number|string|null} valor - Valor a mostrar
 * @returns {{ color: string }}
 */
export function getVitalSignValueStyle(campo, valor) {
  if (estaFueraDeRango(campo, valor)) {
    return { color: COLOR_FUERA_DE_RANGO };
  }
  return { color: COLOR_NORMAL };
}

/**
 * Estilo para presión arterial (sistólica/diastólica). Rojo si alguna está fuera de rango.
 */
export function getPresionValueStyle(sistolica, diastolica) {
  if (presionFueraDeRango(sistolica, diastolica)) {
    return { color: COLOR_FUERA_DE_RANGO };
  }
  return { color: COLOR_NORMAL };
}

/**
 * Estilo para IMC. Rojo si <18.5 o ≥30.
 */
export function getIMCValueStyle(imc) {
  if (imc == null || imc === '') return { color: COLOR_NORMAL };
  const num = Number(imc);
  if (Number.isNaN(num)) return { color: COLOR_NORMAL };
  if (num < 18.5 || num >= 30) return { color: COLOR_FUERA_DE_RANGO };
  return { color: COLOR_NORMAL };
}

/**
 * Dado un objeto signo vital (registro de la API), devuelve un mapa campo -> boolean (si está fuera de rango).
 * Incluye 'imc' calculado si hay peso y talla.
 */
export function getCamposFueraDeRango(signo) {
  if (!signo || typeof signo !== 'object') return {};
  const imc = signo.imc ?? (signo.peso_kg != null && signo.talla_m != null
    ? Number(signo.peso_kg) / (Number(signo.talla_m) ** 2)
    : null);
  const out = {};
  const campos = [
    'presion_sistolica', 'presion_diastolica', 'glucosa_mg_dl',
    'colesterol_mg_dl', 'colesterol_ldl', 'colesterol_hdl',
    'trigliceridos_mg_dl', 'hba1c_porcentaje', 'medida_cintura_cm',
  ];
  campos.forEach((c) => { out[c] = estaFueraDeRango(c, signo[c]); });
  out.imc = imc != null && (Number(imc) < 18.5 || Number(imc) >= 30);
  return out;
}

export default {
  RANGOS,
  COLOR_FUERA_DE_RANGO,
  estaFueraDeRango,
  presionFueraDeRango,
  getVitalSignValueStyle,
  getPresionValueStyle,
  getIMCValueStyle,
  getCamposFueraDeRango,
};
