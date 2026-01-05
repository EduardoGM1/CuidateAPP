/**
 * Script para mostrar todas las credenciales del sistema
 * 
 * Ejecutar: node scripts/mostrar-credenciales.js
 */

import dotenv from 'dotenv';
dotenv.config();
import sequelize from '../config/db.js';
import { Usuario, Paciente, Doctor, AuthCredential } from '../models/associations.js';
import logger from '../utils/logger.js';

async function mostrarCredenciales() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conectado a la base de datos\n');

    // Obtener administrador
    const admin = await Usuario.findOne({
      where: { email: 'admin@clinica.com', rol: 'Admin' }
    });

    const adminCred = admin ? await AuthCredential.findOne({
      where: {
        user_type: 'Admin',
        user_id: admin.id_usuario,
        auth_method: 'password',
        activo: true
      }
    }) : null;

    // Obtener doctor
    const doctor = await Usuario.findOne({
      where: { email: 'doctor@petalmail.com', rol: 'Doctor' }
    });

    const doctorProfile = doctor ? await Doctor.findOne({
      where: { id_usuario: doctor.id_usuario }
    }) : null;

    const doctorCred = doctor ? await AuthCredential.findOne({
      where: {
        user_type: 'Doctor',
        user_id: doctor.id_usuario,
        auth_method: 'password',
        activo: true
      }
    }) : null;

    // Obtener paciente
    const paciente = await Paciente.findOne({
      where: {
        nombre: 'Eduardo',
        apellido_paterno: 'Gonzalez',
        apellido_materno: 'Gonzalez',
        activo: true
      }
    });

    const pacienteUsuario = paciente ? await Usuario.findByPk(paciente.id_usuario) : null;

    const pacientePin = paciente ? await AuthCredential.findOne({
      where: {
        user_type: 'Paciente',
        user_id: paciente.id_usuario,
        auth_method: 'pin',
        activo: true
      }
    }) : null;

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📋 CREDENCIALES DEL SISTEMA');
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (admin) {
      console.log('👤 ADMINISTRADOR:');
      console.log(`   Email: ${admin.email}`);
      console.log(`   Contraseña: admin123`);
      console.log(`   ID Usuario: ${admin.id_usuario}`);
      console.log(`   Credencial configurada: ${adminCred ? '✅ Sí' : '❌ No'}\n`);
    } else {
      console.log('❌ Administrador no encontrado\n');
    }

    if (doctor) {
      console.log('👨‍⚕️ DOCTOR:');
      console.log(`   Email: ${doctor.email}`);
      console.log(`   Contraseña: doctor123`);
      console.log(`   ID Usuario: ${doctor.id_usuario}`);
      console.log(`   ID Doctor: ${doctorProfile?.id_doctor || 'N/A'}`);
      console.log(`   Nombre: ${doctorProfile?.nombre || 'N/A'} ${doctorProfile?.apellido_paterno || ''}`);
      console.log(`   Credencial configurada: ${doctorCred ? '✅ Sí' : '❌ No'}\n`);
    } else {
      console.log('❌ Doctor no encontrado\n');
    }

    if (paciente) {
      console.log('👤 PACIENTE (Eduardo Gonzalez Gonzalez):');
      console.log(`   Email: ${pacienteUsuario?.email || 'N/A'} (NO SE USA - Solo referencia)`);
      console.log(`   Contraseña: paciente123 (NO SE USA - Solo referencia)`);
      console.log(`   PIN: 2020 (USAR ESTE PARA LOGIN)`);
      console.log(`   ID Usuario: ${paciente.id_usuario}`);
      console.log(`   ID Paciente: ${paciente.id_paciente}`);
      console.log(`   PIN configurado: ${pacientePin ? '✅ Sí' : '❌ No'}\n`);
    } else {
      console.log('❌ Paciente no encontrado\n');
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ Credenciales mostradas exitosamente');
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    logger.error('❌ Error mostrando credenciales:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    logger.info('🔌 Conexión cerrada');
  }
}

mostrarCredenciales();

