import {
  ENFERMEDADES_CRONICAS_KEYS,
  getInitialEnfermedadesCronicas,
  getInitialAniosDiagnosticoPorEnfermedad,
} from '../constants/enfermedadesCronicas';

function normId(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * A partir de las filas de GET /pacientes/:id/comorbilidades y el mapa catálogo→clave,
 * rellena checkboxes, años por enfermedad y flags globales de tratamiento (OR de todas las filas).
 *
 * @param {Array<{
 *   id_comorbilidad?: number|string,
 *   año_diagnostico?: number|string|null,
 *   ano_diagnostico?: number|string|null,
 *   recibe_tratamiento_no_farmacologico?: boolean,
 *   recibe_tratamiento_farmacologico?: boolean
 * }>} rows
 * @param {Record<string, number|null>} comorbilidadIdsByKey
 * @returns {{
 *   enfermedadesCronicas: Record<string, boolean>,
 *   aniosDiagnosticoPorEnfermedad: Record<string, string>,
 *   tratamientoNoFarmaco: boolean,
 *   tratamientoFarmaco: boolean
 * }}
 */
export function hydrateEnfermedadesCronicasFromPacienteRows(rows, comorbilidadIdsByKey) {
  const enfermedades = getInitialEnfermedadesCronicas();
  const anios = getInitialAniosDiagnosticoPorEnfermedad();
  let tratNo = false;
  let tratSi = false;

  const idToKey = {};
  for (const key of ENFERMEDADES_CRONICAS_KEYS) {
    const cid = comorbilidadIdsByKey[key];
    const idCom = normId(cid);
    if (idCom != null) idToKey[idCom] = key;
  }

  for (const row of rows || []) {
    const idCom = normId(row.id_comorbilidad);
    const key = idCom != null ? idToKey[idCom] : undefined;
    if (key) {
      enfermedades[key] = true;
      const y = row.año_diagnostico ?? row.ano_diagnostico;
      if (y != null && String(y).trim() !== '') {
        anios[key] = String(y).trim();
      }
    }
    if (row.recibe_tratamiento_no_farmacologico === true || row.recibe_tratamiento_no_farmacologico === 'true') {
      tratNo = true;
    }
    if (row.recibe_tratamiento_farmacologico === true || row.recibe_tratamiento_farmacologico === 'true') {
      tratSi = true;
    }
  }

  return {
    enfermedadesCronicas: enfermedades,
    aniosDiagnosticoPorEnfermedad: anios,
    tratamientoNoFarmaco: tratNo,
    tratamientoFarmaco: tratSi,
  };
}
