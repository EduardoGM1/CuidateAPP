/**
 * Script para truncar toda la base de datos y crear solo un administrador
 * 
 * Uso: node scripts/truncate-and-create-admin.js
 */

import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import bcrypt from 'bcryptjs';
import { Usuario } from '../models/associations.js';
import logger from '../utils/logger.js';

const truncateAndCreateAdmin = async () => {
  const transaction = await sequelize.transaction();
  
  try {
    logger.info('🧹 Iniciando truncate de toda la base de datos...\n');

    // Obtener el tipo de base de datos
    const dbDialect = sequelize.getDialect();
    logger.info(`Tipo de base de datos: ${dbDialect}`);

    // Desactivar temporalmente las restricciones de foreign key (MySQL/MariaDB)
    if (dbDialect === 'mysql' || dbDialect === 'mariadb') {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction });
    } else if (dbDialect === 'sqlite') {
      // SQLite no soporta desactivar foreign keys fácilmente, pero podemos usar PRAGMA
      await sequelize.query('PRAGMA foreign_keys = OFF', { transaction });
    }

    // Lista de todas las tablas que necesitamos limpiar (en orden inverso de dependencias)
    const tables = [
      'plan_detalle',
      'plan_medicacion',
      'esquema_vacunacion',
      'punto_chequeo',
      'paciente_comorbilidad',
      'paciente_auth_pin',
      'paciente_auth',
      'red_apoyo',
      'mensaje_chat',
      'doctor_paciente',
      'diagnosticos',
      'signos_vitales',
      'citas',
      'pacientes',
      'medicamentos',
      'comorbilidades',
      'vacunas', // Nueva tabla
      'doctores',
      'modulos',
      'usuarios'
    ];

    // Limpiar todas las tablas
    for (const table of tables) {
      try {
        if (dbDialect === 'mysql' || dbDialect === 'mariadb') {
          await sequelize.query(`TRUNCATE TABLE ${table}`, { transaction });
        } else if (dbDialect === 'sqlite') {
          // SQLite no tiene TRUNCATE, usar DELETE
          await sequelize.query(`DELETE FROM ${table}`, { transaction });
          // Resetear el autoincrement
          await sequelize.query(`DELETE FROM sqlite_sequence WHERE name='${table}'`, { transaction });
        } else {
          // PostgreSQL, SQL Server, etc.
          await sequelize.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`, { transaction });
        }
        logger.info(`  ✅ Tabla ${table} truncada`);
      } catch (error) {
        logger.warn(`  ⚠️  Tabla ${table}: ${error.message}`);
        // Intentar DELETE como alternativa
        try {
          await sequelize.query(`DELETE FROM ${table}`, { transaction });
          logger.info(`  ✅ Tabla ${table} limpiada con DELETE`);
        } catch (deleteError) {
          logger.error(`  ❌ Error limpiando ${table}: ${deleteError.message}`);
        }
      }
    }

    // Reactivar las restricciones de foreign key
    if (dbDialect === 'mysql' || dbDialect === 'mariadb') {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });
    } else if (dbDialect === 'sqlite') {
      await sequelize.query('PRAGMA foreign_keys = ON', { transaction });
    }

    logger.info('\n✅ Base de datos truncada completamente\n');
    logger.info('👤 Creando administrador...\n');

    // ============================================
    // CREAR ADMINISTRADOR
    // ============================================
    const adminEmail = 'admin@clinica.com';
    const adminPassword = 'Admin123!'; // Contraseña por defecto
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

    const admin = await Usuario.create({
      email: adminEmail,
      password_hash: adminPasswordHash,
      rol: 'Admin',
      activo: true,
      fecha_creacion: new Date()
    }, { transaction });

    logger.info(`✅ Administrador creado:`);
    logger.info(`   Email: ${adminEmail}`);
    logger.info(`   Contraseña: ${adminPassword}`);
    logger.info(`   ID: ${admin.id_usuario}`);
    logger.info(`   Rol: ${admin.rol}\n`);

    // Confirmar la transacción
    await transaction.commit();
    
    logger.info('✅ Proceso completado exitosamente');
    
  } catch (error) {
    // Revertir la transacción en caso de error
    await transaction.rollback();
    logger.error('❌ Error durante el proceso:', {
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

// Ejecutar el script
truncateAndCreateAdmin()
  .then(() => {
    logger.info('✅ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Error fatal:', error);
    process.exit(1);
  });


