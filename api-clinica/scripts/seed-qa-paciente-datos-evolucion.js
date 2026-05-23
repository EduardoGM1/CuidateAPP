/**
 * Añade datos masivos al paciente "QA Paciente" para pruebas de gráficos de evolución.
 * - Completa campos del expediente
 * - Citas en varios años (2022–2026)
 * - Signos vitales en citas + monitoreo continuo (sin cita) con tendencia de mejora
 * - Diagnósticos, medicación, comorbilidades, red de apoyo, vacunas, etc.
 *
 * Uso:
 *   node scripts/seed-qa-paciente-datos-evolucion.js
 *   PACIENTE_ID=1104 node scripts/seed-qa-paciente-datos-evolucion.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Op } from 'sequelize';
import sequelize from '../config/db.js';
import EncryptionService from '../services/encryptionService.js';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import {
  Paciente,
  Doctor,
  DoctorPaciente,
  Comorbilidad,
  Medicamento,
  Vacuna,
  Cita,
  SignoVital,
  Diagnostico,
  PlanMedicacion,
  PlanDetalle,
  MedicamentoToma,
  RedApoyo,
  PuntoChequeo,
  PacienteComorbilidad,
  DeteccionComplicacion,
  SesionEducativa,
  SaludBucal,
  DeteccionTuberculosis,
  EsquemaVacunacion
} from '../models/associations.js';

const NOMBRE = 'QA';
const APELLIDO = 'Paciente';
const TALLA_BASE = 1.65;
const FECHA_NAC = new Date('1992-06-14');

const MOTIVOS = [
  'Control GAM programado',
  'Seguimiento diabetes e hipertensión',
  'Revisión de signos vitales',
  'Consulta preventiva',
  'Renovación de tratamiento',
  'Evaluación HbA1c trimestral',
  'Control de peso y estilo de vida',
  'Seguimiento dislipidemia'
];

const DIAGNOSTICOS = [
  'Diabetes mellitus tipo 2 en control metabólico.',
  'Hipertensión arterial esencial — objetivos alcanzados.',
  'Dislipidemia mixta en tratamiento.',
  'Sobrepeso grado I — plan nutricional activo.',
  'Neuropatía diabética leve — sin úlceras.',
  'Riesgo cardiovascular moderado — seguimiento.'
];

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function addMonths(d, n) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

function dateStr(d) {
  return d.toISOString().slice(0, 10);
}

function edadEn(fecha) {
  let e = fecha.getFullYear() - FECHA_NAC.getFullYear();
  const m = fecha.getMonth() - FECHA_NAC.getMonth();
  if (m < 0 || (m === 0 && fecha.getDate() < FECHA_NAC.getDate())) e--;
  return e;
}

/** Valores con tendencia de mejora: progress 0 = inicio 2022, 1 = hoy */
function metricasEvolucion(progress) {
  const p = Math.min(1, Math.max(0, progress));
  const peso = parseFloat((82 - p * 11 + (Math.sin(p * 12) * 0.4)).toFixed(2));
  const imc = parseFloat((peso / (TALLA_BASE * TALLA_BASE)).toFixed(2));
  const sist = Math.round(142 - p * 24 + (Math.random() * 4 - 2));
  const diast = Math.round(88 - p * 14 + (Math.random() * 3 - 1));
  const glucosa = Math.round(148 - p * 48 + (Math.random() * 6 - 3));
  const col = Math.round(210 - p * 35);
  const ldl = Math.round(130 - p * 38);
  const hdl = Math.round(38 + p * 14);
  const trig = Math.round(180 - p * 55);
  const hba1c = parseFloat((8.4 - p * 2.3).toFixed(1));
  const cintura = parseFloat((98 - p * 10).toFixed(1));
  return { peso, imc, sist, diast, glucosa, col, ldl, hdl, trig, hba1c, cintura };
}

async function buscarPaciente(transaction) {
  const idEnv = Number(process.env.PACIENTE_ID || 0);
  if (idEnv > 0) {
    return Paciente.findByPk(idEnv, { transaction });
  }
  return Paciente.findOne({
    where: {
      nombre: { [Op.like]: `${NOMBRE}%` },
      apellido_paterno: { [Op.like]: `${APELLIDO}%` }
    },
    transaction
  });
}

