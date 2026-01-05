import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import {
  Usuario,
  Paciente,
  Doctor,
  Cita,
  AuthCredential
} from '../models/associations.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcryptjs';

/**
 * Script para agregar 2 citas:
 * - 1 cita para hoy a las 9:00 PM (21:00)
 * - 1 cita para mañana
 * 
 * Para verificar si el dashboard muestra correctamente "citas de hoy"
 * 
 * Credenciales:
 * - Paciente: PIN 2020
 * - Doctor: Email Doctor@clinica.com, Password Doctor123!
 */

(async () => {
  const transaction = await sequelize.transaction();
  
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida\n');

    // ============================================
    // PASO 1: BUSCAR PACIENTE Y DOCTOR
    // ============================================
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🔍 BUSCANDO USUARIOS');
    logger.info('═══════════════════════════════════════════════════════════\n');

    // Buscar paciente con PIN 2020
    logger.info('1️⃣ Buscando paciente con PIN 2020...');
    const pin2020 = '2020';
    
    const allPinCredentials = await AuthCredential.findAll({
      where: {
        auth_method: 'pin',
        user_type: 'Paciente'
      },
      transaction
    });

    let pacienteEncontrado = null;
    for (const cred of allPinCredentials) {
      try {
        const isValid = await bcrypt.compare(pin2020, cred.credential_value);
        if (isValid) {
          pacienteEncontrado = await Paciente.findOne({
            where: { id_paciente: cred.user_id },
            attributes: ['id_paciente', 'nombre', 'apellido_paterno', 'apellido_materno'],
            transaction
          });
          if (pacienteEncontrado) break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!pacienteEncontrado) {
      logger.error('❌ ERROR: No se encontró paciente con PIN 2020');
      await transaction.rollback();
      await sequelize.close();
      process.exit(1);
    }

    logger.info(`✅ Paciente encontrado: ${pacienteEncontrado.nombre} ${pacienteEncontrado.apellido_paterno}`, {
      id_paciente: pacienteEncontrado.id_paciente
    });

    // Buscar doctor con email Doctor@clinica.com
    logger.info('\n2️⃣ Buscando doctor con email Doctor@clinica.com...');
    const usuarioDoctor = await Usuario.findOne({
      where: { 
        email: 'Doctor@clinica.com',
        rol: 'Doctor'
      },
      include: [{
        model: Doctor,
        required: true
      }],
      transaction
    });

    if (!usuarioDoctor || !usuarioDoctor.Doctor) {
      logger.error('❌ ERROR: No se encontró doctor con email Doctor@clinica.com');
      await transaction.rollback();
      await sequelize.close();
      process.exit(1);
    }

    const doctorEncontrado = usuarioDoctor.Doctor;
    logger.info(`✅ Doctor encontrado: ${doctorEncontrado.nombre} ${doctorEncontrado.apellido_paterno}`, {
      id_doctor: doctorEncontrado.id_doctor
    });

    // ============================================
    // PASO 2: CREAR CITAS PARA LAS PRÓXIMAS HORAS
    // ============================================
    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('📅 CREANDO CITAS PARA LAS PRÓXIMAS HORAS');
    logger.info('═══════════════════════════════════════════════════════════\n');

    const ahora = new Date();
    const horaActual = ahora.getHours();
    const minutosActuales = ahora.getMinutes();
    
    logger.info(`Hora actual: ${ahora.toLocaleString('es-MX')}`, {
      hora: horaActual,
      minutos: minutosActuales
    });

    const citasCreadas = [];
    const motivos = [
      'Consulta de control',
      'Seguimiento de tratamiento',
      'Revisión de signos vitales',
      'Consulta de rutina',
      'Control de medicación'
    ];

    // Crear citas para las próximas 5 horas (cada hora)
    // Si ya pasaron las 11 PM, crear para mañana
    for (let i = 1; i <= 5; i++) {
      const fechaCita = new Date(ahora);
      const horaCita = horaActual + i;
      
      if (horaCita >= 24) {
        // Si la hora excede las 23:59, pasar al día siguiente
        fechaCita.setDate(fechaCita.getDate() + 1);
        fechaCita.setHours(horaCita - 24, 0, 0, 0);
      } else {
        fechaCita.setHours(horaCita, 0, 0, 0);
      }
      
      // Asegurar que la cita sea en el futuro (al menos 30 minutos desde ahora)
      if (fechaCita <= ahora) {
        fechaCita.setTime(ahora.getTime() + (30 * 60 * 1000)); // 30 minutos desde ahora
      }

      const motivo = motivos[i % motivos.length];
      const esHoy = fechaCita.toDateString() === ahora.toDateString();
      
      const cita = await Cita.create({
        id_paciente: pacienteEncontrado.id_paciente,
        id_doctor: doctorEncontrado.id_doctor,
        fecha_cita: fechaCita,
        motivo: `${motivo} - ${esHoy ? 'Hoy' : 'Mañana'}`,
        estado: 'pendiente',
        asistencia: null,
        es_primera_consulta: false,
        observaciones: `Cita de prueba ${i} - ${fechaCita.toLocaleString('es-MX')} - Para verificar "citas de hoy" en dashboard`,
        fecha_creacion: new Date()
      }, { transaction });

      citasCreadas.push(cita);
      logger.info(`   ✅ Cita ${i} creada (ID: ${cita.id_cita})`);
      logger.info(`      - Fecha: ${fechaCita.toLocaleString('es-MX')}`);
      logger.info(`      - Hora: ${fechaCita.getHours()}:${String(fechaCita.getMinutes()).padStart(2, '0')}`);
      logger.info(`      - Motivo: ${motivo}`);
      logger.info(`      - Estado: ${cita.estado}\n`);
    }

    logger.info(`\n✅ ${citasCreadas.length} citas creadas exitosamente\n`);

    // ============================================
    // PASO 3: RESUMEN FINAL
    // ============================================
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('✅ DATOS AGREGADOS EXITOSAMENTE');
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('📋 RESUMEN:', { service: 'api-clinica' });
    logger.info(`   👤 Paciente: ${pacienteEncontrado.nombre} ${pacienteEncontrado.apellido_paterno}`, {
      id: pacienteEncontrado.id_paciente,
      service: 'api-clinica'
    });
    logger.info(`   👨‍⚕️ Doctor: ${doctorEncontrado.nombre} ${doctorEncontrado.apellido_paterno}`, {
      id: doctorEncontrado.id_doctor,
      service: 'api-clinica'
    });
    logger.info(`   📅 Citas creadas: ${citasCreadas.length}`, { service: 'api-clinica' });
    citasCreadas.forEach((cita, index) => {
      const fechaCita = new Date(cita.fecha_cita);
      const esHoy = fechaCita.toDateString() === new Date().toDateString();
      logger.info(`      - Cita ${index + 1}: ${esHoy ? 'Hoy' : 'Mañana'} a las ${fechaCita.getHours()}:${String(fechaCita.getMinutes()).padStart(2, '0')} (ID: ${cita.id_cita})`, { service: 'api-clinica' });
    });
    logger.info('\n✅ Script finalizado correctamente', { service: 'api-clinica' });
    logger.info('💡 Verifica en el dashboard si la cita de hoy aparece en "citas de hoy"', { service: 'api-clinica' });

    await transaction.commit();
  } catch (error) {
    logger.error('❌ Error en el script:', error, { service: 'api-clinica', stack: error.stack });
    try {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
    } catch (rollbackError) {
      logger.error('Error haciendo rollback:', rollbackError);
    }
    await sequelize.close();
    process.exit(1);
  }
})();

