import { getSectionLabel } from '../constants/patientDetailSections';

const MODAL_BODY_TARGET = '[data-tour="patient-section-modal-body"]';

/** Textos breves por sección (1 o 2 frases cada entrada). */
const SECTION_COPY = {
  'historial-consultas': [
    'Aquí ves las consultas anteriores del paciente en orden cronológico. Pulsa una fila para abrir el detalle de esa cita.',
  ],
  monitoreo: [
    'El monitoreo continuo concentra alertas y seguimiento cuando hay datos vinculados. Revisa lo que aparezca en pantalla para priorizar la atención.',
  ],
  citas: [
    'Gestiona las citas de este paciente: próximas y pasadas según lo que cargue el sistema. Desde aquí suele poderse crear o revisar citas según tu rol.',
  ],
  signos: [
    'Registra o revisa signos vitales (peso, presión, glucosa, etc.). Puedes ver la evolución y, si aplica, editar o añadir mediciones.',
  ],
  diagnosticos: [
    'Listado de diagnósticos asociados al paciente. Puedes consultar fechas y descripciones y añadir nuevos cuando corresponda clínicamente.',
  ],
  medicacion: [
    'Planes de medicación y tomas: revisa qué está activo, las dosis y el historial. Los botones te guían para agregar o ajustar tratamientos.',
  ],
  'red-apoyo': [
    'Contactos de la red de apoyo (familiares o acompañantes). Sirve para comunicación autorizada y datos de emergencia.',
  ],
  vacunacion: [
    'Esquema de vacunas aplicadas o pendientes. Puedes registrar nuevas dosis con fecha y datos del biológico.',
  ],
  comorbilidades: [
    'Condiciones crónicas o asociadas registradas. Ayuda a tener el contexto clínico completo ante nuevas consultas.',
  ],
  detecciones: [
    'Tamizajes y detecciones de complicaciones. Documenta resultados y seguimiento según los protocolos de tu institución.',
  ],
  'sesiones-educativas': [
    'Sesiones de educación en salud: tipo, fecha y asistencia. Útil para el seguimiento del autocuidado del paciente.',
  ],
  'salud-bucal': [
    'Registros de salud bucal y tratamientos odontológicos relacionados con el paciente.',
  ],
  'detecciones-tb': [
    'Encuestas y seguimiento de tuberculosis cuando aplique. Completa solo los campos que correspondan al caso.',
  ],
  doctores: [
    'Doctores vinculados a este paciente. Según permisos, puedes asignar o quitar profesionales de la lista.',
  ],
  graficos: [
    'Gráficos de evolución (por ejemplo signos vitales en el tiempo). Cambia filtros o rangos si la pantalla lo permite para interpretar tendencias.',
  ],
};

/**
 * Pasos de joyride para la primera apertura de un modal de sección en detalle de paciente.
 * @param {string} sectionId - id de PATIENT_DETAIL_SECTIONS
 */
export function getPatientModalSectionSteps(sectionId) {
  if (!sectionId) return [];
  const raw = SECTION_COPY[sectionId];
  const lines = raw?.length
    ? Array.isArray(raw)
      ? raw
      : [raw]
    : [
        `En «${getSectionLabel(sectionId)}» trabajas con este bloque del expediente. Usa los botones y listas para consultar, añadir o cambiar datos según tus permisos.`,
      ];
  return lines.map((content) => ({
    target: MODAL_BODY_TARGET,
    placement: 'center',
    disableBeacon: true,
    content,
  }));
}
