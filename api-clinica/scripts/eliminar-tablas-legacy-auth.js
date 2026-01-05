import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import logger from '../utils/logger.js';

/**
 * Script para eliminar tablas legacy de autenticación
 * Estas tablas fueron reemplazadas por auth_credentials
 */
async function eliminarTablasLegacy() {
  try {
    // Conectar a la base de datos
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida\n');

    logger.info('🗑️  ELIMINANDO TABLAS LEGACY DE AUTENTICACIÓN');
    logger.info('='.repeat(80));

    const transaction = await sequelize.transaction();

    try {
      const dbDialect = sequelize.getDialect();

      if (dbDialect === 'mysql' || dbDialect === 'mariadb') {
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction });
      }

      // Lista de tablas legacy a eliminar
      const tablasLegacy = [
        'paciente_auth_log',      // Logs de auditoría (puede eliminarse o migrarse)
        'paciente_auth_biometric', // Biométricas legacy → reemplazada por auth_credentials
        'paciente_auth_pin',      // PINs legacy → reemplazada por auth_credentials
        'paciente_auth'           // Autenticación de dispositivos legacy → reemplazada por auth_credentials
      ];

      logger.info(`\n📋 Tablas a eliminar (${tablasLegacy.length}):`);
      tablasLegacy.forEach(tabla => logger.info(`  - ${tabla}`));

      logger.info('\n⚠️  ADVERTENCIA: Estas tablas serán eliminadas permanentemente');
      logger.info('   Asegúrate de haber migrado los datos a auth_credentials si es necesario\n');

      let eliminadas = 0;
      let errores = 0;

      for (const tabla of tablasLegacy) {
        try {
          // Verificar si la tabla existe
          const [tables] = await sequelize.query(
            `SELECT TABLE_NAME
             FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE()
             AND TABLE_NAME = ?`,
            { replacements: [tabla], transaction }
          );

          if (tables.length === 0) {
            logger.info(`  ⚠️  ${tabla} no existe, omitiendo...`);
            continue;
          }

          // Obtener conteo de registros antes de eliminar
          const [countResult] = await sequelize.query(
            `SELECT COUNT(*) as count FROM \`${tabla}\``,
            { transaction }
          );
          const recordCount = countResult[0]?.count || 0;

          // Eliminar tabla
          await sequelize.query(`DROP TABLE IF EXISTS \`${tabla}\``, { transaction });
          
          eliminadas++;
          logger.info(`  ✅ ${tabla} eliminada ${recordCount > 0 ? `(${recordCount} registros perdidos)` : '(vacía)'}`);
        } catch (error) {
          errores++;
          logger.error(`  ❌ Error eliminando ${tabla}:`, error.message);
        }
      }

      if (dbDialect === 'mysql' || dbDialect === 'mariadb') {
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });
      }

      await transaction.commit();

      logger.info('\n' + '='.repeat(80));
      logger.info('✅ ELIMINACIÓN COMPLETADA');
      logger.info('='.repeat(80));
      logger.info(`✅ Tablas eliminadas: ${eliminadas}`);
      if (errores > 0) {
        logger.warn(`⚠️  Errores encontrados: ${errores}`);
      }

      // Verificar tablas restantes relacionadas con auth
      logger.info('\n📊 Verificando tablas de autenticación restantes...\n');
      const [remainingTables] = await sequelize.query(
        `SELECT TABLE_NAME
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME LIKE '%auth%'
         ORDER BY TABLE_NAME`
      );

      if (remainingTables.length > 0) {
        logger.info('Tablas de autenticación restantes:');
        remainingTables.forEach(table => {
          logger.info(`  - ${table.TABLE_NAME}`);
        });
      } else {
        logger.info('  (No se encontraron tablas de autenticación)');
      }

      logger.info('\n✅ Script completado exitosamente');
      logger.info('\n💡 NOTA: Asegúrate de actualizar el código para usar auth_credentials');
      logger.info('   - Eliminar imports de PacienteAuth, PacienteAuthPIN, PacienteAuthBiometric');
      logger.info('   - Actualizar controladores para usar AuthCredential');
      logger.info('   - Migrar rutas legacy a /api/auth-unified/*');

    } catch (dropError) {
      await transaction.rollback();
      logger.error('❌ Error eliminando tablas:', dropError);
      throw dropError;
    }

  } catch (error) {
    logger.error('❌ Error fatal:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Ejecutar si se llama directamente
const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` ||
                     process.argv[1]?.replace(/\\/g, '/').endsWith('eliminar-tablas-legacy-auth.js');

if (isMainModule || process.argv[1]?.includes('eliminar-tablas-legacy-auth')) {
  eliminarTablasLegacy()
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

export default eliminarTablasLegacy;



