import { getSectionLabel } from '../constants/patientDetailSections';
import { COPIA_MODAL_PACIENTE } from './catalogoOnboarding';

const MODAL_BODY_TARGET = '[data-tour="patient-section-modal-body"]';

/**
 * Pasos de joyride para la primera apertura de un modal de sección en detalle de paciente.
 * @param {string} sectionId - id de PATIENT_DETAIL_SECTIONS
 */
export function getPatientModalSectionSteps(sectionId) {
  if (!sectionId) return [];
  const raw = COPIA_MODAL_PACIENTE[sectionId];
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
