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
  NotificacionDoctor,
  SignoVital,
  AuthCredential,
  DoctorPaciente
} from '../models/associations.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcryptjs';
import { crearNotificacionDoctor } from '../controllers/cita.js';

/**
 * Script para:
 * 1. Eliminar todas las citas y signos vitales del paciente con PIN 2020
 * 2. Crear 5 nuevas citas
 * 3. Crear 2 solicitudes de reprogramación para 2 de esas citas
 * 4. Crear 1 registro de signos vitales fuera de rango
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

    // Verificar y crear asignación doctor-paciente si no existe
    logger.info('\n3️⃣ Verificando asignación doctor-paciente...');
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
        fecha_asignacion: new Date(),
        observaciones: 'Asignación automática para datos de prueba'
      }, { transaction });
      logger.info('✅ Asignación doctor-paciente creada\n');
    } else {
      logger.info('✅ Asignación doctor-paciente ya existe\n');
    }

    // ============================================
    // PASO 2: ELIMINAR DATOS DEL PACIENTE
    // ============================================
    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('🗑️  ELIMINANDO DATOS DEL PACIENTE');
    logger.info('═══════════════════════════════════════════════════════════\n');

    // Obtener todas las citas del paciente para eliminar solicitudes y notificaciones relacionadas
    const citasPaciente = await Cita.findAll({
      where: { id_paciente: pacienteEncontrado.id_paciente },
      attributes: ['id_cita'],
      raw: true,
      transaction
    });
    const citasIds = citasPaciente.map(c => c.id_cita);

    // Eliminar notificaciones relacionadas
    logger.info('1️⃣ Eliminando notificaciones del paciente...');
    let notificacionesEliminadas = 0;
    if (citasIds.length > 0) {
      notificacionesEliminadas = await NotificacionDoctor.destroy({
        where: {
          [Op.or]: [
            { id_paciente: pacienteEncontrado.id_paciente },
            { id_cita: { [Op.in]: citasIds } }
          ]
        },
        transaction
      });
    } else {
      notificacionesEliminadas = await NotificacionDoctor.destroy({
        where: { id_paciente: pacienteEncontrado.id_paciente },
        transaction
      });
    }
    logger.info(`   ✅ ${notificacionesEliminadas} notificaciones eliminadas`);

    // Eliminar solicitudes de reprogramación
    logger.info('\n2️⃣ Eliminando solicitudes de reprogramación...');
    let solicitudesEliminadas = 0;
    if (citasIds.length > 0) {
      solicitudesEliminadas = await SolicitudReprogramacion.destroy({
        where: {
          id_cita: { [Op.in]: citasIds },
          id_paciente: pacienteEncontrado.id_paciente
        },
        transaction
      });
    }
    logger.info(`   ✅ ${solicitudesEliminadas} solicitudes eliminadas`);

    // Eliminar citas
    logger.info('\n3️⃣ Eliminando citas...');
    const citasEliminadas = await Cita.destroy({
      where: { id_paciente: pacienteEncontrado.id_paciente },
      transaction
    });
    logger.info(`   ✅ ${citasEliminadas} citas eliminadas`);

    // Eliminar signos vitales
    logger.info('\n4️⃣ Eliminando signos vitales...');
    const signosEliminados = await SignoVital.destroy({
      where: { id_paciente: pacienteEncontrado.id_paciente },
      transaction
    });
    logger.info(`   ✅ ${signosEliminados} signos vitales eliminados\n`);

    // ============================================
    // PASO 3: CREAR 5 NUEVAS CITAS
    // ============================================
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('📅 CREANDO 5 NUEVAS CITAS');
    logger.info('═══════════════════════════════════════════════════════════\n');

    const ahora = new Date();
    const fechasCitas = [];
    
    // Crear 5 citas distribuidas en los próximos días
    for (let i = 1; i <= 5; i++) {
      const fecha = new Date(ahora);
      fecha.setDate(fecha.getDate() + i); // Días: +1, +2, +3, +4, +5
      fecha.setHours(9 + i, 0, 0, 0); // Horas: 10:00, 11:00, 12:00, 13:00, 14:00
      fechasCitas.push(fecha);
    }

    const citasCreadas = [];
    const motivos = [
      'Consulta de seguimiento',
      'Control de presión arterial',
      'Revisión de medicamentos',
      'Consulta general',
      'Seguimiento de tratamiento'
    ];

    for (let i = 0; i < fechasCitas.length; i++) {
      const cita = await Cita.create({
        id_paciente: pacienteEncontrado.id_paciente,
        id_doctor: doctorEncontrado.id_doctor,
        fecha_cita: fechasCitas[i],
        motivo: motivos[i],
        estado: 'pendiente',
        asistencia: null,
        es_primera_consulta: false,
        observaciones: `Cita programada para ${fechasCitas[i].toLocaleDateString('es-MX')} a las ${fechasCitas[i].toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`,
        fecha_creacion: new Date()
      }, { transaction });

      citasCreadas.push(cita);
      logger.info(`   ✅ Cita ${i + 1} creada (ID: ${cita.id_cita}) - ${fechasCitas[i].toLocaleString('es-MX')}`);
    }
    logger.info(`\n✅ ${citasCreadas.length} citas creadas\n`);

    // ============================================
    // PASO 4: CREAR 2 SOLICITUDES DE REPROGRAMACIÓN
    // ============================================
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🔄 CREANDO 2 SOLICITUDES DE REPROGRAMACIÓN');
    logger.info('═══════════════════════════════════════════════════════════\n');

    const motivosSolicitud = [
      'Tengo un compromiso familiar importante ese día y no podré asistir',
      'Necesito cambiar la fecha porque tengo un viaje de trabajo programado'
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
    // PASO 5: CREAR NOTIFICACIONES PARA SOLICITUDES
    // ============================================
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🔔 CREANDO NOTIFICACIONES PARA SOLICITUDES');
    logger.info('═══════════════════════════════════════════════════════════\n');

    const pacienteNombre = `${pacienteEncontrado.nombre} ${pacienteEncontrado.apellido_paterno}`.trim();

    for (let i = 0; i < solicitudesCreadas.length; i++) {
      const solicitud = solicitudesCreadas[i];
      const cita = citasCreadas[i];
      
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
          id_solicitud: solicitud.id_solicitud,
          id_cita: cita.id_cita,
          id_paciente: pacienteEncontrado.id_paciente,
          paciente_nombre: pacienteNombre,
          fecha_cita_original: cita.fecha_cita,
          fecha_solicitada: null,
          motivo: solicitud.motivo
        };

        // Crear notificación directamente para evitar problemas de timeout
        const notificacion = await NotificacionDoctor.create({
          id_doctor: doctorEncontrado.id_doctor,
          id_paciente: pacienteEncontrado.id_paciente,
          id_cita: cita.id_cita,
          tipo: 'solicitud_reprogramacion',
          titulo: '📅 Solicitud de Reprogramación',
          mensaje: `${pacienteNombre} solicitó reprogramar su cita del ${fechaCitaFormateada}`,
          datos_adicionales: solicitudData,
          estado: 'enviada',
          fecha_envio: solicitud.fecha_creacion || new Date()
        }, { transaction });

        logger.info(`   ✅ Notificación ${i + 1} creada para solicitud #${solicitud.id_solicitud}`);
        logger.info(`      - Notificación ID: ${notificacion.id_notificacion}`);
        logger.info(`      - Cita: #${cita.id_cita}`);
        logger.info(`      - Fecha: ${fechaCitaFormateada}\n`);
      } catch (error) {
        logger.error(`   ❌ Error creando notificación ${i + 1}:`, error.message);
        logger.error(`      Detalles:`, error);
      }
    }

    // ============================================
    // PASO 6: CREAR SIGNOS VITALES FUERA DE RANGO
    // ============================================
    logger.info('═══════════════════════════════════════════════════════════');
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
      const alertaData = {
        id_signo_vital: signoVital.id_signo,
        id_paciente: pacienteEncontrado.id_paciente,
        paciente_nombre: pacienteNombre,
        tipo_signo: 'presion',
        valor: `${signoVital.presion_sistolica}/${signoVital.presion_diastolica}`,
        unidad: 'mmHg',
        severidad: 'critica',
        mensaje: `Presión arterial muy elevada: ${signoVital.presion_sistolica}/${signoVital.presion_diastolica} mmHg (Normal: <120/<80 mmHg). Colesterol: ${signoVital.colesterol_mg_dl} mg/dL (Normal: <200 mg/dL)`,
        fecha_medicion: signoVital.fecha_medicion
      };

      // Crear notificación directamente para evitar problemas de timeout
      const notificacion = await NotificacionDoctor.create({
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

      logger.info(`✅ Notificación de signos vitales creada exitosamente`);
      logger.info(`   - Notificación ID: ${notificacion.id_notificacion}`);
      logger.info(`   - Signo vital ID: ${signoVital.id_signo}`);
      logger.info(`   - Presión: ${signoVital.presion_sistolica}/${signoVital.presion_diastolica} mmHg`);
      logger.info(`   - Colesterol: ${signoVital.colesterol_mg_dl} mg/dL\n`);
    } catch (error) {
      logger.error(`❌ Error creando notificación de signos vitales:`, error.message);
      logger.error(`   Detalles:`, error);
    }

    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('✅ PROCESO COMPLETADO EXITOSAMENTE');
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('📋 RESUMEN:', { service: 'api-clinica' });
    logger.info(`   👤 Paciente: ${pacienteEncontrado.nombre} ${pacienteEncontrado.apellido_paterno}`, { id: pacienteEncontrado.id_paciente, service: 'api-clinica' });
    logger.info(`   👨‍⚕️ Doctor: ${usuarioDoctor.nombre} ${usuarioDoctor.apellido_paterno}`, { id: doctorEncontrado.id_doctor, service: 'api-clinica' });
    logger.info(`   🗑️  Datos eliminados:`, { service: 'api-clinica' });
    logger.info(`      - Citas: ${citasEliminadas}`, { service: 'api-clinica' });
    logger.info(`      - Signos vitales: ${signosEliminados}`, { service: 'api-clinica' });
    logger.info(`      - Solicitudes: ${solicitudesEliminadas}`, { service: 'api-clinica' });
    logger.info(`      - Notificaciones: ${notificacionesEliminadas}`, { service: 'api-clinica' });
    logger.info(`   📅 Citas creadas: ${citasCreadas.length}`, { service: 'api-clinica' });
    logger.info(`   🔄 Solicitudes de reprogramación: ${solicitudesCreadas.length}`, { service: 'api-clinica' });
    logger.info(`   📊 Signos vitales: 1 (Presión: 170/105 mmHg, Colesterol: 245 mg/dL)`, { service: 'api-clinica' });
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

