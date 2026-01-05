import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import sequelize from '../config/db.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';
import {
  Usuario,
  Paciente,
  Doctor,
  DoctorPaciente,
  Cita,
  SignoVital,
  EsquemaVacunacion,
  RedApoyo,
  PacienteComorbilidad,
  Comorbilidad,
  DeteccionComplicacion,
  AuthCredential
} from '../models/associations.js';

/**
 * Script:
 * - Mantiene al paciente con PIN 2020
 * - Elimina resto de pacientes y sus datos
 * - Genera 30 pacientes de prueba con: citas, monitoreo continuo (signos sin cita),
 *   medicamentos (no se crean planes complejos, solo estructura mínima),
 *   red de apoyo, esquema de vacunación, comorbilidades crónicas y complicaciones.
 */

const ESTADOS = [
  'Ciudad de México', 'Jalisco', 'Nuevo León', 'Puebla', 'Veracruz', 'Guanajuato',
  'Tabasco', 'Yucatán', 'Quintana Roo', 'Chiapas', 'Oaxaca', 'Michoacán'
];

const COMORBILIDADES_PRIORIDAD = [
  'Diabetes',
  'Hipertensión',
  'Obesidad',
  'Asma',
  'EPOC',
  'Enfermedad Cardiovascular',
  'Enfermedad Renal Crónica',
  'Dislipidemia',
  'Síndrome Metabólico'
];

const VACUNAS = ['Influenza', 'COVID-19', 'Neumococo', 'Tétanos'];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDateWithin(daysBack = 365) {
  const now = new Date();
  const past = new Date(now.getTime() - Math.random() * daysBack * 24 * 60 * 60 * 1000);
  return past;
}

function randomPhone() {
  return `55${Math.floor(10000000 + Math.random() * 89999999)}`;
}

function randomCURP(index) {
  const base = 'ABCDEFGHIJKLMNOPQRSTUVXYZ';
  const nums = '0123456789';
  const pick = (s, n) => Array.from({ length: n }).map(() => s[Math.floor(Math.random() * s.length)]).join('');
  return `${pick(base, 4)}${pick(nums, 6)}${pick(base + nums, 8)}${index % 10}`.slice(0, 18);
}

function randomSexo() {
  return Math.random() > 0.5 ? 'Hombre' : 'Mujer';
}

function randomInstitucion() {
  const opts = ['IMSS', 'Bienestar', 'ISSSTE', 'Particular', 'Otro'];
  return randomItem(opts);
}

async function findPacientePin2020(transaction) {
  const pin2020 = '2020';
  const allPinCredentials = await AuthCredential.findAll({
    where: {
      auth_method: 'pin',
      user_type: 'Paciente'
    },
    transaction
  });

  for (const cred of allPinCredentials) {
    try {
      const isValid = await bcrypt.compare(pin2020, cred.credential_value);
      if (isValid) {
        const paciente = await Paciente.findOne({
          where: { id_paciente: cred.user_id },
          transaction
        });
        if (paciente) return paciente;
      }
    } catch (_) {
      // continue
    }
  }
  return null;
}

