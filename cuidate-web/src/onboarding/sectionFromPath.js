/**
 * Identificador de tour por sección según la ruta actual.
 * Incluye listas, formularios de alta/edición y detalles con guía propia.
 */
export function getSectionTourId(pathname, isAdmin) {
  const p = pathname.split('?')[0].replace(/\/$/, '') || '/';

  if (p === '/' || p === '/dashboard') return 'dashboard';
  if (p === '/pacientes') return 'pacientes';
  if (p === '/citas') return 'citas';
  if (p === '/reportes') return 'reportes';
  if (p === '/perfil') return 'perfil';
  if (p === '/doctores') return 'doctores';
  if (isAdmin && p === '/admin/auditoria') return 'auditoria';
  if (isAdmin && p === '/admin/catalogos') return 'catalogos';
  if (isAdmin && p === '/admin/usuarios') return 'usuarios';
  if (p === '/notificaciones') return 'notificaciones';
  if (p === '/solicitudes-reprogramacion') return 'solicitudes-reprogramacion';
  if (p === '/chat') return 'chat';

  if (p === '/pacientes/nuevo') return 'pacientes-nuevo';
  if (/^\/pacientes\/[^/]+\/editar$/.test(p)) return 'pacientes-editar';
  if (/^\/pacientes\/[^/]+\/agendar-cita$/.test(p)) return 'pacientes-agendar-cita';
  if (/^\/pacientes\/[^/]+$/.test(p)) return 'pacientes-detalle';

  if (/^\/citas\/[^/]+$/.test(p)) return 'citas-detalle';

  if (isAdmin) {
    if (p === '/doctores/nuevo') return 'doctores-nuevo';
    if (/^\/doctores\/[^/]+\/editar$/.test(p)) return 'doctores-editar';
    if (/^\/doctores\/[^/]+$/.test(p)) return 'doctores-detalle';
    if (/^\/admin\/auditoria\/[^/]+$/.test(p)) return 'auditoria-detalle';
  }

  if (/^\/chat\/[^/]+$/.test(p)) return 'chat-conversacion';

  return null;
}
