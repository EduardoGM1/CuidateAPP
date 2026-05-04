/**
 * Metadatos del asistente de alta de paciente (pasos 1–4).
 * Una sola fuente de verdad para títulos de cabecera y accesibilidad.
 */

export const PACIENTE_REGISTRO_TOTAL_PASOS = 4;

/** @typedef {{ step: number, headerTitle: string, a11yLabel: string }} PacienteRegistroPasoMeta */

/** @type {PacienteRegistroPasoMeta[]} */
export const PACIENTE_REGISTRO_PASOS = [
  { step: 1, headerTitle: 'Configurar PIN', a11yLabel: 'Ir al paso 1, configurar PIN' },
  { step: 2, headerTitle: 'Datos del Paciente', a11yLabel: 'Ir al paso 2, datos del paciente' },
  { step: 3, headerTitle: 'Red de Apoyo', a11yLabel: 'Ir al paso 3, red de apoyo' },
  { step: 4, headerTitle: 'Primera Consulta', a11yLabel: 'Ir al paso 4, primera consulta médica' },
];

/**
 * @param {number} step
 * @returns {string}
 */
export function getPacienteRegistroHeaderTitle(step) {
  const meta = PACIENTE_REGISTRO_PASOS.find((p) => p.step === step);
  return meta?.headerTitle ?? 'Agregar paciente';
}

/**
 * @param {number} step
 * @returns {string}
 */
export function getPacienteRegistroStepA11yLabel(step) {
  const meta = PACIENTE_REGISTRO_PASOS.find((p) => p.step === step);
  return meta?.a11yLabel ?? `Ir al paso ${step}`;
}

/**
 * @param {number} step
 * @returns {boolean}
 */
export function isValidPacienteRegistroStep(step) {
  return (
    Number.isInteger(step) &&
    step >= 1 &&
    step <= PACIENTE_REGISTRO_TOTAL_PASOS
  );
}
