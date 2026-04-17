import sequelize from '../config/db.js';
import logger from './logger.js';

let ensured = false;

/**
 * Columna lugar_aplicacion en esquema_vacunacion (institución / lugar de aplicación).
 */
export async function ensureEsquemaVacunacionLugarColumn() {
  if (ensured) return;
  try {
    const [rows] = await sequelize.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'esquema_vacunacion'
        AND COLUMN_NAME = 'lugar_aplicacion'
    `);
    if (rows.length > 0) {
      ensured = true;
      return;
    }
    await sequelize.query(`
      ALTER TABLE esquema_vacunacion
      ADD COLUMN lugar_aplicacion VARCHAR(150) NULL
        COMMENT 'Lugar o institución donde se aplicó la vacuna (ej. IMSS, ISSSTE)'
      AFTER lote
    `);
    logger.info('[vacunación] Columna lugar_aplicacion añadida a esquema_vacunacion');
  } catch (e) {
    logger.error('[vacunación] No se pudo asegurar columna lugar_aplicacion', { error: e.message });
    throw e;
  }
  ensured = true;
}
