import sequelize from '../config/db.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Importar modelos
import {
  Usuario,
  Paciente,
  Doctor,
  Modulo,
  DoctorPaciente,
  RedApoyo,
  Cita,
  SignoVital,
  Diagnostico,
  PlanMedicacion,
  PlanDetalle,
  Medicamento,
  EsquemaVacunacion,
  Vacuna,
  PacienteComorbilidad,
  Comorbilidad,
  DeteccionComplicacion,
  MensajeChat,
  SesionEducativa,
  SaludBucal,
  DeteccionTuberculosis,
  PuntoChequeo,
  SolicitudReprogramacion,
  NotificacionDoctor
} from '../models/associations.js';

import logger from '../utils/logger.js';

/**
 * Script para limpiar datos y recrear:
 * 1. Doctor original (doctor@clinica.com)
 * 2. Paciente original con PIN 2020 (con datos encriptados)
 * 3. 10 pacientes nuevos adicionales
 */
async function limpiarYRecrearDatos() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🗑️  Limpiando datos existentes...\n');
    
    // Eliminar en orden inverso de dependencias
    await NotificacionDoctor.destroy({ where: {}, transaction, force: true });
    await SolicitudReprogramacion.destroy({ where: {}, transaction, force: true });
    await PuntoChequeo.destroy({ where: {}, transaction, force: true });
    await DeteccionTuberculosis.destroy({ where: {}, transaction, force: true });
    await SaludBucal.destroy({ where: {}, transaction, force: true });
    await SesionEducativa.destroy({ where: {}, transaction, force: true });
    await MensajeChat.destroy({ where: {}, transaction, force: true });
    await DeteccionComplicacion.destroy({ where: {}, transaction, force: true });
    await PacienteComorbilidad.destroy({ where: {}, transaction, force: true });
    await EsquemaVacunacion.destroy({ where: {}, transaction, force: true });
    await PlanDetalle.destroy({ where: {}, transaction, force: true });
    await PlanMedicacion.destroy({ where: {}, transaction, force: true });
    await Diagnostico.destroy({ where: {}, transaction, force: true });
    await SignoVital.destroy({ where: {}, transaction, force: true });
    await Cita.destroy({ where: {}, transaction, force: true });
    await RedApoyo.destroy({ where: {}, transaction, force: true });
    await DoctorPaciente.destroy({ where: {}, transaction, force: true });
    await Paciente.destroy({ where: {}, transaction, force: true });
    await Doctor.destroy({ where: {}, transaction, force: true });
    await Usuario.destroy({ where: {}, transaction, force: true });
    
    console.log('✅ Datos eliminados\n');
    
    // Obtener o crear módulo
    let modulo = await Modulo.findOne({ where: {}, transaction });
    if (!modulo) {
      modulo = await Modulo.create({
        nombre_modulo: 'Módulo Principal',
        created_at: new Date(),
        updated_at: new Date()
      }, { transaction });
    }
    
    console.log('👨‍⚕️  Creando doctor original...\n');
    
    // 1. Crear usuario doctor
    const passwordHash = await bcrypt.hash('Doctor123!', 10);
    const usuarioDoctor = await Usuario.create({
      email: 'doctor@clinica.com',
      password_hash: passwordHash,
      rol: 'Doctor',
      fecha_creacion: new Date(),
      activo: true
    }, { transaction });
    
    // 2. Crear doctor
    const doctor = await Doctor.create({
      id_usuario: usuarioDoctor.id_usuario,
      nombre: 'Dr. Juan',
      apellido_paterno: 'Pérez',
      apellido_materno: 'García',
      telefono: '555-1234-5678', // Se encriptará automáticamente
      institucion_hospitalaria: 'Hospital General',
      grado_estudio: 'Especialista en Medicina Familiar',
      anos_servicio: 10,
      id_modulo: modulo.id_modulo,
      fecha_registro: new Date(),
      activo: true
    }, { transaction });
    
    console.log(`✅ Doctor creado (ID: ${doctor.id_doctor}, Email: ${usuarioDoctor.email})\n`);
    
    console.log('👤 Creando paciente original con PIN 2020...\n');
    
    // 3. Crear paciente original
    const pacienteOriginal = await Paciente.create({
      nombre: 'María',
      apellido_paterno: 'González',
      apellido_materno: 'López',
      fecha_nacimiento: '1985-03-15', // Se encriptará automáticamente
      curp: 'GOLM850315MDFRPR01', // Se encriptará automáticamente
      numero_celular: '555-9876-5432', // Se encriptará automáticamente
      direccion: 'Calle Principal #123, Colonia Centro', // Se encriptará automáticamente
      estado: 'Ciudad de México',
      localidad: 'Ciudad de México',
      institucion_salud: 'IMSS',
      sexo: 'Mujer',
      id_modulo: modulo.id_modulo,
      fecha_registro: new Date(),
      activo: true
    }, { transaction });
    
    // 4. Crear usuario paciente con PIN 2020
    const pinHash = await bcrypt.hash('2020', 10);
    const usuarioPaciente = await Usuario.create({
      email: `paciente${pacienteOriginal.id_paciente}@clinica.com`,
      password_hash: pinHash,
      rol: 'Paciente',
      fecha_creacion: new Date(),
      activo: true
    }, { transaction });
    
    // Actualizar paciente con usuario
    await pacienteOriginal.update({
      id_usuario: usuarioPaciente.id_usuario
    }, { transaction });
    
    // 5. Crear asignación doctor-paciente
    await DoctorPaciente.create({
      id_doctor: doctor.id_doctor,
      id_paciente: pacienteOriginal.id_paciente,
      fecha_asignacion: new Date(),
      observaciones: 'Paciente original asignado al doctor'
    }, { transaction });
    
    // 6. Crear red de apoyo para paciente original
    await RedApoyo.create({
      id_paciente: pacienteOriginal.id_paciente,
      nombre_contacto: 'Juan González',
      numero_celular: '555-1111-2222', // Se encriptará automáticamente
      email: 'juan.gonzalez@example.com', // Se encriptará automáticamente
      direccion: 'Calle Secundaria #456', // Se encriptará automáticamente
      parentesco: 'Esposo',
      fecha_creacion: new Date()
    }, { transaction });
    
    console.log(`✅ Paciente original creado (ID: ${pacienteOriginal.id_paciente}, PIN: 2020)`);
    console.log(`   - Nombre: ${pacienteOriginal.nombre} ${pacienteOriginal.apellido_paterno}`);
    console.log(`   - CURP: ${pacienteOriginal.curp}`);
    console.log(`   - Teléfono: ${pacienteOriginal.numero_celular}`);
    console.log(`   - Dirección: ${pacienteOriginal.direccion}\n`);
    
    console.log('👥 Creando 10 pacientes nuevos...\n');
    
    // 7. Crear 10 pacientes nuevos
    const nombres = [
      { nombre: 'Ana', apellido: 'Martínez', apellidoM: 'Sánchez' },
      { nombre: 'Carlos', apellido: 'Rodríguez', apellidoM: 'Fernández' },
      { nombre: 'Laura', apellido: 'López', apellidoM: 'García' },
      { nombre: 'Pedro', apellido: 'García', apellidoM: 'Martínez' },
      { nombre: 'Sofía', apellido: 'Hernández', apellidoM: 'López' },
      { nombre: 'Miguel', apellido: 'Torres', apellidoM: 'Ramírez' },
      { nombre: 'Elena', apellido: 'Ramírez', apellidoM: 'Torres' },
      { nombre: 'Roberto', apellido: 'Morales', apellidoM: 'Jiménez' },
      { nombre: 'Carmen', apellido: 'Jiménez', apellidoM: 'Morales' },
      { nombre: 'Diego', apellido: 'Vargas', apellidoM: 'Castro' }
    ];
    
    const pacientesCreados = [];
    
    for (let i = 0; i < nombres.length; i++) {
      const nombreData = nombres[i];
      const fechaNac = new Date(1970 + Math.floor(Math.random() * 40), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
      const año = fechaNac.getFullYear();
      const mes = String(fechaNac.getMonth() + 1).padStart(2, '0');
      const dia = String(fechaNac.getDate()).padStart(2, '0');
      
      // Generar CURP de ejemplo
      const curp = `${nombreData.apellido.substring(0, 2)}${nombreData.apellidoM.substring(0, 1)}${año.toString().substring(2)}${mes}${dia}MDFRPR${String(i + 1).padStart(2, '0')}`;
      
      const paciente = await Paciente.create({
        nombre: nombreData.nombre,
        apellido_paterno: nombreData.apellido,
        apellido_materno: nombreData.apellidoM,
        fecha_nacimiento: `${año}-${mes}-${dia}`, // Se encriptará automáticamente
        curp: curp, // Se encriptará automáticamente
        numero_celular: `555-${String(1000 + i).padStart(4, '0')}-${String(2000 + i).padStart(4, '0')}`, // Se encriptará automáticamente
        direccion: `Calle ${i + 1} #${(i + 1) * 10}, Colonia ${nombreData.apellido}`, // Se encriptará automáticamente
        estado: 'Ciudad de México',
        localidad: 'Ciudad de México',
        institucion_salud: ['IMSS', 'ISSSTE', 'Bienestar', 'Particular'][i % 4],
        sexo: i % 2 === 0 ? 'Mujer' : 'Hombre',
        id_modulo: modulo.id_modulo,
        fecha_registro: new Date(),
        activo: true
      }, { transaction });
      
      // Crear usuario paciente con PIN aleatorio
      const pinAleatorio = String(1000 + i).padStart(4, '0');
      const pinHashPaciente = await bcrypt.hash(pinAleatorio, 10);
      const usuarioPacienteNuevo = await Usuario.create({
        email: `paciente${paciente.id_paciente}@clinica.com`,
        password_hash: pinHashPaciente,
        rol: 'Paciente',
        fecha_creacion: new Date(),
        activo: true
      }, { transaction });
      
      await paciente.update({
        id_usuario: usuarioPacienteNuevo.id_usuario
      }, { transaction });
      
      // Asignar al doctor
      await DoctorPaciente.create({
        id_doctor: doctor.id_doctor,
        id_paciente: paciente.id_paciente,
        fecha_asignacion: new Date()
      }, { transaction });
      
      // Crear red de apoyo
      await RedApoyo.create({
        id_paciente: paciente.id_paciente,
        nombre_contacto: `Contacto ${nombreData.nombre}`,
        numero_celular: `555-${String(3000 + i).padStart(4, '0')}-${String(4000 + i).padStart(4, '0')}`, // Se encriptará automáticamente
        email: `contacto${i + 1}@example.com`, // Se encriptará automáticamente
        direccion: `Dirección contacto ${i + 1}`, // Se encriptará automáticamente
        parentesco: ['Esposo', 'Hijo', 'Hermano', 'Padre', 'Madre'][i % 5],
        fecha_creacion: new Date()
      }, { transaction });
      
      pacientesCreados.push({
        id: paciente.id_paciente,
        nombre: `${nombreData.nombre} ${nombreData.apellido}`,
        pin: pinAleatorio
      });
      
      console.log(`   ✅ Paciente ${i + 1}: ${nombreData.nombre} ${nombreData.apellido} (ID: ${paciente.id_paciente}, PIN: ${pinAleatorio})`);
    }
    
    await transaction.commit();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ DATOS RECREADOS EXITOSAMENTE\n');
    console.log('📊 RESUMEN:');
    console.log(`   👨‍⚕️  Doctor: doctor@clinica.com / Doctor123!`);
    console.log(`   👤 Paciente Original: PIN 2020`);
    console.log(`   👥 Pacientes Nuevos: 10\n`);
    console.log('🔐 DATOS ENCRIPTADOS:');
    console.log('   ✅ fecha_nacimiento');
    console.log('   ✅ curp');
    console.log('   ✅ numero_celular');
    console.log('   ✅ direccion');
    console.log('   ✅ telefono (doctor)');
    console.log('   ✅ red_apoyo (numero_celular, email, direccion)\n');
    console.log('📝 CREDENCIALES:');
    console.log('   Doctor:');
    console.log('     Email: doctor@clinica.com');
    console.log('     Password: Doctor123!\n');
    console.log('   Paciente Original:');
    console.log('     PIN: 2020\n');
    console.log('   Pacientes Nuevos:');
    pacientesCreados.forEach((p, i) => {
      console.log(`     ${i + 1}. ${p.nombre} - PIN: ${p.pin}`);
    });
    console.log('\n');
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error recreando datos:', error);
    logger.error('Error en limpiarYRecrearDatos', { error: error.message, stack: error.stack });
    throw error;
  }
}

// Ejecutar
limpiarYRecrearDatos()
  .then(() => {
    console.log('✅ Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });

