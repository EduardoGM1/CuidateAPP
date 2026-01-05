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
  DoctorPaciente,
  AuthCredential
} from '../models/associations.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcryptjs';
import { crearNotificacionDoctor } from '../controllers/cita.js';

/**
 * Script para agregar:
 * - 2 nuevas citas con solicitudes de reprogramación
 * - 1 notificación de signos vitales fuera de rango
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
      new Date(ahora.getTime() + (3 * 24 * 60 * 60 * 1000)), // En 3 días
      new Date(ahora.getTime() + (6 * 24 * 60 * 60 * 1000)), // En 6 días
    ];

    const citasCreadas = [];
    for (let i = 0; i < fechasCitas.length; i++) {
      const fechaCita = new Date(fechasCitas[i]);
      fechaCita.setHours(11 + i, 0, 0, 0); // 11:00, 12:00

      const cita = await Cita.create({
        id_paciente: pacienteEncontrado.id_paciente,
        id_doctor: doctorEncontrado.id_doctor,
        fecha_cita: fechaCita,
        motivo: `Consulta de control ${i + 1}`,
        estado: 'pendiente',
        asistencia: null,
        es_primera_consulta: false,
        observaciones: `Cita de prueba ${i + 1} - Agregada para solicitudes de reprogramación`,
        fecha_creacion: new Date()
      }, { transaction });

      citasCreadas.push(cita);
      logger.info(`   ✅ Cita ${i + 1} creada (ID: ${cita.id_cita}) - ${fechaCita.toLocaleString('es-MX')}`);
    }

    logger.info(`\n✅ ${citasCreadas.length} citas creadas exitosamente\n`);

    // ============================================
    // PASO 3: CREAR 2 SOLICITUDES DE REPROGRAMACIÓN
    // ============================================
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🔄 CREANDO 2 SOLICITUDES DE REPROGRAMACIÓN');
    logger.info('═══════════════════════════════════════════════════════════\n');
    logger.info('   ℹ️  Nota: Los pacientes NO pueden elegir fecha, solo solicitan reprogramación\n');

    const motivosSolicitud = [
      'No puedo asistir el día programado, tengo un compromiso familiar importante',
      'Necesito cambiar la fecha porque tengo un viaje de trabajo'
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

    let notificacionesSolicitudesCreadas = 0;
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

        notificacionesSolicitudesCreadas++;
        logger.info(`   ✅ Notificación creada para solicitud #${solicitud.id_solicitud}`);
        logger.info(`      - Notificación ID: ${notificacion.id_notificacion}`);
        logger.info(`      - Título: ${titulo}`);
        logger.info(`      - Mensaje: ${mensaje}\n`);
      } catch (error) {
        logger.error(`   ❌ Error creando notificación para solicitud #${solicitud.id_solicitud}:`, error.message);
      }
    }

    // ============================================
    // PASO 5: CREAR SIGNO VITAL CON VALOR FUERA DE RANGO
    // ============================================
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🚨 CREANDO SIGNO VITAL CON VALOR FUERA DE RANGO');
    logger.info('═══════════════════════════════════════════════════════════\n');

    // Crear signo vital con glucosa muy alta (crítico)
    // Calcular IMC
    const peso_kg = 75;
    const talla_m = 1.70;
    const imc = parseFloat((peso_kg / (talla_m * talla_m)).toFixed(2));

    const signoVital = await SignoVital.create({
      id_paciente: pacienteEncontrado.id_paciente,
      id_cita: null, // Fuera de consulta
      peso_kg: peso_kg,
      talla_m: talla_m,
      imc: imc,
      medida_cintura_cm: null,
      presion_sistolica: 130,
      presion_diastolica: 85,
      glucosa_mg_dl: 280, // Crítico: >200 (normal: 70-100)
      colesterol_mg_dl: null,
      trigliceridos_mg_dl: null,
      registrado_por: 'doctor',
      observaciones: 'Paciente reporta malestar general, glucosa muy elevada',
      fecha_medicion: new Date(),
      fecha_creacion: new Date()
    }, { transaction });

    logger.info(`✅ Signo vital creado (ID: ${signoVital.id_signo})`);
    logger.info(`   - Glucosa: ${signoVital.glucosa_mg_dl} mg/dL (CRÍTICO: >200)`);
    logger.info(`   - Fecha: ${signoVital.fecha_medicion.toLocaleString('es-MX')}\n`);

    // ============================================
    // PASO 6: CREAR NOTIFICACIÓN DE ALERTA DE SIGNOS VITALES
    // ============================================
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🔔 CREANDO NOTIFICACIÓN DE ALERTA DE SIGNOS VITALES');
    logger.info('═══════════════════════════════════════════════════════════\n');

    try {
      // Usar la función crearNotificacionDoctor para crear la notificación
      const pacienteNombre = `${pacienteEncontrado.nombre} ${pacienteEncontrado.apellido_paterno}`.trim();
      
      // Determinar severidad basada en los valores
      let severidad = 'moderada';
      if (signoVital.glucosa_mg_dl > 250) {
        severidad = 'critica';
      } else if (signoVital.glucosa_mg_dl > 200) {
        severidad = 'alta';
      }

      const alertaData = {
        id_signo_vital: signoVital.id_signo,
        id_paciente: pacienteEncontrado.id_paciente,
        paciente_nombre: pacienteNombre,
        tipo_signo: 'glucosa',
        valor: signoVital.glucosa_mg_dl,
        unidad: 'mg/dL',
        severidad: severidad,
        mensaje: `Glucosa muy elevada: ${signoVital.glucosa_mg_dl} mg/dL (Normal: 70-100 mg/dL)`,
        fecha_medicion: signoVital.fecha_medicion
      };

      await crearNotificacionDoctor({
        id_doctor: doctorEncontrado.id_doctor,
        id_paciente: pacienteEncontrado.id_paciente,
        id_cita: null,
        tipo: 'alerta_signos_vitales',
        datos_adicionales: alertaData
      }, { transaction });

      logger.info(`✅ Notificación de alerta creada exitosamente`);
      logger.info(`   - Tipo: Alerta Signos Vitales`);
      logger.info(`   - Severidad: ${severidad}`);
      logger.info(`   - Signo: Glucosa ${signoVital.datos.glucosa_mg_dl} mg/dL\n`);
    } catch (error) {
      logger.error(`❌ Error creando notificación de alerta:`, error.message);
      // Intentar crear directamente si la función falla
      try {
        const pacienteNombre = `${pacienteEncontrado.nombre} ${pacienteEncontrado.apellido_paterno}`.trim();
        const notificacion = await NotificacionDoctor.create({
          id_doctor: doctorEncontrado.id_doctor,
          id_paciente: pacienteEncontrado.id_paciente,
          id_cita: null,
          tipo: 'alerta_signos_vitales',
          titulo: '🚨 Alerta: Signos Vitales Fuera de Rango',
          mensaje: `${pacienteNombre} tiene glucosa muy elevada: ${signoVital.glucosa_mg_dl} mg/dL`,
          datos_adicionales: {
            id_signo_vital: signoVital.id_signo,
            tipo_signo: 'glucosa',
            valor: signoVital.glucosa_mg_dl,
            unidad: 'mg/dL',
            severidad: 'critica'
          },
          estado: 'enviada',
          fecha_envio: new Date()
        }, { transaction });
        
        logger.info(`✅ Notificación creada directamente (ID: ${notificacion.id_notificacion})`);
      } catch (directError) {
        logger.error(`❌ Error creando notificación directamente:`, directError.message);
      }
    }

    // ============================================
    // PASO 7: RESUMEN FINAL
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
    logger.info(`   🔔 Notificaciones de solicitudes: ${notificacionesSolicitudesCreadas}`, { service: 'api-clinica' });
    logger.info(`   🚨 Signos vitales creados: 1`, { service: 'api-clinica' });
    logger.info(`   🔔 Notificaciones de alertas: 1`, { service: 'api-clinica' });
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

