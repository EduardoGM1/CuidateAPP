/**
 * Utilidades para reportes HTML: abrir en nueva pestaña y descargar.
 * Reutilizables desde cualquier página que genere reportes.
 */

/**
 * Abre contenido HTML en una nueva ventana (para imprimir o guardar desde el navegador).
 * @param {string} html - Contenido HTML completo
 * @param {string} [title='Reporte'] - Título del documento
 */
export function openHTMLInNewWindow(html, title = 'Reporte') {
  if (typeof window === 'undefined' || !html) return;
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.title = title;
  w.document.close();
}

/**
 * Descarga un string como archivo en el dispositivo del usuario.
 * @param {string} content - Contenido del archivo
 * @param {string} filename - Nombre del archivo (ej. reporte.html)
 * @param {string} [mimeType='text/html;charset=utf-8'] - Tipo MIME
 */
export function downloadAsFile(content, filename, mimeType = 'text/html;charset=utf-8') {
  if (typeof window === 'undefined' || !content) return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Valida y normaliza fecha para query API (YYYY-MM-DD).
 * @param {string|Date|null|undefined} value
 * @returns {string} '' si no válido, o 'YYYY-MM-DD'
 */
export function toDateString(value) {
  if (value == null || value === '') return '';
  const s = String(value).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  return s;
}
