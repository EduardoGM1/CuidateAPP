import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import {
  Usuario,
  Paciente,
  Doctor,
  Cita,
  SolicitudReprogramacion,
  NotificacionDoctor,
  DoctorPaciente,
  AuthCredential
} from '../models/associations.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcryptjs';

/**
 * Script para agregar 2 nuevas citas con solicitudes de reprogramación
 * 
 * No elimina datos existentes, solo añade nuevos.
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

    // Verificar asignación doctor-paciente
    const asignacion = await DoctorPaciente.findOne({
      where: {
        id_doctor: doctorEncontrado.id_doctor,
        id_paciente: pacienteEncontrado.id_paciente
      },
      transaction
    });

    if (!asignacion) {
      logger.info('⚠️  No existe asignación doctor-paciente, creándola...');
      await DoctorPaciente.create({
        id_doctor: doctorEncontrado.id_doctor,
        id_paciente: pacienteEncontrado.id_paciente,
        fecha_asignacion: new Date()
      }, { transaction });
      logger.info('✅ Asignación creada\n');
    }

    // ============================================
    // PASO 2: CREAR 2 NUEVAS CITAS
    // ============================================
    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('📅 CREANDO 2 NUEVAS CITAS');
    logger.info('═══════════════════════════════════════════════════════════\n');

    const ahora = new Date();
    const fechasCitas = [
      new Date(ahora.getTime() + (4 * 24 * 60 * 60 * 1000)), // En 4 días
      new Date(ahora.getTime() + (7 * 24 * 60 * 60 * 1000)), // En 7 días
    ];

    const citasCreadas = [];
    const motivosCitas = [
      'Consulta de seguimiento post-tratamiento',
      'Revisión de resultados de laboratorio'
    ];

    for (let i = 0; i < fechasCitas.length; i++) {
      const fechaCita = new Date(fechasCitas[i]);
      fechaCita.setHours(14 + i, 30, 0, 0); // 14:30, 15:30

      const cita = await Cita.create({
        id_paciente: pacienteEncontrado.id_paciente,
        id_doctor: doctorEncontrado.id_doctor,
        fecha_cita: fechaCita,
        motivo: motivosCitas[i],
        estado: 'pendiente',
        asistencia: null,
        es_primera_consulta: false,
        observaciones: `Cita de prueba ${i + 1} - Agregada para solicitudes de reprogramación`,
        fecha_creacion: new Date()
      }, { transaction });

      citasCreadas.push(cita);
      logger.info(`   ✅ Cita ${i + 1} creada (ID: ${cita.id_cita})`);
      logger.info(`      - Fecha: ${fechaCita.toLocaleString('es-MX')}`);
      logger.info(`      - Motivo: ${motivosCitas[i]}\n`);
    }

    logger.info(`✅ ${citasCreadas.length} citas creadas exitosamente\n`);

    // ============================================
    // PASO 3: CREAR 2 SOLICITUDES DE REPROGRAMACIÓN
    // ============================================
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🔄 CREANDO 2 SOLICITUDES DE REPROGRAMACIÓN');
    logger.info('═══════════════════════════════════════════════════════════\n');
    logger.info('   ℹ️  Nota: Los pacientes NO pueden elegir fecha, solo solicitan reprogramación\n');

    const motivosSolicitud = [
      'Tengo un compromiso médico urgente el mismo día, necesito reprogramar',
      'Me surgió un viaje de trabajo inesperado y no podré asistir'
    ];

    const solicitudesCreadas = [];
    for (let i = 0; i < citasCreadas.length; i++) {
      const solicitud = await SolicitudReprogramacion.create({
        id_cita: citasCreadas[i].id_cita,
        id_paciente: pacienteEncontrado.id_paciente,
        motivo: motivosSolicitud[i],
        fecha_solicitada: null, // Los pacientes no pueden elegir fecha
        estado: 'pendiente',
        fecha_creacion: new Date()
      }, { transaction });

      solicitudesCreadas.push(solicitud);
      logger.info(`   ✅ Solicitud ${i + 1} creada (ID: ${solicitud.id_solicitud})`);
      logger.info(`      - Cita: #${solicitud.id_cita}`);
      logger.info(`      - Fecha original: ${citasCreadas[i].fecha_cita.toLocaleString('es-MX')}`);
      logger.info(`      - Motivo: ${solicitud.motivo}`);
      logger.info(`      - Estado: ${solicitud.estado}\n`);
    }

    // ============================================
    // PASO 4: CREAR NOTIFICACIONES PARA LAS SOLICITUDES
    // ============================================
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🔔 CREANDO NOTIFICACIONES PARA SOLICITUDES');
    logger.info('═══════════════════════════════════════════════════════════\n');

    // Función helper para obtener título y mensaje de notificación
    const obtenerTituloMensajeNotificacion = (solicitud, cita, paciente) => {
      const fechaCitaFormateada = cita.fecha_cita 
        ? new Date(cita.fecha_cita).toLocaleDateString('es-MX', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : 'fecha no disponible';
      
      const pacienteNombre = paciente 
        ? `${paciente.nombre} ${paciente.apellido_paterno}`.trim()
        : 'Un paciente';
      
      const titulo = '📅 Solicitud de Reprogramación';
      const mensaje = `${pacienteNombre} solicitó reprogramar su cita del ${fechaCitaFormateada}`;
      
      return { titulo, mensaje };
    };

    let notificacionesCreadas = 0;
    for (const solicitud of solicitudesCreadas) {
      try {
        const cita = citasCreadas.find(c => c.id_cita === solicitud.id_cita);
        if (!cita) {
          logger.warn(`   ⚠️  Cita #${solicitud.id_cita} no encontrada para solicitud #${solicitud.id_solicitud}`);
          continue;
        }

        const { titulo, mensaje } = obtenerTituloMensajeNotificacion(
          solicitud,
          cita,
          pacienteEncontrado
        );

        const solicitudData = {
          id_solicitud: solicitud.id_solicitud,
          id_cita: solicitud.id_cita,
          id_paciente: solicitud.id_paciente,
          motivo: solicitud.motivo,
          fecha_solicitada: solicitud.fecha_solicitada,
          estado: solicitud.estado,
          paciente_nombre: `${pacienteEncontrado.nombre} ${pacienteEncontrado.apellido_paterno}`.trim(),
          fecha_cita_original: cita.fecha_cita
        };

        // Crear la notificación
        const notificacion = await NotificacionDoctor.create({
          id_doctor: doctorEncontrado.id_doctor,
          id_paciente: solicitud.id_paciente,
          id_cita: solicitud.id_cita,
          tipo: 'solicitud_reprogramacion',
          titulo,
          mensaje,
          datos_adicionales: solicitudData,
          estado: 'enviada',
          fecha_envio: solicitud.fecha_creacion || new Date()
        }, { transaction });

        notificacionesCreadas++;
        logger.info(`   ✅ Notificación creada para solicitud #${solicitud.id_solicitud}`);
        logger.info(`      - Notificación ID: ${notificacion.id_notificacion}`);
        logger.info(`      - Título: ${titulo}`);
        logger.info(`      - Mensaje: ${mensaje}\n`);
      } catch (error) {
        logger.error(`   ❌ Error creando notificación para solicitud #${solicitud.id_solicitud}:`, error.message);
      }
    }

    // ============================================
    // PASO 5: RESUMEN FINAL
    // ============================================
    logger.info('\n═══════════════════════════════════════════════════════════');
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
    logger.info(`   🔄 Solicitudes de reprogramación: ${solicitudesCreadas.length}`, { service: 'api-clinica' });
    logger.info(`   🔔 Notificaciones creadas: ${notificacionesCreadas}`, { service: 'api-clinica' });
    logger.info('\n✅ Script finalizado correctamente', { service: 'api-clinica' });

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



