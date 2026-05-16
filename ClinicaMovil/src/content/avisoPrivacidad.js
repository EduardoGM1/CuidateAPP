/**
 * Aviso de Privacidad — versión publicada en la app móvil.
 * Mantener sincronizado con cuidate-web/src/content/avisoPrivacidad.js
 */
export const PRIVACY_NOTICE_VERSION = '1.1.0';

/** false = ocultar cuerpo del aviso (pantalla dedicada y modal); mantener consentimiento */
export const PRIVACY_NOTICE_BODY_VISIBLE = false;

export const PRIVACY_NOTICE_BODY_PLACEHOLDER =
  'El texto detallado del aviso de privacidad estará disponible próximamente.';

export const PRIVACY_NOTICE_META = {
  title: 'Aviso de Privacidad',
  lastUpdated: '10 de mayo de 2026',
  responsibleLabel: 'Responsable del tratamiento',
  responsibleName: 'CuidaTeApp / institución de salud que opera la plataforma',
  contactEmail: 'privacidad@cuidateapp.mx',
};

export const PRIVACY_NOTICE_SECTIONS = [
  {
    id: 'identidad',
    title: '1. Identidad y domicilio del responsable',
    paragraphs: [
      'El responsable del tratamiento de sus datos personales es la institución de salud o entidad que opera CuidaTeApp, en los términos de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y su Reglamento.',
      'Para ejercer sus derechos ARCO (Acceso, Rectificación, Cancelación y Oposición) o revocar su consentimiento, puede contactar al área de privacidad de su institución o al correo indicado al final de este aviso.',
    ],
  },
  {
    id: 'datos',
    title: '2. Datos personales que recabamos',
    paragraphs: [
      'Podemos tratar, según su rol en la plataforma: datos de identificación y contacto (nombre, CURP, teléfono, correo, domicilio); datos de salud y expediente clínico (diagnósticos, signos vitales, medicamentos, citas, notas médicas); datos de acceso (usuario, contraseña o PIN, identificadores de dispositivo para notificaciones); y datos de uso técnico necesarios para seguridad y auditoría.',
      'Los datos de salud se consideran sensibles conforme a la LFPDPPP y requieren su consentimiento expreso por separado.',
    ],
  },
  {
    id: 'finalidades',
    title: '3. Finalidades del tratamiento',
    paragraphs: [
      'Primarias (necesarias para el servicio): prestación de atención médica, gestión de citas, expediente clínico, comunicación con su equipo de salud, recordatorios de medicamentos y citas, y cumplimiento de obligaciones legales en materia de salud (NOM-004-SSA3-2012 y normativa aplicable).',
      'Secundarias (opcionales, solo con su consentimiento): estadísticas agregadas, mejora de la plataforma y comunicaciones informativas. Puede oponerse en cualquier momento sin afectar las finalidades primarias.',
    ],
  },
  {
    id: 'transferencias',
    title: '4. Transferencias y encargados',
    paragraphs: [
      'Sus datos pueden ser tratados por proveedores tecnológicos que actúan como encargados (hosting, mensajería, notificaciones push), bajo contratos que exigen medidas de seguridad y confidencialidad.',
      'No vendemos ni comercializamos sus datos personales. Las transferencias sin consentimiento solo se realizarán en los supuestos permitidos por la ley.',
    ],
  },
  {
    id: 'seguridad',
    title: '5. Medidas de seguridad',
    paragraphs: [
      'Aplicamos medidas administrativas, técnicas y físicas razonables: cifrado de datos sensibles, control de acceso por roles, auditoría de acciones, comunicación segura (HTTPS) y almacenamiento protegido en dispositivos autorizados.',
    ],
  },
  {
    id: 'derechos',
    title: '6. Derechos ARCO y revocación',
    paragraphs: [
      'Usted puede solicitar acceso, rectificación, cancelación u oposición al tratamiento de sus datos, así como revocar el consentimiento otorgado, mediante solicitud al responsable. Responderemos en los plazos legales.',
      'Si considera que su derecho a la protección de datos fue vulnerado, puede acudir al Instituto Nacional de Transparencia, Acceso a la Información y Protección de Datos Personales (INAI).',
    ],
  },
  {
    id: 'conservacion',
    title: '7. Conservación',
    paragraphs: [
      'Conservaremos sus datos durante el tiempo necesario para las finalidades descritas y los plazos que exija la normativa sanitaria y de archivos clínicos. Transcurrido ese plazo, se bloquearán o eliminarán de forma segura.',
    ],
  },
  {
    id: 'cambios',
    title: '8. Cambios al aviso',
    paragraphs: [
      'Podemos actualizar este aviso. Le notificaremos cambios sustanciales en la aplicación y, de ser necesario, solicitaremos nuevamente su consentimiento.',
    ],
  },
];

/** Textos del modal de consentimiento (primer acceso del paciente). */
export const PRIVACY_CONSENT_UI = {
  modalTitle: 'Aviso de Privacidad',
  heading: 'Debes aceptar antes de continuar',
  footer:
    'Al continuar, acepto el tratamiento de mis datos conforme al Aviso de Privacidad de la aplicación.',
  acceptButton: 'Aceptar y continuar',
};

export const PRIVACY_CONSENT_LABELS = {
  privacyNotice:
    'He leído y acepto el Aviso de Privacidad y los Términos y Condiciones de la aplicación.',
  healthData:
    'Por medio de la presente, manifiesto mi consentimiento para que la información proporcionada en esta aplicación sea utilizada únicamente con fines de seguimiento médico, académicos y de investigación relacionados con el control de comorbilidades en hospitales comunitarios, garantizando en todo momento la confidencialidad y protección de mis datos personales.',
};
