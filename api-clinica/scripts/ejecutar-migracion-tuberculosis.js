import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import logger from '../utils/logger.js';

async function ejecutarMigracion() {
  try {
    logger.info('🚀 ========================================');
    logger.info('🚀 MIGRACIÓN: DETECCIÓN TUBERCULOSIS');
    logger.info('🚀 ========================================\n');
    
    logger.info('🔌 Conectando a la base de datos...\n');

    const [tables] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'deteccion_tuberculosis'
    `);

    const existe = tables[0].count > 0;

    if (existe) {
      logger.info('✅ La tabla deteccion_tuberculosis ya existe\n');
    } else {
      logger.info('📝 Creando tabla deteccion_tuberculosis...\n');

      await sequelize.query(`
        CREATE TABLE deteccion_tuberculosis (
          id_deteccion_tb INT PRIMARY KEY AUTO_INCREMENT,
          id_paciente INT NOT NULL,
          id_cita INT NULL,
          fecha_deteccion DATE NOT NULL,
          aplicacion_encuesta BOOLEAN DEFAULT FALSE COMMENT 'Aplicación de ENCUESTA de Tuberculosis (1=SI, 0=NO)',
          baciloscopia_realizada BOOLEAN DEFAULT FALSE COMMENT 'Se realizó baciloscopia (1=SI, 0=NO)',
          baciloscopia_resultado ENUM(
            'positivo',
            'negativo',
            'pendiente',
            'no_aplicable'
          ) NULL COMMENT '⑬ En caso de Baciloscopia anote el resultado',
          ingreso_tratamiento BOOLEAN DEFAULT FALSE COMMENT '¿Ingresó a tratamiento? (1=SI, 0=NO)',
          observaciones TEXT,
          fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente) ON DELETE CASCADE,
          FOREIGN KEY (id_cita) REFERENCES citas(id_cita) ON DELETE SET NULL,
          
          INDEX idx_paciente (id_paciente),
          INDEX idx_cita (id_cita),
          INDEX idx_fecha_deteccion (fecha_deteccion),
          INDEX idx_baciloscopia_resultado (baciloscopia_resultado),
          INDEX idx_paciente_fecha (id_paciente, fecha_deteccion)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT 'Registro de detección de tuberculosis'
      `);

      logger.info('✅ Tabla deteccion_tuberculosis creada\n');
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

