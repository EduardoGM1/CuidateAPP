import Badge from '../ui/Badge';
import { isNotificacionArchivada, isNotificacionNoLeida } from '../../utils/notificacionDisplay';

/**
 * Badge de estado de lectura (sin leer / leída / archivada).
 */
export default function NotificacionEstadoBadge({ notificacion }) {
  if (isNotificacionArchivada(notificacion)) {
    return <Badge variant="neutral">Archivada</Badge>;
  }
  if (isNotificacionNoLeida(notificacion)) {
    return <Badge variant="error">Sin leer</Badge>;
  }
  return <Badge variant="success">Leída</Badge>;
}
