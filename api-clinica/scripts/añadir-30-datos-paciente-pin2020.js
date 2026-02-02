/**
 * Script para añadir al menos 30 datos de prueba al paciente con PIN 2020:
 * - Citas
 * - Signos vitales
 * - Plan de medicación (plan + detalles)
 * - Diagnósticos
 * - Solicitudes de reprogramación
 * - Notificaciones
 *
 * No borra datos existentes; solo añade registros nuevos.
 * Paciente: PIN 2020 | Doctor: Doctor@clinica.com
 */

import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import { Op } from 'sequelize';
import {
  Usuario,
  Paciente,
  Doctor,
  Cita,
  SignoVital,
  PlanMedicacion,
  PlanDetalle,
  Medicamento,
  Diagnostico,
  SolicitudReprogramacion,
  NotificacionDoctor,
  AuthCredential,
  DoctorPaciente
} from '../models/associations.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcryptjs';

const PIN_PACIENTE = '2020';
const EMAIL_DOCTOR = 'Doctor@clinica.com';

async function buscarPacientePorPin(transaction) {
  const creds = await AuthCredential.findAll({
    where: { auth_method: 'pin', user_type: 'Paciente' },
    transaction
  });
  for (const c of creds) {
    try {
      if (await bcrypt.compare(PIN_PACIENTE, c.credential_value)) {
        const p = await Paciente.findOne({
          where: { id_paciente: c.user_id },
          transaction
        });
        if (p) return p;
      }
    } catch (_) {}
  }
  return null;
}

async function buscarDoctor(transaction) {
  const u = await Usuario.findOne({
    where: { email: EMAIL_DOCTOR, rol: 'Doctor' },
    include: [{ model: Doctor, required: true }],
    transaction
  });
  return u?.Doctor || null;
}

