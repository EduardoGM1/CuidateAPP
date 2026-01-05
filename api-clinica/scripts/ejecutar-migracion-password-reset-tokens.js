import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sequelize from '../config/db.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  try {
    logger.info('🔄 Iniciando migración: password_reset_tokens...');

    // Crear tabla
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id_token INT PRIMARY KEY AUTO_INCREMENT,
        id_usuario INT NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        fecha_expiracion DATETIME NOT NULL,
        usado BOOLEAN DEFAULT FALSE,
        fecha_uso DATETIME NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        INDEX idx_token (token),
        INDEX idx_usuario (id_usuario),
        INDEX idx_expiracion (fecha_expiracion),
        INDEX idx_usado_expiracion (usado, fecha_expiracion),
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Agregar comentarios (ejecutar por separado)
    await sequelize.query(`
      ALTER TABLE password_reset_tokens 
        MODIFY COLUMN id_token INT AUTO_INCREMENT COMMENT 'ID único del token'
    `).catch(() => {}); // Ignorar si ya tiene comentario

    await sequelize.query(`
      ALTER TABLE password_reset_tokens 
        MODIFY COLUMN id_usuario INT NOT NULL COMMENT 'ID del usuario que solicita recuperación'
    `).catch(() => {});

    await sequelize.query(`
      ALTER TABLE password_reset_tokens 
        MODIFY COLUMN token VARCHAR(255) NOT NULL UNIQUE COMMENT 'Token único de recuperación'
    `).catch(() => {});

    await sequelize.query(`
      ALTER TABLE password_reset_tokens 
        MODIFY COLUMN fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación del token'
    `).catch(() => {});

    await sequelize.query(`
      ALTER TABLE password_reset_tokens 
        MODIFY COLUMN fecha_expiracion DATETIME NOT NULL COMMENT 'Fecha de expiración del token (1 hora después de creación)'
    `).catch(() => {});

    await sequelize.query(`
      ALTER TABLE password_reset_tokens 
        MODIFY COLUMN usado BOOLEAN DEFAULT FALSE COMMENT 'Indica si el token ya fue usado'
    `).catch(() => {});

    await sequelize.query(`
      ALTER TABLE password_reset_tokens 
        MODIFY COLUMN fecha_uso DATETIME NULL COMMENT 'Fecha en que se usó el token'
    `).catch(() => {});

    await sequelize.query(`
      ALTER TABLE password_reset_tokens 
        MODIFY COLUMN ip_address VARCHAR(45) COMMENT 'IP desde donde se solicitó el reset'
    `).catch(() => {});

    await sequelize.query(`
      ALTER TABLE password_reset_tokens 
        MODIFY COLUMN user_agent TEXT COMMENT 'User agent del navegador'
    `).catch(() => {});

    logger.info('✅ Migración completada: password_reset_tokens creada exitosamente');

    // Verificar que la tabla existe
    const [results] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'password_reset_tokens'
    `);

    if (results[0].count > 0) {
      logger.info('✅ Verificación: Tabla password_reset_tokens existe');
    } else {
      logger.error('❌ Error: Tabla password_reset_tokens no se creó correctamente');
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    logger.error('❌ Error ejecutando migración:', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  } finally {
    await sequelize.close();
  }
})();

