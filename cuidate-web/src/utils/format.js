/**
 * Formateo de fechas, números y nombres para mostrar en UI.
 * Fechas en formato dd/mmm/yyyy (mes abreviado en español).
 * Nombre completo en orden: Apellido paterno + Apellido materno + Nombre (ej. "González Morales José").
 */

/**
 * Devuelve el nombre completo en formato "Apellido paterno Apellido materno Nombre".
 * @param {Object} obj - Objeto con apellido_paterno, apellido_materno, nombre (o apellido como alias de apellido_paterno).
 * @returns {string} Ej. "González Morales José", o string vacío si no hay datos.
 */
export function formatNombreCompleto(obj) {
  if (obj == null || typeof obj !== 'object') return '';
  const ap = (obj.apellido_paterno ?? obj.apellido ?? '').trim();
  const am = (obj.apellido_materno ?? '').trim();
  const n = (obj.nombre ?? '').trim();
  const parts = [ap, am, n].filter(Boolean);
  return parts.join(' ') || '';
}

/**
 * Nombre para bienvenida y cabecera (identidad clínica, sin email).
 * Doctor: "Dr. Eduardo Lalito" (nombre + apellido paterno).
 * Admin: nombre completo o "Administrador".
 */
export function formatWelcomeDisplayName(user) {
  if (user == null || typeof user !== 'object') return '';
  const rol = String(user.rol ?? user.role ?? '').trim();
  const nombre = String(user.nombre ?? '').trim();
  const apellido = String(user.apellido_paterno ?? user.apellido ?? '').trim();

  if (rol === 'Doctor') {
    const parts = [nombre, apellido].filter(Boolean);
    if (parts.length > 0) return `Dr. ${parts.join(' ')}`;
  }

  if (rol === 'Admin') {
    const full = formatNombreCompleto(user);
    if (full) return full;
    return 'Administrador';
  }

  const full = formatNombreCompleto(user);
  if (full) return full;
  return '';
}

/**
 * Usuario en listado/detalle de auditoría: nombre legible y correo si aplica.
 * @param {{ usuario_nombre?: string, usuario_email?: string, Usuario?: { email?: string } }} registro
 * @returns {string}
 */
export function formatAuditoriaUsuarioDisplay(registro) {
  if (registro == null) return '—';
  const nombre = String(registro.usuario_nombre ?? '').trim();
  const email = String(registro.usuario_email ?? registro.Usuario?.email ?? '').trim();
  if (nombre && email && nombre !== email && !nombre.includes('@')) {
    return `${nombre} (${email})`;
  }
  return nombre || email || '—';
}

const MESES_ABREV = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

const DIAS_SEMANA = [
  'domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado',
];

const pad2 = (n) => String(n).padStart(2, '0');

/**
 * Solo hora en 12 h (ej: "1:00 pm").
 * @param {Date} d - Instancia Date válida
 * @returns {string}
 */
