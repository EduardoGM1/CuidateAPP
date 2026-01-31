/**
 * Crea 3 usuarios: Administrador, Doctor y Paciente (PIN 2020).
 * No borra datos existentes; crea solo si no existen.
 * Ejecutar: node scripts/crear-3-usuarios.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import sequelize from '../config/db.js';
import {
  Usuario,
  Doctor,
  Paciente,
  DoctorPaciente,
  Modulo,
  AuthCredential
} from '../models/associations.js';
import UnifiedAuthService from '../services/unifiedAuthService.js';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// Credenciales que se crearán y mostrarán al final
const CREDENTIALS = {
  admin: { email: 'admin@clinica.com', password: 'Admin123!' },
  doctor: { email: 'doctor@clinica.com', password: 'Doctor123!' },
  paciente: { pin: '2020' }
};

async function getOrCreateModulo() {
  let modulo = await Modulo.findOne();
  if (!modulo) {
    modulo = await Modulo.create({
      nombre_modulo: 'Módulo Principal',
      created_at: new Date(),
      updated_at: new Date()
    });
    console.log('   Módulo creado:', modulo.nombre_modulo);
  }
  return modulo;
}

async function crearAdministrador() {
  const { email, password } = CREDENTIALS.admin;
  let usuario = await Usuario.findOne({ where: { email, rol: 'Admin' } });

  if (usuario) {
    const hash = await bcrypt.hash(password, 10);
    await Usuario.update({ password_hash: hash }, { where: { id_usuario: usuario.id_usuario } });
    let cred = await AuthCredential.findOne({
      where: { user_type: 'Admin', user_id: usuario.id_usuario, auth_method: 'password', activo: true }
    });
    if (cred) {
      await cred.update({ credential_value: await bcrypt.hash(password, 10) });
    } else {
      await AuthCredential.create({
        user_type: 'Admin',
        user_id: usuario.id_usuario,
        auth_method: 'password',
        credential_value: await bcrypt.hash(password, 10),
        is_primary: true,
        activo: true,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
    console.log('   Administrador ya existía, credencial actualizada.');
    return { email, password, id_usuario: usuario.id_usuario };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  usuario = await Usuario.create({
    email,
    password_hash: passwordHash,
    rol: 'Admin',
    activo: true,
    fecha_creacion: new Date()
  });
  await AuthCredential.create({
    user_type: 'Admin',
    user_id: usuario.id_usuario,
    auth_method: 'password',
    credential_value: passwordHash,
    is_primary: true,
    activo: true,
    created_at: new Date(),
    updated_at: new Date()
  });
  console.log('   Administrador creado.');
  return { email, password, id_usuario: usuario.id_usuario };
}

async function crearDoctor(modulo) {
  const { email, password } = CREDENTIALS.doctor;
  let usuario = await Usuario.findOne({ where: { email } });
  let doctor;

  if (usuario) {
    const hash = await bcrypt.hash(password, 10);
    await Usuario.update({ password_hash: hash }, { where: { id_usuario: usuario.id_usuario } });
    doctor = await Doctor.findOne({ where: { id_usuario: usuario.id_usuario } });
    let cred = await AuthCredential.findOne({
      where: { user_type: 'Doctor', user_id: usuario.id_usuario, auth_method: 'password', activo: true }
    });
    if (cred) {
      await cred.update({ credential_value: await bcrypt.hash(password, 10) });
    } else {
      await AuthCredential.create({
        user_type: 'Doctor',
        user_id: usuario.id_usuario,
        auth_method: 'password',
        credential_value: await bcrypt.hash(password, 10),
        is_primary: true,
        activo: true,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
    if (!doctor) {
      doctor = await Doctor.create({
        id_usuario: usuario.id_usuario,
        nombre: 'Juan',
        apellido_paterno: 'Médico',
        apellido_materno: 'Sistema',
        telefono: '5551234567',
        institucion_hospitalaria: 'Hospital General',
        grado_estudio: 'Especialidad',
        anos_servicio: 5,
        id_modulo: modulo.id_modulo,
        activo: true,
        fecha_registro: new Date()
      });
    }
    console.log('   Doctor ya existía, credencial actualizada.');
    return { email, password, id_usuario: usuario.id_usuario, id_doctor: doctor.id_doctor };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  usuario = await Usuario.create({
    email,
    password_hash: passwordHash,
    rol: 'Doctor',
    activo: true,
    fecha_creacion: new Date()
  });
  await AuthCredential.create({
    user_type: 'Doctor',
    user_id: usuario.id_usuario,
    auth_method: 'password',
    credential_value: passwordHash,
    is_primary: true,
    activo: true,
    created_at: new Date(),
    updated_at: new Date()
  });
  doctor = await Doctor.create({
    id_usuario: usuario.id_usuario,
    nombre: 'Juan',
    apellido_paterno: 'Médico',
    apellido_materno: 'Sistema',
    telefono: '5551234567',
    institucion_hospitalaria: 'Hospital General',
    grado_estudio: 'Especialidad',
    anos_servicio: 5,
    id_modulo: modulo.id_modulo,
    activo: true,
    fecha_registro: new Date()
  });
  console.log('   Doctor creado.');
  return { email, password, id_usuario: usuario.id_usuario, id_doctor: doctor.id_doctor };
}

async function crearPaciente(modulo, id_doctor) {
  const { pin } = CREDENTIALS.paciente;
  const emailPaciente = 'paciente@clinica.com';

  let usuario = await Usuario.findOne({ where: { email: emailPaciente, rol: 'Paciente' } });
  let paciente;

  if (usuario) {
    paciente = await Paciente.findOne({ where: { id_usuario: usuario.id_usuario } });
    if (paciente) {
      try {
        await UnifiedAuthService.setupCredential(
          'Paciente',
          paciente.id_paciente,
          'pin',
          pin,
          {
            deviceId: `device-paciente-${paciente.id_paciente}`,
            deviceName: 'Dispositivo Principal',
            deviceType: 'mobile',
            isPrimary: true
          }
        );
      } catch (e) {
        const cred = await AuthCredential.findOne({
          where: { user_type: 'Paciente', user_id: paciente.id_paciente, auth_method: 'pin', activo: true }
        });
        if (cred) {
          cred.credential_value = await bcrypt.hash(pin, 10);
          await cred.save();
        }
      }
      console.log('   Paciente ya existía, PIN 2020 configurado.');
      return { id_paciente: paciente.id_paciente, pin, nombre: `${paciente.nombre} ${paciente.apellido_paterno}` };
    }
  }

  const passwordHash = await bcrypt.hash('Paciente123', 10);
  if (!usuario) {
    usuario = await Usuario.create({
      email: emailPaciente,
      password_hash: passwordHash,
      rol: 'Paciente',
      activo: true,
      fecha_creacion: new Date()
    });
  }

  const fechaNacStr = '1990-05-15';
  paciente = await Paciente.create({
    id_usuario: usuario.id_usuario,
    nombre: 'María',
    apellido_paterno: 'Paciente',
    apellido_materno: 'Prueba',
    fecha_nacimiento: fechaNacStr,
    sexo: 'Mujer',
    estado: 'activo',
    localidad: 'Ciudad de México',
    id_modulo: modulo.id_modulo,
    activo: true,
    fecha_registro: new Date()
  });

  await DoctorPaciente.create({
    id_doctor: id_doctor,
    id_paciente: paciente.id_paciente,
    fecha_asignacion: new Date()
  });

  await UnifiedAuthService.setupCredential(
    'Paciente',
    paciente.id_paciente,
    'pin',
    pin,
    {
      deviceId: `device-paciente-${paciente.id_paciente}`,
      deviceName: 'Dispositivo Principal',
      deviceType: 'mobile',
      isPrimary: true
    }
  );
  console.log('   Paciente creado con PIN 2020.');
  return { id_paciente: paciente.id_paciente, pin, nombre: `${paciente.nombre} ${paciente.apellido_paterno}` };
}

async function main() {
  try {
    console.log('\n🔧 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conectado.\n');

    const modulo = await getOrCreateModulo();
    console.log('1️⃣ Administrador:');
    const admin = await crearAdministrador();
    console.log('2️⃣ Doctor:');
    const doctor = await crearDoctor(modulo);
    console.log('3️⃣ Paciente (PIN 2020):');
    const paciente = await crearPaciente(modulo, doctor.id_doctor);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📋 CREDENCIALES CREADAS');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('👤 ADMINISTRADOR:');
    console.log(`   Email:      ${admin.email}`);
    console.log(`   Contraseña: ${admin.password}`);
    console.log(`   Login:      POST /api/auth/login o /api/auth-unified/login-doctor-admin\n`);
    console.log('👨‍⚕️ DOCTOR:');
    console.log(`   Email:      ${doctor.email}`);
    console.log(`   Contraseña: ${doctor.password}`);
    console.log(`   Login:      POST /api/auth/login o /api/auth-unified/login-doctor-admin\n`);
    console.log('👤 PACIENTE:');
    console.log(`   Nombre:     ${paciente.nombre}`);
    console.log(`   ID Paciente: ${paciente.id_paciente}`);
    console.log(`   PIN:        ${paciente.pin}`);
    console.log(`   Login:      POST /api/auth-unified/login-paciente`);
    console.log(`   Body:       { "id_paciente": ${paciente.id_paciente}, "pin": "${paciente.pin}" }\n`);
    console.log('═══════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