async function main() {
  const transaction = await sequelize.transaction();

  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida');

    // 1) localizar paciente con PIN 2020
    const paciente2020 = await findPacientePin2020(transaction);
    if (!paciente2020) {
      throw new Error('No se encontró paciente con PIN 2020');
    }
    logger.info(`Paciente PIN 2020 preservado: ${paciente2020.nombre} (${paciente2020.id_paciente})`);

    // 2) localizar doctor principal
    const usuarioDoctor = await Usuario.findOne({
      where: { email: 'Doctor@clinica.com', rol: 'Doctor' },
      include: [{ model: Doctor, attributes: ['id_doctor'] }],
      transaction
    });
    if (!usuarioDoctor || !usuarioDoctor.Doctor) {
      throw new Error('No se encontró doctor con email Doctor@clinica.com');
    }
    const doctorId = usuarioDoctor.Doctor.id_doctor;
    logger.info(`Doctor asignado: ${doctorId}`);

    // 3) borrar pacientes (y datos) excepto PIN 2020
    const pacientesAEliminar = await Paciente.findAll({
      where: { id_paciente: { [Op.ne]: paciente2020.id_paciente } },
      attributes: ['id_paciente'],
      transaction
    });
    const idsEliminar = pacientesAEliminar.map(p => p.id_paciente);

    if (idsEliminar.length > 0) {
      logger.info(`Eliminando ${idsEliminar.length} pacientes (excepto 2020)`);

      // dependencias
      await DeteccionComplicacion.destroy({ where: { id_paciente: idsEliminar }, transaction });
      await PacienteComorbilidad.destroy({ where: { id_paciente: idsEliminar }, transaction });
      await EsquemaVacunacion.destroy({ where: { id_paciente: idsEliminar }, transaction });
      await RedApoyo.destroy({ where: { id_paciente: idsEliminar }, transaction });
      await SignoVital.destroy({ where: { id_paciente: idsEliminar }, transaction });
      await Cita.destroy({ where: { id_paciente: idsEliminar }, transaction });
      await DoctorPaciente.destroy({ where: { id_paciente: idsEliminar }, transaction });
      await Paciente.destroy({ where: { id_paciente: idsEliminar }, transaction });
    } else {
      logger.info('No hay pacientes adicionales para eliminar.');
    }

    // 4) comorbilidades disponibles
    const comorbilidadesBD = await Comorbilidad.findAll({ transaction });
    const mapComor = new Map(comorbilidadesBD.map(c => [c.nombre_comorbilidad, c.id_comorbilidad]));
    const comorDisponibles = COMORBILIDADES_PRIORIDAD.filter(n => mapComor.has(n));

    if (comorDisponibles.length === 0) {
      throw new Error('No hay comorbilidades crónicas disponibles en la BD');
    }

    // 5) crear 30 pacientes con datos
    const pacientesNuevos = [];
    for (let i = 0; i < 30; i++) {
      const nombre = `Paciente${i + 1}`;
      const apeP = `Prueba${i + 1}`;
      const apeM = `Demo${i + 1}`;
      const fechaNac = new Date();
      fechaNac.setFullYear(fechaNac.getFullYear() - (25 + (i % 25)));
      const estado = randomItem(ESTADOS);

      const paciente = await Paciente.create({
        nombre,
        apellido_paterno: apeP,
        apellido_materno: apeM,
        fecha_nacimiento: fechaNac.toISOString().split('T')[0],
        curp: randomCURP(i),
        institucion_salud: randomInstitucion(),
        sexo: randomSexo(),
        direccion: `Calle ${i + 1} #${100 + i}`,
        estado,
        localidad: `Localidad ${i % 5}`,
        numero_celular: randomPhone(),
        activo: true
      }, { transaction });

      pacientesNuevos.push(paciente);

      // asignación doctor-paciente
      await DoctorPaciente.create({
        id_doctor: doctorId,
        id_paciente: paciente.id_paciente,
        fecha_asignacion: new Date(),
        observaciones: 'Asignación automática datos de prueba'
      }, { transaction });

      // comorbilidades (2-3)
      const comorCount = 2 + (i % 2);
      for (let c = 0; c < comorCount; c++) {
        const nombreCom = comorDisponibles[(i + c) % comorDisponibles.length];
        await PacienteComorbilidad.create({
          id_paciente: paciente.id_paciente,
          id_comorbilidad: mapComor.get(nombreCom),
          fecha_deteccion: randomDateWithin(800).toISOString().split('T')[0],
          observaciones: 'Crónica controlada',
          anos_padecimiento: 1 + (i % 5)
        }, { transaction });
      }

      // vacuna
      await EsquemaVacunacion.create({
        id_paciente: paciente.id_paciente,
        vacuna: VACUNAS[i % VACUNAS.length],
        fecha_aplicacion: randomDateWithin(400).toISOString().split('T')[0],
        lote: `L-${1000 + i}`,
        observaciones: 'Dosis de refuerzo'
      }, { transaction });

      // red de apoyo
      await RedApoyo.create({
        id_paciente: paciente.id_paciente,
        nombre_contacto: `Contacto ${i + 1}`,
        numero_celular: randomPhone(),
        parentesco: 'Familiar',
        email: `contacto${i + 1}@correo.com`
      }, { transaction });

      // cita
      const fechaCita = randomDateWithin(120);
      await Cita.create({
        id_paciente: paciente.id_paciente,
        id_doctor: doctorId,
        fecha_cita: fechaCita,
        estado: 'pendiente',
        motivo: 'Control de seguimiento',
        es_primera_consulta: false
      }, { transaction });

      // signos vitales (monitoreo continuo sin cita)
      await SignoVital.create({
        id_paciente: paciente.id_paciente,
        id_cita: null,
        fecha_medicion: randomDateWithin(30),
        peso_kg: 60 + (i % 20),
        talla_m: 1.55 + (i % 6) * 0.01,
        imc: 24 + (i % 6) * 0.5,
        presion_sistolica: 110 + (i % 10),
        presion_diastolica: 70 + (i % 8),
        glucosa_mg_dl: 95 + (i % 15),
        colesterol_mg_dl: 180 + (i % 20),
        trigliceridos_mg_dl: 140 + (i % 25),
        registrado_por: 'doctor',
        observaciones: 'Monitoreo continuo'
      }, { transaction });

      // complicación / detección
      const comId = mapComor.get(comorDisponibles[i % comorDisponibles.length]);
      await DeteccionComplicacion.create({
        id_paciente: paciente.id_paciente,
        id_comorbilidad: comId,
        id_doctor: doctorId,
        exploracion_pies: i % 2 === 0,
        exploracion_fondo_ojo: i % 3 === 0,
        realiza_auto_monitoreo: true,
        auto_monitoreo_glucosa: true,
        auto_monitoreo_presion: i % 2 === 0,
        tipo_complicacion: 'Complicación crónica',
        fecha_deteccion: randomDateWithin(300).toISOString().split('T')[0],
        fecha_diagnostico: null,
        observaciones: 'Seguimiento automatizado',
        registrado_por: 'doctor'
      }, { transaction });
    }

    await transaction.commit();
    logger.info(`✅ Proceso completado. Pacientes nuevos: ${pacientesNuevos.length}. Paciente 2020 preservado.`);
  } catch (error) {
    await transaction.rollback();
    logger.error('❌ Error en el script:', error);
  } finally {
    await sequelize.close();
  }
}

main();

