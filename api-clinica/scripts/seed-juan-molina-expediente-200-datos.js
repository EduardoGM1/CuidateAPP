/**
 * Script para añadir al menos 200 registros de prueba al paciente "Juan Molina"
 * para analizar el PDF de expediente médico con múltiples datos.
 *
 * - Citas: ~50 (últimos 6 meses)
 * - Signos vitales: ~110 (60 asociados a citas, 50 monitoreo continuo sin cita)
 * - Planes de medicación: ~20 (algunos ligados a citas, otros activos)
 * - Plan detalle: ~45
 * - Diagnósticos: ~45 (asociados a citas)
 *
 * Total: 200+ registros. No borra datos existentes.
 */

import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import { Op } from 'sequelize';
import {
  Paciente,
  Doctor,
  Cita,
  SignoVital,
  PlanMedicacion,
  PlanDetalle,
  Medicamento,
  Diagnostico,
  DoctorPaciente
} from '../models/associations.js';
import logger from '../utils/logger.js';

const NOMBRE_PACIENTE = 'Juan';
const APELLIDO_PACIENTE = 'Molina';

const MOTIVOS = [
  'Control de presión arterial',
  'Seguimiento de diabetes',
  'Revisión general',
  'Consulta por dolor de cabeza',
  'Control de peso',
  'Seguimiento tratamiento',
  'Evaluación de signos vitales',
  'Consulta preventiva',
  'Renovación de receta',
  'Control post tratamiento'
];

const ESTADOS_CITA = ['atendida', 'atendida', 'atendida', 'pendiente', 'no_asistida'];
const DESCRIPCIONES_DIAGNOSTICO = [
  'Hipertensión arterial controlada',
  'Diabetes mellitus tipo 2 en control',
  'Sobrepeso grado I - recomendaciones dietéticas',
  'Dislipidemia leve - en seguimiento',
  'Rinitis alérgica estacional',
  'Artralgias inespecíficas',
  'Reflujo gastroesofágico leve',
  'Insomnio ocasional',
  'Ansiedad leve - controlada',
  'Dorsalgia mecánica'
];

async function buscarPacienteJuanMolina(transaction) {
  const p = await Paciente.findOne({
    where: {
      nombre: { [Op.like]: NOMBRE_PACIENTE },
      apellido_paterno: { [Op.like]: APELLIDO_PACIENTE }
    },
    transaction
  });
  return p;
}

async function buscarUnDoctor(transaction) {
  const d = await Doctor.findOne({
    where: { activo: true },
    transaction
  });
  return d;
}

async function obtenerMedicamentos(transaction) {
  let list = await Medicamento.findAll({
    limit: 20,
    order: [['id_medicamento', 'ASC']],
    transaction
  });
  if (list.length < 5) {
    const nombres = ['Metformina', 'Losartán', 'Paracetamol', 'Omeprazol', 'Atorvastatina', 'Aspirina', 'Amoxicilina', 'Ibuprofeno', 'Enalapril', 'Metoclopramida'];
    for (const nom of nombres) {
      const [m] = await Medicamento.findOrCreate({
        where: { nombre_medicamento: nom },
        defaults: { nombre_medicamento: nom, descripcion: `Medicamento ${nom}` },
        transaction
      });
      if (m && !list.find(x => x.id_medicamento === m.id_medicamento)) list.push(m);
    }
  }
  return list;
}

function fechaAleatoriaEntre(fechaInicio, fechaFin) {
  const start = fechaInicio.getTime();
  const end = fechaFin.getTime();
  return new Date(start + Math.random() * (end - start));
}

