/**
 * Script de migración: Migrar datos de autenticación a auth_credentials
 * 
 * Este script migra:
 * 1. Passwords de Usuario (Doctor/Admin) → auth_credentials
 * 2. PINs de Paciente → auth_credentials
 * 3. Biométricas de Paciente → auth_credentials
 * 
 * Ejecutar: node scripts/migrar-auth-credentials.js
 */

import sequelize from '../config/db.js';
import { Usuario, Paciente } from '../models/associations.js';
import { PacienteAuth, PacienteAuthPIN, PacienteAuthBiometric } from '../models/PacienteAuth.js';
import AuthCredential from '../models/AuthCredential.js';
import logger from '../utils/logger.js';

async function migrateAuthCredentials() {
  const transaction = await sequelize.transaction();

  try {
    logger.info('Iniciando migración de credenciales de autenticación...');

    // Verificar si ya existe la tabla
    const [results] = await sequelize.query(
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'auth_credentials'",
      { transaction }
    );

    if (results[0].count === 0) {
      logger.warn('La tabla auth_credentials no existe. Debe crearse primero con Sequelize sync o migration.');
      logger.info('Sincronizando modelo...');
      await AuthCredential.sync({ transaction });
    }

    // PASO 1: Migrar passwords de Doctores/Admins
    logger.info('PASO 1: Migrando passwords de Doctores/Admins...');
    const usuarios = await Usuario.findAll({
      where: {
        rol: ['Doctor', 'Admin'],
        activo: true
      },
      transaction
    });

    let migratedPasswords = 0;
    for (const usuario of usuarios) {
      // Verificar si ya existe una credencial password para este usuario
      const existing = await AuthCredential.findOne({
        where: {
          user_type: usuario.rol === 'Doctor' ? 'Doctor' : 'Admin',
          user_id: usuario.id_usuario,
          auth_method: 'password',
          activo: true
        },
        transaction
      });

      if (!existing && usuario.password_hash) {
        await AuthCredential.create({
          user_type: usuario.rol === 'Doctor' ? 'Doctor' : 'Admin',
          user_id: usuario.id_usuario,
          auth_method: 'password',
          credential_value: usuario.password_hash,
          credential_salt: null,
          is_primary: true,
          activo: usuario.activo,
          created_at: usuario.fecha_creacion || new Date()
        }, { transaction });

        migratedPasswords++;
      }
    }

    logger.info(`Migrados ${migratedPasswords} passwords de Doctores/Admins`);

    // PASO 2: Migrar PINs de Pacientes
    logger.info('PASO 2: Migrando PINs de Pacientes...');
    const pinRecords = await PacienteAuthPIN.findAll({
      where: { activo: true },
      include: [
        {
          model: PacienteAuth,
          as: 'PacienteAuth',
          where: { activo: true },
          required: true
        }
      ],
      transaction
    });

    let migratedPINs = 0;
    for (const pinRecord of pinRecords) {
      const authRecord = pinRecord.PacienteAuth;
      if (!authRecord) continue;

      // Verificar si ya existe
      const existing = await AuthCredential.findOne({
        where: {
          user_type: 'Paciente',
          user_id: authRecord.id_paciente,
          auth_method: 'pin',
          device_id: authRecord.device_id,
          activo: true
        },
        transaction
      });

      if (!existing) {
        await AuthCredential.create({
          user_type: 'Paciente',
          user_id: authRecord.id_paciente,
          auth_method: 'pin',
          credential_value: pinRecord.pin_hash,
          credential_salt: pinRecord.pin_salt,
          device_id: authRecord.device_id,
          device_name: authRecord.device_name || null,
          device_type: authRecord.device_type || 'mobile',
          is_primary: authRecord.is_primary_device || false,
          failed_attempts: authRecord.failed_attempts || 0,
          locked_until: authRecord.locked_until,
          last_used: authRecord.last_activity,
          created_at: pinRecord.created_at || new Date(),
          activo: pinRecord.activo && authRecord.activo
        }, { transaction });

        migratedPINs++;
      }
    }

    logger.info(`Migrados ${migratedPINs} PINs de Pacientes`);

    // PASO 3: Migrar Biométricas de Pacientes
    logger.info('PASO 3: Migrando Biométricas de Pacientes...');
    const biometricRecords = await PacienteAuthBiometric.findAll({
      where: { activo: true },
      include: [
        {
          model: PacienteAuth,
          as: 'PacienteAuth',
          where: { activo: true },
          required: true
        }
      ],
      transaction
    });

    let migratedBiometrics = 0;
    for (const bioRecord of biometricRecords) {
      const authRecord = bioRecord.PacienteAuth;
      if (!authRecord) continue;

      // Verificar si ya existe
      const existing = await AuthCredential.findOne({
        where: {
          user_type: 'Paciente',
          user_id: authRecord.id_paciente,
          auth_method: 'biometric',
          device_id: bioRecord.credential_id,
          activo: true
        },
        transaction
      });

      if (!existing) {
        await AuthCredential.create({
          user_type: 'Paciente',
          user_id: authRecord.id_paciente,
          auth_method: 'biometric',
          credential_value: bioRecord.public_key,
          credential_salt: null,
          device_id: bioRecord.credential_id,
          device_name: authRecord.device_name || null,
          device_type: authRecord.device_type || 'mobile',
          credential_metadata: {
            biometric_type: bioRecord.biometric_type,
            credential_id: bioRecord.credential_id
          },
          is_primary: authRecord.is_primary_device || false,
          last_used: bioRecord.last_used,
          created_at: bioRecord.created_at || new Date(),
          activo: bioRecord.activo && authRecord.activo
        }, { transaction });

        migratedBiometrics++;
      }
    }

    logger.info(`Migradas ${migratedBiometrics} credenciales biométricas`);

    // Resumen
    const total = migratedPasswords + migratedPINs + migratedBiometrics;
    logger.info('='.repeat(50));
    logger.info('MIGRACIÓN COMPLETADA');
    logger.info('='.repeat(50));
    logger.info(`Total de credenciales migradas: ${total}`);
    logger.info(`  - Passwords (Doctor/Admin): ${migratedPasswords}`);
    logger.info(`  - PINs (Paciente): ${migratedPINs}`);
    logger.info(`  - Biométricas (Paciente): ${migratedBiometrics}`);
    logger.info('='.repeat(50));

    await transaction.commit();
    logger.info('✅ Migración completada exitosamente');

    // Verificar integridad
    const totalInNewTable = await AuthCredential.count({ where: { activo: true } });
    logger.info(`Total de credenciales activas en auth_credentials: ${totalInNewTable}`);

  } catch (error) {
    await transaction.rollback();
    logger.error('❌ Error en migración:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateAuthCredentials()
    .then(() => {
      logger.info('Script finalizado');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Error fatal:', error);
      process.exit(1);
    });
}

export default migrateAuthCredentials;



