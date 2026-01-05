import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import logger from '../utils/logger.js';

async function ejecutarMigracion() {
  try {
    logger.info('🚀 Iniciando migración: crear tabla deteccion_complicaciones...');

    // Verificar si la tabla ya existe
    const [results] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'deteccion_complicaciones'
    `);

    if (results[0].count > 0) {
      logger.info('⚠️  La tabla deteccion_complicaciones ya existe');
      process.exit(0);
    }

    // Crear la tabla
    const createTableSQL = `
      CREATE TABLE deteccion_complicaciones (
        id_deteccion INTEGER PRIMARY KEY AUTO_INCREMENT,
        
        -- Relaciones (solo id_paciente es obligatorio)
        id_paciente INTEGER NOT NULL,
        id_comorbilidad INTEGER NULL,
        id_cita INTEGER NULL,
        id_doctor INTEGER NULL,
        
        -- Exámenes realizados (todos opcionales, default FALSE)
        exploracion_pies BOOLEAN DEFAULT FALSE,
        exploracion_fondo_ojo BOOLEAN DEFAULT FALSE,
        
        -- Auto-monitoreo (todos opcionales, default FALSE)
        realiza_auto_monitoreo BOOLEAN DEFAULT FALSE,
        auto_monitoreo_glucosa BOOLEAN DEFAULT FALSE,
        auto_monitoreo_presion BOOLEAN DEFAULT FALSE,
        
        -- Clasificación (opcional)
        tipo_complicacion VARCHAR(100) NULL,
        fecha_deteccion DATE NOT NULL,
        fecha_diagnostico DATE NULL,
        
        -- Metadatos
        observaciones TEXT NULL,
        registrado_por ENUM('doctor', 'paciente') DEFAULT 'doctor',
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        -- Índices
        INDEX idx_paciente (id_paciente),
        INDEX idx_comorbilidad (id_comorbilidad),
        INDEX idx_cita (id_cita),
        INDEX idx_fecha_deteccion (fecha_deteccion),
        INDEX idx_paciente_fecha (id_paciente, fecha_deteccion),
        
        -- Foreign Keys
        FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente) ON DELETE CASCADE,
        FOREIGN KEY (id_comorbilidad) REFERENCES comorbilidades(id_comorbilidad) ON DELETE SET NULL,
        FOREIGN KEY (id_cita) REFERENCES citas(id_cita) ON DELETE SET NULL,
        FOREIGN KEY (id_doctor) REFERENCES doctores(id_doctor) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await sequelize.query(createTableSQL);

    logger.info('✅ Migración completada exitosamente');
    logger.info('📋 Tabla deteccion_complicaciones creada');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Error ejecutando migración:', error);
    logger.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

ejecutarMigracion();

