import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import { Op } from 'sequelize';
import {
  Usuario,
  Paciente,
  Doctor,
  Cita,
  SolicitudReprogramacion,
  MensajeChat
} from '../models/associations.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcryptjs';

/**
 * Script completo para crear datos de prueba:
 * 1. Elimina todas las citas existentes
 * 2. Crea nuevas citas de prueba
 * 3. Crea solicitudes de reprogramación (sin fecha solicitada)
 * 4. Crea mensajes de prueba entre paciente y doctor
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
    // PASO 1: ELIMINAR CITAS EXISTENTES
    // ============================================
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🗑️  ELIMINANDO CITAS EXISTENTES');
    logger.info('═══════════════════════════════════════════════════════════\n');

    // Contar citas antes de eliminar
    const totalCitas = await Cita.count({ transaction });
    logger.info(`📊 Total de citas en el sistema: ${totalCitas}`);

    if (totalCitas > 0) {
      // Eliminar solicitudes de reprogramación primero
      const totalSolicitudes = await SolicitudReprogramacion.count({ transaction });
      if (totalSolicitudes > 0) {
        logger.info('🗑️  Eliminando solicitudes de reprogramación...');
        await SolicitudReprogramacion.destroy({ where: {}, transaction });
        logger.info(`✅ ${totalSolicitudes} solicitudes eliminadas`);
      }

      // Eliminar citas
      logger.info('🗑️  Eliminando citas...');
      await Cita.destroy({ where: {}, transaction });
      logger.info(`✅ ${totalCitas} citas eliminadas\n`);
    } else {
      logger.info('✅ No hay citas para eliminar\n');
    }

    // ============================================
    // PASO 2: BUSCAR PACIENTE Y DOCTOR
    // ============================================
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🔍 BUSCANDO USUARIOS');
    logger.info('═══════════════════════════════════════════════════════════\n');

    // Buscar paciente con PIN 2020
    logger.info('1️⃣ Buscando paciente con PIN 2020...');
    const AuthCredential = (await import('../models/AuthCredential.js')).default;
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
      process.exit(1);
    }

    logger.info('   ✅ Paciente encontrado:', {
      id_paciente: pacienteEncontrado.id_paciente,
      nombre: `${pacienteEncontrado.nombre} ${pacienteEncontrado.apellido_paterno}`
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
      process.exit(1);
    }

    const doctor = usuarioDoctor.Doctor;
    logger.info('   ✅ Doctor encontrado:', {
      id_doctor: doctor.id_doctor,
      nombre: `${doctor.nombre} ${doctor.apellido_paterno}`,
      email: usuarioDoctor.email
    });

    // ============================================
    // PASO 3: CREAR CITAS DE PRUEBA
    // ============================================
    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('📅 CREANDO CITAS DE PRUEBA');
    logger.info('═══════════════════════════════════════════════════════════\n');

    const ahora = new Date();
    const fechasCitas = [
      new Date(ahora.getTime() + (1 * 24 * 60 * 60 * 1000)),  // Mañana
      new Date(ahora.getTime() + (3 * 24 * 60 * 60 * 1000)),  // En 3 días
      new Date(ahora.getTime() + (5 * 24 * 60 * 60 * 1000)),  // En 5 días
      new Date(ahora.getTime() + (7 * 24 * 60 * 60 * 1000)),  // En 7 días
      new Date(ahora.getTime() + (10 * 24 * 60 * 60 * 1000))  // En 10 días
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
        observaciones: `Cita de prueba ${i + 1} para verificar funcionalidades`,
        fecha_creacion: new Date()
      }, { transaction });

      citasCreadas.push(cita);
      logger.info(`   ✅ Cita ${i + 1} creada (ID: ${cita.id_cita}) - ${fechaCita.toLocaleString('es-MX')}`);
    }

    // ============================================
    // PASO 4: CREAR SOLICITUDES DE REPROGRAMACIÓN
    // ============================================
    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('🔄 CREANDO SOLICITUDES DE REPROGRAMACIÓN');
    logger.info('═══════════════════════════════════════════════════════════\n');
    logger.info('   ℹ️  Nota: Los pacientes NO pueden elegir fecha, solo solicitan reprogramación\n');

    // Solicitud 1: Para la primera cita
    const solicitud1 = await SolicitudReprogramacion.create({
      id_cita: citasCreadas[0].id_cita,
      id_paciente: pacienteEncontrado.id_paciente,
      motivo: 'No puedo asistir el día programado, tengo un compromiso familiar importante',
      fecha_solicitada: null, // Los pacientes no pueden elegir fecha
      estado: 'pendiente',
      fecha_creacion: new Date()
    }, { transaction });

    logger.info(`   ✅ Solicitud 1 creada (ID: ${solicitud1.id_solicitud})`);
    logger.info(`      - Cita: #${solicitud1.id_cita}`);
    logger.info(`      - Motivo: ${solicitud1.motivo}`);
    logger.info(`      - Fecha solicitada: null (doctor decidirá)\n`);

    // Solicitud 2: Para la segunda cita
    const solicitud2 = await SolicitudReprogramacion.create({
      id_cita: citasCreadas[1].id_cita,
      id_paciente: pacienteEncontrado.id_paciente,
      motivo: 'Necesito cambiar la fecha porque tengo un viaje de trabajo',
      fecha_solicitada: null, // Los pacientes no pueden elegir fecha
      estado: 'pendiente',
      fecha_creacion: new Date()
    }, { transaction });

    logger.info(`   ✅ Solicitud 2 creada (ID: ${solicitud2.id_solicitud})`);
    logger.info(`      - Cita: #${solicitud2.id_cita}`);
    logger.info(`      - Motivo: ${solicitud2.motivo}`);
    logger.info(`      - Fecha solicitada: null (doctor decidirá)\n`);

    // ============================================
    // PASO 5: CREAR MENSAJES DE PRUEBA
    // ============================================
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('💬 CREANDO MENSAJES DE PRUEBA');
    logger.info('═══════════════════════════════════════════════════════════\n');

    const mensajes = [
      {
        remitente: 'Paciente',
        mensaje_texto: 'Buenos días doctor, tengo una pregunta sobre mi próxima cita',
        fecha_envio: new Date(ahora.getTime() - (2 * 24 * 60 * 60 * 1000)) // Hace 2 días
      },
      {
        remitente: 'Doctor',
        mensaje_texto: 'Buenos días, claro. ¿En qué puedo ayudarte?',
        fecha_envio: new Date(ahora.getTime() - (2 * 24 * 60 * 60 * 1000) + (30 * 60 * 1000)) // 30 min después
      },
      {
        remitente: 'Paciente',
        mensaje_texto: 'Quería saber si puedo cambiar la fecha de mi cita del próximo lunes',
        fecha_envio: new Date(ahora.getTime() - (1 * 24 * 60 * 60 * 1000)) // Ayer
      },
      {
        remitente: 'Doctor',
        mensaje_texto: 'Por supuesto, puedes solicitar la reprogramación desde la app. Yo revisaré tu solicitud y te asignaré una nueva fecha.',
        fecha_envio: new Date(ahora.getTime() - (1 * 24 * 60 * 60 * 1000) + (45 * 60 * 1000)) // 45 min después
      },
      {
        remitente: 'Paciente',
        mensaje_texto: 'Perfecto, muchas gracias doctor',
        fecha_envio: new Date(ahora.getTime() - (12 * 60 * 60 * 1000)) // Hace 12 horas
      },
      {
        remitente: 'Paciente',
        mensaje_texto: 'Doctor, tengo otra pregunta sobre los resultados de mis análisis',
        fecha_envio: new Date(ahora.getTime() - (6 * 60 * 60 * 1000)) // Hace 6 horas
      },
      {
        remitente: 'Doctor',
        mensaje_texto: 'Claro, los resultados están listos. Puedes revisarlos en tu próxima consulta o si es urgente podemos agendar una cita antes.',
        fecha_envio: new Date(ahora.getTime() - (5 * 60 * 60 * 1000)) // Hace 5 horas
      },
      {
        remitente: 'Paciente',
        mensaje_texto: 'Entendido, gracias por su atención',
        fecha_envio: new Date(ahora.getTime() - (4 * 60 * 60 * 1000)) // Hace 4 horas
      }
    ];

    const mensajesCreados = [];
    for (const mensajeData of mensajes) {
      const mensaje = await MensajeChat.create({
        id_paciente: pacienteEncontrado.id_paciente,
        id_doctor: doctor.id_doctor,
        remitente: mensajeData.remitente,
        mensaje_texto: mensajeData.mensaje_texto,
        mensaje_audio_url: null,
        mensaje_audio_duracion: null,
        mensaje_audio_transcripcion: null,
        leido: mensajeData.remitente === 'Doctor', // Los mensajes del doctor están leídos, los del paciente no
        fecha_envio: mensajeData.fecha_envio
      }, { transaction });

      mensajesCreados.push(mensaje);
      logger.info(`   ✅ Mensaje creado (ID: ${mensaje.id_mensaje})`);
      logger.info(`      - De: ${mensajeData.remitente}`);
      logger.info(`      - Texto: ${mensajeData.mensaje_texto.substring(0, 50)}...`);
      logger.info(`      - Fecha: ${mensajeData.fecha_envio.toLocaleString('es-MX')}\n`);
    }

    // ============================================
    // PASO 6: CREAR NOTIFICACIONES PARA MENSAJES
    // ============================================
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🔔 CREANDO NOTIFICACIONES DE MENSAJES');
    logger.info('═══════════════════════════════════════════════════════════\n');

    const NotificacionDoctor = (await import('../models/NotificacionDoctor.js')).default;
    const { crearNotificacionDoctor } = await import('../controllers/cita.js');

    // Crear notificación para los mensajes no leídos del paciente
    // Solo crear una notificación (se agruparán automáticamente)
    const mensajesNoLeidos = mensajesCreados.filter(m => m.remitente === 'Paciente' && !m.leido);
    
    if (mensajesNoLeidos.length > 0) {
      const ultimoMensaje = mensajesNoLeidos[mensajesNoLeidos.length - 1];
      const previewMensaje = ultimoMensaje.mensaje_texto.length > 50 
        ? ultimoMensaje.mensaje_texto.substring(0, 50) + '...' 
        : ultimoMensaje.mensaje_texto;

      await crearNotificacionDoctor(
        doctor.id_doctor,
        'nuevo_mensaje',
        {
          id_paciente: pacienteEncontrado.id_paciente,
          id_doctor: doctor.id_doctor,
          id_mensaje: ultimoMensaje.id_mensaje,
          paciente_nombre: `${pacienteEncontrado.nombre} ${pacienteEncontrado.apellido_paterno}`,
          preview_mensaje: previewMensaje
        }
      );

      logger.info(`   ✅ Notificación de mensaje creada`);
      logger.info(`      - Total mensajes no leídos: ${mensajesNoLeidos.length}`);
      logger.info(`      - Preview: ${previewMensaje}\n`);
    }

    // ============================================
    // PASO 7: CREAR NOTIFICACIONES PARA SOLICITUDES
    // ============================================
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🔔 CREANDO NOTIFICACIONES DE SOLICITUDES');
    logger.info('═══════════════════════════════════════════════════════════\n');

    // Crear notificaciones para las solicitudes de reprogramación
    const solicitudes = [solicitud1, solicitud2];
    for (const solicitud of solicitudes) {
      const cita = citasCreadas.find(c => c.id_cita === solicitud.id_cita);
      if (cita) {
        await crearNotificacionDoctor(
          doctor.id_doctor,
          'solicitud_reprogramacion',
          {
            id_solicitud: solicitud.id_solicitud,
            id_cita: solicitud.id_cita,
            id_paciente: solicitud.id_paciente,
            paciente_nombre: `${pacienteEncontrado.nombre} ${pacienteEncontrado.apellido_paterno}`,
            fecha_cita_original: cita.fecha_cita,
            motivo: solicitud.motivo
          }
        );

        logger.info(`   ✅ Notificación de solicitud creada (ID solicitud: ${solicitud.id_solicitud})`);
      }
    }

    // ============================================
    // CONFIRMAR TRANSACCIÓN
    // ============================================
    await transaction.commit();

    // ============================================
    // RESUMEN FINAL
    // ============================================
    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('✅ DATOS DE PRUEBA CREADOS EXITOSAMENTE');
    logger.info('═══════════════════════════════════════════════════════════\n');

    logger.info('📋 RESUMEN:\n');
    logger.info(`👤 Paciente: ${pacienteEncontrado.nombre} ${pacienteEncontrado.apellido_paterno}`);
    logger.info(`   ID: ${pacienteEncontrado.id_paciente}`);
    logger.info(`   🔐 PIN: 2020\n`);
    
    logger.info(`👨‍⚕️ Doctor: ${doctor.nombre} ${doctor.apellido_paterno}`);
    logger.info(`   ID: ${doctor.id_doctor}`);
    logger.info(`   📧 Email: Doctor@clinica.com`);
    logger.info(`   🔐 Password: Doctor123!\n`);

    logger.info(`📅 Citas creadas: ${citasCreadas.length}`);
    citasCreadas.forEach((cita, index) => {
      logger.info(`   ${index + 1}. Cita #${cita.id_cita} - ${fechasCitas[index].toLocaleString('es-MX')}`);
    });

    logger.info(`\n🔄 Solicitudes de reprogramación: ${solicitudes.length}`);
    logger.info(`   1. Solicitud #${solicitud1.id_solicitud} - Cita #${solicitud1.id_cita}`);
    logger.info(`   2. Solicitud #${solicitud2.id_solicitud} - Cita #${solicitud2.id_cita}`);

    logger.info(`\n💬 Mensajes creados: ${mensajesCreados.length}`);
    logger.info(`   - Mensajes del paciente: ${mensajesCreados.filter(m => m.remitente === 'Paciente').length}`);
    logger.info(`   - Mensajes del doctor: ${mensajesCreados.filter(m => m.remitente === 'Doctor').length}`);
    logger.info(`   - Mensajes no leídos: ${mensajesCreados.filter(m => !m.leido).length}`);

    logger.info(`\n🔔 Notificaciones creadas:`);
    logger.info(`   - Notificación de mensajes: 1`);
    logger.info(`   - Notificaciones de solicitudes: ${solicitudes.length}`);

    logger.info('\n✅ Script finalizado correctamente\n');

    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    logger.error('\n❌ ERROR:', {
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  } finally {
    await sequelize.close();
  }
})();

