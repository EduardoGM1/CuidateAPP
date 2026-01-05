import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import logger from '../utils/logger.js';

async function ejecutarMigracion() {
  try {
    logger.info('🚀 ========================================');
    logger.info('🚀 MIGRACIÓN: BAJA Y NÚMERO GAM');
    logger.info('🚀 ========================================\n');
    
    logger.info('🔌 Conectando a la base de datos...\n');

    const campos = ['fecha_baja', 'motivo_baja', 'numero_gam'];

    const [columnsBefore] = await sequelize.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pacientes'
      AND COLUMN_NAME IN (${campos.map(() => '?').join(',')})
      ORDER BY COLUMN_NAME
    `, {
      replacements: campos
    });

    logger.info('📋 Columnas actuales:');
    if (columnsBefore.length === 0) {
      logger.info('   ⚠️  No se encontraron columnas (se agregarán)');
    } else {
      columnsBefore.forEach(col => {
        logger.info(`   - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE}`);
      });
    }
    logger.info('');

    const camposExistentes = columnsBefore.map(c => c.COLUMN_NAME);
    const camposFaltantes = campos.filter(c => !camposExistentes.includes(c));

    if (camposFaltantes.length === 0) {
      logger.info('✅ Todas las columnas ya existen\n');
    } else {
      logger.info(`📝 Agregando ${camposFaltantes.length} columnas faltantes...\n`);

      const migraciones = {
        'fecha_baja': `ALTER TABLE pacientes ADD COLUMN fecha_baja DATE NULL COMMENT '⑭ Fecha en que el paciente fue dado de baja del GAM. Debe ser >= fecha_registro'`,
        'motivo_baja': `ALTER TABLE pacientes ADD COLUMN motivo_baja TEXT NULL COMMENT 'Motivo de la baja del paciente del GAM'`,
        'numero_gam': `ALTER TABLE pacientes ADD COLUMN numero_gam INT NULL COMMENT 'Número de integrante en el GAM (para fórmulas y reportes). Debe ser único por módulo'`
      };

      for (const campo of camposFaltantes) {
        try {
          await sequelize.query(migraciones[campo]);
          logger.info(`✅ Columna ${campo} agregada`);
        } catch (addErr) {
          if (!addErr.message.includes('Duplicate column name')) {
            throw addErr;
          }
          logger.info(`ℹ️  Columna ${campo} ya existe`);
        }
      }

      // Agregar índice único compuesto
      try {
        await sequelize.query(`CREATE UNIQUE INDEX idx_modulo_numero_gam ON pacientes (id_modulo, numero_gam)`);
        logger.info('✅ Índice idx_modulo_numero_gam creado');
      } catch (idxErr) {
        if (!idxErr.message.includes('Duplicate key name') && !idxErr.message.includes('already exists')) {
          logger.warn(`⚠️  Error creando índice: ${idxErr.message}`);
        }
      }

      logger.info('\n✅ Migración SQL ejecutada\n');
    }

    const [columnsAfter] = await sequelize.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pacientes'
      AND COLUMN_NAME IN (${campos.map(() => '?').join(',')})
      ORDER BY COLUMN_NAME
    `, {
      replacements: campos
    });

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

