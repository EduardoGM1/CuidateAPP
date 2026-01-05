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
  SignoVital,
  AuthCredential
} from '../models/associations.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcryptjs';
import { crearNotificacionDoctor } from '../controllers/cita.js';

/**
 * Script para añadir nuevamente las notificaciones:
 * 1. Notificación de signos vitales fuera de rango (del signo vital más reciente)
 * 2. Notificación de solicitud de reprogramación (de la solicitud más reciente)
 * 
 * Para el paciente con PIN 2020
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
            include: [
              {
                model: Usuario,
                attributes: ['id_usuario'],
                required: false
              }
            ],
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
        attributes: ['id_doctor']
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
    logger.info(`✅ Doctor encontrado: ${usuarioDoctor.nombre} ${usuarioDoctor.apellido_paterno}`, {
      id_doctor: doctorEncontrado.id_doctor
    });

    const pacienteNombre = `${pacienteEncontrado.nombre} ${pacienteEncontrado.apellido_paterno}`.trim();

    // ============================================
    // PASO 2: OBTENER SIGNOS VITALES MÁS RECIENTE
    // ============================================
    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('📊 BUSCANDO SIGNOS VITALES MÁS RECIENTE');
    logger.info('═══════════════════════════════════════════════════════════\n');

    const signoVitalReciente = await SignoVital.findOne({
      where: { id_paciente: pacienteEncontrado.id_paciente },
      order: [['fecha_creacion', 'DESC']],
      transaction
    });

    if (!signoVitalReciente) {
      logger.warn('⚠️ No se encontró signo vital reciente para el paciente');
    } else {
      logger.info(`✅ Signo vital encontrado (ID: ${signoVitalReciente.id_signo})`);
      logger.info(`   - Presión: ${signoVitalReciente.presion_sistolica}/${signoVitalReciente.presion_diastolica} mmHg`);
      logger.info(`   - Colesterol: ${signoVitalReciente.colesterol_mg_dl} mg/dL`);
      logger.info(`   - Fecha: ${signoVitalReciente.fecha_medicion.toLocaleString('es-MX')}\n`);

      // Crear notificación de signos vitales
      logger.info('🔔 Creando notificación de alerta de signos vitales...');
      try {
        const alertaData = {
          id_signo_vital: signoVitalReciente.id_signo,
          id_paciente: pacienteEncontrado.id_paciente,
          paciente_nombre: pacienteNombre,
          tipo_signo: 'presion',
          valor: `${signoVitalReciente.presion_sistolica}/${signoVitalReciente.presion_diastolica}`,
          unidad: 'mmHg',
          severidad: 'critica',
          mensaje: `Presión arterial muy elevada: ${signoVitalReciente.presion_sistolica}/${signoVitalReciente.presion_diastolica} mmHg (Normal: <120/<80 mmHg)`,
          fecha_medicion: signoVitalReciente.fecha_medicion
        };

        await crearNotificacionDoctor(
          doctorEncontrado.id_doctor,
          'alerta_signos_vitales',
          alertaData
        );

        logger.info(`✅ Notificación de signos vitales creada exitosamente\n`);
      } catch (error) {
        logger.error(`❌ Error creando notificación de signos vitales:`, error.message);
        // Intentar crear directamente
        try {
          const alertaData = {
            id_signo_vital: signoVitalReciente.id_signo,
            id_paciente: pacienteEncontrado.id_paciente,
            paciente_nombre: pacienteNombre,
            tipo_signo: 'presion',
            valor: `${signoVitalReciente.presion_sistolica}/${signoVitalReciente.presion_diastolica}`,
            unidad: 'mmHg',
            severidad: 'critica',
            mensaje: `Presión arterial muy elevada: ${signoVitalReciente.presion_sistolica}/${signoVitalReciente.presion_diastolica} mmHg (Normal: <120/<80 mmHg)`,
            fecha_medicion: signoVitalReciente.fecha_medicion
          };

          await NotificacionDoctor.create({
            id_doctor: doctorEncontrado.id_doctor,
            id_paciente: pacienteEncontrado.id_paciente,
            id_cita: null,
            tipo: 'alerta_signos_vitales',
            titulo: '🚨 Alerta Signos Vitales Fuera de Rango',
            mensaje: alertaData.mensaje,
            datos_adicionales: alertaData,
            estado: 'enviada',
            fecha_envio: new Date()
          }, { transaction });

          logger.info(`✅ Notificación creada directamente\n`);
        } catch (directError) {
          logger.error(`❌ Error creando notificación directamente:`, directError.message);
        }
      }
    }

    // ============================================
    // PASO 3: OBTENER SOLICITUD DE REPROGRAMACIÓN MÁS RECIENTE
    // ============================================
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('📅 BUSCANDO SOLICITUD DE REPROGRAMACIÓN MÁS RECIENTE');
    logger.info('═══════════════════════════════════════════════════════════\n');

    const solicitudReciente = await SolicitudReprogramacion.findOne({
      where: { id_paciente: pacienteEncontrado.id_paciente },
      order: [['fecha_creacion', 'DESC']],
      transaction
    });

    if (!solicitudReciente) {
      logger.warn('⚠️ No se encontró solicitud de reprogramación reciente para el paciente');
    } else {
      logger.info(`✅ Solicitud encontrada (ID: ${solicitudReciente.id_solicitud})`);
      logger.info(`   - Cita: #${solicitudReciente.id_cita}`);
      logger.info(`   - Motivo: ${solicitudReciente.motivo}\n`);

      // Obtener la cita asociada
      const cita = await Cita.findByPk(solicitudReciente.id_cita, { transaction });
      
      if (cita) {
        // Crear notificación para la solicitud
        logger.info('🔔 Creando notificación para solicitud de reprogramación...');
        try {
          const fechaCitaFormateada = cita.fecha_cita.toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          const solicitudData = {
            id_solicitud: solicitudReciente.id_solicitud,
            id_cita: cita.id_cita,
            id_paciente: pacienteEncontrado.id_paciente,
            paciente_nombre: pacienteNombre,
            fecha_cita_original: cita.fecha_cita,
            fecha_solicitada: solicitudReciente.fecha_solicitada,
            motivo: solicitudReciente.motivo
          };

          await crearNotificacionDoctor(
            doctorEncontrado.id_doctor,
            'solicitud_reprogramacion',
            solicitudData
          );

          logger.info(`✅ Notificación de solicitud creada exitosamente\n`);
        } catch (error) {
          logger.error(`❌ Error creando notificación de solicitud:`, error.message);
          // Intentar crear directamente
          try {
            const fechaCitaFormateada = cita.fecha_cita.toLocaleDateString('es-MX', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            const solicitudData = {
              id_solicitud: solicitudReciente.id_solicitud,
              id_cita: cita.id_cita,
              id_paciente: pacienteEncontrado.id_paciente,
              paciente_nombre: pacienteNombre,
              fecha_cita_original: cita.fecha_cita,
              fecha_solicitada: solicitudReciente.fecha_solicitada,
              motivo: solicitudReciente.motivo
            };

            await NotificacionDoctor.create({
              id_doctor: doctorEncontrado.id_doctor,
              id_paciente: pacienteEncontrado.id_paciente,
              id_cita: cita.id_cita,
              tipo: 'solicitud_reprogramacion',
              titulo: '📅 Solicitud de Reprogramación',
              mensaje: `${pacienteNombre} solicitó reprogramar su cita del ${fechaCitaFormateada}`,
              datos_adicionales: solicitudData,
              estado: 'enviada',
              fecha_envio: new Date()
            }, { transaction });

            logger.info(`✅ Notificación creada directamente\n`);
          } catch (directError) {
            logger.error(`❌ Error creando notificación directamente:`, directError.message);
          }
        }
      }
    }

    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('✅ PROCESO COMPLETADO EXITOSAMENTE');
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('📋 RESUMEN:', { service: 'api-clinica' });
    logger.info(`   👤 Paciente: ${pacienteNombre}`, { id: pacienteEncontrado.id_paciente, service: 'api-clinica' });
    logger.info(`   👨‍⚕️ Doctor: ${usuarioDoctor.nombre} ${usuarioDoctor.apellido_paterno}`, { id: doctorEncontrado.id_doctor, service: 'api-clinica' });
    logger.info(`   🔔 Notificaciones creadas: 2`, { service: 'api-clinica' });
    logger.info('\n✅ Script finalizado correctamente', { service: 'api-clinica' });

    await transaction.commit();
    await sequelize.close();
  } catch (error) {
    logger.error('❌ ERROR GENERAL:', error);
    await transaction.rollback();
    await sequelize.close();
    process.exit(1);
  }
})();