(async () => {
  const transaction = await sequelize.transaction();
  const contador = { citas: 0, signosConCita: 0, signosSinCita: 0, planes: 0, detalles: 0, diagnosticos: 0 };

  try {
    await sequelize.authenticate();
    logger.info('Conexión OK. Buscando paciente Juan Molina y doctor...\n');

    const paciente = await buscarPacienteJuanMolina(transaction);
    if (!paciente) {
      logger.error('No se encontró paciente con nombre "Juan" y apellido "Molina". Créalo desde la app o desde otro script.');
      await transaction.rollback();
      await sequelize.close();
      process.exit(1);
    }
    logger.info(`Paciente: ${paciente.nombre} ${paciente.apellido_paterno} (id: ${paciente.id_paciente})`);

    const doctor = await buscarUnDoctor(transaction);
    if (!doctor) {
      logger.error('No se encontró ningún doctor activo.');
      await transaction.rollback();
      await sequelize.close();
      process.exit(1);
    }
    logger.info(`Doctor: ${doctor.nombre} ${doctor.apellido_paterno} (id: ${doctor.id_doctor})\n`);

    await DoctorPaciente.findOrCreate({
      where: { id_doctor: doctor.id_doctor, id_paciente: paciente.id_paciente },
      defaults: { fecha_asignacion: new Date(), observaciones: 'Asignación para expediente de prueba' },
      transaction
    });

    const medicamentos = await obtenerMedicamentos(transaction);
    if (medicamentos.length === 0) {
      logger.error('No hay medicamentos en la base de datos.');
      await transaction.rollback();
      process.exit(1);
    }
    logger.info(`Medicamentos disponibles: ${medicamentos.length}\n`);

    const ahora = new Date();
    const hace6Meses = new Date(ahora.getFullYear(), ahora.getMonth() - 6, ahora.getDate());

    // ——— 1. CITAS (50) ———
    logger.info('Creando 50 citas (últimos 6 meses)...');
    const citasCreadas = [];
    for (let i = 0; i < 50; i++) {
      const fechaCita = fechaAleatoriaEntre(hace6Meses, ahora);
      fechaCita.setHours(8 + (i % 8), (i * 7) % 60, 0, 0);
      const cita = await Cita.create({
        id_paciente: paciente.id_paciente,
        id_doctor: doctor.id_doctor,
        fecha_cita: fechaCita,
        motivo: MOTIVOS[i % MOTIVOS.length],
        estado: ESTADOS_CITA[i % ESTADOS_CITA.length],
        asistencia: ESTADOS_CITA[i % ESTADOS_CITA.length] === 'atendida' ? true : (ESTADOS_CITA[i % ESTADOS_CITA.length] === 'no_asistida' ? false : null),
        es_primera_consulta: i === 0,
        observaciones: `Consulta ${i + 1} - expediente prueba Juan Molina`,
        fecha_creacion: new Date()
      }, { transaction });
      citasCreadas.push(cita);
      contador.citas++;
    }
    citasCreadas.sort((a, b) => new Date(a.fecha_cita) - new Date(b.fecha_cita));
    logger.info(`  ${contador.citas} citas creadas.\n`);

    // ——— 2. SIGNOS VITALES CON CITA (60) ———
    logger.info('Creando 60 signos vitales asociados a citas...');
    const tallaBase = 1.72;
    for (let i = 0; i < 60; i++) {
      const cita = citasCreadas[i % citasCreadas.length];
      const fechaMed = new Date(cita.fecha_cita);
      const peso = 70 + (i % 15) * 0.4 + Math.random() * 2;
      const imc = parseFloat((peso / (tallaBase * tallaBase)).toFixed(2));
      await SignoVital.create({
        id_paciente: paciente.id_paciente,
        id_cita: cita.id_cita,
        fecha_medicion: fechaMed,
        peso_kg: parseFloat(peso.toFixed(2)),
        talla_m: tallaBase,
        imc,
        presion_sistolica: 118 + (i % 15),
        presion_diastolica: 72 + (i % 10),
        glucosa_mg_dl: 88 + (i % 25),
        colesterol_mg_dl: 175 + (i % 35),
        trigliceridos_mg_dl: 110 + (i % 40),
        observaciones: `Signo cita ${i + 1}`,
        registrado_por: i % 2 === 0 ? 'doctor' : 'paciente',
        fecha_creacion: new Date()
      }, { transaction });
      contador.signosConCita++;
    }
    logger.info(`  ${contador.signosConCita} signos con cita creados.\n`);

    // ——— 3. SIGNOS VITALES SIN CITA - Monitoreo continuo (55) ———
    logger.info('Creando 55 signos vitales de monitoreo continuo (sin cita)...');
    for (let i = 0; i < 55; i++) {
      const fechaMed = fechaAleatoriaEntre(hace6Meses, ahora);
      fechaMed.setHours(7 + (i % 12), (i * 5) % 60, 0, 0);
      const peso = 69 + (i % 12) * 0.5 + Math.random() * 1.5;
      const imc = parseFloat((peso / (tallaBase * tallaBase)).toFixed(2));
      await SignoVital.create({
        id_paciente: paciente.id_paciente,
        id_cita: null,
        fecha_medicion: fechaMed,
        peso_kg: parseFloat(peso.toFixed(2)),
        talla_m: tallaBase,
        imc,
        presion_sistolica: 120 + (i % 12),
        presion_diastolica: 74 + (i % 8),
        glucosa_mg_dl: 92 + (i % 20),
        colesterol_mg_dl: 180 + (i % 30),
        trigliceridos_mg_dl: 115 + (i % 35),
        observaciones: `Monitoreo continuo ${i + 1}`,
        registrado_por: i % 3 === 0 ? 'doctor' : 'paciente',
        fecha_creacion: new Date()
      }, { transaction });
      contador.signosSinCita++;
    }
    logger.info(`  ${contador.signosSinCita} signos monitoreo continuo creados.\n`);

    // ——— 4. PLANES DE MEDICACIÓN (20): algunos con id_cita, algunos activos ———
    logger.info('Creando 20 planes de medicación (10 ligados a citas, 10 activos)...');
    const planesCreados = [];
    const fechaInicioBase = new Date(ahora.getFullYear(), ahora.getMonth() - 4, 1);
    for (let i = 0; i < 20; i++) {
      const citaRef = i < 10 ? citasCreadas[10 + i] : null;
      const fechaInicio = new Date(fechaInicioBase);
      fechaInicio.setDate(fechaInicio.getDate() + i * 3);
      const fechaFin = new Date(fechaInicio);
      fechaFin.setMonth(fechaFin.getMonth() + 2);
      const plan = await PlanMedicacion.create({
        id_paciente: paciente.id_paciente,
        id_doctor: doctor.id_doctor,
        id_cita: citaRef?.id_cita ?? null,
        fecha_inicio: fechaInicio.toISOString().split('T')[0],
        fecha_fin: i >= 10 ? null : fechaFin.toISOString().split('T')[0],
        activo: i >= 10,
        observaciones: `Plan ${i + 1} - expediente Juan Molina`,
        fecha_creacion: new Date()
      }, { transaction });
      planesCreados.push(plan);
      contador.planes++;
    }
    logger.info(`  ${contador.planes} planes creados.\n`);

    // ——— 5. PLAN DETALLE (~45) ———
    logger.info('Creando ~45 detalles de plan (medicamentos en planes)...');
    const dosisOpt = ['500 mg', '50 mg', '100 mg', '20 mg', '10 mg', '1 tableta', '5 mg'];
    const freqOpt = ['Cada 12 horas', 'Una vez al día', 'Cada 8 horas', 'Cada 24 horas', '2 veces al día', 'En la noche'];
    const viaOpt = ['Oral', 'Sublingual', 'Oral'];
    let detalleCount = 0;
    for (let p = 0; p < planesCreados.length; p++) {
      const numDetalles = p < 10 ? 3 : 2;
      for (let d = 0; d < numDetalles; d++) {
        await PlanDetalle.create({
          id_plan: planesCreados[p].id_plan,
          id_medicamento: medicamentos[(p + d) % medicamentos.length].id_medicamento,
          dosis: dosisOpt[(p + d) % dosisOpt.length],
          frecuencia: freqOpt[(p + d) % freqOpt.length],
          via_administracion: viaOpt[(p + d) % viaOpt.length],
          observaciones: `Detalle plan ${p + 1}`
        }, { transaction });
        detalleCount++;
      }
    }
    contador.detalles = detalleCount;
    logger.info(`  ${contador.detalles} detalles de plan creados.\n`);

    // ——— 6. DIAGNÓSTICOS (45) asociados a citas ———
    logger.info('Creando 45 diagnósticos asociados a citas...');
    for (let i = 0; i < 45; i++) {
      const cita = citasCreadas[i % citasCreadas.length];
      await Diagnostico.create({
        id_cita: cita.id_cita,
        descripcion: DESCRIPCIONES_DIAGNOSTICO[i % DESCRIPCIONES_DIAGNOSTICO.length] + ` (consulta ${i + 1})`,
        fecha_registro: new Date(cita.fecha_cita)
      }, { transaction });
      contador.diagnosticos++;
    }
    logger.info(`  ${contador.diagnosticos} diagnósticos creados.\n`);

    await transaction.commit();

    const total =
      contador.citas + contador.signosConCita + contador.signosSinCita +
      contador.planes + contador.detalles + contador.diagnosticos;

    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('RESUMEN - Datos añadidos para Juan Molina (expediente PDF)');
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info(`  Citas: ${contador.citas}`);
    logger.info(`  Signos vitales (con cita): ${contador.signosConCita}`);
    logger.info(`  Signos vitales (monitoreo continuo): ${contador.signosSinCita}`);
    logger.info(`  Planes de medicación: ${contador.planes}`);
    logger.info(`  Detalles de plan: ${contador.detalles}`);
    logger.info(`  Diagnósticos: ${contador.diagnosticos}`);
    logger.info(`  TOTAL: ${total} registros (objetivo ≥200).`);
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('Puedes exportar el Expediente Médico Completo desde Detalle del Paciente para ver el PDF con muchos datos.');

    await sequelize.close();
  } catch (err) {
    await transaction.rollback();
    logger.error('Error:', err);
    await sequelize.close();
    process.exit(1);
  }
})();
