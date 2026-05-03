import { ENFERMEDADES_CRONICAS_KEYS } from '../constants/enfermedadesCronicas';

/**
 * Construye la lista de comorbilidades iniciales para POST (una fila por selección).
 * Usa la clave API `año_diagnostico` (Unicode) que espera el backend.
 *
 * @param {Record<string, boolean>} enfermedadesCronicas
 * @param {Record<string, number|null>} comorbilidadIds
 * @param {Record<string, string>} aniosDiagnosticoPorEnfermedad
 * @returns {Array<{ id_comorbilidad: number, año_diagnostico?: string }>}
 */
export function buildComorbilidadesInicialesPayload(
  enfermedadesCronicas,
  comorbilidadIds,
  aniosDiagnosticoPorEnfermedad
) {
  const list = [];
  for (const key of ENFERMEDADES_CRONICAS_KEYS) {
    if (!enfermedadesCronicas[key] || comorbilidadIds[key] == null) continue;
    const idNum = Number(comorbilidadIds[key]);
    if (!Number.isFinite(idNum) || idNum <= 0) continue;
    const raw = aniosDiagnosticoPorEnfermedad?.[key];
    const trimmed = raw != null ? String(raw).trim() : '';
    const item = { id_comorbilidad: idNum };
    if (trimmed !== '') {
      item.año_diagnostico = trimmed;
    }
    list.push(item);
  }
  return list;
}
