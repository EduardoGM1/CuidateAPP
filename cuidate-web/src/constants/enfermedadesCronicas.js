/**
 * Enfermedades crónicas para comorbilidades (paridad web/móvil).
 * Reutilizado en AgregarPaciente y EditarPaciente.
 */
export const ENFERMEDADES_CRONICAS_KEYS = [
  'diabetes',
  'hipertension',
  'obesidad',
  'dislipidemia',
  'enfermedad_renal_cronica',
  'epoc',
  'enfermedad_cardiovascular',
  'tuberculosis',
  'asma',
  'tabaquismo',
  'otro',
];

export const ENFERMEDADES_CRONICAS_LABELS = {
  diabetes: 'Diabetes',
  hipertension: 'Hipertensión',
  obesidad: 'Obesidad',
  dislipidemia: 'Dislipidemia',
  enfermedad_renal_cronica: 'Enfermedad renal crónica',
  epoc: 'EPOC',
  enfermedad_cardiovascular: 'Enfermedad cardiovascular',
  tuberculosis: 'Tuberculosis',
  asma: 'Asma',
  tabaquismo: 'Tabaquismo',
  otro: 'Otro',
};

/** Objeto inicial de checkboxes (todos false). */
export function getInitialEnfermedadesCronicas() {
  const o = {};
  ENFERMEDADES_CRONICAS_KEYS.forEach((k) => {
    o[k] = false;
  });
  return o;
}

/** Objeto inicial de comorbilidadIds (todos null). */
export function getInitialComorbilidadIds() {
  const o = {};
  ENFERMEDADES_CRONICAS_KEYS.forEach((k) => {
    o[k] = null;
  });
  return o;
}
