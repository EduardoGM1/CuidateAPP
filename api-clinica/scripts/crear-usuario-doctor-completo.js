/**
 * Script para crear usuario doctor completo con relaciones
 */

import dotenv from 'dotenv';
import sequelize from '../config/db.js';
import { Usuario, Doctor, Paciente, DoctorPaciente } from '../models/associations.js';
import AuthCredential from '../models/AuthCredential.js';
import UnifiedAuthService from '../services/unifiedAuthService.js';
import bcrypt from 'bcrypt';

dotenv.config();

const DOCTOR_EMAIL = 'Doctor@clinica.com';
const DOCTOR_PASSWORD = 'Doctor123!';
const PATIENT_PIN = '2020';

async function crearUsuarioDoctor() {
  try {
    console.log('\n🔧 Creando usuario doctor...\n');
    
    // Verificar si el usuario ya existe
    let usuario = await Usuario.findOne({
      where: { email: DOCTOR_EMAIL }
    });

    if (usuario) {
      console.log('⚠️  Usuario ya existe. Verificando doctor...');
      
      // Verificar si tiene doctor asociado
      let doctor = await Doctor.findOne({
        where: { id_usuario: usuario.id_usuario }
      });

      if (!doctor) {
        console.log('⚠️  Usuario existe pero no tiene doctor asociado. Creando doctor...');
        doctor = await Doctor.create({
          id_usuario: usuario.id_usuario,
          nombre: 'Doctor',
          apellido_paterno: 'Prueba',
          apellido_materno: 'Sistema',
          especialidad: 'Medicina General',
          numero_cedula: 'DOC123456',
          telefono: '5551234567',
          activo: true
        });
        console.log('✅ Doctor creado:', doctor.id_doctor);
      } else {
        console.log('✅ Doctor ya existe:', doctor.id_doctor);
      }

      return { usuario, doctor };
    }

    // Crear nuevo usuario
    console.log('📝 Creando nuevo usuario...');
    const hashedPassword = await bcrypt.hash(DOCTOR_PASSWORD, 10);
    
    usuario = await Usuario.create({
      email: DOCTOR_EMAIL,
      password_hash: hashedPassword,
      rol: 'Doctor',
      activo: true
    });

    console.log('✅ Usuario creado:', usuario.id_usuario);

    // Crear doctor asociado
    console.log('👨‍⚕️ Creando doctor...');
    const doctor = await Doctor.create({
      id_usuario: usuario.id_usuario,
      nombre: 'Doctor',
      apellido_paterno: 'Prueba',
      apellido_materno: 'Sistema',
      especialidad: 'Medicina General',
      numero_cedula: 'DOC123456',
      telefono: '5551234567',
      activo: true
    });

    console.log('✅ Doctor creado:', doctor.id_doctor);

    return { usuario, doctor };
  } catch (error) {
    console.error('❌ Error creando usuario doctor:', error);
    throw error;
  }
}

async function obtenerOPacientes() {
  try {
    console.log('\n📋 Obteniendo pacientes existentes...\n');
    
    const pacientes = await Paciente.findAll({
      where: { activo: true },
      limit: 10
    });

    if (pacientes.length === 0) {
      console.log('⚠️  No hay pacientes existentes. Creando pacientes de prueba...');
      
      // Crear algunos pacientes de prueba
      const pacientesCreados = [];
      for (let i = 1; i <= 5; i++) {
        const fechaNac = new Date(1980 + i, 0, 1);
        const paciente = await Paciente.create({
          nombre: `Paciente${i}`,
          apellido_paterno: 'Prueba',
          apellido_materno: 'Sistema',
          fecha_nacimiento: fechaNac.toISOString().split('T')[0],
          sexo: i % 2 === 0 ? 'Mujer' : 'Hombre',
          activo: true,
          estado: 'activo'
        });
        pacientesCreados.push(paciente);
        console.log(`✅ Paciente creado: ${paciente.nombre} ${paciente.apellido_paterno} (ID: ${paciente.id_paciente})`);
      }
      
      return pacientesCreados;
    }

    console.log(`✅ Encontrados ${pacientes.length} pacientes existentes`);
    return pacientes;
  } catch (error) {
    console.error('❌ Error obteniendo pacientes:', error);
    throw error;
  }
}

async function asignarPacientesADoctor(doctorId, pacientes) {
  try {
    console.log('\n🔗 Asignando pacientes al doctor...\n');
    
    let asignados = 0;
    for (const paciente of pacientes) {
      // Verificar si ya está asignado
      const existe = await DoctorPaciente.findOne({
        where: {
          id_doctor: doctorId,
          id_paciente: paciente.id_paciente
        }
      });

      if (!existe) {
        await DoctorPaciente.create({
          id_doctor: doctorId,
          id_paciente: paciente.id_paciente,
          fecha_asignacion: new Date(),
          activo: true
        });
        asignados++;
        console.log(`✅ Paciente ${paciente.nombre} ${paciente.apellido_paterno} asignado al doctor`);
      } else {
        console.log(`⚠️  Paciente ${paciente.nombre} ${paciente.apellido_paterno} ya estaba asignado`);
      }
    }

    console.log(`\n✅ Total de pacientes asignados: ${asignados}`);
    return asignados;
  } catch (error) {
    console.error('❌ Error asignando pacientes:', error);
    throw error;
  }
}

