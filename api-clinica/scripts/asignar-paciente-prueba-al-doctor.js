/**
 * Script para asignar el paciente de prueba (Juan Prueba Evolución) 
 * al doctor con email doctor@clinica.com
 */

import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import {
  Paciente,
  Doctor,
  DoctorPaciente,
  Usuario,
} from '../models/associations.js';
import logger from '../utils/logger.js';

(async () => {
  const transaction = await sequelize.transaction();
  
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida\n');

    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('👨‍⚕️ ASIGNANDO PACIENTE DE PRUEBA AL DOCTOR');
    logger.info('═══════════════════════════════════════════════════════════\n');

    // 1. Buscar el doctor por email
    logger.info('1. Buscando doctor con email: doctor@clinica.com');
    const usuario = await Usuario.findOne({
      where: { email: 'doctor@clinica.com' },
      include: [{
        model: Doctor,
        as: 'Doctor'
      }],
      transaction
    });

    if (!usuario || !usuario.Doctor) {
      logger.error('❌ No se encontró el doctor con email: doctor@clinica.com');
      logger.info('💡 Verifica que el doctor existe en la base de datos');
      await transaction.rollback();
      process.exit(1);
    }

    const doctor = usuario.Doctor;
    logger.info(`✅ Doctor encontrado: ${doctor.nombre} ${doctor.apellido_paterno}`, {
      id_doctor: doctor.id_doctor,
      email: usuario.email
    });

    // 2. Buscar el paciente de prueba
    logger.info('\n2. Buscando paciente de prueba: Juan Prueba Evolución');
    const paciente = await Paciente.findOne({
      where: {
        nombre: 'Juan',
        apellido_paterno: 'Prueba',
        apellido_materno: 'Evolución'
      },
      transaction
    });

    if (!paciente) {
      logger.error('❌ No se encontró el paciente de prueba');
      logger.info('💡 Ejecuta primero: node scripts/crear-paciente-prueba-evolucion-6-meses.js');
      await transaction.rollback();
      process.exit(1);
    }

    logger.info(`✅ Paciente encontrado: ${paciente.nombre} ${paciente.apellido_paterno}`, {
      id_paciente: paciente.id_paciente
    });

    // 3. Verificar si ya existe la asignación
    logger.info('\n3. Verificando si ya existe la asignación...');
    const asignacionExistente = await DoctorPaciente.findOne({
      where: {
        id_doctor: doctor.id_doctor,
        id_paciente: paciente.id_paciente
      },
      transaction
    });

    if (asignacionExistente) {
      logger.info('⚠️  El paciente ya está asignado a este doctor');
      logger.info('   Eliminando asignación anterior para recrearla...');
      await DoctorPaciente.destroy({
        where: {
          id_doctor: doctor.id_doctor,
          id_paciente: paciente.id_paciente
        },
        transaction
      });
    }

    // 4. Crear la asignación
    logger.info('\n4. Creando asignación doctor-paciente...');
    const asignacion = await DoctorPaciente.create({
      id_doctor: doctor.id_doctor,
      id_paciente: paciente.id_paciente,
      fecha_asignacion: new Date(),
      observaciones: 'Paciente de prueba para análisis de evolución - Asignado automáticamente'
    }, { transaction });

    logger.info('✅ Asignación creada exitosamente', {
      id_doctor: doctor.id_doctor,
      id_paciente: paciente.id_paciente,
      fecha_asignacion: asignacion.fecha_asignacion
    });

    // 5. Commit transacción
    await transaction.commit();

    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('✅ ASIGNACIÓN COMPLETADA EXITOSAMENTE');
    logger.info('═══════════════════════════════════════════════════════════\n');
    logger.info('📋 RESUMEN:');
    logger.info(`   Doctor: ${doctor.nombre} ${doctor.apellido_paterno} (ID: ${doctor.id_doctor})`);
    logger.info(`   Email: ${usuario.email}`);
    logger.info(`   Paciente: ${paciente.nombre} ${paciente.apellido_paterno} (ID: ${paciente.id_paciente})`);
    logger.info(`   PIN: 9999`);
    logger.info(`   Fecha de asignación: ${asignacion.fecha_asignacion.toLocaleString('es-MX')}`);
    logger.info('\n🎯 PRÓXIMOS PASOS:');
    logger.info('   1. Iniciar sesión como doctor con email: doctor@clinica.com');
    logger.info('   2. Ir a "Mis Pacientes"');
    logger.info('   3. Buscar "Juan Prueba Evolución"');
    logger.info('   4. Abrir Detalle del Paciente');
    logger.info('   5. Ir a "Gráficos de Evolución" desde Opciones de Signos Vitales');
    logger.info('\n✅ Script finalizado correctamente');

  } catch (error) {
    await transaction.rollback();
    logger.error('❌ Error en el script:', error);
    logger.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
})();
