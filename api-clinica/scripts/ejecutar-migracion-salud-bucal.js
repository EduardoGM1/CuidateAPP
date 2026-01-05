import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import logger from '../utils/logger.js';

async function ejecutarMigracion() {
  try {
    logger.info('🚀 ========================================');
    logger.info('🚀 MIGRACIÓN: SALUD BUCAL');
    logger.info('🚀 ========================================\n');
    
    logger.info('🔌 Conectando a la base de datos...\n');

    const [tables] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'salud_bucal'
    `);

    const existe = tables[0].count > 0;

    if (existe) {
      logger.info('✅ La tabla salud_bucal ya existe\n');
    } else {
      logger.info('📝 Creando tabla salud_bucal...\n');

      await sequelize.query(`
        CREATE TABLE salud_bucal (
          id_salud_bucal INT PRIMARY KEY AUTO_INCREMENT,
          id_paciente INT NOT NULL,
          id_cita INT NULL,
          fecha_registro DATE NOT NULL,
          presenta_enfermedades_odontologicas BOOLEAN DEFAULT FALSE COMMENT '⑫ ¿Presenta enfermedades odontológicas? (1=SI, 0=NO)',
          recibio_tratamiento_odontologico BOOLEAN DEFAULT FALSE COMMENT '¿Recibió tratamiento odontológico? (1=SI, 0=NO)',
          observaciones TEXT,
          fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente) ON DELETE CASCADE,
          FOREIGN KEY (id_cita) REFERENCES citas(id_cita) ON DELETE SET NULL,
          
          INDEX idx_paciente (id_paciente),
          INDEX idx_cita (id_cita),
          INDEX idx_fecha_registro (fecha_registro),
          INDEX idx_paciente_fecha (id_paciente, fecha_registro)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT 'Registro de salud bucal del paciente'
      `);

      logger.info('✅ Tabla salud_bucal creada\n');
    }

    logger.info('✅ Migración completada exitosamente\n');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error ejecutando migración:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

ejecutarMigracion();

