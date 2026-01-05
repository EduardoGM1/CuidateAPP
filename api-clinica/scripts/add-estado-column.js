/**
 * Script para agregar la columna 'estado' a la tabla 'pacientes'
 */

import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import logger from '../utils/logger.js';

async function addEstadoColumn() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida');

    // Verificar si la columna ya existe
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'pacientes' 
      AND COLUMN_NAME = 'estado'
    `);

    if (results.length > 0) {
      logger.info('✅ La columna "estado" ya existe en la tabla pacientes');
    } else {
      // Agregar la columna
      logger.info('📝 Agregando columna "estado" a la tabla pacientes...');
      
      await sequelize.query(`
        ALTER TABLE pacientes 
        ADD COLUMN estado VARCHAR(100) NOT NULL DEFAULT '' AFTER direccion
      `);
      
      logger.info('✅ Columna "estado" agregada exitosamente');
      
      // Actualizar registros existentes con valor por defecto
      await sequelize.query(`
        UPDATE pacientes 
        SET estado = '' 
        WHERE estado IS NULL OR estado = ''
      `);
      
      logger.info('✅ Registros existentes actualizados');
    }

    // Verificar la columna
    const [verify] = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'pacientes' 
      AND COLUMN_NAME = 'estado'
    `);

    if (verify.length > 0) {
      logger.info('✅ Verificación exitosa:');
      logger.info(`   - Nombre: ${verify[0].COLUMN_NAME}`);
      logger.info(`   - Tipo: ${verify[0].DATA_TYPE}`);
      logger.info(`   - Nullable: ${verify[0].IS_NULLABLE}`);
      logger.info(`   - Default: ${verify[0].COLUMN_DEFAULT || 'N/A'}`);
    }

    logger.info('\n✅ Proceso completado exitosamente');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    if (error.original && error.original.code === 'ER_DUP_FIELDNAME') {
      logger.info('✅ La columna "estado" ya existe en la tabla pacientes');
      await sequelize.close();
      process.exit(0);
    } else {
      logger.error('❌ Error:', error);
      await sequelize.close();
      process.exit(1);
    }
  }
}

addEstadoColumn();

