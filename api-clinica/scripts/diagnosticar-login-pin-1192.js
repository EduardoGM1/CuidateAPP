/**
 * Script para diagnosticar problemas de login con PIN 1192
 */

import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import { Paciente, PacienteAuth, PacienteAuthPIN } from '../models/associations.js';
import bcrypt from 'bcryptjs';

async function diagnosticarLogin() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 DIAGNÓSTICO DE LOGIN - PIN 1192');
    console.log('='.repeat(80) + '\n');

    // 1. Buscar todos los pacientes con PIN 1192
    console.log('📋 BUSCANDO PACIENTES CON PIN 1192:\n');
    
    const todosLosPINs = await PacienteAuthPIN.findAll({
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
              required: true
            }
          ]
        }
      ]
    });

    let pacientesCon1192 = [];
    for (const pinRec of todosLosPINs) {
      const esValido = await bcrypt.compare('1192', pinRec.pin_hash);
      if (esValido && pinRec.PacienteAuth && pinRec.PacienteAuth.paciente) {
        pacientesCon1192.push({
          paciente: pinRec.PacienteAuth.paciente,
          auth: pinRec.PacienteAuth,
          pin: pinRec
        });
      }
    }

    if (pacientesCon1192.length === 0) {
      console.log('❌ No se encontró ningún paciente con PIN 1192\n');
    } else {
      console.log(`✅ Se encontraron ${pacientesCon1192.length} paciente(s) con PIN 1192:\n`);
      
      pacientesCon1192.forEach((item, index) => {
        console.log(`${index + 1}. PACIENTE ID: ${item.paciente.id_paciente}`);
        console.log(`   Nombre: ${item.paciente.nombre} ${item.paciente.apellido_paterno || ''}`);
        console.log(`   Activo: ${item.paciente.activo ? '✅' : '❌'}`);
        console.log(`   Fecha registro: ${item.paciente.fecha_registro}`);
        console.log(`   ID Auth: ${item.auth.id_auth}`);
        console.log(`   Device ID: ${item.auth.device_id}`);
        console.log(`   Intentos fallidos: ${item.auth.failed_attempts}`);
        console.log(`   Bloqueado hasta: ${item.auth.locked_until || 'No bloqueado'}`);
        console.log('');
      });
    }

    // 2. Buscar el paciente más reciente creado
    console.log('📋 PACIENTE MÁS RECIENTE CREADO:\n');
    
    const pacienteReciente = await Paciente.findOne({
      order: [['fecha_registro', 'DESC']],
      include: [
        {
          model: PacienteAuth,
          as: 'auth',
          where: { activo: true },
          required: false,
          include: [
            {
              model: PacienteAuthPIN,
              as: 'PacienteAuthPIN',
              where: { activo: true },
              required: false
            }
          ]
        }
      ]
    });

    if (pacienteReciente) {
      console.log(`ID: ${pacienteReciente.id_paciente}`);
      console.log(`Nombre: ${pacienteReciente.nombre} ${pacienteReciente.apellido_paterno || ''}`);
      console.log(`Fecha registro: ${pacienteReciente.fecha_registro}`);
      console.log(`Activo: ${pacienteReciente.activo ? '✅' : '❌'}`);
      
      if (pacienteReciente.auth) {
        console.log(`\n🔐 Autenticación:`);
        console.log(`   Device ID: ${pacienteReciente.auth.device_id}`);
        console.log(`   Intentos fallidos: ${pacienteReciente.auth.failed_attempts}`);
        
        if (pacienteReciente.auth.PacienteAuthPIN) {
          const pinRecord = pacienteReciente.auth.PacienteAuthPIN;
          console.log(`\n🔢 PIN:`);
          console.log(`   Hash: ${pinRecord.pin_hash.substring(0, 30)}...`);
          
          // Probar PIN 1192
          const esValido = await bcrypt.compare('1192', pinRecord.pin_hash);
          console.log(`   PIN 1192 válido: ${esValido ? '✅' : '❌'}`);
          
          if (!esValido) {
            console.log(`\n⚠️  El PIN 1192 NO es válido para este paciente`);
            console.log(`   Este paciente tiene un PIN diferente`);
          }
        } else {
          console.log(`\n⚠️  No tiene PIN configurado`);
        }
      } else {
        console.log(`\n⚠️  No tiene registro de autenticación`);
      }
      console.log('');
    }

    // 3. Listar todos los pacientes con PIN configurado
    console.log('📋 TODOS LOS PACIENTES CON PIN CONFIGURADO:\n');
    
    const pacientesConPIN = await Paciente.findAll({
      where: { activo: true },
      include: [
        {
          model: PacienteAuth,
          as: 'auth',
          where: { activo: true },
          required: true,
          include: [
            {
              model: PacienteAuthPIN,
              as: 'PacienteAuthPIN',
              where: { activo: true },
              required: true
            }
          ]
        }
      ],
      order: [['fecha_registro', 'DESC']]
    });

    console.log(`Total: ${pacientesConPIN.length} pacientes con PIN\n`);
    
    for (const paciente of pacientesConPIN) {
      const pinRecord = paciente.auth.PacienteAuthPIN;
      const es1192 = await bcrypt.compare('1192', pinRecord.pin_hash);
      
      console.log(`ID ${paciente.id_paciente}: ${paciente.nombre} ${paciente.apellido_paterno || ''} - PIN 1192: ${es1192 ? '✅' : '❌'}`);
    }

    // 4. Recomendaciones
    console.log('\n' + '='.repeat(80));
    console.log('💡 RECOMENDACIONES:\n');
    
    if (pacientesCon1192.length === 0) {
      console.log('⚠️  No se encontró ningún paciente con PIN 1192');
      console.log('   - Verifica que el PIN fue ingresado correctamente al crear el paciente');
      console.log('   - Verifica que el paciente tiene un registro de autenticación activo');
    } else {
      pacientesCon1192.forEach(item => {
        console.log(`\n✅ Para paciente ID ${item.paciente.id_paciente}:`);
        console.log(`   - Usa el ID: ${item.paciente.id_paciente}`);
        console.log(`   - PIN: 1192`);
        
        if (item.auth.locked_until && new Date() < item.auth.locked_until) {
          const minutos = Math.ceil((item.auth.locked_until - new Date()) / (1000 * 60));
          console.log(`   - ⚠️  CUENTA BLOQUEADA por ${minutos} minutos más`);
          console.log(`   - Resetea el bloqueo antes de intentar login`);
        }
        
        if (item.auth.failed_attempts >= 2) {
          console.log(`   - ⚠️  ${item.auth.failed_attempts} intentos fallidos`);
          console.log(`   - El próximo fallo bloqueará la cuenta`);
        }
        
        console.log(`   - Device ID actual: ${item.auth.device_id}`);
        console.log(`   - Si usas un dispositivo diferente, el sistema debería actualizar el device_id automáticamente`);
      });
    }

    await sequelize.close();
  } catch (error) {
    console.error('❌ ERROR:', error);
    await sequelize.close();
    process.exit(1);
  }
}

diagnosticarLogin();




