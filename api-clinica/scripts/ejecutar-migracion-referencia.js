import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import logger from '../utils/logger.js';

async function ejecutarMigracion() {
  try {
    logger.info('🚀 ========================================');
    logger.info('🚀 MIGRACIÓN: REFERENCIA');
    logger.info('🚀 ========================================\n');
    
    logger.info('🔌 Conectando a la base de datos...\n');

    const [columnsBefore] = await sequelize.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'deteccion_complicaciones'
      AND COLUMN_NAME IN ('fue_referido', 'referencia_observaciones')
      ORDER BY COLUMN_NAME
    `);

    logger.info('📋 Columnas actuales relacionadas con referencia:');
    if (columnsBefore.length === 0) {
      logger.info('   ⚠️  No se encontraron columnas (se agregarán)');
    } else {
      columnsBefore.forEach(col => {
        logger.info(`   - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE}`);
      });
    }
    logger.info('');

    const tieneReferido = columnsBefore.some(c => c.COLUMN_NAME === 'fue_referido');
    const tieneObservaciones = columnsBefore.some(c => c.COLUMN_NAME === 'referencia_observaciones');

    if (tieneReferido && tieneObservaciones) {
      logger.info('✅ Las columnas de referencia ya existen\n');
    } else {
      logger.info('📝 Ejecutando migración...\n');

      if (!tieneReferido) {
        try {
          await sequelize.query(`
            ALTER TABLE deteccion_complicaciones 
            ADD COLUMN fue_referido BOOLEAN DEFAULT FALSE 
            COMMENT '⑪ Indica si el paciente fue referido a otro nivel de atención (1=SI, 0=NO)'
          `);
          logger.info('✅ Columna fue_referido agregada');
        } catch (addErr) {
          if (!addErr.message.includes('Duplicate column name')) {
            throw addErr;
          }
        }
      }

      if (!tieneObservaciones) {
        try {
          await sequelize.query(`
            ALTER TABLE deteccion_complicaciones 
            ADD COLUMN referencia_observaciones TEXT NULL 
            COMMENT 'Detalles de la referencia (especialidad, institución, motivo)'
          `);
          logger.info('✅ Columna referencia_observaciones agregada');
        } catch (addErr) {
          if (!addErr.message.includes('Duplicate column name')) {
            throw addErr;
          }
        }
      }

      logger.info('\n✅ Migración SQL ejecutada\n');
    }

    const [columnsAfter] = await sequelize.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'deteccion_complicaciones'
      AND COLUMN_NAME IN ('fue_referido', 'referencia_observaciones')
      ORDER BY COLUMN_NAME
    `);

    logger.info('📋 Columnas después de la migración:');
    columnsAfter.forEach(col => {
      const isNew = !columnsBefore.some(c => c.COLUMN_NAME === col.COLUMN_NAME);
      const marker = isNew ? '✨ NUEVO' : '✅';
      logger.info(`   ${marker} ${col.COLUMN_NAME}: ${col.COLUMN_TYPE}`);
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

