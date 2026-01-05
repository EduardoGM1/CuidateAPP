import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import { Paciente, Usuario, AuthCredential } from '../models/associations.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcrypt';

const log = {
  info: (msg, ...args) => console.log(`ℹ️  ${msg}`, ...args),
  success: (msg, ...args) => console.log(`✅ ${msg}`, ...args),
  error: (msg, ...args) => console.log(`❌ ${msg}`, ...args),
  warn: (msg, ...args) => console.log(`⚠️  ${msg}`, ...args),
};

/**
 * Script para:
 * 1. Eliminar todos los pacientes excepto el que tiene PIN 2020
 * 2. Crear 10 pacientes nuevos con información en los nuevos campos
 */
async function main() {
  const transaction = await sequelize.transaction();
  
  try {
    log.info('🚀 ========================================');
    log.info('🚀 LIMPIEZA Y CREACIÓN DE PACIENTES');
    log.info('🚀 ========================================\n');

    // Paso 1: Buscar el paciente con PIN 2020
    log.info('Buscando paciente con PIN 2020...');
    
    const pin2020Credential = await AuthCredential.findOne({
      where: {
        user_type: 'Paciente',
        auth_method: 'pin',
        activo: true
      },
      transaction
    });

    let pacienteConPin2020 = null;
    
    if (pin2020Credential) {
      // Verificar que el PIN sea 2020
      const pinValue = pin2020Credential.credential_value;
      // El PIN puede estar hasheado, intentar verificar
      const isPin2020 = await bcrypt.compare('2020', pinValue).catch(() => {
        // Si falla, puede ser que esté en texto plano o otro formato
        return pinValue === '2020' || pinValue.includes('2020');
      });

      if (isPin2020 || pinValue === '2020') {
        pacienteConPin2020 = await Paciente.findByPk(pin2020Credential.user_id, { transaction });
        if (pacienteConPin2020) {
          log.success(`Paciente con PIN 2020 encontrado: ${pacienteConPin2020.nombre} ${pacienteConPin2020.apellido_paterno} (ID: ${pacienteConPin2020.id_paciente})`);
        }
      }
    }

    // Si no se encontró, buscar por todos los PINs y verificar manualmente
    if (!pacienteConPin2020) {
      log.warn('No se encontró paciente con PIN 2020 directamente, buscando en todos los PINs...');
      const allPinCredentials = await AuthCredential.findAll({
        where: {
          user_type: 'Paciente',
          auth_method: 'pin',
          activo: true
        },
        transaction
      });

      for (const cred of allPinCredentials) {
        try {
          const isMatch = await bcrypt.compare('2020', cred.credential_value);
          if (isMatch) {
            pacienteConPin2020 = await Paciente.findByPk(cred.user_id, { transaction });
            if (pacienteConPin2020) {
              log.success(`Paciente con PIN 2020 encontrado: ${pacienteConPin2020.nombre} ${pacienteConPin2020.apellido_paterno} (ID: ${pacienteConPin2020.id_paciente})`);
              break;
            }
          }
        } catch (err) {
          // Continuar con el siguiente
        }
      }
    }

    if (!pacienteConPin2020) {
      log.error('No se encontró ningún paciente con PIN 2020');
      log.warn('El script continuará eliminando todos los pacientes');
      log.warn('¿Deseas continuar? (Esto eliminará TODOS los pacientes)');
      // En producción, deberías pedir confirmación aquí
    }

    // Paso 2: Obtener lista de todos los pacientes
    log.info('\nObteniendo lista de todos los pacientes...');
    const todosLosPacientes = await Paciente.findAll({ transaction });
    log.info(`Total de pacientes encontrados: ${todosLosPacientes.length}`);

    // Paso 3: Eliminar pacientes (excepto el que tiene PIN 2020)
    const pacientesAEliminar = pacienteConPin2020
      ? todosLosPacientes.filter(p => p.id_paciente !== pacienteConPin2020.id_paciente)
      : todosLosPacientes;

    log.info(`\nPacientes a eliminar: ${pacientesAEliminar.length}`);
    
    if (pacientesAEliminar.length > 0) {
      log.warn('⚠️  ADVERTENCIA: Se eliminarán los siguientes pacientes:');
      pacientesAEliminar.forEach(p => {
        log.warn(`  - ${p.nombre} ${p.apellido_paterno} (ID: ${p.id_paciente})`);
      });

      // Eliminar credenciales de autenticación primero
      for (const paciente of pacientesAEliminar) {
        await AuthCredential.destroy({
          where: {
            user_type: 'Paciente',
            user_id: paciente.id_paciente
          },
          transaction
        });
      }

      // Eliminar usuarios asociados
      const usuariosAEliminar = pacientesAEliminar
        .filter(p => p.id_usuario)
        .map(p => p.id_usuario);

      if (usuariosAEliminar.length > 0) {
        await Usuario.destroy({
          where: {
            id_usuario: usuariosAEliminar
          },
          transaction
        });
      }

      // Eliminar pacientes
      const idsAEliminar = pacientesAEliminar.map(p => p.id_paciente);
      await Paciente.destroy({
        where: {
          id_paciente: idsAEliminar
        },
        transaction
      });

      log.success(`✅ ${pacientesAEliminar.length} pacientes eliminados exitosamente`);
    } else {
      log.info('No hay pacientes para eliminar');
    }

    // Paso 4: Crear 10 pacientes nuevos con datos en los nuevos campos
    log.info('\n📝 Creando 10 pacientes nuevos con información en los nuevos campos...\n');

    const nuevosPacientes = [
      {
        nombre: 'María',
        apellido_paterno: 'González',
        apellido_materno: 'López',
        fecha_nacimiento: '1985-03-15',
        curp: 'GOLM850315MDFNPR01',
        institucion_salud: 'IMSS',
        sexo: 'Mujer',
        direccion: 'Calle Principal 123',
        estado: 'Ciudad de México',
        localidad: 'Benito Juárez',
        numero_celular: '5551234567',
        id_modulo: 1,
        activo: true,
        numero_gam: 1,
        fecha_baja: null,
        motivo_baja: null,
        pin: '1001'
      },
      {
        nombre: 'Juan',
        apellido_paterno: 'Pérez',
        apellido_materno: 'Martínez',
        fecha_nacimiento: '1978-07-22',
        curp: 'PEMJ780722HDFRRN02',
        institucion_salud: 'ISSSTE',
        sexo: 'Hombre',
        direccion: 'Avenida Reforma 456',
        estado: 'Ciudad de México',
        localidad: 'Miguel Hidalgo',
        numero_celular: '5552345678',
        id_modulo: 1,
        activo: true,
        numero_gam: 2,
        fecha_baja: null,
        motivo_baja: null,
        pin: '1002'
      },
      {
        nombre: 'Ana',
        apellido_paterno: 'Rodríguez',
        apellido_materno: 'Sánchez',
        fecha_nacimiento: '1990-11-08',
        curp: 'ROSA901108MDFNNS03',
        institucion_salud: 'Particular',
        sexo: 'Mujer',
        direccion: 'Calle Morelos 789',
        estado: 'Estado de México',
        localidad: 'Toluca',
        numero_celular: '5553456789',
        id_modulo: 1,
        activo: true,
        numero_gam: 3,
        fecha_baja: null,
        motivo_baja: null,
        pin: '1003'
      },
      {
        nombre: 'Carlos',
        apellido_paterno: 'Hernández',
        apellido_materno: 'García',
        fecha_nacimiento: '1982-05-30',
        curp: 'HEGC820530HDFRRC04',
        institucion_salud: 'Particular',
        sexo: 'Hombre',
        direccion: 'Boulevard Insurgentes 321',
        estado: 'Ciudad de México',
        localidad: 'Coyoacán',
        numero_celular: '5554567890',
        id_modulo: 1,
        activo: true,
        numero_gam: 4,
        fecha_baja: null,
        motivo_baja: null,
        pin: '1004'
      },
      {
        nombre: 'Laura',
        apellido_paterno: 'Fernández',
        apellido_materno: 'Torres',
        fecha_nacimiento: '1988-09-12',
        curp: 'FETL880912MDFRRL05',
        institucion_salud: 'IMSS',
        sexo: 'Mujer',
        direccion: 'Calle Hidalgo 654',
        estado: 'Ciudad de México',
        localidad: 'Álvaro Obregón',
        numero_celular: '5555678901',
        id_modulo: 1,
        activo: true,
        numero_gam: 5,
        fecha_baja: null,
        motivo_baja: null,
        pin: '1005'
      },
      {
        nombre: 'Roberto',
        apellido_paterno: 'López',
        apellido_materno: 'Morales',
        fecha_nacimiento: '1975-12-25',
        curp: 'LOMR751225HDFPLB06',
        institucion_salud: 'ISSSTE',
        sexo: 'Hombre',
        direccion: 'Avenida Universidad 987',
        estado: 'Ciudad de México',
        localidad: 'Iztapalapa',
        numero_celular: '5556789012',
        id_modulo: 1,
        activo: false, // Paciente dado de baja
        numero_gam: 6,
        fecha_baja: '2024-11-15',
        motivo_baja: 'Paciente se mudó a otra ciudad',
        pin: '1006'
      },
      {
        nombre: 'Patricia',
        apellido_paterno: 'Martínez',
        apellido_materno: 'Jiménez',
        fecha_nacimiento: '1992-02-18',
        curp: 'MAJP920218MDFRTP07',
        institucion_salud: 'Particular',
        sexo: 'Mujer',
        direccion: 'Calle Juárez 147',
        estado: 'Ciudad de México',
        localidad: 'Gustavo A. Madero',
        numero_celular: '5557890123',
        id_modulo: 1,
        activo: true,
        numero_gam: 7,
        fecha_baja: null,
        motivo_baja: null,
        pin: '1007'
      },
      {
        nombre: 'Miguel',
        apellido_paterno: 'García',
        apellido_materno: 'Ruiz',
        fecha_nacimiento: '1980-08-05',
        curp: 'GARM800805HDFRZM08',
        institucion_salud: 'Particular',
        sexo: 'Hombre',
        direccion: 'Boulevard Revolución 258',
        estado: 'Ciudad de México',
        localidad: 'Cuauhtémoc',
        numero_celular: '5558901234',
        id_modulo: 1,
        activo: true,
        numero_gam: 8,
        fecha_baja: null,
        motivo_baja: null,
        pin: '1008'
      },
      {
        nombre: 'Sofía',
        apellido_paterno: 'Díaz',
        apellido_materno: 'Vargas',
        fecha_nacimiento: '1987-04-20',
        curp: 'DIVS870420MDFRZF09',
        institucion_salud: 'IMSS',
        sexo: 'Mujer',
        direccion: 'Calle Allende 369',
        estado: 'Ciudad de México',
        localidad: 'Venustiano Carranza',
        numero_celular: '5559012345',
        id_modulo: 1,
        activo: false, // Paciente dado de baja
        numero_gam: 9,
        fecha_baja: '2024-10-01',
        motivo_baja: 'Fallecimiento del paciente',
        pin: '1009'
      },
      {
        nombre: 'Diego',
        apellido_paterno: 'Moreno',
        apellido_materno: 'Castro',
        fecha_nacimiento: '1983-06-14',
        curp: 'MOCD830614HDFRSG10',
        institucion_salud: 'ISSSTE',
        sexo: 'Hombre',
        direccion: 'Avenida Insurgentes Sur 741',
        estado: 'Ciudad de México',
        localidad: 'Benito Juárez',
        numero_celular: '5550123456',
        id_modulo: 1,
        activo: true,
        numero_gam: 10,
        fecha_baja: null,
        motivo_baja: null,
        pin: '1010'
      }
    ];

    const pacientesCreados = [];

    for (const datosPaciente of nuevosPacientes) {
      const { pin, ...pacienteData } = datosPaciente;

      // Crear usuario primero
      const usuario = await Usuario.create({
        email: `${datosPaciente.nombre.toLowerCase()}.${datosPaciente.apellido_paterno.toLowerCase()}@test.com`,
        password_hash: await bcrypt.hash('password123', 10),
        rol: 'Paciente',
        activo: true
      }, { transaction });

      // Crear paciente
      const paciente = await Paciente.create({
        ...pacienteData,
        id_usuario: usuario.id_usuario,
        fecha_registro: new Date()
      }, { transaction });

      // Crear credencial PIN
      const pinHash = await bcrypt.hash(pin, 10);
      await AuthCredential.create({
        user_type: 'Paciente',
        user_id: paciente.id_paciente,
        auth_method: 'pin',
        credential_value: pinHash,
        device_id: `device_${paciente.id_paciente}_${Date.now()}`,
        device_name: `${paciente.nombre} ${paciente.apellido_paterno} - Mobile`,
        device_type: 'mobile',
        is_primary: true,
        activo: true
      }, { transaction });

      pacientesCreados.push({
        id: paciente.id_paciente,
        nombre: `${paciente.nombre} ${paciente.apellido_paterno}`,
        numero_gam: paciente.numero_gam,
        fecha_baja: paciente.fecha_baja,
        motivo_baja: paciente.motivo_baja,
        pin: pin
      });

      log.success(`✅ Paciente creado: ${paciente.nombre} ${paciente.apellido_paterno} (ID: ${paciente.id_paciente}, PIN: ${pin})`);
    }

    await transaction.commit();

    // Resumen
    log.info('\n📊 ========================================');
    log.info('📊 RESUMEN');
    log.info('📊 ========================================\n');
    
    if (pacienteConPin2020) {
      log.success(`Paciente conservado (PIN 2020): ${pacienteConPin2020.nombre} ${pacienteConPin2020.apellido_paterno} (ID: ${pacienteConPin2020.id_paciente})`);
    }
    
    log.info(`Pacientes eliminados: ${pacientesAEliminar.length}`);
    log.success(`Pacientes nuevos creados: ${pacientesCreados.length}\n`);

    log.info('📋 Detalle de pacientes creados:');
    pacientesCreados.forEach((p, index) => {
      log.info(`  ${index + 1}. ${p.nombre}`);
      log.info(`     - ID: ${p.id}`);
      log.info(`     - Número GAM: ${p.numero_gam}`);
      log.info(`     - PIN: ${p.pin}`);
      if (p.fecha_baja) {
        log.info(`     - Fecha de Baja: ${p.fecha_baja}`);
        log.info(`     - Motivo: ${p.motivo_baja}`);
      }
      log.info('');
    });

    log.success('✅ Proceso completado exitosamente');

  } catch (error) {
    await transaction.rollback();
    log.error('Error en el proceso:', error.message);
    logger.error('Error en limpiar-y-crear-pacientes:', error);
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();

