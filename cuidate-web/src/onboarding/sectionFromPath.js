/**
 * Identificador de tour por sección según la ruta actual.
 * Solo rutas lista o página principal; subrutas no disparan tour propio.
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

  return null;
}
