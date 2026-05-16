import sequelize from '../config/db.js';
import logger from './logger.js';

let ensured = false;

/**
 * Crea la tabla consentimientos_privacidad si no existe (arranque sin migración manual).
 */
export async function ensureConsentimientosPrivacidadTable() {
  if (ensured) return;

  try {
    const [rows] = await sequelize.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'consentimientos_privacidad'
    `);

    if (rows.length > 0) {
      ensured = true;
      return;
    }

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS consentimientos_privacidad (
        id_consentimiento INT NOT NULL AUTO_INCREMENT,
        id_usuario INT NULL,
        id_paciente INT NULL,
        id_doctor INT NULL,
        rol ENUM('Paciente', 'Doctor') NOT NULL,
        version_aviso VARCHAR(20) NOT NULL,
        acepto_aviso_terminos TINYINT(1) NOT NULL DEFAULT 0,
        acepto_datos_salud TINYINT(1) NOT NULL DEFAULT 0,
        canal ENUM('web', 'mobile') NOT NULL DEFAULT 'web',
        user_agent VARCHAR(500) NULL,
        ip_address VARCHAR(45) NULL,
        revocado TINYINT(1) NOT NULL DEFAULT 0,
        revocado_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id_consentimiento),
        INDEX idx_consent_paciente (id_paciente, version_aviso, revocado, created_at),
        INDEX idx_consent_doctor (id_doctor, version_aviso, revocado, created_at),
        INDEX idx_consent_usuario (id_usuario, rol, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    logger.info('[privacy-consent] Tabla consentimientos_privacidad creada');
  } catch (e) {
    logger.error('[privacy-consent] No se pudo asegurar tabla consentimientos_privacidad', {
      error: e.message,
    });
    throw e;
  }

  ensured = true;
}
