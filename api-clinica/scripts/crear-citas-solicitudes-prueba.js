import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import { Op } from 'sequelize';
import {
  Usuario,
  Paciente,
  Doctor,
  Cita,
  SolicitudReprogramacion
} from '../models/associations.js';
import UnifiedAuthService from '../services/unifiedAuthService.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcryptjs';

/**
 * Script para crear citas de prueba con solicitudes de reprogramación
 * - Busca paciente con PIN 2020
 * - Busca doctor con email Doctor@clinica.com
 * - Crea varias citas
 * - Crea al menos 2 solicitudes de reprogramación
 */

(async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida\n');

    // 1. Buscar paciente con PIN 2020
    logger.info('1️⃣ Buscando paciente con PIN 2020...');
    
    // Buscar todas las credenciales PIN
    const AuthCredential = (await import('../models/AuthCredential.js')).default;
    const pin2020 = '2020';
    
    // Obtener todas las credenciales PIN
    const allPinCredentials = await AuthCredential.findAll({
      where: {
        auth_method: 'pin',
        user_type: 'Paciente'
      }
    });

    let pacienteEncontrado = null;
    
    // Verificar cada credencial para encontrar el PIN 2020
    for (const cred of allPinCredentials) {
      try {
        const isValid = await bcrypt.compare(pin2020, cred.credential_value);
        if (isValid) {
          // Encontrar el paciente asociado
          pacienteEncontrado = await Paciente.findOne({
            where: { id_paciente: cred.user_id },
            attributes: ['id_paciente', 'nombre', 'apellido_paterno', 'apellido_materno']
          });
          if (pacienteEncontrado) break;
        }
      } catch (error) {
        // Continuar con la siguiente credencial
        continue;
      }
    }

    if (!pacienteEncontrado) {
      logger.error('❌ ERROR: No se encontró paciente con PIN 2020');
      process.exit(1);
    }

    logger.info('   ✅ Paciente encontrado:', {
      id_paciente: pacienteEncontrado.id_paciente,
      nombre: `${pacienteEncontrado.nombre} ${pacienteEncontrado.apellido_paterno}`
    });

    // 2. Buscar doctor con email Doctor@clinica.com
    logger.info('\n2️⃣ Buscando doctor con email Doctor@clinica.com...');
    const usuarioDoctor = await Usuario.findOne({
      where: { 
        email: 'Doctor@clinica.com',
        rol: 'Doctor'
      },
      include: [{
        model: Doctor,
        required: true
      }]
    });

    if (!usuarioDoctor || !usuarioDoctor.Doctor) {
      logger.error('❌ ERROR: No se encontró doctor con email Doctor@clinica.com');
      process.exit(1);
    }

    const doctor = usuarioDoctor.Doctor;
    logger.info('   ✅ Doctor encontrado:', {
      id_doctor: doctor.id_doctor,
      nombre: `${doctor.nombre} ${doctor.apellido_paterno}`,
      email: usuarioDoctor.email
    });

    // 3. Crear citas de prueba
    logger.info('\n3️⃣ Creando citas de prueba...');
    const ahora = new Date();
    const fechasCitas = [
      new Date(ahora.getTime() + (2 * 24 * 60 * 60 * 1000)),  // En 2 días
      new Date(ahora.getTime() + (5 * 24 * 60 * 60 * 1000)),  // En 5 días
      new Date(ahora.getTime() + (7 * 24 * 60 * 60 * 1000)),  // En 7 días
      new Date(ahora.getTime() + (10 * 24 * 60 * 60 * 1000)), // En 10 días
      new Date(ahora.getTime() + (14 * 24 * 60 * 60 * 1000))  // En 14 días
    ];

    const citasCreadas = [];
    for (let i = 0; i < fechasCitas.length; i++) {
      const fechaCita = fechasCitas[i];
      fechaCita.setHours(10 + i, 0, 0, 0); // 10:00, 11:00, 12:00, etc.

      const cita = await Cita.create({
        id_paciente: pacienteEncontrado.id_paciente,
        id_doctor: doctor.id_doctor,
        fecha_cita: fechaCita,
        motivo: `Consulta de control ${i + 1}`,
        estado: 'pendiente',
        asistencia: null,
        es_primera_consulta: i === 0,
        observaciones: `Cita de prueba ${i + 1} para solicitudes de reprogramación`,
        fecha_creacion: new Date()
      });

      citasCreadas.push(cita);
      logger.info(`   ✅ Cita ${i + 1} creada (ID: ${cita.id_cita}) - ${fechaCita.toLocaleString('es-MX')}`);
    }

    // 4. Crear solicitudes de reprogramación (al menos 2)
    logger.info('\n4️⃣ Creando solicitudes de reprogramación...');
    
    // Solicitud 1: Para la primera cita (en 2 días)
    const fechaSolicitada1 = new Date(fechasCitas[0]);
    fechaSolicitada1.setDate(fechaSolicitada1.getDate() + 3); // Reprogramar para 3 días después

    const solicitud1 = await SolicitudReprogramacion.create({
      id_cita: citasCreadas[0].id_cita,
      id_paciente: pacienteEncontrado.id_paciente,
      motivo: 'No puedo asistir el día programado, tengo un compromiso familiar importante',
      fecha_solicitada: fechaSolicitada1.toISOString().split('T')[0],
      estado: 'pendiente',
      fecha_creacion: new Date()
    });

    logger.info(`   ✅ Solicitud 1 creada (ID: ${solicitud1.id_solicitud})`);
    logger.info(`      - Cita original: ${fechasCitas[0].toLocaleString('es-MX')}`);
    logger.info(`      - Fecha solicitada: ${fechaSolicitada1.toLocaleString('es-MX')}`);
    logger.info(`      - Motivo: ${solicitud1.motivo}`);

    // Solicitud 2: Para la segunda cita (en 5 días)
    const fechaSolicitada2 = new Date(fechasCitas[1]);
    fechaSolicitada2.setDate(fechaSolicitada2.getDate() + 2); // Reprogramar para 2 días después

    const solicitud2 = await SolicitudReprogramacion.create({
      id_cita: citasCreadas[1].id_cita,
      id_paciente: pacienteEncontrado.id_paciente,
      motivo: 'Necesito cambiar la fecha porque tengo un viaje de trabajo',
      fecha_solicitada: fechaSolicitada2.toISOString().split('T')[0],
      estado: 'pendiente',
      fecha_creacion: new Date()
    });

    logger.info(`   ✅ Solicitud 2 creada (ID: ${solicitud2.id_solicitud})`);
    logger.info(`      - Cita original: ${fechasCitas[1].toLocaleString('es-MX')}`);
    logger.info(`      - Fecha solicitada: ${fechaSolicitada2.toLocaleString('es-MX')}`);
    logger.info(`      - Motivo: ${solicitud2.motivo}`);

    // 5. Resumen final
    logger.info('\n✅ ========================================');
    logger.info('✅ DATOS DE PRUEBA CREADOS EXITOSAMENTE');
    logger.info('✅ ========================================\n');
    logger.info('📋 RESUMEN:\n');
    logger.info(`👤 Paciente: ${pacienteEncontrado.nombre} ${pacienteEncontrado.apellido_paterno} (ID: ${pacienteEncontrado.id_paciente})`);
    logger.info(`   🔐 PIN: 2020`);
    logger.info(`👨‍⚕️ Doctor: ${doctor.nombre} ${doctor.apellido_paterno} (ID: ${doctor.id_doctor})`);
    logger.info(`   📧 Email: Doctor@clinica.com`);
    logger.info(`📅 Citas creadas: ${citasCreadas.length}`);
    logger.info(`🔄 Solicitudes de reprogramación: 2\n`);

    logger.info('📝 DETALLES DE LAS CITAS:\n');
    citasCreadas.forEach((cita, index) => {
      logger.info(`   ${index + 1}. Cita #${cita.id_cita}`);
      logger.info(`      Fecha: ${fechasCitas[index].toLocaleString('es-MX')}`);
      logger.info(`      Motivo: ${cita.motivo}`);
      logger.info(`      Estado: ${cita.estado}\n`);
    });

    logger.info('🔄 DETALLES DE LAS SOLICITUDES:\n');
    logger.info(`   1. Solicitud #${solicitud1.id_solicitud}`);
    logger.info(`      Cita: #${solicitud1.id_cita}`);
    logger.info(`      Fecha solicitada: ${fechaSolicitada1.toLocaleDateString('es-MX')}`);
    logger.info(`      Estado: ${solicitud1.estado}\n`);
    
    logger.info(`   2. Solicitud #${solicitud2.id_solicitud}`);
    logger.info(`      Cita: #${solicitud2.id_cita}`);
    logger.info(`      Fecha solicitada: ${fechaSolicitada2.toLocaleDateString('es-MX')}`);
    logger.info(`      Estado: ${solicitud2.estado}\n`);

    logger.info('✅ Script finalizado correctamente\n');

    process.exit(0);
  } catch (error) {
    logger.error('\n❌ ERROR:', {
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  } finally {
    await sequelize.close();
  }
})();

