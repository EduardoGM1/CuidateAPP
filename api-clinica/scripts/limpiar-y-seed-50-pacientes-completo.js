/**
 * Limpia todos los datos de la BD e inserta seed completo:
 * - 1 administrador, 3 doctores, 50 pacientes
 * - Datos en todas las tablas del modelo entidad-relación
 *
 * Ejecutar: node scripts/limpiar-y-seed-50-pacientes-completo.js
 * Puede tardar 2-5 minutos según la BD.
 */

import sequelize from '../config/db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import EncryptionService from '../services/encryptionService.js';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import {
  Usuario,
  Modulo,
  Comorbilidad,
  Medicamento,
  Vacuna,
  Paciente,
  Doctor,
  DoctorPaciente,
  PacienteComorbilidad,
  Cita,
  SignoVital,
  Diagnostico,
  PlanMedicacion,
  PlanDetalle,
  MedicamentoToma,
  RedApoyo,
  MensajeChat,
  NotificacionDoctor,
  EsquemaVacunacion,
  PuntoChequeo,
  SolicitudReprogramacion,
  SistemaAuditoria,
  DeteccionComplicacion,
  SesionEducativa,
  SaludBucal,
  DeteccionTuberculosis,
  AuthCredential,
  PasswordResetToken
} from '../models/associations.js';

const NOMBRES = ['María', 'José', 'Ana', 'Carlos', 'Laura', 'Miguel', 'Carmen', 'Juan', 'Patricia', 'Roberto', 'Guadalupe', 'Francisco', 'Rosa', 'Antonio', 'Martha', 'Pedro', 'Sofía', 'Luis', 'Elena', 'Fernando', 'Alejandra', 'Ricardo', 'Gabriela', 'Javier', 'Diana', 'Manuel', 'Claudia', 'Alejandro', 'Verónica', 'Daniel', 'Adriana', 'Eduardo', 'Lucía', 'Andrés', 'Paola', 'Sergio', 'Natalia', 'Raúl', 'Mariana', 'Diego', 'Valeria', 'Óscar', 'Andrea', 'Arturo', 'Isabel', 'Héctor', 'Monica', 'Gustavo', 'Teresa', 'Rodrigo'];
const APELLIDOS = ['García', 'Rodríguez', 'López', 'Martínez', 'González', 'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Cruz', 'Morales', 'Ortiz', 'Gutiérrez', 'Chávez', 'Ramos', 'Herrera', 'Jiménez', 'Ruiz', 'Mendoza', 'Aguilar', 'Vargas', 'Castro', 'Romero', 'Moreno', 'Delgado', 'Hernández'];

const MEDICAMENTOS = [
  { nombre_medicamento: 'Metformina 500mg', descripcion: 'Antidiabético oral' },
  { nombre_medicamento: 'Losartán 50mg', descripcion: 'Antihipertensivo' },
  { nombre_medicamento: 'Atorvastatina 20mg', descripcion: 'Hipolipemiante' },
  { nombre_medicamento: 'Ácido Acetilsalicílico 100mg', descripcion: 'Antiagregante' },
  { nombre_medicamento: 'Enalapril 10mg', descripcion: 'Antihipertensivo' }
];

const VACUNAS = [
  { nombre_vacuna: 'Influenza', descripcion: 'Gripe estacional', tipo: 'Viral' },
  { nombre_vacuna: 'COVID-19 (mRNA)', descripcion: 'COVID-19', tipo: 'Viral' },
  { nombre_vacuna: 'Hepatitis B', descripcion: 'Hepatitis B', tipo: 'Viral' }
];

const COMORBILIDADES = [
  { nombre_comorbilidad: 'Diabetes', descripcion: 'Diabetes mellitus' },
  { nombre_comorbilidad: 'Hipertensión', descripcion: 'Hipertensión arterial' },
  { nombre_comorbilidad: 'Obesidad', descripcion: 'Obesidad' },
  { nombre_comorbilidad: 'Dislipidemia', descripcion: 'Alteración de lípidos' }
];

const MODULOS = [
  { nombre_modulo: 'Módulo 1' },
  { nombre_modulo: 'Módulo 2' }
];