function formatTime12hPmFromDate(d) {
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${pad2(m)} ${ap}`;
}

/**
 * Formatea fecha a dd/mmm/yyyy (ej: 20/feb/2026).
 * @param {string|Date|null|undefined} date
 * @returns {string}
 */
export function formatDate(date) {
  if (date == null) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = MESES_ABREV[d.getMonth()];
  const year = d.getFullYear();
  return `${dia}/${mes}/${year}`;
}

/**
 * Fecha y hora: dd/mmm/yyyy y hora en 12 h (ej: 23/abr/2026, 1:00 pm).
 * @param {string|Date|null|undefined} date
 * @returns {string}
 */
export function formatDateTime(date) {
  if (date == null) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';

  const dia = String(d.getDate()).padStart(2, '0');
  const mes = MESES_ABREV[d.getMonth()];
  const year = d.getFullYear();

  return `${dia}/${mes}/${year}, ${formatTime12hPmFromDate(d)}`;
}

/**
 * Igual que {@link formatDateTime} (12 h, sufijos am/pm en minúsculas).
 * @param {string|Date|null|undefined} date
 * @returns {string}
 */
export function formatDateTimeAmPm(date) {
  return formatDateTime(date);
}

/**
 * Solo la hora en 12 h (ej: "1:00 pm").
 * @param {string|Date|null|undefined} date
 * @returns {string}
 */
export function formatTime(date) {
  if (date == null) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';
  return formatTime12hPmFromDate(d);
}

/**
 * Formatea fecha con día de la semana: "jueves, 20/feb/2026".
 * @param {string|Date|null|undefined} date
 * @returns {string}
 */
export function formatDateWithWeekday(date) {
  if (date == null) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';
  const diaSemana = DIAS_SEMANA[d.getDay()];
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = MESES_ABREV[d.getMonth()];
  const year = d.getFullYear();
  return `${diaSemana}, ${dia}/${mes}/${year}`;
}

/**
 * Normaliza un valor de hora (TIME o string) a HH:mm para tablas clínicas.
 * @param {string|unknown} raw
 * @returns {string|null}
 */
function sliceHoraHHmm(raw) {
  if (raw == null || raw === '') return null;
  const s = typeof raw === 'string' ? raw : String(raw);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

function minutesFromMidnight(hhmm) {
  const m = sliceHoraHHmm(hhmm);
  if (!m) return null;
  const [h, min] = m.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(min)) return null;
  return h * 60 + min;
}

/**
 * Lista HH:mm del plan (horarios[] o horario único). Acepta horarios serializados como string JSON.
 * @param {{ horario?: string|null, horarios?: unknown }|null|undefined} planDetalle
 * @returns {string[]}
 */
export function listHorariosPrescriptosPlanDetalle(planDetalle) {
  if (planDetalle == null || typeof planDetalle !== 'object') return [];
  let list = planDetalle.horarios;
  if (typeof list === 'string' && list.trim()) {
    try {
      const parsed = JSON.parse(list);
      list = Array.isArray(parsed) ? parsed : null;
    } catch {
      list = null;
    }
  }
  const parts = [];
  if (Array.isArray(list) && list.length > 0) {
    for (const x of list) {
      const h = sliceHoraHHmm(x);
      if (h) parts.push(h);
    }
  }
  const single = sliceHoraHHmm(planDetalle.horario);
  if (single) parts.push(single);
  return [...new Set(parts)].sort((a, b) => a.localeCompare(b));
}

/**
 * Horario prescripto del medicamento según PlanDetalle (campo horario o lista horarios).
 * Si hay varios horarios y se pasa `horaReferencia` (p. ej. hora de administración), se muestra el más cercano ese día.
 * @param {{ horario?: string|null, horarios?: unknown }|null|undefined} planDetalle
 * @param {string|null|undefined} [horaReferencia] - HH:mm o TIME para elegir ranura (varios horarios)
 * @returns {string}
 */
export function formatHorarioPrescriptoMedicamento(planDetalle, horaReferencia = null) {
  const parts = listHorariosPrescriptosPlanDetalle(planDetalle);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0];
  const refMin = minutesFromMidnight(horaReferencia);
  if (refMin == null) return parts.join(', ');
  let best = parts[0];
  let bestDiff = Infinity;
  for (const p of parts) {
    const pm = minutesFromMidnight(p);
    if (pm == null) continue;
    const d = Math.abs(pm - refMin);
    if (d < bestDiff) {
      bestDiff = d;
      best = p;
    }
  }
  return best;
}

/**
 * Hora en que se registró la administración del medicamento (registro de toma).
 * @param {string|unknown|null|undefined} horaToma
 * @returns {string}
 */
export function formatHoraAdministracionRegistrada(horaToma) {
  if (horaToma == null || horaToma === '') return '—';
  return sliceHoraHHmm(horaToma) ?? '—';
}