async function run() {
  let t;
  const contador = {
    citas: 0,
    signosConCita: 0,
    signosSinCita: 0,
    diagnosticos: 0,
    planes: 0,
    detalles: 0,
    otros: 0
  };

  try {
    await sequelize.authenticate();
    t = await sequelize.transaction();

    const paciente = await buscarPaciente(t);
    if (!paciente) {
      logger.error('No se encontró "QA Paciente". Define PACIENTE_ID o créalo en la app.');
      process.exit(1);
    }

    let doctor = null;
    const asignacion = await DoctorPaciente.findOne({
      where: { id_paciente: paciente.id_paciente },
      transaction: t
    });
    if (asignacion) {
      doctor = await Doctor.findByPk(asignacion.id_doctor, { transaction: t });
    }
    if (!doctor) {
      doctor = await Doctor.findOne({
        where: {
          [Op.or]: [
            { nombre: { [Op.like]: '%Eduardo%' } },
            { email: { [Op.like]: '%doctor%' } }
          ],
          activo: true
        },
        transaction: t
      });
    }
    if (!doctor) {
      doctor = await Doctor.findOne({ where: { activo: true }, transaction: t });
    }
    if (!doctor) {
      logger.error('No hay doctor disponible para asociar citas.');
      process.exit(1);
    }

    const [comorbilidades, medicamentos, vacunas] = await Promise.all([
      Comorbilidad.findAll({ transaction: t }),
      Medicamento.findAll({ limit: 15, transaction: t }),
      Vacuna.findAll({ transaction: t })
    ]);

    const hoy = new Date();
    hoy.setHours(12, 0, 0, 0);
    const inicioHistorico = new Date('2022-01-15T10:00:00');

    logger.info(`Paciente: ${paciente.nombre} ${paciente.apellido_paterno} (id=${paciente.id_paciente})`);
    logger.info(`Doctor: ${doctor.nombre} ${doctor.apellido_paterno || ''} (id=${doctor.id_doctor})`);

    // ——— Completar perfil ———
    await paciente.update({
      apellido_materno: paciente.apellido_materno || 'Prueba',
      sexo: paciente.sexo || 'Hombre',
      institucion_salud: paciente.institucion_salud || 'IMSS',
      estado: paciente.estado || 'Jalisco',
      localidad: paciente.localidad || 'Guadalajara',
      direccion: paciente.direccion || EncryptionService.encryptField('Av. Patria 1500, Col. Jardines del Sol, Zapopan, Jal.'),
      numero_celular: paciente.numero_celular || EncryptionService.encryptField('3399887766'),
      fecha_nacimiento: paciente.fecha_nacimiento || EncryptionService.encryptField('1992-06-14'),
      curp: paciente.curp || EncryptionService.encryptField('QAQM920614HDFRRL09'),
      numero_expediente: paciente.numero_expediente || `EXP-QA-${paciente.id_paciente}`,
      numero_gam: paciente.numero_gam || paciente.id_paciente,
      activo: true
    }, { transaction: t });

    if (!asignacion) {
      await DoctorPaciente.findOrCreate({
        where: { id_paciente: paciente.id_paciente, id_doctor: doctor.id_doctor },
        defaults: { id_paciente: paciente.id_paciente, id_doctor: doctor.id_doctor },
        transaction: t
      });
    }

    const citasCreadas = [];
    const estadosRot = ['atendida', 'atendida', 'atendida', 'pendiente', 'no_asistida', 'atendida', 'reprogramada'];

    // ——— Citas mensuales 2022-01 → hoy + 4 futuras ———
    let cursor = new Date(inicioHistorico);
    let idxCita = 0;
    while (cursor <= hoy) {
      const fc = new Date(cursor);
      fc.setHours(9 + (idxCita % 5), (idxCita % 4) * 15, 0, 0);
      const esFuturo = fc > hoy;
      const estado = esFuturo ? 'pendiente' : estadosRot[idxCita % estadosRot.length];
      const cita = await Cita.create({
        id_paciente: paciente.id_paciente,
        id_doctor: doctor.id_doctor,
        fecha_cita: fc,
        estado,
        asistencia: estado === 'atendida' ? true : estado === 'no_asistida' ? false : null,
        es_primera_consulta: idxCita === 0,
        motivo: EncryptionService.encryptField(MOTIVOS[idxCita % MOTIVOS.length] + ` #${idxCita + 1}`),
        observaciones: EncryptionService.encryptField(
          estado === 'atendida' ? 'Paciente en seguimiento GAM. Continuar plan.' : 'Cita programada.'
        ),
        fecha_creacion: fc
      }, { transaction: t });
      citasCreadas.push({ cita, estado });
      contador.citas++;
      idxCita++;
      cursor = addMonths(cursor, 1);
    }
    for (let f = 1; f <= 4; f++) {
      const fc = addDays(hoy, 14 * f);
      fc.setHours(11, 30, 0, 0);
      const cita = await Cita.create({
        id_paciente: paciente.id_paciente,
        id_doctor: doctor.id_doctor,
        fecha_cita: fc,
        estado: 'pendiente',
        asistencia: null,
        es_primera_consulta: false,
        motivo: EncryptionService.encryptField('Control programado — seguimiento evolución'),
        observaciones: null,
        fecha_creacion: hoy
      }, { transaction: t });
      citasCreadas.push({ cita, estado: 'pendiente' });
      contador.citas++;
    }

    const citasAtendidas = citasCreadas.filter((x) => x.estado === 'atendida').map((x) => x.cita);
    const rangoMs = hoy.getTime() - inicioHistorico.getTime();

    // ——— Signos en citas atendidas ———
    for (let i = 0; i < citasAtendidas.length; i++) {
      const c = citasAtendidas[i];
      const f = new Date(c.fecha_cita);
      const progress = (f.getTime() - inicioHistorico.getTime()) / rangoMs;
      const m = metricasEvolucion(progress);
      await SignoVital.create({
        id_paciente: paciente.id_paciente,
        id_cita: c.id_cita,
        fecha_medicion: f,
        peso_kg: m.peso,
        talla_m: TALLA_BASE,
        imc: m.imc,
        medida_cintura_cm: m.cintura,
        presion_sistolica: EncryptionService.encryptField(String(m.sist)),
        presion_diastolica: EncryptionService.encryptField(String(m.diast)),
        glucosa_mg_dl: EncryptionService.encryptField(String(m.glucosa)),
        colesterol_mg_dl: EncryptionService.encryptField(String(m.col)),
        colesterol_ldl: EncryptionService.encryptField(String(m.ldl)),
        colesterol_hdl: EncryptionService.encryptField(String(m.hdl)),
        trigliceridos_mg_dl: EncryptionService.encryptField(String(m.trig)),
        hba1c_porcentaje: EncryptionService.encryptField(String(m.hba1c)),
        edad_paciente_en_medicion: edadEn(f),
        observaciones: EncryptionService.encryptField(`Consulta ${i + 1} — evolución QA`),
        registrado_por: 'doctor',
        fecha_creacion: f
      }, { transaction: t });
      contador.signosConCita++;
    }

    // ——— Monitoreo continuo: cada 10 días desde 2022 (sin cita) ———
    const totalMonitoreos = 130;
    for (let i = 0; i < totalMonitoreos; i++) {
      const fd = addDays(inicioHistorico, i * 10);
      if (fd > hoy) break;
      fd.setHours(7 + (i % 10), (i * 7) % 60, 0, 0);
      const progress = (fd.getTime() - inicioHistorico.getTime()) / rangoMs;
      const m = metricasEvolucion(progress);
      await SignoVital.create({
        id_paciente: paciente.id_paciente,
        id_cita: null,
        fecha_medicion: fd,
        peso_kg: m.peso,
        talla_m: TALLA_BASE,
        imc: m.imc,
        medida_cintura_cm: m.cintura,
        presion_sistolica: EncryptionService.encryptField(String(m.sist)),
        presion_diastolica: EncryptionService.encryptField(String(m.diast)),
        glucosa_mg_dl: EncryptionService.encryptField(String(m.glucosa)),
        colesterol_mg_dl: EncryptionService.encryptField(String(m.col)),
        colesterol_ldl: EncryptionService.encryptField(String(m.ldl)),
        colesterol_hdl: EncryptionService.encryptField(String(m.hdl)),
        trigliceridos_mg_dl: EncryptionService.encryptField(String(m.trig)),
        hba1c_porcentaje: EncryptionService.encryptField(String(m.hba1c)),
        edad_paciente_en_medicion: edadEn(fd),
        observaciones: EncryptionService.encryptField(`Monitoreo continuo QA — registro ${i + 1}`),
        registrado_por: i % 3 === 0 ? 'paciente' : 'doctor',
        fecha_creacion: fd
      }, { transaction: t });
      contador.signosSinCita++;
    }

    // ——— Diagnósticos ———
    const maxDiag = Math.min(35, citasAtendidas.length);
    for (let i = 0; i < maxDiag; i++) {
      const cita = citasAtendidas[i];
      await Diagnostico.create({
        id_cita: cita.id_cita,
        descripcion: EncryptionService.encryptField(DIAGNOSTICOS[i % DIAGNOSTICOS.length]),
        fecha_registro: cita.fecha_cita
      }, { transaction: t });
      contador.diagnosticos++;
    }

    // ——— Puntos de chequeo ———
    for (const { cita, estado } of citasCreadas) {
      await PuntoChequeo.create({
        id_paciente: paciente.id_paciente,
        id_cita: cita.id_cita,
        asistencia: estado === 'atendida',
        fecha_registro: cita.fecha_cita
      }, { transaction: t });
      contador.otros++;
    }

    // ——— Planes de medicación ———
    if (medicamentos.length >= 2) {
      const plan = await PlanMedicacion.create({
        id_paciente: paciente.id_paciente,
        id_doctor: doctor.id_doctor,
        id_cita: citasAtendidas[0]?.id_cita ?? null,
        fecha_inicio: dateStr(addMonths(hoy, -18)),
        activo: true,
        observaciones: EncryptionService.encryptField('Metformina, IECA y estatina — plan GAM QA evolución.')
      }, { transaction: t });
      contador.planes++;

      const det1 = await PlanDetalle.create({
        id_plan: plan.id_plan,
        id_medicamento: medicamentos[0].id_medicamento,
        dosis: '850 mg',
        frecuencia: 'Cada 12 horas',
        horario: '08:00, 20:00',
        via_administracion: 'Oral',
        observaciones: EncryptionService.encryptField('Con alimentos')
      }, { transaction: t });
      const det2 = await PlanDetalle.create({
        id_plan: plan.id_plan,
        id_medicamento: medicamentos[1 % medicamentos.length].id_medicamento,
        dosis: '50 mg',
        frecuencia: 'Una vez al día',
        horario: '08:00',
        via_administracion: 'Oral',
        observaciones: null
      }, { transaction: t });
      contador.detalles += 2;

      for (let d = 0; d < 30; d++) {
        const ft = addDays(hoy, -d);
        await MedicamentoToma.create({
          id_plan_medicacion: plan.id_plan,
          id_plan_detalle: det1.id_detalle,
          fecha_toma: ft,
          hora_toma: '08:10',
          confirmado_por: 'Paciente'
        }, { transaction: t });
        await MedicamentoToma.create({
          id_plan_medicacion: plan.id_plan,
          id_plan_detalle: det2.id_detalle,
          fecha_toma: ft,
          hora_toma: '08:05',
          confirmado_por: 'Paciente'
        }, { transaction: t });
        contador.otros += 2;
      }

      if (medicamentos.length >= 3) {
        await PlanMedicacion.create({
          id_paciente: paciente.id_paciente,
          id_doctor: doctor.id_doctor,
          fecha_inicio: dateStr(addMonths(hoy, -6)),
          activo: true,
          observaciones: EncryptionService.encryptField('Plan complementario hipolipemiante.')
        }, { transaction: t });
        contador.planes++;
      }
    }

    // ——— Comorbilidades del paciente ———
    if (comorbilidades.length > 0) {
      for (let i = 0; i < Math.min(3, comorbilidades.length); i++) {
        const [row] = await PacienteComorbilidad.findOrCreate({
          where: {
            id_paciente: paciente.id_paciente,
            id_comorbilidad: comorbilidades[i].id_comorbilidad
          },
          defaults: {
            fecha_deteccion: dateStr(addMonths(hoy, -36 + i * 6)),
            observaciones: EncryptionService.encryptField('Diagnóstico basal GAM — seguimiento QA.'),
            anos_padecimiento: 5 + i,
            es_diagnostico_basal: i === 0,
            es_agregado_posterior: i > 0,
            año_diagnostico: 2018 + i,
            recibe_tratamiento_farmacologico: true,
            recibe_tratamiento_no_farmacologico: true
          },
          transaction: t
        });
        if (row) contador.otros++;
      }
    }

    // ——— Red de apoyo ———
    const contactos = [
      ['María QA López', 'Esposa', '3399112233'],
      ['Carlos QA Hernández', 'Hermano', '3399223344'],
      ['Ana QA Martínez', 'Hija', '3399334455']
    ];
    for (const [nombre, parentesco, tel] of contactos) {
      const existe = await RedApoyo.findOne({
        where: { id_paciente: paciente.id_paciente, nombre_contacto: nombre },
        transaction: t
      });
      if (!existe) {
        await RedApoyo.create({
          id_paciente: paciente.id_paciente,
          nombre_contacto: nombre,
          numero_celular: EncryptionService.encryptField(tel),
          parentesco,
          localidad: 'Guadalajara'
        }, { transaction: t });
        contador.otros++;
      }
    }

    // ——— Detecciones, sesiones, salud bucal, TB ———
    if (comorbilidades.length > 0) {
      for (let i = 0; i < Math.min(5, citasAtendidas.length); i++) {
        await DeteccionComplicacion.create({
          id_paciente: paciente.id_paciente,
          id_cita: citasAtendidas[i].id_cita,
          id_doctor: doctor.id_doctor,
          id_comorbilidad: comorbilidades[0].id_comorbilidad,
          fecha_deteccion: dateStr(citasAtendidas[i].fecha_cita),
          tipo_complicacion: ['Control glucémico', 'Evaluación cardiovascular', 'Pie diabético', 'Retinopatía', 'Función renal'][i],
          observaciones: 'Detección protocolo GAM — datos QA evolución.',
          registrado_por: 'doctor'
        }, { transaction: t });
        contador.otros++;
      }
    }

    const tiposSesion = ['medico_preventiva', 'nutricional', 'actividad_fisica', 'psicologica', 'odontologica'];
    for (let i = 0; i < 8; i++) {
      await SesionEducativa.create({
        id_paciente: paciente.id_paciente,
        id_cita: citasAtendidas[i % citasAtendidas.length]?.id_cita ?? null,
        fecha_sesion: dateStr(addMonths(inicioHistorico, 3 + i * 4)),
        asistio: true,
        tipo_sesion: tiposSesion[i % tiposSesion.length],
        numero_intervenciones: 1 + (i % 2),
        observaciones: 'Sesión educativa GAM — autocuidado diabetes.'
      }, { transaction: t });
      contador.otros++;
    }

    for (let i = 0; i < Math.min(6, citasAtendidas.length); i++) {
      await SaludBucal.create({
        id_paciente: paciente.id_paciente,
        id_cita: citasAtendidas[i].id_cita,
        fecha_registro: dateStr(citasAtendidas[i].fecha_cita),
        presenta_enfermedades_odontologicas: i % 2 === 1,
        recibio_tratamiento_odontologico: i % 3 === 0,
        observaciones: i % 2 === 1 ? 'Caries tratada. Control semestral.' : 'Sin hallazgos relevantes.'
      }, { transaction: t });
      contador.otros++;
    }

    for (let i = 0; i < 4; i++) {
      await DeteccionTuberculosis.create({
        id_paciente: paciente.id_paciente,
        id_cita: citasAtendidas[i]?.id_cita ?? null,
        fecha_deteccion: dateStr(addMonths(inicioHistorico, 6 + i * 8)),
        aplicacion_encuesta: true,
        baciloscopia_realizada: i % 2 === 0,
        baciloscopia_resultado: 'negativo',
        ingreso_tratamiento: false,
        observaciones: 'TB negativa — cribado anual QA.'
      }, { transaction: t });
      contador.otros++;
    }

    if (vacunas.length > 0) {
      for (let i = 0; i < Math.min(vacunas.length, 4); i++) {
        await EsquemaVacunacion.create({
          id_paciente: paciente.id_paciente,
          vacuna: vacunas[i].nombre_vacuna,
          fecha_aplicacion: dateStr(addMonths(hoy, -24 + i * 6)),
          lote: `LOT-QA-${2024 + i}`,
          observaciones: EncryptionService.encryptField('Vacunación registrada — QA expediente completo.')
        }, { transaction: t });
        contador.otros++;
      }
    }

    await t.commit();

    const total =
      contador.citas +
      contador.signosConCita +
      contador.signosSinCita +
      contador.diagnosticos +
      contador.planes +
      contador.detalles +
      contador.otros;

    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('QA PACIENTE — datos de evolución añadidos');
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info(`  Citas nuevas:              ${contador.citas}`);
    logger.info(`  Signos vitales (cita):     ${contador.signosConCita}`);
    logger.info(`  Monitoreo continuo:        ${contador.signosSinCita}`);
    logger.info(`  Diagnósticos:              ${contador.diagnosticos}`);
    logger.info(`  Planes / detalles:         ${contador.planes} / ${contador.detalles}`);
    logger.info(`  Otros módulos:             ${contador.otros}`);
    logger.info(`  TOTAL registros nuevos:    ${total}`);
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('Recarga el detalle del paciente para ver gráficos de evolución (2022–2026).');
  } catch (err) {
    if (t) await t.rollback();
    logger.error('Error:', err?.message || err);
    if (err?.stack) console.error(err.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
