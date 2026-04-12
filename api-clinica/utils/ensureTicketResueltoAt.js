import sequelize from '../config/db.js';
import logger from './logger.js';

let ensured = false;

/**
 * Asegura columna resuelto_at en soporte_tickets (sync sin alter no la crea en tablas ya existentes).
 */
export async function ensureTicketResueltoAtColumn() {
  if (ensured) return;
  try {
    const [rows] = await sequelize.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'soporte_tickets'
        AND COLUMN_NAME = 'resuelto_at'
    `);
    if (rows.length > 0) {
      ensured = true;
      return;
    }
    await sequelize.query(`
      ALTER TABLE soporte_tickets
      ADD COLUMN resuelto_at DATETIME NULL
        COMMENT 'Cuando pasó a resuelto; tras 2 días el job pasa el ticket a cerrado'
      AFTER estado
    `);
    await sequelize.query(`
      UPDATE soporte_tickets
      SET resuelto_at = updated_at
      WHERE estado = 'resuelto' AND resuelto_at IS NULL
    `);
    logger.info('[tickets] Columna resuelto_at creada en soporte_tickets y tickets resueltos existentes inicializados');
  } catch (e) {
    logger.error('[tickets] No se pudo asegurar columna resuelto_at', { error: e.message });
    throw e;
  }
  ensured = true;
}
