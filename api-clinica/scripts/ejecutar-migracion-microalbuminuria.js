import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import logger from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ejecutarMigracion() {
  try {
    logger.info('🚀 ========================================');
    logger.info('🚀 MIGRACIÓN: MICROALBUMINURIA');
    logger.info('🚀 ========================================\n');
    
    logger.info('🔌 Conectando a la base de datos...\n');

    // Verificar estado actual
    logger.info('📊 Verificando estado actual de la tabla...\n');
    
    const [columnsBefore] = await sequelize.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'deteccion_complicaciones'
      AND COLUMN_NAME IN ('microalbuminuria_realizada', 'microalbuminuria_resultado')
      ORDER BY COLUMN_NAME
    `);

    logger.info('📋 Columnas actuales relacionadas con microalbuminuria:');
    if (columnsBefore.length === 0) {
      logger.info('   ⚠️  No se encontraron columnas (se agregarán)');
    } else {
      columnsBefore.forEach(col => {
        logger.info(`   - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} ${col.COLUMN_COMMENT ? `(${col.COLUMN_COMMENT})` : ''}`);
      });
    }
    logger.info('');

    const tieneRealizada = columnsBefore.some(c => c.COLUMN_NAME === 'microalbuminuria_realizada');
    const tieneResultado = columnsBefore.some(c => c.COLUMN_NAME === 'microalbuminuria_resultado');

    if (tieneRealizada && tieneResultado) {
      logger.info('✅ Las columnas de microalbuminuria ya existen en la base de datos');
      logger.info('✅ Migración ya aplicada anteriormente\n');
    } else {
      logger.info('📝 Ejecutando migración...\n');

      // Agregar columnas manualmente
      if (!tieneRealizada) {
        try {
          await sequelize.query(`
            ALTER TABLE deteccion_complicaciones 
            ADD COLUMN microalbuminuria_realizada BOOLEAN DEFAULT FALSE 
            COMMENT '⑥ Indica si se realizó examen de microalbuminuria (1=SI, 0=NO)'
          `);
          logger.info('✅ Columna microalbuminuria_realizada agregada');
        } catch (addErr) {
          if (!addErr.message.includes('Duplicate column name')) {
            throw addErr;
          }
          logger.info('ℹ️  Columna microalbuminuria_realizada ya existe');
        }
      }

      if (!tieneResultado) {
        try {
          await sequelize.query(`
            ALTER TABLE deteccion_complicaciones 
            ADD COLUMN microalbuminuria_resultado DECIMAL(10,2) NULL 
            COMMENT 'Resultado del examen de microalbuminuria (mg/L o mg/g de creatinina). Valores normales <30 mg/g'
          `);
          logger.info('✅ Columna microalbuminuria_resultado agregada');
        } catch (addErr) {
          if (!addErr.message.includes('Duplicate column name')) {
            throw addErr;
          }
          logger.info('ℹ️  Columna microalbuminuria_resultado ya existe');
        }
      }

      logger.info('\n✅ Migración SQL ejecutada\n');
    }

    // Verificar estado después de la migración
    logger.info('📊 Verificando cambios aplicados...\n');
    
    const [columnsAfter] = await sequelize.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'deteccion_complicaciones'
      AND COLUMN_NAME IN ('microalbuminuria_realizada', 'microalbuminuria_resultado')
      ORDER BY COLUMN_NAME
    `);

    logger.info('📋 Columnas después de la migración:');
    columnsAfter.forEach(col => {
      const isNew = !columnsBefore.some(c => c.COLUMN_NAME === col.COLUMN_NAME);
      const marker = isNew ? '✨ NUEVO' : '✅';
      logger.info(`   ${marker} ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} ${col.COLUMN_COMMENT ? `(${col.COLUMN_COMMENT})` : ''}`);
    });

    logger.info('\n✅ Migración completada exitosamente\n');
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

