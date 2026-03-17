/**
 * Formato de nombre completo: "Apellido paterno Apellido materno Nombre"
 * (ej. "González Morales José"). Misma lógica que la app web.
 *
 * @param {Object} obj - Objeto con apellido_paterno, apellido_materno, nombre (o apellido como alias de apellido_paterno).
 * @returns {string}
 */
export function formatNombreCompleto(obj) {
  if (obj == null || typeof obj !== 'object') return '';
  const ap = String(obj.apellido_paterno ?? obj.apellido ?? '').trim();
  const am = String(obj.apellido_materno ?? '').trim();
  const n = String(obj.nombre ?? '').trim();
  const parts = [ap, am, n].filter(Boolean);
  return parts.join(' ') || '';
}

/**
 * Iniciales a partir del nombre formateado (primeras letras de los dos primeros términos).
 * Ej. "González Morales José" -> "GM"
 */
export function inicialesDesdeNombreCompleto(obj) {
  const full = formatNombreCompleto(obj);
  if (!full) return '?';
  const parts = full.split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((x) => (x || '').charAt(0)).join('').toUpperCase() || '?';
}
