import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import logger from '../utils/logger.js';

async function ejecutarMigracion() {
  try {
    logger.info('🚀 ========================================');
    logger.info('🚀 MIGRACIÓN: SESIONES EDUCATIVAS');
    logger.info('🚀 ========================================\n');
    
    logger.info('🔌 Conectando a la base de datos...\n');

    const [tables] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sesiones_educativas'
    `);

    const existe = tables[0].count > 0;

    if (existe) {
      logger.info('✅ La tabla sesiones_educativas ya existe\n');
    } else {
      logger.info('📝 Creando tabla sesiones_educativas...\n');

      await sequelize.query(`
        CREATE TABLE sesiones_educativas (
          id_sesion INT PRIMARY KEY AUTO_INCREMENT,
          id_paciente INT NOT NULL,
          id_cita INT NULL,
          fecha_sesion DATE NOT NULL,
          asistio BOOLEAN DEFAULT FALSE COMMENT 'Asistió a sesión educativa (1=SI, 0=NO)',
          tipo_sesion ENUM(
            'nutricional', 
            'actividad_fisica', 
            'medico_preventiva', 
            'trabajo_social', 
            'psicologica', 
            'odontologica'
          ) NOT NULL COMMENT 'Tipo de intervención educativa',
          numero_intervenciones INT DEFAULT 1 COMMENT 'N° de intervenciones en el mes por integrante',
          observaciones TEXT,
          fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente) ON DELETE CASCADE,
          FOREIGN KEY (id_cita) REFERENCES citas(id_cita) ON DELETE SET NULL,
          
          INDEX idx_paciente (id_paciente),
          INDEX idx_cita (id_cita),
          INDEX idx_fecha_sesion (fecha_sesion),
          INDEX idx_tipo_sesion (tipo_sesion),
          INDEX idx_paciente_fecha (id_paciente, fecha_sesion)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT 'Registro de sesiones e intervenciones educativas para la salud'
      `);

      logger.info('✅ Tabla sesiones_educativas creada\n');
    }

    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sesiones_educativas'
      ORDER BY ORDINAL_POSITION
    `);

    logger.info('📋 Columnas de la tabla:');
    columns.forEach(col => {
      logger.info(`   ✅ ${col.COLUMN_NAME}: ${col.COLUMN_TYPE}`);
    });

    logger.info('\n✅ Migración completada exitosamente\n');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error ejecutando migración:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

ejecutarMigracion();