function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function tel() { return `555${String(1000 + Math.floor(Math.random() * 9000))}${String(1000 + Math.floor(Math.random() * 9000))}`; }
function curp() { return Array(18).fill(0).map(() => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]).join(''); }
function fechaNac() {
  const y = 1950 + Math.floor(Math.random() * 55);
  const m = 1 + Math.floor(Math.random() * 12);
  const d = 1 + Math.floor(Math.random() * 28);
  return new Date(y, m - 1, d);
}

async function run() {
  let t;
  try {
    t = await sequelize.transaction();
    await sequelize.authenticate();
    logger.info('Conectado a la BD. Borrando datos en orden (respetando FKs)...');

    await MedicamentoToma.destroy({ where: {}, force: true, transaction: t });
    await PlanDetalle.destroy({ where: {}, force: true, transaction: t });
    await Diagnostico.destroy({ where: {}, force: true, transaction: t });
    await SignoVital.destroy({ where: {}, force: true, transaction: t });
    await SolicitudReprogramacion.destroy({ where: {}, force: true, transaction: t });
    await NotificacionDoctor.destroy({ where: {}, force: true, transaction: t });
    await MensajeChat.destroy({ where: {}, force: true, transaction: t });
    await DeteccionComplicacion.destroy({ where: {}, force: true, transaction: t });
    await SesionEducativa.destroy({ where: {}, force: true, transaction: t });
    await SaludBucal.destroy({ where: {}, force: true, transaction: t });
    await DeteccionTuberculosis.destroy({ where: {}, force: true, transaction: t });
    await PuntoChequeo.destroy({ where: {}, force: true, transaction: t });
    await EsquemaVacunacion.destroy({ where: {}, force: true, transaction: t });
    await RedApoyo.destroy({ where: {}, force: true, transaction: t });
    await Cita.destroy({ where: {}, force: true, transaction: t });
    await PlanMedicacion.destroy({ where: {}, force: true, transaction: t });
    await SistemaAuditoria.destroy({ where: {}, force: true, transaction: t });
    await AuthCredential.destroy({ where: {}, force: true, transaction: t });
    await PasswordResetToken.destroy({ where: {}, force: true, transaction: t });
    await PacienteComorbilidad.destroy({ where: {}, force: true, transaction: t });
    await DoctorPaciente.destroy({ where: {}, force: true, transaction: t });
    await Paciente.destroy({ where: {}, force: true, transaction: t });
    await Doctor.destroy({ where: {}, force: true, transaction: t });
    await Usuario.destroy({ where: {}, force: true, transaction: t });

    logger.info('Datos borrados. Insertando catálogos...');

    for (const m of MODULOS) {
      await Modulo.findOrCreate({ where: { nombre_modulo: m.nombre_modulo }, defaults: m, transaction: t });
    }
    for (const c of COMORBILIDADES) {
      await Comorbilidad.findOrCreate({ where: { nombre_comorbilidad: c.nombre_comorbilidad }, defaults: c, transaction: t });
    }
    for (const m of MEDICAMENTOS) {
      await Medicamento.findOrCreate({ where: { nombre_medicamento: m.nombre_medicamento }, defaults: m, transaction: t });
    }
    for (const v of VACUNAS) {
      await Vacuna.findOrCreate({ where: { nombre_vacuna: v.nombre_vacuna }, defaults: v, transaction: t });
    }

    const [modulo] = await Modulo.findAll({ limit: 1, transaction: t });
    const modulos = await Modulo.findAll({ transaction: t });
    const comorbilidades = await Comorbilidad.findAll({ transaction: t });
    const medicamentos = await Medicamento.findAll({ transaction: t });
    const vacunas = await Vacuna.findAll({ transaction: t });
    const idModulo = modulo?.id_modulo ?? 1;

    logger.info('Creando 1 administrador, 3 doctores, 50 pacientes...');

    const adminHash = await bcrypt.hash('Admin123!', 10);
    const admin = await Usuario.create({
      email: 'admin@clinica.com',
      password_hash: adminHash,
      rol: 'Admin',
      activo: true
    }, { transaction: t });
    await AuthCredential.create({
      user_type: 'Usuario',
      user_id: admin.id_usuario,
      auth_method: 'password',
      credential_value: adminHash,
      device_id: 'admin-web',
      is_primary: true,
      activo: true
    }, { transaction: t });

    const doctores = [];
    for (let i = 0; i < 3; i++) {
      const email = `doctor${i + 1}@clinica.com`;
      const hash = await bcrypt.hash('Doctor123!', 10);
      const u = await Usuario.create({ email, password_hash: hash, rol: 'Doctor', activo: true }, { transaction: t });
      const d = await Doctor.create({
        id_usuario: u.id_usuario,
        nombre: NOMBRES[i],
        apellido_paterno: APELLIDOS[i],
        apellido_materno: APELLIDOS[i + 1],
        telefono: tel(),
        institucion_hospitalaria: 'IMSS',
        grado_estudio: ['Medicina General', 'Cardiología', 'Medicina Interna'][i],
        id_modulo: idModulo,
        activo: true
      }, { transaction: t });
      doctores.push(d);
      await AuthCredential.create({
        user_type: 'Doctor',
        user_id: d.id_doctor,
        auth_method: 'password',
        credential_value: hash,
        device_id: `doctor-${d.id_doctor}`,
        is_primary: true,
        activo: true
      }, { transaction: t });
    }

    const pacientes = [];
    const TOTAL_PACIENTES = 50;
    for (let i = 0; i < TOTAL_PACIENTES; i++) {
      const nombre = NOMBRES[i % NOMBRES.length];
      const ap = APELLIDOS[i % APELLIDOS.length];
      const am = APELLIDOS[(i + 1) % APELLIDOS.length];
      const fn = fechaNac();
      const sexo = i % 2 === 0 ? 'Hombre' : 'Mujer';
      const email = `paciente${i + 1}@test.com`;
      const hash = await bcrypt.hash('Paciente123!', 10);
      const u = await Usuario.create({ email, password_hash: hash, rol: 'Paciente', activo: true }, { transaction: t });
      const cel = tel();
      const dir = `Calle ${i + 1}, Col. Centro`;
      const p = await Paciente.create({
        id_usuario: u.id_usuario,
        nombre,
        apellido_paterno: ap,
        apellido_materno: am,
        fecha_nacimiento: EncryptionService.encryptField(fn.toISOString().split('T')[0]),
        curp: EncryptionService.encryptField(curp()),
        numero_celular: EncryptionService.encryptField(cel),
        direccion: EncryptionService.encryptField(dir),
        estado: 'Ciudad de México',
        localidad: 'Benito Juárez',
        institucion_salud: rnd(['IMSS', 'ISSSTE', 'Bienestar', 'Particular']),
        sexo,
        id_modulo: idModulo,
        activo: true
      }, { transaction: t });
      pacientes.push(p);
      const doctor = doctores[i % 3];
      await DoctorPaciente.create({ id_doctor: doctor.id_doctor, id_paciente: p.id_paciente, fecha_asignacion: new Date() }, { transaction: t });
      const pin = String(2000 + i).padStart(4, '0');
      await AuthCredential.create({
        user_type: 'Paciente',
        user_id: p.id_paciente,
        auth_method: 'pin',
        credential_value: await bcrypt.hash(pin, 10),
        device_id: `p-${p.id_paciente}`,
        is_primary: true,
        activo: true
      }, { transaction: t });
      const nCom = 1 + Math.floor(Math.random() * 2);
      for (let k = 0; k < nCom; k++) {
        const com = comorbilidades[k % comorbilidades.length];
        await PacienteComorbilidad.findOrCreate({
          where: { id_paciente: p.id_paciente, id_comorbilidad: com.id_comorbilidad },
          defaults: { observaciones: null },
          transaction: t
        });
      }
    }

    logger.info('Creando citas, signos vitales, diagnósticos, planes de medicación...');

    const hoy = new Date();
    for (let i = 0; i < pacientes.length; i++) {
      const p = pacientes[i];
      const doc = doctores[i % 3];
      const numCitas = 2 + Math.floor(Math.random() * 3);
      for (let j = 0; j < numCitas; j++) {
        const fc = new Date(hoy);
        fc.setDate(fc.getDate() - Math.floor(Math.random() * 90));
        fc.setHours(8 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 4) * 15, 0, 0);
        const estados = ['pendiente', 'atendida', 'atendida', 'no_asistida', 'cancelada'];
        const estado = rnd(estados);
        const cita = await Cita.create({
          id_paciente: p.id_paciente,
          id_doctor: doc.id_doctor,
          fecha_cita: fc,
          estado,
          asistencia: estado === 'atendida',
          es_primera_consulta: j === 0,
          motivo: EncryptionService.encryptField('Consulta de control'),
          observaciones: EncryptionService.encryptField('Paciente estable'),
          fecha_creacion: fc
        }, { transaction: t });

        if (estado === 'atendida') {
          await SignoVital.create({
            id_paciente: p.id_paciente,
            id_cita: cita.id_cita,
            fecha_medicion: fc,
            peso_kg: 55 + Math.random() * 35,
            talla_m: 1.5 + Math.random() * 0.4,
            imc: 22 + Math.random() * 8,
            presion_sistolica: EncryptionService.encryptField(String(100 + Math.floor(Math.random() * 30))),
            presion_diastolica: EncryptionService.encryptField(String(60 + Math.floor(Math.random() * 20))),
            glucosa_mg_dl: EncryptionService.encryptField(String(80 + Math.floor(Math.random() * 30))),
            registrado_por: 'doctor'
          }, { transaction: t });
          await Diagnostico.create({
            id_cita: cita.id_cita,
            descripcion: EncryptionService.encryptField('Control de enfermedad crónica'),
            fecha_registro: fc
          }, { transaction: t });
        }

        await PuntoChequeo.create({
          id_paciente: p.id_paciente,
          id_cita: cita.id_cita,
          asistencia: estado === 'atendida',
          fecha_registro: fc
        }, { transaction: t });
      }
    }

    for (let i = 0; i < Math.min(30, pacientes.length); i++) {
      const p = pacientes[i];
      const doc = doctores[i % 3];
      const plan = await PlanMedicacion.create({
        id_paciente: p.id_paciente,
        id_doctor: doc.id_doctor,
        fecha_inicio: new Date().toISOString().slice(0, 10),
        activo: true,
        observaciones: EncryptionService.encryptField('Tomar con alimentos')
      }, { transaction: t });
      const med = medicamentos[i % medicamentos.length];
      const det = await PlanDetalle.create({
        id_plan: plan.id_plan,
        id_medicamento: med.id_medicamento,
        dosis: '1 tableta',
        frecuencia: 'Cada 12 horas',
        horario: '08:00, 20:00',
        via_administracion: 'Oral',
        observaciones: EncryptionService.encryptField('En ayunas')
      }, { transaction: t });
      await MedicamentoToma.create({
        id_plan_medicacion: plan.id_plan,
        id_plan_detalle: det.id_detalle,
        fecha_toma: new Date(),
        confirmado_por: 'Paciente'
      }, { transaction: t });
    }

    for (let i = 0; i < Math.min(25, pacientes.length); i++) {
      await RedApoyo.create({
        id_paciente: pacientes[i].id_paciente,
        nombre_contacto: `Familiar ${i + 1}`,
        numero_celular: EncryptionService.encryptField(tel()),
        parentesco: rnd(['Cónyuge', 'Hijo(a)', 'Hermano(a)', 'Padre', 'Madre'])
      }, { transaction: t });
    }

    const doc0 = doctores[0];
    const p0 = pacientes[0];
    const msg = await MensajeChat.create({
      id_doctor: doc0.id_doctor,
      id_paciente: p0.id_paciente,
      mensaje_texto: 'Mensaje de prueba desde seed',
      remitente: 'doctor',
      leido: false,
      fecha_envio: new Date()
    }, { transaction: t });
    await NotificacionDoctor.create({
      id_doctor: doc0.id_doctor,
      id_paciente: p0.id_paciente,
      id_mensaje: msg.id_mensaje,
      tipo: 'nuevo_mensaje',
      titulo: 'Nuevo mensaje',
      mensaje: 'Tienes un mensaje nuevo',
      estado: 'enviada',
      fecha_envio: new Date()
    }, { transaction: t });

    for (let i = 0; i < Math.min(20, pacientes.length); i++) {
      const p = pacientes[i];
      const vac = vacunas[i % vacunas.length];
      await EsquemaVacunacion.create({
        id_paciente: p.id_paciente,
        vacuna: vac.nombre_vacuna,
        fecha_aplicacion: new Date().toISOString().slice(0, 10),
        lote: `LOT-${1000 + i}`,
        observaciones: EncryptionService.encryptField('Aplicación correcta')
      }, { transaction: t });
    }

    const cita1 = await Cita.findOne({ where: { estado: 'pendiente' }, transaction: t });
    if (cita1) {
      await SolicitudReprogramacion.create({
        id_cita: cita1.id_cita,
        id_paciente: cita1.id_paciente,
        motivo: 'Motivo de prueba',
        estado: 'pendiente'
      }, { transaction: t });
    }

    await SistemaAuditoria.create({
      id_usuario: admin.id_usuario,
      tipo_accion: 'sistema_automatico',
      entidad_afectada: 'sistema',
      descripcion: 'Seed completo ejecutado: limpiar-y-seed-50-pacientes-completo',
      datos_nuevos: { script: 'limpiar-y-seed-50-pacientes-completo' },
      ip_address: '127.0.0.1'
    }, { transaction: t });

    const pDet = pacientes[0];
    const citaDet = await Cita.findOne({ where: { id_paciente: pDet.id_paciente }, transaction: t });
    const hoyStr = new Date().toISOString().slice(0, 10);
    if (citaDet) {
      await DeteccionComplicacion.create({
        id_paciente: pDet.id_paciente,
        id_cita: citaDet.id_cita,
        id_doctor: doctores[0].id_doctor,
        id_comorbilidad: comorbilidades[0].id_comorbilidad,
        fecha_deteccion: hoyStr,
        tipo_complicacion: 'Control glucémico',
        observaciones: 'Seguimiento recomendado',
        registrado_por: 'doctor'
      }, { transaction: t });
      await SesionEducativa.create({
        id_paciente: pDet.id_paciente,
        id_cita: citaDet.id_cita,
        fecha_sesion: hoyStr,
        asistio: true,
        tipo_sesion: 'medico_preventiva',
        numero_intervenciones: 1,
        observaciones: 'Sesión completada'
      }, { transaction: t });
      await SaludBucal.create({
        id_paciente: pDet.id_paciente,
        id_cita: citaDet.id_cita,
        fecha_registro: hoyStr,
        presenta_enfermedades_odontologicas: false,
        recibio_tratamiento_odontologico: false,
        observaciones: 'Sin caries'
      }, { transaction: t });
      await DeteccionTuberculosis.create({
        id_paciente: pDet.id_paciente,
        id_cita: citaDet.id_cita,
        fecha_deteccion: hoyStr,
        aplicacion_encuesta: true,
        baciloscopia_realizada: true,
        baciloscopia_resultado: 'negativo',
        ingreso_tratamiento: false,
        observaciones: 'Sin hallazgos'
      }, { transaction: t });
    }

    await t.commit();
    logger.info('\n=== SEED COMPLETADO ===');
    logger.info('Admin: admin@clinica.com / Admin123!');
    logger.info('Doctores: doctor1@clinica.com, doctor2@clinica.com, doctor3@clinica.com / Doctor123!');
    logger.info('Pacientes: 50 (paciente1@test.com ... paciente50@test.com / Paciente123!)');
    logger.info('PINs pacientes: 2000 a 2049');
    logger.info('Tablas con datos: modulos, comorbilidades, medicamentos, vacunas, usuarios, doctores, pacientes, doctor_paciente, paciente_comorbilidad, citas, signos_vitales, diagnosticos, planes_medicacion, plan_detalle, medicamento_toma, red_apoyo, mensajes_chat, notificaciones_doctor, esquema_vacunacion, puntos_chequeo, solicitudes_reprogramacion, sistema_auditoria, deteccion_complicaciones, sesiones_educativas, salud_bucal, deteccion_tuberculosis, auth_credentials.');
  } catch (err) {
    if (t) await t.rollback();
    console.error('Error en seed:', err?.message || err);
    if (err?.stack) console.error(err.stack);
    logger.error('Error en seed:', err?.message || err);
    throw err;
  } finally {
    await sequelize.close();
  }
}

run()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
