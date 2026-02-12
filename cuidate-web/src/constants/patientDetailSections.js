/** Ancho por defecto del modal de sección (px) */
export const DEFAULT_SECTION_MODAL_WIDTH = 900;

/**
 * Secciones del detalle de paciente (web).
 * Fuente única para cards modales, títulos y ancho de modal.
 * Reutilizable en PacienteDetail, PatientSectionModal y tests.
 */
export const PATIENT_DETAIL_SECTIONS = [
  { id: 'datos', label: 'Datos', icon: '📋', modalWidth: 920 },
  { id: 'citas', label: 'Citas', icon: '📅' },
  { id: 'signos', label: 'Signos vitales', icon: '❤️' },
  { id: 'diagnosticos', label: 'Diagnósticos', icon: '🩺' },
  { id: 'medicacion', label: 'Medicación', icon: '💊' },
  { id: 'red-apoyo', label: 'Red de apoyo', icon: '👥' },
  { id: 'vacunacion', label: 'Vacunación', icon: '💉' },
  { id: 'comorbilidades', label: 'Comorbilidades', icon: '📊' },
  { id: 'detecciones', label: 'Detecciones complicaciones', icon: '⚠️' },
  { id: 'sesiones-educativas', label: 'Sesiones educativas', icon: '📚' },
  { id: 'salud-bucal', label: 'Salud bucal', icon: '🦷' },
  { id: 'detecciones-tb', label: 'Detección tuberculosis', icon: '🫁' },
  { id: 'doctores', label: 'Doctores', icon: '👨‍⚕️' },
  { id: 'graficos', label: 'Gráficos', icon: '📈', modalWidth: 1000 },
];

/** Obtener etiqueta de una sección por id */
export function getSectionLabel(sectionId) {
  const section = PATIENT_DETAIL_SECTIONS.find((s) => s.id === sectionId);
  return section?.label ?? sectionId;
}

/** Obtener ancho del modal para una sección (px) */
export function getSectionModalWidth(sectionId) {
  const section = PATIENT_DETAIL_SECTIONS.find((s) => s.id === sectionId);
  return section?.modalWidth ?? DEFAULT_SECTION_MODAL_WIDTH;
}
