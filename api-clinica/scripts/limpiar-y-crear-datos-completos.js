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
 * Script para:
 * 1. Eliminar todas las citas, solicitudes de reprogramación y notificaciones
 * 2. Crear 5 citas nuevas (2 con solicitud de reprogramación)
 * 3. Crear 1 registro de signos vitales fuera de rango
 * 4. Crear 2 citas para hoy (10:30 AM y 11:00 AM)
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
    // PASO 2: ELIMINAR DATOS EXISTENTES
    // ============================================
    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('🗑️  ELIMINANDO DATOS EXISTENTES');
    logger.info('═══════════════════════════════════════════════════════════\n');

    // Eliminar notificaciones
    logger.info('1️⃣ Eliminando notificaciones...');
    const notificacionesEliminadas = await NotificacionDoctor.destroy({
      where: {},
      transaction
    });
    logger.info(`   ✅ ${notificacionesEliminadas} notificaciones eliminadas`);

    // Eliminar solicitudes de reprogramación
    logger.info('\n2️⃣ Eliminando solicitudes de reprogramación...');
    const solicitudesEliminadas = await SolicitudReprogramacion.destroy({
      where: {},
      transaction
    });
    logger.info(`   ✅ ${solicitudesEliminadas} solicitudes eliminadas`);

    // Eliminar citas
    logger.info('\n3️⃣ Eliminando citas...');
    const citasEliminadas = await Cita.destroy({
      where: {},
      transaction
    });
    logger.info(`   ✅ ${citasEliminadas} citas eliminadas\n`);

    // ============================================
    // PASO 3: CREAR 2 CITAS PARA HOY
    // ============================================
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('📅 CREANDO 2 CITAS PARA HOY');
    logger.info('═══════════════════════════════════════════════════════════\n');

    const ahora = new Date();
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    
    const citasHoy = [];
    const horasHoy = [10, 11]; // 10:30 AM y 11:00 AM
    const minutosHoy = [30, 0];

    for (let i = 0; i < horasHoy.length; i++) {
      const fechaCita = new Date(hoy);
      fechaCita.setHours(horasHoy[i], minutosHoy[i], 0, 0);

      const cita = await Cita.create({
        id_paciente: pacienteEncontrado.id_paciente,
        id_doctor: doctorEncontrado.id_doctor,
        fecha_cita: fechaCita,
        motivo: `Consulta de hoy - ${horasHoy[i]}:${String(minutosHoy[i]).padStart(2, '0')}`,
        estado: 'pendiente',
        asistencia: null,
        es_primera_consulta: false,
        observaciones: `Cita programada para hoy a las ${horasHoy[i]}:${String(minutosHoy[i]).padStart(2, '0')}`,
        fecha_creacion: new Date()
      }, { transaction });

      citasHoy.push(cita);
      logger.info(`   ✅ Cita ${i + 1} creada (ID: ${cita.id_cita}) - ${fechaCita.toLocaleString('es-MX')}`);
    }
    logger.info(`\n✅ ${citasHoy.length} citas para hoy creadas\n`);

    // ============================================
    // PASO 4: CREAR 5 CITAS NUEVAS (2 CON SOLICITUD)
    // ============================================
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('📅 CREANDO 5 CITAS NUEVAS');
    logger.info('═══════════════════════════════════════════════════════════\n');

    const fechasCitas = [];
    for (let i = 1; i <= 5; i++) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + (i + 2)); // Empezar desde 3 días en adelante
      fecha.setHours(10 + i, 0, 0, 0); // 11:00, 12:00, 13:00, 14:00, 15:00
      fechasCitas.push(fecha);
    }

    const citasCreadas = [];
    for (let i = 0; i < fechasCitas.length; i++) {
      const cita = await Cita.create({
        id_paciente: pacienteEncontrado.id_paciente,
        id_doctor: doctorEncontrado.id_doctor,
        fecha_cita: fechasCitas[i],
        motivo: `Consulta de control ${i + 1}`,
        estado: 'pendiente',
        asistencia: null,
        es_primera_consulta: false,
        observaciones: `Cita de prueba ${i + 1}`,
        fecha_creacion: new Date()
      }, { transaction });

      citasCreadas.push(cita);
      logger.info(`   ✅ Cita ${i + 1} creada (ID: ${cita.id_cita}) - ${fechasCitas[i].toLocaleString('es-MX')}`);
    }
    logger.info(`\n✅ ${citasCreadas.length} citas creadas\n`);

    // ============================================
    // PASO 5: CREAR 2 SOLICITUDES DE REPROGRAMACIÓN
    // ============================================
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🔄 CREANDO 2 SOLICITUDES DE REPROGRAMACIÓN');
    logger.info('═══════════════════════════════════════════════════════════\n');

    const motivosSolicitud = [
      'No puedo asistir el día programado, tengo un compromiso familiar importante',
      'Necesito cambiar la fecha porque tengo un viaje de trabajo'
    ];

    const solicitudesCreadas = [];
    // Crear solicitudes para las primeras 2 citas
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
      logger.info(`      - Motivo: ${solicitud.motivo}\n`);
    }

    // ============================================
    // PASO 6: CREAR NOTIFICACIONES PARA SOLICITUDES
    // ============================================
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🔔 CREANDO NOTIFICACIONES PARA SOLICITUDES');
    logger.info('═══════════════════════════════════════════════════════════\n');

    const pacienteNombre = `${pacienteEncontrado.nombre} ${pacienteEncontrado.apellido_paterno}`.trim();

    for (let i = 0; i < solicitudesCreadas.length; i++) {
      try {
        const solicitud = solicitudesCreadas[i];
        const cita = citasCreadas[i];

        const solicitudData = {
          id_solicitud: solicitud.id_solicitud,
          id_cita: cita.id_cita,
          id_paciente: pacienteEncontrado.id_paciente,
          paciente_nombre: pacienteNombre,
          fecha_cita_original: cita.fecha_cita,
          fecha_solicitada: null,
          motivo: solicitud.motivo
        };

        await crearNotificacionDoctor(
          doctorEncontrado.id_doctor,
          'solicitud_reprogramacion',
          solicitudData
        );

        logger.info(`   ✅ Notificación ${i + 1} creada para solicitud #${solicitud.id_solicitud}`);
      } catch (error) {
        logger.error(`   ❌ Error creando notificación ${i + 1}:`, error.message);
        // Intentar crear directamente
        try {
          const solicitud = solicitudesCreadas[i];
          const cita = citasCreadas[i];
          const fechaCitaFormateada = cita.fecha_cita.toLocaleDateString('es-MX', {
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
              fecha_cita_original: cita.fecha_cita,
              motivo: solicitud.motivo
            },
            estado: 'enviada',
            fecha_envio: new Date()
          }, { transaction });

          logger.info(`   ✅ Notificación ${i + 1} creada directamente`);
        } catch (directError) {
          logger.error(`   ❌ Error creando notificación directamente:`, directError.message);
        }
      }
    }

    // ============================================
    // PASO 7: CREAR SIGNOS VITALES FUERA DE RANGO
    // ============================================
    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('📊 CREANDO SIGNOS VITALES FUERA DE RANGO');
    logger.info('═══════════════════════════════════════════════════════════\n');

    const fechaMedicion = new Date();

    // Crear signo vital con glucosa muy alta (crítica)
    const signoVital = await SignoVital.create({
      id_paciente: pacienteEncontrado.id_paciente,
      id_cita: null,
      fecha_medicion: fechaMedicion,
      peso_kg: 78,
      talla_m: 1.70,
      imc: 26.99,
      presion_sistolica: 145,
      presion_diastolica: 92,
      glucosa_mg_dl: 285, // Muy alta, fuera de rango
      colesterol_mg_dl: 230,
      trigliceridos_mg_dl: 195,
      observaciones: 'Glucosa muy elevada - requiere atención inmediata',
      registrado_por: 'doctor',
      fecha_creacion: new Date()
    }, { transaction });

    logger.info(`✅ Signo vital creado (ID: ${signoVital.id_signo})`);
    logger.info(`   - Glucosa: ${signoVital.glucosa_mg_dl} mg/dL (Normal: 70-126 mg/dL) ⚠️`);
    logger.info(`   - Presión: ${signoVital.presion_sistolica}/${signoVital.presion_diastolica} mmHg`);
    logger.info(`   - IMC: ${signoVital.imc} kg/m²`);
    logger.info(`   - Fecha: ${fechaMedicion.toLocaleString('es-MX')}\n`);

    // Crear notificación de signos vitales
    logger.info('🔔 Creando notificación de alerta de signos vitales...');
    try {
      const alertaData = {
        id_signo_vital: signoVital.id_signo,
        id_paciente: pacienteEncontrado.id_paciente,
        paciente_nombre: pacienteNombre,
        tipo_signo: 'glucosa',
        valor: signoVital.glucosa_mg_dl,
        unidad: 'mg/dL',
        severidad: 'critica',
        mensaje: `Glucosa muy elevada: ${signoVital.glucosa_mg_dl} mg/dL (Normal: 70-126 mg/dL)`,
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
          tipo_signo: 'glucosa',
          valor: signoVital.glucosa_mg_dl,
          unidad: 'mg/dL',
          severidad: 'critica',
          mensaje: `Glucosa muy elevada: ${signoVital.glucosa_mg_dl} mg/dL (Normal: 70-126 mg/dL)`,
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

    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('✅ PROCESO COMPLETADO EXITOSAMENTE');
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('📋 RESUMEN:', { service: 'api-clinica' });
    logger.info(`   👤 Paciente: ${pacienteNombre}`, { id: pacienteEncontrado.id_paciente, service: 'api-clinica' });
    logger.info(`   👨‍⚕️ Doctor: ${usuarioDoctor.nombre} ${usuarioDoctor.apellido_paterno}`, { id: doctorEncontrado.id_doctor, service: 'api-clinica' });
    logger.info(`   🗑️  Datos eliminados:`, { service: 'api-clinica' });
    logger.info(`      - Notificaciones: ${notificacionesEliminadas}`, { service: 'api-clinica' });
    logger.info(`      - Solicitudes: ${solicitudesEliminadas}`, { service: 'api-clinica' });
    logger.info(`      - Citas: ${citasEliminadas}`, { service: 'api-clinica' });
    logger.info(`   📅 Citas creadas:`, { service: 'api-clinica' });
    logger.info(`      - Para hoy: ${citasHoy.length} (10:30 AM y 11:00 AM)`, { service: 'api-clinica' });
    logger.info(`      - Futuras: ${citasCreadas.length}`, { service: 'api-clinica' });
    logger.info(`      - Total: ${citasHoy.length + citasCreadas.length}`, { service: 'api-clinica' });
    logger.info(`   📝 Solicitudes de reprogramación: ${solicitudesCreadas.length}`, { service: 'api-clinica' });
    logger.info(`   📊 Signos vitales: 1`, { service: 'api-clinica' });
    logger.info(`   🔔 Notificaciones creadas: ${solicitudesCreadas.length + 1}`, { service: 'api-clinica' });
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



