/**
 * Script para configurar PIN 2020 para el paciente ID 1
 */

import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  Paciente,
  PacienteAuth,
  PacienteAuthPIN
} from '../models/associations.js';
import logger from '../utils/logger.js';

async function configurarPIN() {
  const transaction = await sequelize.transaction();

  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔐 CONFIGURANDO PIN 2020 PARA PACIENTE ID 1');
    console.log('='.repeat(80) + '\n');

    const pacienteId = 1;
    const pin = '2020';
    const deviceId = 'device_1760123281625_iel456prr'; // Device ID que está usando el frontend

    // Verificar que el paciente existe
    const paciente = await Paciente.findByPk(pacienteId);
    if (!paciente) {
      throw new Error(`Paciente con ID ${pacienteId} no encontrado`);
    }

    console.log(`✅ Paciente encontrado: ${paciente.nombre} ${paciente.apellido_paterno}`);

    // Buscar o crear registro de autenticación
    const [authRecord, authCreated] = await PacienteAuth.findOrCreate({
      where: {
        id_paciente: pacienteId,
        device_id: deviceId
      },
      defaults: {
        device_type: 'mobile',
        is_primary_device: true,
        failed_attempts: 0,
        locked_until: null,
        activo: true
      },
      transaction
    });

    if (!authCreated) {
      // Actualizar el registro existente
      await authRecord.update({
        failed_attempts: 0,
        locked_until: null,
        activo: true,
        last_activity: new Date()
      }, { transaction });
      console.log('✅ Registro de autenticación actualizado');
    } else {
      console.log('✅ Nuevo registro de autenticación creado');
    }

    // Crear o actualizar PIN
    const pin_hash = await bcrypt.hash(pin, 10);
    const pin_salt = crypto.randomBytes(16).toString('hex');

    const [pinRecord, pinCreated] = await PacienteAuthPIN.findOrCreate({
      where: {
        id_auth: authRecord.id_auth
      },
      defaults: {
        pin_hash: pin_hash,
        pin_salt: pin_salt,
        activo: true
      },
      transaction
    });

    if (!pinCreated) {
      // Actualizar PIN existente
      await pinRecord.update({
        pin_hash: pin_hash,
        pin_salt: pin_salt,
        activo: true
      }, { transaction });
      console.log('✅ PIN actualizado a 2020');
    } else {
      console.log('✅ PIN 2020 configurado exitosamente');
    }

    await transaction.commit();

    console.log('\n' + '='.repeat(80));
    console.log('✅ CONFIGURACIÓN COMPLETADA');
    console.log('='.repeat(80) + '\n');

    console.log('📋 RESUMEN:');
    console.log('─'.repeat(80));
    console.log(`   Paciente: ${paciente.nombre} ${paciente.apellido_paterno} (ID: ${pacienteId})`);
    console.log(`   PIN: ${pin} ⭐`);
    console.log(`   Device ID: ${deviceId}`);
    console.log('');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    logger.error('Error configurando PIN:', error);
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

// Ejecutar script
configurarPIN();




