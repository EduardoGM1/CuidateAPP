import ConsentimientoPrivacidad from '../models/ConsentimientoPrivacidad.js';

/** Versión vigente del aviso (sincronizar con apps). */
export const CURRENT_PRIVACY_NOTICE_VERSION = '1.1.0';

/**
 * @param {{ rol: 'Paciente'|'Doctor', id_paciente?: number|null, id_doctor?: number|null, version?: string }} filters
 */
export async function findLatestValidConsent({ rol, id_paciente, id_doctor, version = CURRENT_PRIVACY_NOTICE_VERSION }) {
  const where = {
    rol,
    version_aviso: version,
    revocado: false,
    acepto_aviso_terminos: true,
    acepto_datos_salud: true,
  };

  if (rol === 'Paciente') {
    where.id_paciente = id_paciente;
  } else {
    where.id_doctor = id_doctor;
  }

  return ConsentimientoPrivacidad.findOne({
    where,
    order: [['created_at', 'DESC']],
  });
}

/**
 * @param {object} payload
 */
export async function insertConsent(payload) {
  return ConsentimientoPrivacidad.create(payload);
}

/**
 * Historial reciente (auditoría).
 * @param {{ rol: string, id_paciente?: number, id_doctor?: number, limit?: number }} params
 */
export async function findConsentHistory({ rol, id_paciente, id_doctor, limit = 20 }) {
  const where = { rol };
  if (rol === 'Paciente') {
    where.id_paciente = id_paciente;
  } else {
    where.id_doctor = id_doctor;
  }

  return ConsentimientoPrivacidad.findAll({
    where,
    order: [['created_at', 'DESC']],
    limit: Math.min(limit, 100),
  });
}
