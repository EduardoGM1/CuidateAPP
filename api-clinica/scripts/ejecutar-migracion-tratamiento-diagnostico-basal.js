import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import logger from '../utils/logger.js';

async function ejecutarMigracion() {
  try {
    logger.info('🚀 ========================================');
    logger.info('🚀 MIGRACIÓN: TRATAMIENTO Y DIAGNÓSTICO BASAL');
    logger.info('🚀 ========================================\n');
    
    logger.info('🔌 Conectando a la base de datos...\n');

    const campos = [
      'es_diagnostico_basal',
      'es_agregado_posterior',
      'año_diagnostico',
      'recibe_tratamiento_no_farmacologico',
      'recibe_tratamiento_farmacologico'
    ];

    const [columnsBefore] = await sequelize.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'paciente_comorbilidad'
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
        'es_diagnostico_basal': `ALTER TABLE paciente_comorbilidad ADD COLUMN es_diagnostico_basal BOOLEAN DEFAULT FALSE COMMENT '① Indica si es el diagnóstico basal (inicial) del paciente'`,
        'es_agregado_posterior': `ALTER TABLE paciente_comorbilidad ADD COLUMN es_agregado_posterior BOOLEAN DEFAULT FALSE COMMENT 'Indica si el diagnóstico fue agregado después del diagnóstico basal'`,
        'año_diagnostico': `ALTER TABLE paciente_comorbilidad ADD COLUMN año_diagnostico INTEGER NULL COMMENT 'Año en que se diagnosticó la comorbilidad (YYYY). Rango válido: 1900 - año actual'`,
        'recibe_tratamiento_no_farmacologico': `ALTER TABLE paciente_comorbilidad ADD COLUMN recibe_tratamiento_no_farmacologico BOOLEAN DEFAULT FALSE COMMENT '② Indica si el paciente recibe tratamiento no farmacológico (dieta, ejercicio, cambios de estilo de vida)'`,
        'recibe_tratamiento_farmacologico': `ALTER TABLE paciente_comorbilidad ADD COLUMN recibe_tratamiento_farmacologico BOOLEAN DEFAULT FALSE COMMENT '③ Indica si el paciente recibe tratamiento farmacológico. Debe sincronizarse con PlanMedicacion activo'`
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

      // Agregar índice
      try {
        await sequelize.query(`CREATE INDEX idx_año_diagnostico ON paciente_comorbilidad (año_diagnostico)`);
        logger.info('✅ Índice idx_año_diagnostico creado');
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
      AND TABLE_NAME = 'paciente_comorbilidad'
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

