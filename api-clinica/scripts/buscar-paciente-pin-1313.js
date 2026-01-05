/**
 * Script para buscar qué paciente tiene el PIN 1313
 */

import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import bcrypt from 'bcryptjs';
import {
  PacienteAuth,
  PacienteAuthPIN,
  Paciente
} from '../models/associations.js';

async function buscarPIN1313() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 BUSCANDO PACIENTE CON PIN 1313');
    console.log('='.repeat(80) + '\n');

    // Obtener todos los PINs activos
    const allPINRecords = await PacienteAuthPIN.findAll({
      where: { activo: true },
      include: [
        {
          model: PacienteAuth,
          as: 'PacienteAuth',
          where: { activo: true },
          required: true,
          include: [
            {
              model: Paciente,
              as: 'paciente',
              required: true,
              attributes: ['id_paciente', 'nombre', 'apellido_paterno', 'apellido_materno']
            }
          ]
        }
      ]
    });

    console.log(`📋 Total de PINs activos: ${allPINRecords.length}\n`);

    let encontrado = false;
    for (const pinRecord of allPINRecords) {
      if (pinRecord.PacienteAuth && pinRecord.PacienteAuth.paciente) {
        const isValid1313 = await bcrypt.compare('1313', pinRecord.pin_hash);
        if (isValid1313) {
          const paciente = pinRecord.PacienteAuth.paciente;
          console.log('✅ PIN 1313 ENCONTRADO:');
          console.log(`   Paciente ID: ${paciente.id_paciente}`);
          console.log(`   Nombre: ${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno || ''}`);
          console.log(`   Auth ID: ${pinRecord.PacienteAuth.id_auth}`);
          console.log(`   Device ID: ${pinRecord.PacienteAuth.device_id?.substring(0, 40)}...`);
          console.log('');
          encontrado = true;
        }
      }
    }

    if (!encontrado) {
      console.log('❌ No se encontró ningún paciente con PIN 1313');
      console.log('\n💡 Verificando todos los PINs activos...\n');
      
      for (const pinRecord of allPINRecords) {
        if (pinRecord.PacienteAuth && pinRecord.PacienteAuth.paciente) {
          const paciente = pinRecord.PacienteAuth.paciente;
          console.log(`   Paciente ID ${paciente.id_paciente}: ${paciente.nombre} ${paciente.apellido_paterno}`);
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ BÚSQUEDA COMPLETADA');
    console.log('='.repeat(80) + '\n');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

buscarPIN1313();




