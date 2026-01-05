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
    logger.info('🚀 MIGRACIÓN: HbA1c Y EDAD EN MEDICIÓN');
    logger.info('🚀 ========================================\n');
    
    logger.info('🔌 Conectando a la base de datos...\n');

    // Leer archivo SQL
    const sqlPath = path.join(__dirname, '..', 'migrations', 'add-hba1c-to-signos-vitales.sql');
    
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
      AND COLUMN_NAME IN ('hba1c_porcentaje', 'edad_paciente_en_medicion')
      ORDER BY COLUMN_NAME
    `);

    logger.info('📋 Columnas actuales relacionadas con HbA1c:');
    if (columnsBefore.length === 0) {
      logger.info('   ⚠️  No se encontraron columnas (se agregarán)');
    } else {
      columnsBefore.forEach(col => {
        logger.info(`   - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} ${col.COLUMN_COMMENT ? `(${col.COLUMN_COMMENT})` : ''}`);
      });
    }
    logger.info('');

    // Verificar si las columnas ya existen
    const tieneHbA1c = columnsBefore.some(c => c.COLUMN_NAME === 'hba1c_porcentaje');
    const tieneEdad = columnsBefore.some(c => c.COLUMN_NAME === 'edad_paciente_en_medicion');

    if (tieneHbA1c && tieneEdad) {
      logger.info('✅ Las columnas de HbA1c ya existen en la base de datos');
      logger.info('✅ Migración ya aplicada anteriormente\n');
    } else {
      // Ejecutar migración
      logger.info('📝 Ejecutando migración SQL...\n');
      
      // Ejecutar el SQL completo (contiene múltiples statements preparados)
      try {
        // El SQL usa prepared statements, ejecutarlo completo
        await sequelize.query(sql, { 
          type: sequelize.QueryTypes.RAW,
          multipleStatements: true 
        });
        logger.info('✅ Migración SQL ejecutada\n');
      } catch (err) {
        // Si falla por múltiples statements, intentar ejecutar directamente con conexión raw
        logger.warn('⚠️  Intentando método alternativo...\n');
        
        // Verificar y agregar columnas manualmente
        if (!tieneHbA1c) {
          try {
            await sequelize.query(`
              ALTER TABLE signos_vitales 
              ADD COLUMN hba1c_porcentaje DECIMAL(5,2) NULL 
              COMMENT '*HbA1c (%) - Campo obligatorio para criterios de acreditación. Rangos: 20-59 años <7%, 60+ años <8%'
            `);
            logger.info('✅ Columna hba1c_porcentaje agregada');
          } catch (addErr) {
            if (!addErr.message.includes('Duplicate column name')) {
              throw addErr;
            }
            logger.info('ℹ️  Columna hba1c_porcentaje ya existe');
          }
        }

        if (!tieneEdad) {
          try {
            await sequelize.query(`
              ALTER TABLE signos_vitales 
              ADD COLUMN edad_paciente_en_medicion INT NULL 
              COMMENT 'Edad del paciente al momento de la medición (para clasificar rangos de HbA1c: 20-59 años vs 60+ años)'
            `);
            logger.info('✅ Columna edad_paciente_en_medicion agregada');
          } catch (addErr) {
            if (!addErr.message.includes('Duplicate column name')) {
              throw addErr;
            }
            logger.info('ℹ️  Columna edad_paciente_en_medicion ya existe');
          }
        }

        // Agregar índices
        try {
          await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_hba1c ON signos_vitales (hba1c_porcentaje)`);
          logger.info('✅ Índice idx_hba1c creado/verificado');
        } catch (idxErr) {
          if (!idxErr.message.includes('Duplicate key name') && !idxErr.message.includes('already exists')) {
            logger.warn(`⚠️  Error creando índice idx_hba1c: ${idxErr.message}`);
          }
        }

        try {
          await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_edad_medicion ON signos_vitales (edad_paciente_en_medicion)`);
          logger.info('✅ Índice idx_edad_medicion creado/verificado');
        } catch (idxErr) {
          if (!idxErr.message.includes('Duplicate key name') && !idxErr.message.includes('already exists')) {
            logger.warn(`⚠️  Error creando índice idx_edad_medicion: ${idxErr.message}`);
          }
        }

        logger.info('\n✅ Migración SQL ejecutada (método alternativo)\n');
      }
    }

    // Verificar estado después de la migración
    logger.info('📊 Verificando cambios aplicados...\n');
    
    const [columnsAfter] = await sequelize.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'signos_vitales'
      AND COLUMN_NAME IN ('hba1c_porcentaje', 'edad_paciente_en_medicion')
      ORDER BY COLUMN_NAME
    `);

    logger.info('📋 Columnas después de la migración:');
    columnsAfter.forEach(col => {
      const isNew = !columnsBefore.some(c => c.COLUMN_NAME === col.COLUMN_NAME);
      const marker = isNew ? '✨ NUEVO' : '✅';
      logger.info(`   ${marker} ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} ${col.COLUMN_COMMENT ? `(${col.COLUMN_COMMENT})` : ''}`);
    });

    // Verificar índices
    const [indexes] = await sequelize.query(`
      SELECT INDEX_NAME
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'signos_vitales' 
      AND INDEX_NAME IN ('idx_hba1c', 'idx_edad_medicion')
      GROUP BY INDEX_NAME
    `);

    logger.info('\n📋 Índices creados:');
    if (indexes.length === 0) {
      logger.info('   ⚠️  No se encontraron índices nuevos');
    } else {
      indexes.forEach(idx => {
        logger.info(`   ✅ ${idx.INDEX_NAME}`);
      });
    }

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

