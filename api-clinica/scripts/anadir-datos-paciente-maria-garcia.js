/**
 * Añade datos completos a la paciente María García Rodríguez:
 * citas (pasadas y futuras), monitoreo continuo (signos vitales), medicamentos,
 * registro de tomas, complicaciones, sesiones educativas, salud bucal,
 * detección tuberculosis, red de apoyo, vacunación, solicitudes, etc.
 *
 * Ejecutar: node scripts/anadir-datos-paciente-maria-garcia.js
 */

import sequelize from '../config/db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Op } from 'sequelize';
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
  SolicitudReprogramacion,
  DeteccionComplicacion,
  SesionEducativa,
  SaludBucal,
  DeteccionTuberculosis,
  EsquemaVacunacion,
  MensajeChat,
  NotificacionDoctor
} from '../models/associations.js';

const NOMBRE_PACIENTE = 'María';
const APELLIDO_PATERNO = 'García';
const APELLIDO_MATERNO = 'Rodríguez';

function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function addMonths(d, n) { const r = new Date(d); r.setMonth(r.getMonth() + n); return r; }
function dateStr(d) { return d.toISOString().slice(0, 10); }

async function run() {
  let t;
  try {
    await sequelize.authenticate();

    const paciente = await Paciente.findOne({
      where: {
        nombre: NOMBRE_PACIENTE,
        apellido_paterno: APELLIDO_PATERNO,
        apellido_materno: APELLIDO_MATERNO
      }
    });

    if (!paciente) {
      logger.error('No se encontró a la paciente María García Rodríguez. Ejecuta primero el seed o crea la paciente.');
      process.exit(1);
    }

    const asignacion = await DoctorPaciente.findOne({ where: { id_paciente: paciente.id_paciente } });
    if (!asignacion) {
      logger.error('La paciente no tiene doctor asignado. Asigna un doctor primero.');
      process.exit(1);
    }

    const doctor = await Doctor.findByPk(asignacion.id_doctor);
    if (!doctor) {
      logger.error('Doctor asignado no encontrado.');
      process.exit(1);
    }

    const [comorbilidades, medicamentos, vacunas] = await Promise.all([
      Comorbilidad.findAll(),
      Medicamento.findAll(),
      Vacuna.findAll()
    ]);

    if (!medicamentos.length || !comorbilidades.length) {
      logger.warn('Faltan catálogos (medicamentos/comorbilidades). Se usarán los que existan.');
    }

    t = await sequelize.transaction();
    const hoy = new Date();

    logger.info(`Añadiendo datos para ${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno} (id: ${paciente.id_paciente})`);

    // ---------- Citas: pasadas (atendidas y no) y futuras ----------
    const citasCreadas = [];
    const fechasPasadas = [
      addDays(hoy, -90), addDays(hoy, -60), addDays(hoy, -45), addDays(hoy, -30),
      addDays(hoy, -21), addDays(hoy, -14), addDays(hoy, -7), addDays(hoy, -3)
    ];
    const estadosPasados = ['atendida', 'atendida', 'atendida', 'no_asistida', 'atendida', 'atendida', 'atendida', 'pendiente'];
    for (let i = 0; i < fechasPasadas.length; i++) {
      const fc = new Date(fechasPasadas[i]);
      fc.setHours(9 + (i % 4), (i % 3) * 20, 0, 0);
      const estado = estadosPasados[i];
      const cita = await Cita.create({
        id_paciente: paciente.id_paciente,
        id_doctor: doctor.id_doctor,
        fecha_cita: fc,
        estado,
        asistencia: estado === 'atendida',
        es_primera_consulta: i === 0,
        motivo: EncryptionService.encryptField(i === 0 ? 'Primera consulta GAM' : 'Control de seguimiento'),
        observaciones: EncryptionService.encryptField(estado === 'atendida' ? 'Paciente estable. Continuar tratamiento.' : ''),
        fecha_creacion: fc
      }, { transaction: t });
      citasCreadas.push({ cita, estado });
    }
    // Citas futuras
    for (let i = 1; i <= 4; i++) {
      const fc = addDays(hoy, 7 * i);
      fc.setHours(10, 0, 0, 0);
      const cita = await Cita.create({
        id_paciente: paciente.id_paciente,
        id_doctor: doctor.id_doctor,
        fecha_cita: fc,
        estado: 'pendiente',
        asistencia: null,
        es_primera_consulta: false,
        motivo: EncryptionService.encryptField('Control programado'),
        observaciones: null,
        fecha_creacion: hoy
      }, { transaction: t });
      citasCreadas.push({ cita, estado: 'pendiente' });
    }

    // ---------- Signos vitales (monitoreo continuo): en citas atendidas y algunos sin cita ----------
    const citasAtendidas = citasCreadas.filter(x => x.estado === 'atendida').map(x => x.cita);
    for (let i = 0; i < citasAtendidas.length; i++) {
      const c = citasAtendidas[i];
      const f = new Date(c.fecha_cita);
      await SignoVital.create({
        id_paciente: paciente.id_paciente,
        id_cita: c.id_cita,
        fecha_medicion: f,
        peso_kg: 68 + (i * 0.3),
        talla_m: 1.62,
        imc: 25.5 + (i * 0.1),
        presion_sistolica: EncryptionService.encryptField(String(118 + i)),
        presion_diastolica: EncryptionService.encryptField(String(72 + (i % 3))),
        glucosa_mg_dl: EncryptionService.encryptField(String(95 + (i * 2))),
        registrado_por: 'doctor'
      }, { transaction: t });
    }
    // Monitoreo continuo sin cita (automonitoreo / registro en consultorio)
    for (let i = 0; i < 5; i++) {
      const fd = addDays(hoy, -14 + (i * 3));
      fd.setHours(8, 30, 0, 0);
      await SignoVital.create({
        id_paciente: paciente.id_paciente,
        id_cita: null,
        fecha_medicion: fd,
        peso_kg: 67.5 + (i * 0.2),
        presion_sistolica: EncryptionService.encryptField(String(115 + i)),
        presion_diastolica: EncryptionService.encryptField(String(74)),
        glucosa_mg_dl: EncryptionService.encryptField(String(92 + (i * 2))),
        registrado_por: i % 2 === 0 ? 'paciente' : 'doctor'
      }, { transaction: t });
    }

    // ---------- Diagnósticos en citas atendidas ----------
    for (const cita of citasAtendidas.slice(0, 5)) {
      await Diagnostico.create({
        id_cita: cita.id_cita,
        descripcion: EncryptionService.encryptField('Diabetes mellitus tipo 2 en control. Hipertensión en seguimiento.'),
        fecha_registro: cita.fecha_cita
      }, { transaction: t });
    }

    // ---------- Puntos de chequeo por cita ----------
    for (const { cita, estado } of citasCreadas) {
      await PuntoChequeo.create({
        id_paciente: paciente.id_paciente,
        id_cita: cita.id_cita,
        asistencia: estado === 'atendida',
        fecha_registro: cita.fecha_cita
      }, { transaction: t });
    }

    // ---------- Planes de medicación + detalle + registro de tomas ----------
    if (medicamentos.length >= 2) {
      const plan1 = await PlanMedicacion.create({
        id_paciente: paciente.id_paciente,
        id_doctor: doctor.id_doctor,
        id_cita: citasAtendidas.length ? citasAtendidas[0].id_cita : null,
        fecha_inicio: dateStr(addDays(hoy, -60)),
        activo: true,
        observaciones: EncryptionService.encryptField('Metformina y antihipertensivo. Tomar con alimentos.')
      }, { transaction: t });

      const det1 = await PlanDetalle.create({
        id_plan: plan1.id_plan,
        id_medicamento: medicamentos[0].id_medicamento,
        dosis: '1 tableta',
        frecuencia: 'Cada 12 horas',
        horario: '08:00, 20:00',
        via_administracion: 'Oral',
        observaciones: EncryptionService.encryptField('En ayunas')
      }, { transaction: t });
      const det2 = await PlanDetalle.create({
        id_plan: plan1.id_plan,
        id_medicamento: medicamentos[1].id_medicamento,
        dosis: '1 tableta',
        frecuencia: 'Una vez al día',
        horario: '08:00',
        via_administracion: 'Oral',
        observaciones: null
      }, { transaction: t });

      // Registro de tomas (últimos 14 días, varias por día)
      for (let d = 0; d < 14; d++) {
        const fechaToma = addDays(hoy, -d);
        await MedicamentoToma.create({
          id_plan_medicacion: plan1.id_plan,
          id_plan_detalle: det1.id_detalle,
          fecha_toma: fechaToma,
          hora_toma: '08:15',
          confirmado_por: 'Paciente'
        }, { transaction: t });
        if (d % 2 === 0) {
          await MedicamentoToma.create({
            id_plan_medicacion: plan1.id_plan,
            id_plan_detalle: det1.id_detalle,
            fecha_toma: fechaToma,
            hora_toma: '20:10',
            confirmado_por: 'Paciente'
          }, { transaction: t });
        }
        await MedicamentoToma.create({
          id_plan_medicacion: plan1.id_plan,
          id_plan_detalle: det2.id_detalle,
          fecha_toma: fechaToma,
          hora_toma: '08:05',
          confirmado_por: 'Paciente'
        }, { transaction: t });
      }

      if (medicamentos.length >= 3) {
        const plan2 = await PlanMedicacion.create({
          id_paciente: paciente.id_paciente,
          id_doctor: doctor.id_doctor,
          fecha_inicio: dateStr(addDays(hoy, -30)),
          activo: true,
          observaciones: EncryptionService.encryptField('Hipolipemiante agregado.')
        }, { transaction: t });
        const det3 = await PlanDetalle.create({
          id_plan: plan2.id_plan,
          id_medicamento: medicamentos[2].id_medicamento,
          dosis: '1 tableta',
          frecuencia: 'Una vez al día',
          horario: '22:00',
          via_administracion: 'Oral',
          observaciones: null
        }, { transaction: t });
        for (let d = 0; d < 7; d++) {
          await MedicamentoToma.create({
            id_plan_medicacion: plan2.id_plan,
            id_plan_detalle: det3.id_detalle,
            fecha_toma: addDays(hoy, -d),
            hora_toma: '22:00',
            confirmado_por: 'Paciente'
          }, { transaction: t });
        }
      }
    }

    // ---------- Red de apoyo ----------
    const parentescos = ['Cónyuge', 'Hija', 'Hermana'];
    const nombresContacto = ['Juan García López', 'Ana García Hernández', 'Roberto García'];
    for (let i = 0; i < 3; i++) {
      await RedApoyo.create({
        id_paciente: paciente.id_paciente,
        nombre_contacto: nombresContacto[i],
        numero_celular: EncryptionService.encryptField(`555123${1000 + i}${1000 + i}`),
        parentesco: parentescos[i],
        localidad: 'Ciudad de México'
      }, { transaction: t });
    }

    // ---------- Complicaciones (detección) ----------
    if (comorbilidades.length > 0) {
      for (let i = 0; i < 3; i++) {
        const citaRef = citasAtendidas[i];
        if (citaRef) {
          await DeteccionComplicacion.create({
            id_paciente: paciente.id_paciente,
            id_cita: citaRef.id_cita,
            id_doctor: doctor.id_doctor,
            id_comorbilidad: comorbilidades[0].id_comorbilidad,
            fecha_deteccion: dateStr(citaRef.fecha_cita),
            tipo_complicacion: i === 0 ? 'Control glucémico' : i === 1 ? 'Evaluación cardiovascular' : 'Pie diabético',
            observaciones: 'Seguimiento según protocolo GAM.',
            registrado_por: 'doctor'
          }, { transaction: t });
        }
      }
    }

    // ---------- Sesiones educativas ----------
    const tiposSesion = ['medico_preventiva', 'nutricional', 'actividad_fisica', 'psicologica'];
    for (let i = 0; i < 4; i++) {
      const citaRef = citasAtendidas[i];
      await SesionEducativa.create({
        id_paciente: paciente.id_paciente,
        id_cita: citaRef?.id_cita ?? null,
        fecha_sesion: dateStr(addDays(hoy, -30 + (i * 8))),
        asistio: true,
        tipo_sesion: tiposSesion[i],
        numero_intervenciones: 1,
        observaciones: 'Sesión de educación en diabetes y estilo de vida.'
      }, { transaction: t });
    }

    // ---------- Salud bucal ----------
    for (let i = 0; i < 3; i++) {
      const citaRef = citasAtendidas[i];
      if (citaRef) {
        await SaludBucal.create({
          id_paciente: paciente.id_paciente,
          id_cita: citaRef.id_cita,
          fecha_registro: dateStr(citaRef.fecha_cita),
          presenta_enfermedades_odontologicas: i === 1,
          recibio_tratamiento_odontologico: i === 1,
          observaciones: i === 1 ? 'Caries en pieza 36. Derivada a odontología.' : 'Sin hallazgos.'
        }, { transaction: t });
      }
    }

    // ---------- Detección tuberculosis ----------
    for (let i = 0; i < 2; i++) {
      const citaRef = citasAtendidas[i];
      if (citaRef) {
        await DeteccionTuberculosis.create({
          id_paciente: paciente.id_paciente,
          id_cita: citaRef.id_cita,
          fecha_deteccion: dateStr(citaRef.fecha_cita),
          aplicacion_encuesta: true,
          baciloscopia_realizada: i === 0,
          baciloscopia_resultado: 'negativo',
          ingreso_tratamiento: false,
          observaciones: 'Sin datos de TB. Encuesta negativa.'
        }, { transaction: t });
      }
    }

    // ---------- Esquema vacunación ----------
    if (vacunas.length >= 2) {
      for (let i = 0; i < vacunas.length; i++) {
        await EsquemaVacunacion.create({
          id_paciente: paciente.id_paciente,
          vacuna: vacunas[i].nombre_vacuna,
          fecha_aplicacion: dateStr(addDays(hoy, -180 + (i * 60))),
          lote: `LOT-MG-${2025 - i}`,
          observaciones: EncryptionService.encryptField('Aplicación en unidad de salud.')
        }, { transaction: t });
      }
    }

    // ---------- Solicitudes de reprogramación (sobre citas futuras) ----------
    const citasPendientes = citasCreadas.filter(x => x.estado === 'pendiente' && new Date(x.cita.fecha_cita) > hoy).map(x => x.cita);
    const primeraPendiente = citasPendientes[0];
    const segundaPendiente = citasPendientes[1];
    if (primeraPendiente) {
      await SolicitudReprogramacion.create({
        id_cita: primeraPendiente.id_cita,
        id_paciente: paciente.id_paciente,
        motivo: 'Conflictos de horario laboral. Solicito cambiar a la tarde.',
        fecha_solicitada: dateStr(addDays(primeraPendiente.fecha_cita, 1)),
        estado: 'pendiente'
      }, { transaction: t });
    }
    if (segundaPendiente) {
      await SolicitudReprogramacion.create({
        id_cita: segundaPendiente.id_cita,
        id_paciente: paciente.id_paciente,
        motivo: 'Preferencia de día.',
        estado: 'aprobada',
        respuesta_doctor: 'Reprogramada según solicitud.',
        fecha_respuesta: new Date()
      }, { transaction: t });
    }

    // ---------- Mensajes y notificaciones ----------
    const msg1 = await MensajeChat.create({
      id_doctor: doctor.id_doctor,
      id_paciente: paciente.id_paciente,
      mensaje_texto: 'Buenos días, recuerde tomar su medicación en horario. Cualquier duda estamos en contacto.',
      remitente: 'doctor',
      leido: false,
      fecha_envio: addDays(hoy, -2)
    }, { transaction: t });
    await NotificacionDoctor.create({
      id_doctor: doctor.id_doctor,
      id_paciente: paciente.id_paciente,
      id_mensaje: msg1.id_mensaje,
      tipo: 'nuevo_mensaje',
      titulo: 'Mensaje para paciente',
      mensaje: 'Tienes un mensaje en el chat.',
      estado: 'enviada',
      fecha_envio: msg1.fecha_envio
    }, { transaction: t });

    if (primeraPendiente) {
      await NotificacionDoctor.create({
        id_doctor: doctor.id_doctor,
        id_paciente: paciente.id_paciente,
        id_cita: primeraPendiente.id_cita,
        tipo: 'cita_actualizada',
        titulo: 'Cita próxima',
        mensaje: `Cita programada para ${new Date(primeraPendiente.fecha_cita).toLocaleDateString('es-MX')}.`,
        estado: 'enviada',
        fecha_envio: hoy
      }, { transaction: t });
    }

    await t.commit();
    logger.info('\n=== DATOS AÑADIDOS CORRECTAMENTE ===');
    logger.info(`Paciente: ${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno}`);
    logger.info('Citas: varias pasadas (atendidas/no asistida) + 4 futuras pendientes');
    logger.info('Signos vitales: en citas atendidas + 5 monitoreos continuos (sin cita)');
    logger.info('Planes de medicación: 2 planes con registro de tomas (últimos 14 y 7 días)');
    logger.info('Red de apoyo: 3 contactos | Complicaciones: 3 | Sesiones educativas: 4');
    logger.info('Salud bucal: 3 | Detección TB: 2 | Vacunación: según catálogo | Solicitudes: 2');
  } catch (err) {
    if (t) await t.rollback();
    console.error('Error:', err?.message || err);
    if (err?.stack) console.error(err.stack);
    logger.error('Error añadiendo datos:', err?.message || err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
