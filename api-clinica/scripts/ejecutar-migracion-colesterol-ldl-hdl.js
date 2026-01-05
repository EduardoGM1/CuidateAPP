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
    logger.info('🚀 MIGRACIÓN: COLESTEROL LDL Y HDL');
    logger.info('🚀 ========================================\n');
    
    logger.info('🔌 Conectando a la base de datos...\n');

    // Leer archivo SQL
    const sqlPath = path.join(__dirname, '..', 'migrations', 'add-colesterol-ldl-hdl-to-signos-vitales.sql');
    
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Archivo de migración no encontrado: ${sqlPath}`);
    }
    
    const sql = fs.readFileSync(sqlPath, 'utf8');
    logger.info('📄 Archivo de migración cargado\n');

    // Verificar estado actual antes de la migración
    logger.info('📊 Verificando estado actual de la tabla...\n');
    
    const [columnsBefore] = await sequelize.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'signos_vitales'
      AND COLUMN_NAME IN ('colesterol_mg_dl', 'colesterol_ldl', 'colesterol_hdl')
      ORDER BY COLUMN_NAME
    `);

    logger.info('📋 Columnas actuales relacionadas con colesterol:');
    if (columnsBefore.length === 0) {
      logger.info('   ⚠️  No se encontraron columnas (tabla puede no existir)');
    } else {
      columnsBefore.forEach(col => {
        logger.info(`   - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} ${col.COLUMN_COMMENT ? `(${col.COLUMN_COMMENT})` : ''}`);
      });
    }
    logger.info('');

    // Verificar si las columnas ya existen
    const tieneLDL = columnsBefore.some(c => c.COLUMN_NAME === 'colesterol_ldl');
    const tieneHDL = columnsBefore.some(c => c.COLUMN_NAME === 'colesterol_hdl');
    const tieneTotal = columnsBefore.some(c => c.COLUMN_NAME === 'colesterol_mg_dl');

    if (tieneLDL && tieneHDL && tieneTotal) {
      logger.info('✅ Las columnas de colesterol ya existen en la base de datos');
      logger.info('✅ Migración ya aplicada anteriormente\n');
    } else {
      // Ejecutar migración solo si faltan columnas
      logger.info('📝 Ejecutando migración SQL...\n');
      // Dividir el SQL en statements individuales
      const statements = sql.split(';').filter(s => s.trim().length > 0 && !s.trim().startsWith('--'));
      
      for (const statement of statements) {
        const trimmed = statement.trim();
        if (trimmed && !trimmed.startsWith('--')) {
          try {
            await sequelize.query(trimmed);
          } catch (err) {
            // Ignorar errores de "ya existe" o "no existe"
            if (!err.message.includes('already exists') && !err.message.includes('doesn\'t exist')) {
              throw err;
            }
          }
        }
      }
      logger.info('✅ Migración SQL ejecutada\n');
    }

    // Verificar estado después de la migración
    logger.info('📊 Verificando cambios aplicados...\n');
    
    const [columnsAfter] = await sequelize.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'signos_vitales'
      AND COLUMN_NAME IN ('colesterol_mg_dl', 'colesterol_ldl', 'colesterol_hdl')
      ORDER BY COLUMN_NAME
    `);

    logger.info('📋 Columnas después de la migración:');
    columnsAfter.forEach(col => {
      const isNew = !columnsBefore.some(c => c.COLUMN_NAME === col.COLUMN_NAME);
      const marker = isNew ? '✅ NUEVO' : '✅';
      logger.info(`   ${marker} ${col.COLUMN_NAME}: ${col.COLUMN_TYPE}`);
      if (col.COLUMN_COMMENT) {
        logger.info(`      ${col.COLUMN_COMMENT}`);
      }
    });
    logger.info('');

    // Verificar índices
    const [indexes] = await sequelize.query(`
      SELECT INDEX_NAME, COLUMN_NAME
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'signos_vitales'
      AND INDEX_NAME IN ('idx_colesterol_ldl', 'idx_colesterol_hdl')
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `);

    if (indexes.length > 0) {
      logger.info('📊 Índices creados:');
      indexes.forEach(idx => {
        logger.info(`   ✅ ${idx.INDEX_NAME} (${idx.COLUMN_NAME})`);
      });
      logger.info('');
    }

    logger.info('✅ ========================================');
    logger.info('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
    logger.info('✅ ========================================\n');
    
    logger.info('📋 Resumen de cambios:');
    logger.info('   ✅ Campo colesterol_mg_dl actualizado con comentario');
    logger.info('   ✅ Campo colesterol_ldl agregado');
    logger.info('   ✅ Campo colesterol_hdl agregado');
    logger.info('   ✅ Índices creados para optimización\n');

    process.exit(0);
  } catch (error) {
    logger.error('\n❌ ========================================');
    logger.error('❌ ERROR EJECUTANDO MIGRACIÓN');
    logger.error('❌ ========================================\n');
    logger.error('Error:', error.message);
    if (error.sql) {
      logger.error('\nSQL ejecutado:');
      logger.error(error.sql.substring(0, 500) + '...');
    }
    if (error.code) {
      logger.error(`\nCódigo de error: ${error.code}`);
    }
    logger.error('\n');
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar migración
ejecutarMigracion();
