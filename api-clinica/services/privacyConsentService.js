import {
  CURRENT_PRIVACY_NOTICE_VERSION,
  findLatestValidConsent,
  insertConsent,
} from '../repositories/privacyConsentRepository.js';

/**
 * Resuelve sujeto Paciente/Doctor desde req.user (post authenticateToken).
 * @param {object} user
 * @returns {{ rol: 'Paciente'|'Doctor', id_usuario?: number, id_paciente?: number, id_doctor?: number } | null}
 */
export function resolveConsentSubject(user) {
  if (!user) return null;

  const rolRaw = (user.rol ?? user.user_type ?? user.role ?? '').toString().toLowerCase();

  if (rolRaw === 'paciente') {
    const id_paciente = user.id_paciente ?? user.id;
    if (!id_paciente) return null;
    return {
      rol: 'Paciente',
      id_paciente: Number(id_paciente),
      id_usuario: user.id_usuario ? Number(user.id_usuario) : null,
    };
  }

  if (rolRaw === 'doctor') {
    const id_doctor = user.id_doctor;
    if (!id_doctor) return null;
    return {
      rol: 'Doctor',
      id_doctor: Number(id_doctor),
      id_usuario: user.id_usuario ? Number(user.id_usuario) : user.id ? Number(user.id) : null,
    };
  }

  return null;
}

/**
 * @param {object} user
 * @param {string} [version]
 */
export async function getConsentStatus(user, version = CURRENT_PRIVACY_NOTICE_VERSION) {
  const subject = resolveConsentSubject(user);
  if (!subject) {
    return {
      required: false,
      hasValidConsent: true,
      version,
    };
  }

  const latest = await findLatestValidConsent({ ...subject, version });

  return {
    required: true,
    hasValidConsent: Boolean(latest),
    version,
    acceptedAt: latest?.created_at ?? null,
    id_consentimiento: latest?.id_consentimiento ?? null,
  };
}

/**
 * @param {object} user
 * @param {{ version: string, privacyNotice: boolean, healthData: boolean, canal: 'web'|'mobile', userAgent?: string, ipAddress?: string }} data
 */
export async function recordConsent(user, data) {
  const subject = resolveConsentSubject(user);
  if (!subject) {
    const err = new Error('Solo pacientes y doctores deben registrar consentimiento de privacidad');
    err.statusCode = 403;
    throw err;
  }

  const version = data.version || CURRENT_PRIVACY_NOTICE_VERSION;
  const privacyNotice = Boolean(data.privacyNotice);
  const healthData = Boolean(data.healthData);

  if (!privacyNotice || !healthData) {
    const err = new Error('Debe aceptar el aviso de privacidad y el tratamiento de datos de salud');
    err.statusCode = 400;
    throw err;
  }

  if (version !== CURRENT_PRIVACY_NOTICE_VERSION) {
    const err = new Error(`Versión de aviso no vigente. Versión actual: ${CURRENT_PRIVACY_NOTICE_VERSION}`);
    err.statusCode = 400;
    throw err;
  }

  const row = await insertConsent({
    id_usuario: subject.id_usuario ?? null,
    id_paciente: subject.id_paciente ?? null,
    id_doctor: subject.id_doctor ?? null,
    rol: subject.rol,
    version_aviso: version,
    acepto_aviso_terminos: true,
    acepto_datos_salud: true,
    canal: data.canal === 'mobile' ? 'mobile' : 'web',
    user_agent: data.userAgent?.slice(0, 500) ?? null,
    ip_address: data.ipAddress?.slice(0, 45) ?? null,
    revocado: false,
  });

  return {
    success: true,
    hasValidConsent: true,
    version,
    acceptedAt: row.created_at,
    id_consentimiento: row.id_consentimiento,
  };
}
