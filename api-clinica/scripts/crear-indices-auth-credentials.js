import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import logger from '../utils/logger.js';

/**
 * Script para crear índices en auth_credentials para optimizar búsquedas
 * Especialmente útil para búsqueda global de PINs
 */
async function crearIndicesAuthCredentials() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida');

    logger.info('\n📊 CREANDO ÍNDICES EN auth_credentials');
    logger.info('='.repeat(80));

    const indices = [
      {
        name: 'idx_auth_user_type_method_active',
        columns: ['user_type', 'auth_method', 'activo'],
        description: 'Índice para búsquedas por tipo de usuario, método y estado activo'
      },
      {
        name: 'idx_auth_user_type_method_primary',
        columns: ['user_type', 'auth_method', 'activo', 'is_primary'],
        description: 'Índice para búsquedas de credenciales primarias'
      },
      {
        name: 'idx_auth_user_type_method_device',
        columns: ['user_type', 'auth_method', 'device_id', 'activo'],
        description: 'Índice para búsquedas por device_id'
      },
      {
        name: 'idx_auth_user_id_type',
        columns: ['user_type', 'user_id', 'auth_method', 'activo'],
        description: 'Índice para búsquedas por usuario específico'
      }
    ];

    for (const index of indices) {
      try {
        // Verificar si el índice ya existe
        const [existingIndexes] = await sequelize.query(`
          SELECT INDEX_NAME 
          FROM information_schema.STATISTICS 
          WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'auth_credentials' 
            AND INDEX_NAME = '${index.name}'
        `);

        if (existingIndexes.length > 0) {
          logger.info(`  ℹ️  Índice ${index.name} ya existe, omitiendo`);
          continue;
        }

        // Crear índice
        const columnsStr = index.columns.map(col => `\`${col}\``).join(', ');
        await sequelize.query(`
          CREATE INDEX \`${index.name}\` 
          ON \`auth_credentials\` (${columnsStr})
        `);

        logger.info(`  ✅ Índice creado: ${index.name}`);
        logger.info(`     Columnas: ${index.columns.join(', ')}`);
        logger.info(`     Descripción: ${index.description}`);
      } catch (error) {
        if (error.message.includes('Duplicate key name')) {
          logger.info(`  ℹ️  Índice ${index.name} ya existe`);
        } else {
          logger.error(`  ❌ Error creando índice ${index.name}:`, error.message);
        }
      }
    }

    logger.info('\n' + '='.repeat(80));
    logger.info('✅ ÍNDICES CREADOS EXITOSAMENTE');
    logger.info('='.repeat(80));

    // Verificar índices existentes
    logger.info('\n📋 Índices actuales en auth_credentials:');
    const [allIndexes] = await sequelize.query(`
      SELECT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as COLUMNS
      FROM information_schema.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'auth_credentials'
        AND INDEX_NAME != 'PRIMARY'
      GROUP BY INDEX_NAME
      ORDER BY INDEX_NAME
    `);

    if (allIndexes.length > 0) {
      allIndexes.forEach(idx => {
        logger.info(`  - ${idx.INDEX_NAME}: (${idx.COLUMNS})`);
      });
    } else {
      logger.info('  (No hay índices adicionales)');
    }

  } catch (error) {
    logger.error('❌ Error fatal creando índices:', error);
    console.error('Error detallado:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar si se llama directamente
const isMainModule = import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` ||
                     process.argv[1]?.includes('crear-indices-auth-credentials');

if (isMainModule) {
  crearIndicesAuthCredentials()
    .then(() => {
      logger.info('\n✅ Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('\n❌ Error fatal:', error);
      console.error('Error detallado:', error);
      process.exit(1);
    });
}

export default crearIndicesAuthCredentials;

