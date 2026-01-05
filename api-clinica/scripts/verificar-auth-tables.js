/**
 * Script de verificación de tablas de autenticación de pacientes
 * Verifica que todas las tablas existan y las relaciones funcionen correctamente
 */

import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import { Paciente, PacienteAuth, PacienteAuthPIN, PacienteAuthBiometric } from '../models/associations.js';
import logger from '../utils/logger.js';

async function verificarTablas() {
  try {
    logger.info('🔍 Iniciando verificación de tablas de autenticación...\n');

    // 1. Verificar conexión
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida\n');

    // 2. Verificar que las tablas existen
    logger.info('📋 Verificando existencia de tablas...\n');
    
    const tablas = [
      'paciente_auth',
      'paciente_auth_pin',
      'paciente_auth_biometric',
      'paciente_auth_log'
    ];

    for (const tabla of tablas) {
      try {
        const [results] = await sequelize.query(
          `SELECT COUNT(*) as count FROM information_schema.tables 
           WHERE table_schema = DATABASE() 
           AND table_name = ?`,
          { replacements: [tabla] }
        );
        
        if (results[0].count > 0) {
          logger.info(`  ✅ Tabla "${tabla}" existe`);
          
          // Verificar estructura
          const [columns] = await sequelize.query(
            `DESCRIBE ${tabla}`
          );
          logger.info(`     Columnas: ${columns.length}`);
        } else {
          logger.warn(`  ❌ Tabla "${tabla}" NO existe`);
        }
      } catch (error) {
        logger.error(`  ❌ Error verificando "${tabla}": ${error.message}`);
      }
    }

    // 3. Verificar modelos de Sequelize
    logger.info('\n🔧 Verificando modelos de Sequelize...\n');
    
    try {
      await PacienteAuth.sync({ alter: false });
      logger.info('  ✅ Modelo PacienteAuth sincronizado');
    } catch (error) {
      logger.error(`  ❌ Error en PacienteAuth: ${error.message}`);
    }

    try {
      await PacienteAuthPIN.sync({ alter: false });
      logger.info('  ✅ Modelo PacienteAuthPIN sincronizado');
    } catch (error) {
      logger.error(`  ❌ Error en PacienteAuthPIN: ${error.message}`);
    }

    try {
      await PacienteAuthBiometric.sync({ alter: false });
      logger.info('  ✅ Modelo PacienteAuthBiometric sincronizado');
    } catch (error) {
      logger.error(`  ❌ Error en PacienteAuthBiometric: ${error.message}`);
    }

    // 4. Verificar relaciones con una consulta de prueba
    logger.info('\n🔗 Verificando relaciones...\n');
    
    try {
      // Verificar relación PacienteAuth -> Paciente
      const [authTest] = await sequelize.query(
        `SELECT COUNT(*) as count 
         FROM paciente_auth pa
         INNER JOIN pacientes p ON pa.id_paciente = p.id_paciente
         LIMIT 1`
      );
      logger.info('  ✅ Relación PacienteAuth -> Paciente funciona');
    } catch (error) {
      logger.error(`  ❌ Error en relación PacienteAuth -> Paciente: ${error.message}`);
    }

    try {
      // Verificar relación PacienteAuth -> PacienteAuthPIN
      const [pinTest] = await sequelize.query(
        `SELECT COUNT(*) as count 
         FROM paciente_auth pa
         LEFT JOIN paciente_auth_pin pap ON pa.id_auth = pap.id_auth
         LIMIT 1`
      );
      logger.info('  ✅ Relación PacienteAuth -> PacienteAuthPIN funciona');
    } catch (error) {
      logger.error(`  ❌ Error en relación PacienteAuth -> PacienteAuthPIN: ${error.message}`);
    }

    try {
      // Verificar relación PacienteAuth -> PacienteAuthBiometric
      const [bioTest] = await sequelize.query(
        `SELECT COUNT(*) as count 
         FROM paciente_auth pa
         LEFT JOIN paciente_auth_biometric pab ON pa.id_auth = pab.id_auth
         LIMIT 1`
      );
      logger.info('  ✅ Relación PacienteAuth -> PacienteAuthBiometric funciona');
    } catch (error) {
      logger.error(`  ❌ Error en relación PacienteAuth -> PacienteAuthBiometric: ${error.message}`);
    }

    // 5. Verificar índices
    logger.info('\n📊 Verificando índices importantes...\n');
    
    try {
      const [indexes] = await sequelize.query(
        `SHOW INDEXES FROM paciente_auth WHERE Key_name = 'uk_paciente_device'`
      );
      if (indexes.length > 0) {
        logger.info('  ✅ Índice único uk_paciente_device existe');
      } else {
        logger.warn('  ⚠️  Índice único uk_paciente_device NO existe');
      }
    } catch (error) {
      logger.error(`  ❌ Error verificando índices: ${error.message}`);
    }

    try {
      const [indexes] = await sequelize.query(
        `SHOW INDEXES FROM paciente_auth_biometric WHERE Key_name = 'uk_credential_id'`
      );
      if (indexes.length > 0) {
        logger.info('  ✅ Índice único uk_credential_id existe');
      } else {
        logger.warn('  ⚠️  Índice único uk_credential_id NO existe');
      }
    } catch (error) {
      logger.error(`  ❌ Error verificando índices: ${error.message}`);
    }

    // 6. Verificar con modelos Sequelize (test de include)
    logger.info('\n🧪 Probando relaciones con Sequelize...\n');
    
    try {
      // Intentar hacer un include como lo hace el controlador
      const testAuth = await PacienteAuth.findOne({
        include: [
          { model: Paciente, as: 'paciente' },
          { model: PacienteAuthPIN, as: 'PacienteAuthPIN' },
          { model: PacienteAuthBiometric, as: 'PacienteAuthBiometric' }
        ],
        limit: 1
      });
      
      if (testAuth) {
        logger.info('  ✅ Include con todas las relaciones funciona correctamente');
        logger.info(`     ID Auth: ${testAuth.id_auth}, ID Paciente: ${testAuth.id_paciente}`);
      } else {
        logger.warn('  ⚠️  No hay registros para probar, pero las relaciones están configuradas');
      }
    } catch (error) {
      logger.error(`  ❌ Error en include de Sequelize: ${error.message}`);
      logger.error(`     Stack: ${error.stack}`);
    }

    // 7. Contar registros existentes
    logger.info('\n📈 Estadísticas de registros...\n');
    
    try {
      const [authCount] = await sequelize.query('SELECT COUNT(*) as count FROM paciente_auth');
      logger.info(`  📊 PacienteAuth: ${authCount[0].count} registros`);
      
      const [pinCount] = await sequelize.query('SELECT COUNT(*) as count FROM paciente_auth_pin');
      logger.info(`  📊 PacienteAuthPIN: ${pinCount[0].count} registros`);
      
      const [bioCount] = await sequelize.query('SELECT COUNT(*) as count FROM paciente_auth_biometric');
      logger.info(`  📊 PacienteAuthBiometric: ${bioCount[0].count} registros`);
    } catch (error) {
      logger.error(`  ❌ Error contando registros: ${error.message}`);
    }

    // 8. Verificar foreign keys
    logger.info('\n🔐 Verificando foreign keys...\n');
    
    try {
      const [fks] = await sequelize.query(`
        SELECT 
          CONSTRAINT_NAME,
          TABLE_NAME,
          COLUMN_NAME,
          REFERENCED_TABLE_NAME,
          REFERENCED_COLUMN_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('paciente_auth', 'paciente_auth_pin', 'paciente_auth_biometric')
        AND REFERENCED_TABLE_NAME IS NOT NULL
        ORDER BY TABLE_NAME, CONSTRAINT_NAME
      `);
      
      if (fks.length > 0) {
        logger.info(`  ✅ ${fks.length} foreign keys encontradas:`);
        fks.forEach(fk => {
          logger.info(`     ${fk.TABLE_NAME}.${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
        });
      } else {
        logger.warn('  ⚠️  No se encontraron foreign keys');
      }
    } catch (error) {
      logger.error(`  ❌ Error verificando foreign keys: ${error.message}`);
    }

    logger.info('\n✅ Verificación completada\n');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error en verificación:', error);
    logger.error('Stack:', error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

// Ejecutar verificación
verificarTablas();



