/**
 * Formateo de fechas y números para mostrar en UI.
 */

/**
 * Formatea fecha a dd/mm/yyyy (locale es-MX).
 * @param {string|Date|null|undefined} date
 * @returns {string}
 */
export function formatDate(date) {
  if (date == null) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formatea fecha y hora en un formato legible similar a la app móvil.
 * Ejemplo: "21 noviembre 2025, 14:30"
 * @param {string|Date|null|undefined} date
 * @returns {string}
 */
export function formatDateTime(date) {
  if (date == null) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';

  const meses = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];

  const dia = d.getDate();
  const mes = meses[d.getMonth()];
  const year = d.getFullYear();
  const horas = String(d.getHours()).padStart(2, '0');
  const minutos = String(d.getMinutes()).padStart(2, '0');

  return `${dia} ${mes} ${year}, ${horas}:${minutos}`;
}
