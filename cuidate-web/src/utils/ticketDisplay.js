import { sanitizeForDisplay } from './sanitize';

/** @typedef {'success' | 'warning' | 'error' | 'neutral'} TicketTone */

const ESTADO_MAP = {
  abierto: { label: 'Abierto', tone: 'warning' },
  en_curso: { label: 'En curso', tone: 'warning' },
  resuelto: { label: 'Resuelto', tone: 'success' },
  cerrado: { label: 'Cerrado', tone: 'success' },
};

const PRIORIDAD_MAP = {
  baja: { label: 'Baja', tone: 'success' },
  media: { label: 'Media', tone: 'warning' },
  alta: { label: 'Alta', tone: 'error' },
};

const CATEGORIA_MAP = {
  tecnico: 'Técnico',
  cita_paciente: 'Cita / paciente',
  acceso: 'Acceso',
  catalogo_medicamentos: 'Catálogo de medicamentos',
  otro: 'Otro',
};

export const TICKET_CATEGORIA_OPTIONS = [
  { value: 'tecnico', label: CATEGORIA_MAP.tecnico },
  { value: 'cita_paciente', label: CATEGORIA_MAP.cita_paciente },
  { value: 'acceso', label: CATEGORIA_MAP.acceso },
  { value: 'catalogo_medicamentos', label: CATEGORIA_MAP.catalogo_medicamentos },
  { value: 'otro', label: CATEGORIA_MAP.otro },
];

export const TICKET_DESCRIPCION_PLACEHOLDER_DEFAULT = 'Describe el problema o la solicitud';

/** Texto editable sugerido al elegir catálogo de medicamentos */
export const TICKET_DESCRIPCION_PLACEHOLDER_CATALOGO =
  'Solicito que añadan [nombre del medicamento] en la lista del catálogo.';

export function getTicketCategoriaLabel(categoria) {
  const key = String(categoria ?? '').toLowerCase();
  return CATEGORIA_MAP[key] ?? sanitizeForDisplay(categoria) ?? '—';
}

export function getTicketDescripcionPlaceholder(categoria) {
  if (String(categoria ?? '').toLowerCase() === 'catalogo_medicamentos') {
    return TICKET_DESCRIPCION_PLACEHOLDER_CATALOGO;
  }
  return TICKET_DESCRIPCION_PLACEHOLDER_DEFAULT;
}

export function getTicketEstadoDisplay(estado) {
  const key = String(estado ?? '').toLowerCase();
  const cfg = ESTADO_MAP[key];
  if (cfg) return { ...cfg, raw: key };
  return {
    label: sanitizeForDisplay(estado) || '—',
    tone: 'neutral',
    raw: key,
  };
}

export function getTicketPrioridadDisplay(prioridad) {
  const key = String(prioridad ?? '').toLowerCase();
  const cfg = PRIORIDAD_MAP[key];
  if (cfg) return { ...cfg, raw: key };
  return {
    label: sanitizeForDisplay(prioridad) || '—',
    tone: 'neutral',
    raw: key,
  };
}
