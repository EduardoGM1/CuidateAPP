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
 * Script para agregar:
 * - 1 registro de signos vitales fuera de rango (con notificación)
 * - 1 cita con solicitud de reprogramación (con notificación)
 * 
 * No elimina datos existentes, solo añade nuevos.
 * 
 * Credenciales:
 * - Paciente: PIN 2020
 * - Doctor: Email Doctor@clinica.com
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

    // ============================================
    // PASO 2: CREAR SIGNOS VITALES FUERA DE RANGO
    // ============================================
    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('📊 CREANDO SIGNOS VITALES FUERA DE RANGO');
    logger.info('═══════════════════════════════════════════════════════════\n');

    const pacienteNombre = `${pacienteEncontrado.nombre} ${pacienteEncontrado.apellido_paterno}`.trim();
    const fechaMedicion = new Date();

    // Crear signo vital con presión arterial alta
    const signoVital = await SignoVital.create({
      id_paciente: pacienteEncontrado.id_paciente,
      id_cita: null,
      fecha_medicion: fechaMedicion,
      peso_kg: 82,
      talla_m: 1.68,
      imc: 29.04,
      presion_sistolica: 165,
      presion_diastolica: 110,
      glucosa_mg_dl: 105,
      colesterol_mg_dl: 240,
      trigliceridos_mg_dl: 190,
      observaciones: 'Presión arterial muy elevada - requiere atención',
      registrado_por: 'doctor',
      fecha_creacion: new Date()
    }, { transaction });

    logger.info(`✅ Signo vital creado (ID: ${signoVital.id_signo})`);
    logger.info(`   - Presión: ${signoVital.presion_sistolica}/${signoVital.presion_diastolica} mmHg`);
    logger.info(`   - IMC: ${signoVital.imc} kg/m²`);
    logger.info(`   - Colesterol: ${signoVital.colesterol_mg_dl} mg/dL`);
    logger.info(`   - Fecha: ${fechaMedicion.toLocaleString('es-MX')}\n`);

    // Crear notificación de signos vitales
    logger.info('🔔 Creando notificación de alerta de signos vitales...');
    try {
      const alertaData = {
        id_signo_vital: signoVital.id_signo,
        id_paciente: pacienteEncontrado.id_paciente,
        paciente_nombre: pacienteNombre,
        tipo_signo: 'presion',
        valor: `${signoVital.presion_sistolica}/${signoVital.presion_diastolica}`,
        unidad: 'mmHg',
        severidad: 'moderada',
        mensaje: `Presión arterial elevada: ${signoVital.presion_sistolica}/${signoVital.presion_diastolica} mmHg (Normal: 90-140/60-90 mmHg)`,
        fecha_medicion: signoVital.fecha_medicion
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
          id_signo_vital: signoVital.id_signo,
          id_paciente: pacienteEncontrado.id_paciente,
          paciente_nombre: pacienteNombre,
          tipo_signo: 'presion',
          valor: `${signoVital.presion_sistolica}/${signoVital.presion_diastolica}`,
          unidad: 'mmHg',
          severidad: 'moderada',
          mensaje: `Presión arterial elevada: ${signoVital.presion_sistolica}/${signoVital.presion_diastolica} mmHg (Normal: 90-140/60-90 mmHg)`,
          fecha_medicion: signoVital.fecha_medicion
        };

        await NotificacionDoctor.create({
          id_doctor: doctorEncontrado.id_doctor,
          id_paciente: pacienteEncontrado.id_paciente,
          id_cita: null,
          tipo: 'alerta_signos_vitales',
          titulo: '⚠️ Alerta Signos Vitales Fuera de Rango',
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

    // ============================================
    // PASO 3: CREAR CITA CON SOLICITUD DE REPROGRAMACIÓN
    // ============================================
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('📅 CREANDO CITA CON SOLICITUD DE REPROGRAMACIÓN');
    logger.info('═══════════════════════════════════════════════════════════\n');

    // Crear cita para dentro de 5 días
    const fechaCita = new Date();
    fechaCita.setDate(fechaCita.getDate() + 5);
    fechaCita.setHours(14, 0, 0, 0); // 2:00 PM

    const cita = await Cita.create({
      id_paciente: pacienteEncontrado.id_paciente,
      id_doctor: doctorEncontrado.id_doctor,
      fecha_cita: fechaCita,
      motivo: 'Consulta de seguimiento',
      estado: 'pendiente',
      asistencia: null,
      es_primera_consulta: false,
      observaciones: 'Cita de prueba para solicitud de reprogramación',
      fecha_creacion: new Date()
    }, { transaction });

    logger.info(`✅ Cita creada (ID: ${cita.id_cita})`);
    logger.info(`   - Fecha: ${fechaCita.toLocaleString('es-MX')}`);
    logger.info(`   - Motivo: ${cita.motivo}\n`);

    // Crear solicitud de reprogramación
    logger.info('📝 Creando solicitud de reprogramación...');
    const nuevaFechaSolicitada = new Date(fechaCita);
    nuevaFechaSolicitada.setDate(nuevaFechaSolicitada.getDate() + 3); // 3 días después de la cita original
    nuevaFechaSolicitada.setHours(16, 0, 0, 0); // 4:00 PM

    const solicitud = await SolicitudReprogramacion.create({
      id_cita: cita.id_cita,
      id_paciente: pacienteEncontrado.id_paciente,
      fecha_solicitada: nuevaFechaSolicitada,
      motivo: 'Necesito cambiar la fecha por un compromiso familiar',
      estado: 'pendiente',
      fecha_creacion: new Date()
    }, { transaction });

    logger.info(`✅ Solicitud de reprogramación creada (ID: ${solicitud.id_solicitud})`);
    logger.info(`   - Fecha solicitada: ${nuevaFechaSolicitada.toLocaleString('es-MX')}`);
    logger.info(`   - Motivo: ${solicitud.motivo}\n`);

    // Crear notificación de solicitud de reprogramación
    logger.info('🔔 Creando notificación de solicitud de reprogramación...');
    try {
      const solicitudData = {
        id_solicitud: solicitud.id_solicitud,
        id_cita: cita.id_cita,
        id_paciente: pacienteEncontrado.id_paciente,
        paciente_nombre: pacienteNombre,
        fecha_cita_original: fechaCita,
        fecha_solicitada: nuevaFechaSolicitada,
        motivo: solicitud.motivo
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
        const solicitudData = {
          id_solicitud: solicitud.id_solicitud,
          id_cita: cita.id_cita,
          id_paciente: pacienteEncontrado.id_paciente,
          paciente_nombre: pacienteNombre,
          fecha_cita_original: fechaCita,
          fecha_solicitada: nuevaFechaSolicitada,
          motivo: solicitud.motivo
        };

        const fechaCitaFormateada = fechaCita.toLocaleDateString('es-MX', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

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

    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('✅ PROCESO COMPLETADO EXITOSAMENTE');
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('📋 RESUMEN:', { service: 'api-clinica' });
    logger.info(`   👤 Paciente: ${pacienteNombre}`, { id: pacienteEncontrado.id_paciente, service: 'api-clinica' });
    logger.info(`   👨‍⚕️ Doctor: ${usuarioDoctor.nombre} ${usuarioDoctor.apellido_paterno}`, { id: doctorEncontrado.id_doctor, service: 'api-clinica' });
    logger.info(`   📊 Signo vital creado: 1`, { service: 'api-clinica' });
    logger.info(`   📅 Cita creada: 1`, { service: 'api-clinica' });
    logger.info(`   📝 Solicitud de reprogramación creada: 1`, { service: 'api-clinica' });
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



