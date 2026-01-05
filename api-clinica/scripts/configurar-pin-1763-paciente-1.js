/**
 * Script para configurar PIN 1763 también para el paciente ID 1
 */

import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  PacienteAuth,
  PacienteAuthPIN,
  Paciente
} from '../models/associations.js';
import logger from '../utils/logger.js';

async function configurarPIN1763() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔐 CONFIGURANDO PIN 1763 PARA PACIENTE ID 1');
    console.log('='.repeat(80) + '\n');

    const pacienteId = 1;
    const pin = '1763';

    // Buscar o crear registro de autenticación
    const paciente = await Paciente.findByPk(pacienteId);
    if (!paciente) {
      throw new Error(`Paciente con ID ${pacienteId} no encontrado`);
    }

    console.log(`✅ Paciente encontrado: ${paciente.nombre} ${paciente.apellido_paterno}`);

    // Buscar cualquier registro de auth del paciente
    let authRecord = await PacienteAuth.findOne({
      where: { id_paciente: pacienteId, activo: true },
      include: [{ model: PacienteAuthPIN, as: 'PacienteAuthPIN' }]
    });

    if (!authRecord) {
      const deviceId = `device_${pacienteId}_${Date.now()}`;
      authRecord = await PacienteAuth.create({
        id_paciente: pacienteId,
        device_id: deviceId,
        device_type: 'mobile',
        is_primary_device: true,
        failed_attempts: 0,
        locked_until: null,
        activo: true
      });
      console.log('✅ Nuevo registro de autenticación creado');
    }

    // Verificar PIN actual
    let pinRecord = authRecord.PacienteAuthPIN;
    
    if (pinRecord) {
      // Verificar si ya tiene PIN 1763
      const isValid1763 = await bcrypt.compare(pin, pinRecord.pin_hash);
      const isValid2020 = await bcrypt.compare('2020', pinRecord.pin_hash);
      
      if (isValid1763) {
        console.log('✅ El PIN 1763 ya está configurado para este paciente');
        await sequelize.close();
        process.exit(0);
      }
      
      if (isValid2020) {
        console.log('⚠️  El paciente tiene PIN 2020. Actualizando también a 1763...');
        // Actualizar el PIN existente a 1763
        const pin_hash = await bcrypt.hash(pin, 10);
        const pin_salt = crypto.randomBytes(16).toString('hex');
        
        await pinRecord.update({
          pin_hash: pin_hash,
          pin_salt: pin_salt,
          activo: true
        });
        console.log('✅ PIN actualizado de 2020 a 1763');
      }
    } else {
      // Crear nuevo PIN
      const pin_hash = await bcrypt.hash(pin, 10);
      const pin_salt = crypto.randomBytes(16).toString('hex');
      
      pinRecord = await PacienteAuthPIN.create({
        id_auth: authRecord.id_auth,
        pin_hash: pin_hash,
        pin_salt: pin_salt,
        activo: true
      });
      console.log('✅ PIN 1763 configurado exitosamente');
    }

    // Resetear bloqueos
    await authRecord.update({
      failed_attempts: 0,
      locked_until: null,
      activo: true
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ CONFIGURACIÓN COMPLETADA');
    console.log('='.repeat(80) + '\n');

    console.log('🔑 CREDENCIALES:');
    console.log('─'.repeat(80));
    console.log(`   Paciente ID: ${pacienteId}`);
    console.log(`   PIN: ${pin}`);
    console.log('');
    console.log('⚠️  NOTA: El PIN anterior (2020) ha sido reemplazado por 1763');
    console.log('');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    logger.error('Error configurando PIN:', error);
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

configurarPIN1763();




