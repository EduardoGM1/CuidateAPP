import { Op } from 'sequelize';
import { SoporteTicket } from '../models/associations.js';
import logger from '../utils/logger.js';
import { ensureTicketResueltoAtColumn } from '../utils/ensureTicketResueltoAt.js';

function diasHastaCierreAutomatico() {
  const n = parseInt(process.env.TICKET_RESUELTO_CIERRE_DIAS, 10);
  return Number.isFinite(n) && n > 0 ? n : 2;
}

/**
 * Pasa a cerrado los tickets en resuelto cuyo resuelto_at es anterior al umbral (por defecto 2 días).
 * Idempotente; conviene llamarla desde cron y al listar/ver tickets en admin.
 */
export async function cerrarTicketsResueltoVencidos() {
  await ensureTicketResueltoAtColumn();
  const dias = diasHastaCierreAutomatico();
  const limite = new Date();
  limite.setDate(limite.getDate() - dias);
  limite.setHours(limite.getHours(), limite.getMinutes(), limite.getSeconds(), limite.getMilliseconds());

  const [affected] = await SoporteTicket.update(
    { estado: 'cerrado' },
    {
      where: {
        estado: 'resuelto',
        resuelto_at: { [Op.lte]: limite },
      },
    }
  );

  if (affected > 0) {
    logger.info('[tickets] Cierre automático', { cerrados: affected, dias_gracia: dias });
  }
  return affected;
}
