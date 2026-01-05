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
 * Script para añadir:
 * 1. 1 registro de signos vitales fuera de rango para el paciente con PIN 2020
 * 2. 1 cita con solicitud de reprogramación para el mismo paciente
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

    const fechaMedicion = new Date();

    // Crear signo vital con presión arterial muy alta (crítica)
    const signoVital = await SignoVital.create({
      id_paciente: pacienteEncontrado.id_paciente,
      id_cita: null,
      fecha_medicion: fechaMedicion,
      peso_kg: 82,
      talla_m: 1.72,
      imc: 27.68,
      presion_sistolica: 170, // Muy alta, fuera de rango
      presion_diastolica: 105, // Muy alta, fuera de rango
      glucosa_mg_dl: 140,
      colesterol_mg_dl: 245, // Alto, fuera de rango
      trigliceridos_mg_dl: 210,
      observaciones: 'Presión arterial y colesterol muy elevados - requiere atención inmediata',
      registrado_por: 'doctor',
      fecha_creacion: new Date()
    }, { transaction });

    logger.info(`✅ Signo vital creado (ID: ${signoVital.id_signo})`);
    logger.info(`   - Presión: ${signoVital.presion_sistolica}/${signoVital.presion_diastolica} mmHg (Normal: <120/<80 mmHg) ⚠️`);
    logger.info(`   - Colesterol: ${signoVital.colesterol_mg_dl} mg/dL (Normal: <200 mg/dL) ⚠️`);
    logger.info(`   - IMC: ${signoVital.imc} kg/m²`);
    logger.info(`   - Fecha: ${fechaMedicion.toLocaleString('es-MX')}\n`);

    // Crear notificación de signos vitales
    logger.info('🔔 Creando notificación de alerta de signos vitales...');
    try {
      const pacienteNombre = `${pacienteEncontrado.nombre} ${pacienteEncontrado.apellido_paterno}`.trim();
      const alertaData = {
        id_signo_vital: signoVital.id_signo,
        id_paciente: pacienteEncontrado.id_paciente,
        paciente_nombre: pacienteNombre,
        tipo_signo: 'presion',
        valor: `${signoVital.presion_sistolica}/${signoVital.presion_diastolica}`,
        unidad: 'mmHg',
        severidad: 'critica',
        mensaje: `Presión arterial muy elevada: ${signoVital.presion_sistolica}/${signoVital.presion_diastolica} mmHg (Normal: <120/<80 mmHg)`,
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
        const pacienteNombre = `${pacienteEncontrado.nombre} ${pacienteEncontrado.apellido_paterno}`.trim();
        const alertaData = {
          id_signo_vital: signoVital.id_signo,
          id_paciente: pacienteEncontrado.id_paciente,
          paciente_nombre: pacienteNombre,
          tipo_signo: 'presion',
          valor: `${signoVital.presion_sistolica}/${signoVital.presion_diastolica}`,
          unidad: 'mmHg',
          severidad: 'critica',
          mensaje: `Presión arterial muy elevada: ${signoVital.presion_sistolica}/${signoVital.presion_diastolica} mmHg (Normal: <120/<80 mmHg)`,
          fecha_medicion: signoVital.fecha_medicion
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
      observaciones: 'Cita de prueba con solicitud de reprogramación',
      fecha_creacion: new Date()
    }, { transaction });

    logger.info(`✅ Cita creada (ID: ${cita.id_cita}) - ${fechaCita.toLocaleString('es-MX')}\n`);

    // Crear solicitud de reprogramación
    logger.info('🔄 Creando solicitud de reprogramación...');
    const solicitud = await SolicitudReprogramacion.create({
      id_cita: cita.id_cita,
      id_paciente: pacienteEncontrado.id_paciente,
      motivo: 'Tengo un compromiso familiar importante ese día y no podré asistir',
      fecha_solicitada: null, // Los pacientes no pueden elegir fecha
      estado: 'pendiente',
      fecha_creacion: new Date()
    }, { transaction });

    logger.info(`✅ Solicitud creada (ID: ${solicitud.id_solicitud})`);
    logger.info(`   - Cita: #${solicitud.id_cita}`);
    logger.info(`   - Fecha original: ${fechaCita.toLocaleString('es-MX')}`);
    logger.info(`   - Motivo: ${solicitud.motivo}\n`);

    // Crear notificación para la solicitud
    logger.info('🔔 Creando notificación para solicitud de reprogramación...');
    try {
      const pacienteNombre = `${pacienteEncontrado.nombre} ${pacienteEncontrado.apellido_paterno}`.trim();
      const fechaCitaFormateada = fechaCita.toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const solicitudData = {
        id_solicitud: solicitud.id_solicitud,
        id_cita: cita.id_cita,
        id_paciente: pacienteEncontrado.id_paciente,
        paciente_nombre: pacienteNombre,
        fecha_cita_original: fechaCita,
        fecha_solicitada: null,
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
        const pacienteNombre = `${pacienteEncontrado.nombre} ${pacienteEncontrado.apellido_paterno}`.trim();
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
          datos_adicionales: {
            id_solicitud: solicitud.id_solicitud,
            id_cita: cita.id_cita,
            id_paciente: pacienteEncontrado.id_paciente,
            paciente_nombre: pacienteNombre,
            fecha_cita_original: fechaCita,
            motivo: solicitud.motivo
          },
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
    logger.info(`   👤 Paciente: ${pacienteEncontrado.nombre} ${pacienteEncontrado.apellido_paterno}`, { id: pacienteEncontrado.id_paciente, service: 'api-clinica' });
    logger.info(`   👨‍⚕️ Doctor: ${usuarioDoctor.nombre} ${usuarioDoctor.apellido_paterno}`, { id: doctorEncontrado.id_doctor, service: 'api-clinica' });
    logger.info(`   📊 Signos vitales: 1 (Presión: 170/105 mmHg, Colesterol: 245 mg/dL)`, { service: 'api-clinica' });
    logger.info(`   📅 Cita creada: 1 (ID: ${cita.id_cita})`, { service: 'api-clinica' });
    logger.info(`   📝 Solicitud de reprogramación: 1 (ID: ${solicitud.id_solicitud})`, { service: 'api-clinica' });
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