async function crearOPacienteConPIN() {
  try {
    console.log('\n👤 Verificando/creando paciente con PIN 2020...\n');
    
    // Buscar todas las credenciales PIN activas de pacientes
    const credenciales = await AuthCredential.findAll({
      where: {
        user_type: 'Paciente',
        auth_method: 'pin',
        activo: true
      }
    });

    // Verificar cada credencial para encontrar PIN 2020
    for (const credencial of credenciales) {
      try {
        const pinValido = await bcrypt.compare(PATIENT_PIN, credencial.credential_value);
        if (pinValido) {
          // Encontramos el PIN 2020, buscar el paciente
          const paciente = await Paciente.findOne({
            where: { id_paciente: credencial.user_id },
            include: [{
              model: Usuario,
              as: 'Usuario'
            }]
          });

          if (paciente) {
            console.log('✅ Paciente con PIN 2020 ya existe:', paciente.id_paciente);
            
            // Verificar si tiene usuario
            if (!paciente.Usuario) {
              console.log('⚠️  Paciente no tiene usuario. Creando usuario...');
              const hashedPassword = await bcrypt.hash(PATIENT_PIN, 10);
              const usuario = await Usuario.create({
                email: `paciente${paciente.id_paciente}@clinica.com`,
                password_hash: hashedPassword,
                rol: 'Paciente',
                activo: true
              });
              
              await paciente.update({ id_usuario: usuario.id_usuario });
              console.log('✅ Usuario creado y asociado al paciente');
            }
            
            return paciente;
          }
        }
      } catch (compareError) {
        // Continuar con la siguiente credencial si hay error al comparar
        continue;
      }
    }

    // Crear nuevo paciente
    console.log('📝 Creando nuevo paciente con PIN 2020...');
    const fechaNac = new Date(1990, 5, 15);
    const nuevoPaciente = await Paciente.create({
      nombre: 'Paciente',
      apellido_paterno: 'Prueba',
      apellido_materno: 'PIN2020',
      fecha_nacimiento: fechaNac.toISOString().split('T')[0],
      sexo: 'Hombre',
      activo: true,
      estado: 'activo'
    });

    console.log('✅ Paciente creado:', nuevoPaciente.id_paciente);

    // Crear usuario para el paciente
    const hashedPassword = await bcrypt.hash(PATIENT_PIN, 10);
    const usuario = await Usuario.create({
      email: `paciente${nuevoPaciente.id_paciente}@clinica.com`,
      password_hash: hashedPassword,
      rol: 'Paciente',
      activo: true
    });

    await nuevoPaciente.update({ id_usuario: usuario.id_usuario });
    console.log('✅ Usuario creado y asociado al paciente');

    // Crear credencial PIN usando UnifiedAuthService
    try {
      await UnifiedAuthService.setupCredential(
        'Paciente',
        nuevoPaciente.id_paciente,
        'pin',
        PATIENT_PIN,
        {
          deviceId: `device-${nuevoPaciente.id_paciente}-${Date.now()}`,
          deviceName: `${nuevoPaciente.nombre} ${nuevoPaciente.apellido_paterno} - Mobile`,
          deviceType: 'mobile',
          isPrimary: true
        }
      );
      console.log('✅ Credencial PIN 2020 creada exitosamente');
    } catch (authError) {
      console.log('⚠️  Error creando credencial PIN:', authError.message);
      // Continuar aunque falle la credencial
    }

    return nuevoPaciente;
  } catch (error) {
    console.error('❌ Error creando paciente con PIN:', error);
    throw error;
  }
}

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida\n');

    // 1. Crear usuario doctor
    const { usuario: doctorUsuario, doctor } = await crearUsuarioDoctor();

    // 2. Obtener o crear pacientes
    const pacientes = await obtenerOPacientes();

    // 3. Asignar pacientes al doctor
    await asignarPacientesADoctor(doctor.id_doctor, pacientes);

    // 4. Crear/verificar paciente con PIN 2020
    const pacientePIN = await crearOPacienteConPIN();

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ PROCESO COMPLETADO\n');
    console.log(`Doctor creado/verificado:`);
    console.log(`  - Email: ${DOCTOR_EMAIL}`);
    console.log(`  - Password: ${DOCTOR_PASSWORD}`);
    console.log(`  - ID Doctor: ${doctor.id_doctor}`);
    console.log(`  - Pacientes asignados: ${pacientes.length}`);
    console.log(`\nPaciente con PIN:`);
    console.log(`  - PIN: ${PATIENT_PIN}`);
    console.log(`  - ID Paciente: ${pacientePIN.id_paciente}`);
    console.log('\n' + '='.repeat(60) + '\n');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error en el proceso:', error);
    await sequelize.close();
    process.exit(1);
  }
}

main();