(async () => {
  const transaction = await sequelize.transaction();
  const contador = { citas: 0, signos: 0, planes: 0, detalles: 0, diagnosticos: 0, solicitudes: 0, notificaciones: 0 };

  try {
    await sequelize.authenticate();
    logger.info('Conexión OK. Buscando paciente PIN 2020 y doctor...\n');

    const paciente = await buscarPacientePorPin(transaction);
    if (!paciente) {
      logger.error('No se encontró paciente con PIN 2020.');
      await transaction.rollback();
      await sequelize.close();
      process.exit(1);
    }
    logger.info(`Paciente: ${paciente.nombre} ${paciente.apellido_paterno} (id: ${paciente.id_paciente})`);

    const doctor = await buscarDoctor(transaction);
    if (!doctor) {
      logger.error('No se encontró doctor con email ' + EMAIL_DOCTOR);
      await transaction.rollback();
      await sequelize.close();
      process.exit(1);
    }
    logger.info(`Doctor: ${doctor.nombre} ${doctor.apellido_paterno} (id: ${doctor.id_doctor})\n`);

    // Asignación doctor-paciente si no existe
    let dp = await DoctorPaciente.findOne({
      where: { id_doctor: doctor.id_doctor, id_paciente: paciente.id_paciente },
      transaction
    });
    if (!dp) {
      await DoctorPaciente.create({
        id_doctor: doctor.id_doctor,
        id_paciente: paciente.id_paciente,
        fecha_asignacion: new Date(),
        observaciones: 'Asignación para datos de prueba'
      }, { transaction });
    }

    const ahora = new Date();
    const nombrePaciente = `${paciente.nombre} ${paciente.apellido_paterno}`.trim();

    // ——— 1. CITAS (10) ———
    logger.info('Creando 10 citas...');
    const citasCreadas = [];
    for (let i = 1; i <= 10; i++) {
      const f = new Date(ahora);
      f.setDate(f.getDate() + i);
      f.setHours(8 + (i % 5), (i * 10) % 60, 0, 0);
      const cita = await Cita.create({
        id_paciente: paciente.id_paciente,
        id_doctor: doctor.id_doctor,
        fecha_cita: f,
        motivo: ['Control', 'Seguimiento', 'Revisión', 'Consulta general', 'Control presión'][i % 5],
        estado: i <= 8 ? 'pendiente' : (i === 9 ? 'atendida' : 'no_asistida'),
        asistencia: i === 9 ? true : i === 10 ? false : null,
        es_primera_consulta: i === 1,
        observaciones: `Cita ${i} - datos prueba PIN 2020`,
        fecha_creacion: new Date()
      }, { transaction });
      citasCreadas.push(cita);
      contador.citas++;
    }
    logger.info(`  ${contador.citas} citas creadas.\n`);

    // ——— 2. SIGNOS VITALES (10) ———
    logger.info('Creando 10 signos vitales...');
    for (let i = 0; i < 10; i++) {
      const f = new Date(ahora);
      f.setDate(f.getDate() - (9 - i));
      f.setHours(10, 0, 0, 0);
      const peso = 68 + (i * 0.5) + (i % 3);
      const talla = 1.70;
      const imc = Math.round((peso / (talla * talla)) * 100) / 100;
      await SignoVital.create({
        id_paciente: paciente.id_paciente,
        id_cita: citasCreadas[i]?.id_cita ?? null,
        fecha_medicion: f,
        peso_kg: peso,
        talla_m: talla,
        imc,
        presion_sistolica: 118 + (i % 10),
        presion_diastolica: 74 + (i % 6),
        glucosa_mg_dl: 88 + (i % 12),
        colesterol_mg_dl: 175 + (i % 25),
        trigliceridos_mg_dl: 120 + (i % 30),
        observaciones: `Signo vital ${i + 1} - evolución`,
        registrado_por: i % 2 === 0 ? 'doctor' : 'paciente',
        fecha_creacion: new Date()
      }, { transaction });
      contador.signos++;
    }
    logger.info(`  ${contador.signos} signos vitales creados.\n`);

    // ——— 3. PLAN DE MEDICACIÓN + DETALLES (1 plan + 5 detalles = 6 registros) ———
    logger.info('Creando plan de medicación con 5 detalles...');
    const medicamentosNombres = ['Metformina', 'Paracetamol', 'Ibuprofeno', 'Omeprazol', 'Amoxicilina'];
    const medicamentosIds = [];
    for (const nom of medicamentosNombres) {
      const m = await Medicamento.findOne({
        where: { nombre_medicamento: { [Op.like]: `%${nom}%` } },
        transaction
      });
      if (m) medicamentosIds.push(m.id_medicamento);
    }
    if (medicamentosIds.length === 0) {
      const m = await Medicamento.create({
        nombre_medicamento: 'Metformina',
        descripcion: 'Control glucosa',
        activo: true
      }, { transaction });
      medicamentosIds.push(m.id_medicamento);
    }
    const primeraCita = citasCreadas[0];
    const fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const fechaFin = new Date(ahora.getFullYear(), ahora.getMonth() + 3, 1);
    const plan = await PlanMedicacion.create({
      id_paciente: paciente.id_paciente,
      id_doctor: doctor.id_doctor,
      id_cita: primeraCita?.id_cita ?? null,
      fecha_inicio: fechaInicio.toISOString().split('T')[0],
      fecha_fin: fechaFin.toISOString().split('T')[0],
      activo: true,
      observaciones: 'Plan de medicación de prueba - PIN 2020',
      fecha_creacion: new Date()
    }, { transaction });
    contador.planes++;

    const dosisList = ['500mg', '500mg', '400mg', '20mg', '500mg'];
    const frecList = ['2 veces al día', 'Cada 8 horas', 'Cada 12 horas', 'Una vez al día', 'Cada 12 horas'];
    const horariosList = ['08:00', '08:00;20:00', '08:00;20:00', '08:00', '07:00;19:00'];
    for (let i = 0; i < 5; i++) {
      await PlanDetalle.create({
        id_plan: plan.id_plan,
        id_medicamento: medicamentosIds[i % medicamentosIds.length],
        dosis: dosisList[i],
        frecuencia: frecList[i],
        horario: horariosList[i].split(';')[0],
        horarios: horariosList[i].includes(';') ? horariosList[i].split(';') : [horariosList[i]],
        via_administracion: 'Oral',
        observaciones: `Detalle ${i + 1} - prueba`
      }, { transaction });
      contador.detalles++;
    }
    logger.info(`  ${contador.planes} plan + ${contador.detalles} detalles creados.\n`);

    // ——— 4. DIAGNÓSTICOS (3) ———
    logger.info('Creando 3 diagnósticos...');
    const diagTextos = [
      'Hipertensión arterial leve - control con dieta y ejercicio',
      'Sobrepeso grado I - mejora con tratamiento',
      'Hiperglucemia leve - valores en mejora'
    ];
    for (let i = 0; i < 3; i++) {
      await Diagnostico.create({
        id_cita: citasCreadas[i]?.id_cita ?? null,
        descripcion: diagTextos[i],
        fecha_registro: new Date(ahora.getFullYear(), ahora.getMonth() - (2 - i), 5 + i)
      }, { transaction });
      contador.diagnosticos++;
    }
    logger.info(`  ${contador.diagnosticos} diagnósticos creados.\n`);

    // ——— 5. SOLICITUDES DE REPROGRAMACIÓN (2) ———
    logger.info('Creando 2 solicitudes de reprogramación...');
    const solicitudesCreadas = [];
    for (let s = 0; s < 2; s++) {
      const sol = await SolicitudReprogramacion.create({
        id_cita: citasCreadas[s].id_cita,
        id_paciente: paciente.id_paciente,
        motivo: s === 0 ? 'Compromiso familiar' : 'Viaje de trabajo',
        fecha_solicitada: null,
        estado: 'pendiente',
        fecha_creacion: new Date()
      }, { transaction });
      solicitudesCreadas.push(sol);
      contador.solicitudes++;
    }
    logger.info(`  ${contador.solicitudes} solicitudes creadas.\n`);

    // ——— 6. NOTIFICACIONES (2) ———
    logger.info('Creando 2 notificaciones...');
    for (let n = 0; n < 2; n++) {
      const cita = citasCreadas[n];
      const fechaCitaStr = cita.fecha_cita.toLocaleDateString('es-MX', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      await NotificacionDoctor.create({
        id_doctor: doctor.id_doctor,
        id_paciente: paciente.id_paciente,
        id_cita: cita.id_cita,
        tipo: 'solicitud_reprogramacion',
        titulo: 'Solicitud de reprogramación',
        mensaje: `${nombrePaciente} solicitó reprogramar cita del ${fechaCitaStr}`,
        datos_adicionales: {
          id_solicitud: solicitudesCreadas[n].id_solicitud,
          id_cita: cita.id_cita,
          paciente_nombre: nombrePaciente,
          fecha_cita_original: cita.fecha_cita,
          motivo: solicitudesCreadas[n].motivo
        },
        estado: 'enviada',
        fecha_envio: new Date()
      }, { transaction });
      contador.notificaciones++;
    }
    logger.info(`  ${contador.notificaciones} notificaciones creadas.\n`);

    const total =
      contador.citas + contador.signos + contador.planes + contador.detalles +
      contador.diagnosticos + contador.solicitudes + contador.notificaciones;

    await transaction.commit();

    logger.info('════════════════════════════════════════');
    logger.info('RESUMEN - Datos añadidos para PIN 2020');
    logger.info('════════════════════════════════════════');
    logger.info(`  Citas: ${contador.citas}`);
    logger.info(`  Signos vitales: ${contador.signos}`);
    logger.info(`  Planes de medicación: ${contador.planes}`);
    logger.info(`  Detalles de plan (medicamentos): ${contador.detalles}`);
    logger.info(`  Diagnósticos: ${contador.diagnosticos}`);
    logger.info(`  Solicitudes reprogramación: ${contador.solicitudes}`);
    logger.info(`  Notificaciones: ${contador.notificaciones}`);
    logger.info(`  TOTAL: ${total} registros (mínimo 30 solicitado).`);
    logger.info('Script finalizado correctamente.');

    await sequelize.close();
  } catch (err) {
    await transaction.rollback();
    logger.error('Error:', err);
    await sequelize.close();
    process.exit(1);
  }
})();
