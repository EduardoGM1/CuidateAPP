/**
 * Script para configurar PIN para el paciente Eduardo Gonzalez Gonzalez
 * 
 * Ejecutar: node scripts/configurar-pin-paciente.js
 */

import dotenv from 'dotenv';
dotenv.config();
import sequelize from '../config/db.js';
import { Paciente, AuthCredential } from '../models/associations.js';
import UnifiedAuthService from '../services/unifiedAuthService.js';
import logger from '../utils/logger.js';

async function configurarPinPaciente() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conectado a la base de datos');

    // Buscar paciente Eduardo Gonzalez Gonzalez
    const paciente = await Paciente.findOne({
      where: {
        nombre: 'Eduardo',
        apellido_paterno: 'Gonzalez',
        apellido_materno: 'Gonzalez',
        activo: true
      }
    });

    if (!paciente) {
      logger.error('❌ Paciente Eduardo Gonzalez Gonzalez no encontrado');
      process.exit(1);
    }

    logger.info(`✅ Paciente encontrado: ${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno} (ID: ${paciente.id_paciente})\n`);

    // Verificar si ya tiene PIN
    const pinExistente = await AuthCredential.findOne({
      where: {
        user_type: 'Paciente',
        user_id: paciente.id_paciente,
        auth_method: 'pin',
        activo: true
      }
    });

    if (pinExistente) {
      logger.info('⚠️  El paciente ya tiene un PIN configurado');
      logger.info(`   ID Credencial: ${pinExistente.id_credential}`);
      logger.info(`   Es primaria: ${pinExistente.is_primary}`);
      logger.info('\n💡 Para cambiar el PIN, elimina la credencial existente primero o usa el endpoint de actualización.\n');
      return;
    }

    // PIN por defecto: 2020 (4 dígitos)
    const pin = '2020';
    const deviceId = `device-${paciente.id_paciente}-${Date.now()}`;

    logger.info('🔐 Configurando PIN para el paciente...');
    logger.info(`   PIN: ${pin}`);
    logger.info(`   Device ID: ${deviceId}\n`);

    // Crear credencial PIN usando el servicio unificado
    const resultado = await UnifiedAuthService.setupCredential(
      'Paciente',
      paciente.id_paciente,
      'pin',
      pin,
      {
        deviceId: deviceId,
        deviceName: 'Dispositivo Principal',
        deviceType: 'mobile',
        isPrimary: true
      }
    );

    logger.info('✅ PIN configurado exitosamente');
    logger.info(`   ID Credencial: ${resultado.credential.id_credential}`);
    logger.info(`   Es primaria: ${resultado.credential.is_primary}\n`);

    logger.info('═══════════════════════════════════════════════════════════════');
    logger.info('📋 CREDENCIALES DEL PACIENTE');
    logger.info('═══════════════════════════════════════════════════════════════\n');
    logger.info('👤 PACIENTE (Eduardo Gonzalez Gonzalez):');
    logger.info(`   ID Paciente: ${paciente.id_paciente}`);
    logger.info(`   PIN: ${pin}`);
    logger.info(`   Device ID: ${deviceId}\n`);
    logger.info('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    logger.error('❌ Error configurando PIN:', error);
    if (error.message) {
      logger.error(`   Mensaje: ${error.message}`);
    }
    process.exit(1);
  } finally {
    await sequelize.close();
    logger.info('🔌 Conexión cerrada');
  }
}

configurarPinPaciente();

