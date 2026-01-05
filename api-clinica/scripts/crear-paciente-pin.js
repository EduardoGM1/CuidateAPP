/**
 * Script para crear un nuevo paciente con PIN específico
 * 
 * Ejecutar: node scripts/crear-paciente-pin.js
 */

import dotenv from 'dotenv';
dotenv.config();
import sequelize from '../config/db.js';
import {
  Usuario,
  Paciente,
  Doctor,
  DoctorPaciente,
  Modulo,
  AuthCredential
} from '../models/associations.js';
import bcrypt from 'bcrypt';
import UnifiedAuthService from '../services/unifiedAuthService.js';
import logger from '../utils/logger.js';

async function crearPacienteConPin() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conectado a la base de datos\n');

    // Obtener el módulo existente
    const modulo = await Modulo.findOne();
    if (!modulo) {
      logger.error('❌ No se encontró ningún módulo');
      await sequelize.close();
      return;
    }

    // Obtener el primer doctor activo
    const doctor = await Doctor.findOne({ 
      where: { activo: true },
      include: [{ model: Usuario, where: { rol: 'Doctor' } }]
    });
    
    if (!doctor) {
      logger.error('❌ No se encontró ningún doctor activo');
      await sequelize.close();
      return;
    }

    logger.info('👤 Creando nuevo paciente...');

    // Generar email único
    const timestamp = Date.now();
    const email = `paciente${timestamp}@temp.com`;
    const password = 'paciente123'; // No se usa para login
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const usuario = await Usuario.create({
      email,
      password_hash: hashedPassword,
      rol: 'Paciente',
      activo: true,
      fecha_creacion: new Date()
    });

    // Crear perfil de paciente
    const fechaNacimiento = new Date('1985-03-20');
    const paciente = await Paciente.create({
      id_usuario: usuario.id_usuario,
      nombre: 'María',
      apellido_paterno: 'López',
      apellido_materno: 'García',
      fecha_nacimiento: fechaNacimiento,
      sexo: 'Mujer',
      curp: `LOGM850320MDFPRR0${Math.floor(Math.random() * 10)}`,
      direccion: 'Avenida Principal 456, Colonia Norte',
      localidad: 'Ciudad de México',
      numero_celular: `555${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
      institucion_salud: 'IMSS',
      id_modulo: modulo.id_modulo,
      activo: true,
      fecha_registro: new Date()
    });

    // Asignar doctor al paciente
    await DoctorPaciente.create({
      id_doctor: doctor.id_doctor,
      id_paciente: paciente.id_paciente,
      fecha_asignacion: new Date()
    });

    // Crear PIN para el paciente
    const pin = '1010';
    const deviceId = `device-${paciente.id_paciente}-${Date.now()}`;

    try {
      await UnifiedAuthService.setupCredential(
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
      logger.info(`✅ PIN configurado para el paciente: ${pin}`);
    } catch (error) {
      logger.warn(`⚠️  Error configurando PIN: ${error.message}`);
    }

    logger.info(`✅ Paciente creado: ${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno} (ID: ${paciente.id_paciente})\n`);

    // Mostrar credenciales
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📋 CREDENCIALES DEL NUEVO PACIENTE');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`👤 PACIENTE (${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno}):`);
    console.log(`   Email: ${email} (NO SE USA - Solo referencia)`);
    console.log(`   Contraseña: ${password} (NO SE USA - Solo referencia)`);
    console.log(`   PIN: ${pin} (USAR ESTE PARA LOGIN)`);
    console.log(`   ID Usuario: ${usuario.id_usuario}`);
    console.log(`   ID Paciente: ${paciente.id_paciente}`);
    console.log(`   Doctor asignado: ${doctor.nombre} ${doctor.apellido_paterno} (ID: ${doctor.id_doctor})`);
    console.log(`   CURP: ${paciente.curp}`);
    console.log(`   Teléfono: ${paciente.numero_celular}\n`);
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ Paciente creado exitosamente');
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    logger.error('❌ Error creando paciente:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    logger.info('🔌 Conexión cerrada');
  }
}

crearPacienteConPin();

