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
  AuthCredential
} from '../models/associations.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcryptjs';

/**
 * Script para limpiar y crear nuevas citas con solicitudes de reprogramación
 * 1. Elimina todas las solicitudes de reprogramación
 * 2. Elimina todas las notificaciones relacionadas
 * 3. Elimina todas las citas
 * 4. Crea 5 nuevas citas
 * 5. Crea 2 solicitudes de reprogramación pendientes
 * 6. Crea notificaciones para las solicitudes
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
    // PASO 1: ELIMINAR SOLICITUDES DE REPROGRAMACIÓN
    // ============================================
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🗑️  ELIMINANDO SOLICITUDES DE REPROGRAMACIÓN');
    logger.info('═══════════════════════════════════════════════════════════\n');

    const totalSolicitudes = await SolicitudReprogramacion.count({ transaction });
    if (totalSolicitudes > 0) {
      await SolicitudReprogramacion.destroy({ where: {}, transaction });
      logger.info(`✅ ${totalSolicitudes} solicitudes de reprogramación eliminadas\n`);
    } else {
      logger.info('✅ No hay solicitudes de reprogramación para eliminar\n');
    }

    // ============================================
    // PASO 2: ELIMINAR NOTIFICACIONES RELACIONADAS
    // ============================================
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🗑️  ELIMINANDO NOTIFICACIONES');
    logger.info('═══════════════════════════════════════════════════════════\n');

    // Eliminar notificaciones de tipo solicitud_reprogramacion
    const totalNotificaciones = await NotificacionDoctor.count({
      where: { tipo: 'solicitud_reprogramacion' },
      transaction
    });
    
    if (totalNotificaciones > 0) {
      await NotificacionDoctor.destroy({
        where: { tipo: 'solicitud_reprogramacion' },
        transaction
      });
      logger.info(`✅ ${totalNotificaciones} notificaciones de reprogramación eliminadas\n`);
    } else {
      logger.info('✅ No hay notificaciones de reprogramación para eliminar\n');
    }

    // ============================================
    // PASO 3: ELIMINAR TODAS LAS CITAS
    // ============================================
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🗑️  ELIMINANDO CITAS');
    logger.info('═══════════════════════════════════════════════════════════\n');

    const totalCitas = await Cita.count({ transaction });
    if (totalCitas > 0) {
      await Cita.destroy({ where: {}, transaction });
      logger.info(`✅ ${totalCitas} citas eliminadas\n`);
    } else {
      logger.info('✅ No hay citas para eliminar\n');
    }

    // ============================================
    // PASO 4: BUSCAR PACIENTE Y DOCTOR
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
      if (transaction) await transaction.rollback();
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
      if (transaction) await transaction.rollback();
      await sequelize.close();
      process.exit(1);
    }

    const doctorEncontrado = usuarioDoctor.Doctor;
    logger.info(`✅ Doctor encontrado: ${doctorEncontrado.nombre} ${doctorEncontrado.apellido_paterno}`, {
      id_doctor: doctorEncontrado.id_doctor
    });

    // ============================================
    // PASO 5: CREAR 5 NUEVAS CITAS
    // ============================================
    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('📅 CREANDO 5 NUEVAS CITAS');
    logger.info('═══════════════════════════════════════════════════════════\n');

    const ahora = new Date();
    const fechasCitas = [
      new Date(ahora.getTime() + (2 * 24 * 60 * 60 * 1000)), // En 2 días
      new Date(ahora.getTime() + (5 * 24 * 60 * 60 * 1000)), // En 5 días
      new Date(ahora.getTime() + (7 * 24 * 60 * 60 * 1000)), // En 7 días
      new Date(ahora.getTime() + (10 * 24 * 60 * 60 * 1000)), // En 10 días
      new Date(ahora.getTime() + (14 * 24 * 60 * 60 * 1000)), // En 14 días
    ];

    const citasCreadas = [];
    for (let i = 0; i < fechasCitas.length; i++) {
      const fechaCita = new Date(fechasCitas[i]);
      fechaCita.setHours(10 + i, 0, 0, 0); // 10:00, 11:00, 12:00, 13:00, 14:00

      const cita = await Cita.create({
        id_paciente: pacienteEncontrado.id_paciente,
        id_doctor: doctorEncontrado.id_doctor,
        fecha_cita: fechaCita,
        motivo: `Consulta de control ${i + 1}`,
        estado: 'pendiente',
        asistencia: null,
        es_primera_consulta: i === 0,
        observaciones: `Cita de prueba ${i + 1} - Nueva creación`,
        fecha_creacion: new Date()
      }, { transaction });

      citasCreadas.push(cita);
      logger.info(`   ✅ Cita ${i + 1} creada (ID: ${cita.id_cita}) - ${fechaCita.toLocaleString('es-MX')}`);
    }

    logger.info(`\n✅ ${citasCreadas.length} citas creadas exitosamente\n`);

    // ============================================
    // PASO 6: CREAR 2 SOLICITUDES DE REPROGRAMACIÓN PENDIENTES
    // ============================================
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🔄 CREANDO 2 SOLICITUDES DE REPROGRAMACIÓN PENDIENTES');
    logger.info('═══════════════════════════════════════════════════════════\n');
    logger.info('   ℹ️  Nota: Los pacientes NO pueden elegir fecha, solo solicitan reprogramación\n');

    const motivosSolicitud = [
      'No puedo asistir el día programado, tengo un compromiso familiar importante',
      'Necesito cambiar la fecha porque tengo un viaje de trabajo'
    ];

    // Crear 2 solicitudes pendientes (para las primeras 2 citas)
    const solicitudesCreadas = [];
    for (let i = 0; i < 2; i++) {
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
    // PASO 7: CREAR NOTIFICACIONES PARA LAS SOLICITUDES
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
    // PASO 8: RESUMEN FINAL
    // ============================================
    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('✅ PROCESO COMPLETADO EXITOSAMENTE');
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
    logger.info(`   🗑️  Solicitudes eliminadas: ${totalSolicitudes}`, { service: 'api-clinica' });
    logger.info(`   🗑️  Notificaciones eliminadas: ${totalNotificaciones}`, { service: 'api-clinica' });
    logger.info(`   🗑️  Citas eliminadas: ${totalCitas}`, { service: 'api-clinica' });
    logger.info(`   📅 Citas creadas: ${citasCreadas.length}`, { service: 'api-clinica' });
    logger.info(`   🔄 Solicitudes pendientes: ${solicitudesCreadas.length}`, { service: 'api-clinica' });
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
  } finally {
    await sequelize.close();
  }
})();

