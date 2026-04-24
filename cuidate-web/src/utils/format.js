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

/**
 * Horario prescripto del medicamento según PlanDetalle (campo horario o lista horarios).
 * @param {{ horario?: string|null, horarios?: unknown }|null|undefined} planDetalle
 * @returns {string}
 */
export function formatHorarioPrescriptoMedicamento(planDetalle) {
  if (planDetalle == null || typeof planDetalle !== 'object') return '—';
  const list = planDetalle.horarios;
  if (Array.isArray(list) && list.length > 0) {
    const parts = list
      .map((x) => sliceHoraHHmm(x))
      .filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '—';
  }
  const single = sliceHoraHHmm(planDetalle.horario);
  return single ?? '—';
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
