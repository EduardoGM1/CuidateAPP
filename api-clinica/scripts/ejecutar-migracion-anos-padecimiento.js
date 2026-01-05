/**
 * Script para ejecutar la migración de anos_padecimiento
 * 
 * Ejecutar con: node scripts/ejecutar-migracion-anos-padecimiento.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sequelize from '../config/db.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ejecutarMigracion = async () => {
  try {
    logger.info('Iniciando migración: add-anos-padecimiento-comorbilidad');
    
    // Ejecutar migración directamente (evitar problemas con múltiples statements)
    const [results] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'paciente_comorbilidad'
      AND COLUMN_NAME = 'anos_padecimiento'
    `);
    
    const columnExists = results[0]?.count > 0;
    
    if (!columnExists) {
      await sequelize.query(`
        ALTER TABLE paciente_comorbilidad 
        ADD COLUMN anos_padecimiento INT NULL 
        COMMENT 'Años que el paciente ha tenido esta comorbilidad' 
        AFTER observaciones
      `);
      logger.info('✅ Columna anos_padecimiento agregada exitosamente');
    } else {
      logger.info('ℹ️ La columna anos_padecimiento ya existe');
    }
    
    // Verificar que la columna existe
    const [verification] = await sequelize.query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'paciente_comorbilidad'
      AND COLUMN_NAME = 'anos_padecimiento'
    `);
    
    if (verification.length > 0) {
      console.log('✅ Verificación exitosa:', verification[0]);
      logger.info('✅ Migración ejecutada exitosamente', { column: verification[0] });
    } else {
      console.warn('⚠️ La columna no se encontró después de la migración');
      logger.warn('⚠️ La columna no se encontró después de la migración');
    }
    
    console.log('✅ Columna anos_padecimiento agregada a paciente_comorbilidad');
    
    process.exit(0);
  } catch (error) {
    logger.error('Error ejecutando migración:', error);
    console.error('❌ Error:', error.message);
    
    // Si el error es que la columna ya existe, no es crítico
    if (error.message.includes('Duplicate column name') || error.message.includes('ya existe')) {
      console.log('ℹ️ La columna ya existe, no es necesario agregarla');
      process.exit(0);
    }
    
    process.exit(1);
  }
};

ejecutarMigracion();

