/**
 * Utilidades de visualización para notificaciones de doctor.
 * No leída = estado `enviada` (coincide con contador del menú lateral).
 */

export function isNotificacionNoLeida(notif) {
  const estado = String(notif?.estado ?? '').toLowerCase();
  return estado === 'enviada' || estado === '';
}

export function isNotificacionArchivada(notif) {
  return String(notif?.estado ?? '').toLowerCase() === 'archivada';
}

export function sortNotificacionesConNoLeidasPrimero(list) {
  return [...(list || [])].sort((a, b) => {
    const pa = isNotificacionNoLeida(a) ? 0 : 1;
    const pb = isNotificacionNoLeida(b) ? 0 : 1;
    if (pa !== pb) return pa - pb;
    const ta = new Date(a.fecha_envio || 0).getTime();
    const tb = new Date(b.fecha_envio || 0).getTime();
    return tb - ta;
  });
}

export function countNotificacionesNoLeidas(list) {
  return (list || []).filter(isNotificacionNoLeida).length;
}
