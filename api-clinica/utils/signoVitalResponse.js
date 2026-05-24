import EncryptionService from '../services/encryptionService.js';

function decryptFieldIfNeeded(value) {
  if (value === null || value === undefined || value === '') return value;
  const isEncryptedObject =
    typeof value === 'object' && value !== null && value.encrypted != null && value.iv != null && value.authTag != null;
  if (isEncryptedObject) {
    try {
      const decrypted = EncryptionService.decryptField(value);
      return decrypted !== null ? decrypted : null;
    } catch {
      return null;
    }
  }
  if (typeof value !== 'string') return value;
  try {
    const jsonData = JSON.parse(value);
    if (jsonData.encrypted && jsonData.iv && jsonData.authTag) {
      const decrypted = EncryptionService.decrypt(value);
      return decrypted !== null ? decrypted : value;
    }
  } catch {
    /* not JSON */
  }
  const parts = value.split(':');
  if (parts.length === 3 && parts[0].length > 0 && parts[1].length > 0 && parts[2].length > 0) {
    try {
      const decrypted = EncryptionService.decrypt(value);
      return decrypted !== null ? decrypted : value;
    } catch {
      return value;
    }
  }
  return value;
}

const NUMERIC_FIELDS = [
  'presion_sistolica',
  'presion_diastolica',
  'glucosa_mg_dl',
  'colesterol_mg_dl',
  'colesterol_ldl',
  'colesterol_hdl',
  'trigliceridos_mg_dl',
  'hba1c_porcentaje',
];

function looksEncrypted(value) {
  if (value == null || typeof value !== 'string') return false;
  const t = value.trim();
  if (!t) return false;
  if (t.startsWith('{') && t.includes('encrypted')) return true;
  const parts = t.split(':');
  return parts.length === 3 && parts[0].length > 0 && parts[1].length > 0 && parts[2].length > 0;
}

function toNumber(value, { lite = false } = {}) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = parseFloat(trimmed);
  if (Number.isFinite(parsed) && trimmed === String(parsed)) return parsed;
  if (lite && !looksEncrypted(trimmed)) return Number.isFinite(parsed) ? parsed : null;
  const decrypted = decryptFieldIfNeeded(trimmed);
  if (decrypted !== trimmed && decrypted != null) {
    const n = parseFloat(decrypted);
    return Number.isFinite(n) ? n : null;
  }
  if (looksEncrypted(trimmed)) return null;
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Formatea un registro SignoVital para respuesta API.
 * @param {object} signo - instancia Sequelize o plain
 * @param {{ lite?: boolean }} options
 */
export function formatSignoVitalRow(signo, { lite = false } = {}) {
  const signoData = signo?.toJSON ? signo.toJSON() : signo;
  const decryptedData = { ...signoData };

  for (const field of NUMERIC_FIELDS) {
    decryptedData[field] = toNumber(decryptedData[field], { lite });
  }

  let observaciones = null;
  if (!lite && decryptedData.observaciones) {
    observaciones = decryptFieldIfNeeded(decryptedData.observaciones);
  }

  const row = {
    id_signo: decryptedData.id_signo,
    id_paciente: decryptedData.id_paciente,
    id_cita: decryptedData.id_cita,
    fecha_medicion: decryptedData.fecha_medicion,
    peso_kg: decryptedData.peso_kg,
    talla_m: decryptedData.talla_m,
    imc: decryptedData.imc,
    medida_cintura_cm: decryptedData.medida_cintura_cm,
    presion_sistolica: decryptedData.presion_sistolica,
    presion_diastolica: decryptedData.presion_diastolica,
    glucosa_mg_dl: decryptedData.glucosa_mg_dl,
    colesterol_mg_dl: decryptedData.colesterol_mg_dl,
    colesterol_ldl: decryptedData.colesterol_ldl,
    colesterol_hdl: decryptedData.colesterol_hdl,
    trigliceridos_mg_dl: decryptedData.trigliceridos_mg_dl,
    hba1c_porcentaje: decryptedData.hba1c_porcentaje,
    registrado_por: decryptedData.registrado_por,
    fecha_creacion: decryptedData.fecha_creacion,
  };
  if (!lite) row.observaciones = observaciones;
  return row;
}

export const MESES_ABREV_EVOLUCION = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function buildSignosDateWhere(pacienteId, ymdInicio, ymdFin, sequelize, Op) {
  const where = { id_paciente: pacienteId };
  const dateClauses = [];
  if (ymdInicio) {
    dateClauses.push(
      sequelize.where(sequelize.fn('DATE', sequelize.col('fecha_medicion')), { [Op.gte]: ymdInicio })
    );
  }
  if (ymdFin) {
    dateClauses.push(
      sequelize.where(sequelize.fn('DATE', sequelize.col('fecha_medicion')), { [Op.lte]: ymdFin })
    );
  }
  if (dateClauses.length) where[Op.and] = dateClauses;
  return where;
}
