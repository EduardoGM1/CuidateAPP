/**
 * Seed: completar pacientes actuales con datos completos y múltiples registros.
 * - Citas (varias por paciente, con estados variados)
 * - Signos vitales (asociados a citas y sueltos)
 * - Diagnósticos
 * - Monitoreo continuo (PuntoChequeo)
 * - Planes de medicación y detalles
 * - Red de apoyo
 * - Esquema de vacunación
 * - Complicaciones (DeteccionComplicacion)
 * - Comorbilidades crónicas (PacienteComorbilidad)
 * - Sesiones educativas
 * - Salud bucal
 * - Detección de tuberculosis
 *
 * Ejecutar desde raíz api-clinica: node scripts/seed-completar-pacientes-actuales.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import sequelize from '../config/db.js';
import {
  Paciente,
  Doctor,
  DoctorPaciente,
  Cita,
  SignoVital,
  Diagnostico,
  PlanMedicacion,
  PlanDetalle,
  RedApoyo,
  EsquemaVacunacion,
  PacienteComorbilidad,
  Comorbilidad,
  DeteccionComplicacion,
  SaludBucal,
  SesionEducativa,
  DeteccionTuberculosis,
  PuntoChequeo,
  Medicamento,
  Vacuna
} from '../models/associations.js';

const ESTADOS_CITA = ['pendiente', 'atendida', 'no_asistida', 'reprogramada', 'cancelada'];
const TIPOS_SESION = ['nutricional', 'actividad_fisica', 'medico_preventiva', 'trabajo_social', 'psicologica', 'odontologica'];
const RESULTADOS_BACILO = ['positivo', 'negativo', 'pendiente', 'no_aplicable'];
const PARENTESCOS = ['Cónyuge', 'Hijo(a)', 'Hermano(a)', 'Padre/Madre', 'Vecino(a)', 'Amigo(a)', 'Cuidador(a)'];

function addDays(d, days) {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

function dateOnly(d) {
  return d.toISOString().split('T')[0];
}

function pick(arr, index) {
  return arr[index % arr.length];
}

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida.\n');

    const pacientes = await Paciente.findAll({ where: { activo: true }, order: [['id_paciente', 'ASC']] });
    const doctores = await Doctor.findAll({ where: { activo: true }, order: [['id_doctor', 'ASC']] });
    const comorbilidades = await Comorbilidad.findAll({ order: [['id_comorbilidad', 'ASC']] });
    const medicamentos = await Medicamento.findAll({ order: [['id_medicamento', 'ASC']] });
    const vacunas = await Vacuna.findAll({ order: [['id_vacuna', 'ASC']] });

    if (pacientes.length === 0) {
      console.log('⚠️ No hay pacientes activos. Ejecuta primero un seed que cree pacientes.');
      await sequelize.close();
      process.exit(0);
      return;
    }
    if (doctores.length === 0) {
      console.log('⚠️ No hay doctores. El script creará citas sin doctor o fallará en planes/otros.');
    }

    console.log(`📋 Pacientes a completar: ${pacientes.length}`);
    console.log(`👨‍⚕️ Doctores: ${doctores.length}, Comorbilidades: ${comorbilidades.length}, Medicamentos: ${medicamentos.length}, Vacunas: ${vacunas.length}\n`);

    const hoy = new Date();
    hoy.setHours(12, 0, 0, 0);

    for (let pIdx = 0; pIdx < pacientes.length; pIdx++) {
      const paciente = pacientes[pIdx];
      const doctor = doctores[pIdx % doctores.length];
      const nombrePac = `${paciente.nombre} ${paciente.apellido_paterno}`;

      console.log(`\n👤 [${pIdx + 1}/${pacientes.length}] Paciente: ${nombrePac} (id=${paciente.id_paciente})`);

      if (doctor) {
        await DoctorPaciente.findOrCreate({
          where: { id_doctor: doctor.id_doctor, id_paciente: paciente.id_paciente },
          defaults: { id_doctor: doctor.id_doctor, id_paciente: paciente.id_paciente, fecha_asignacion: dateOnly(hoy) }
        });
      }

      // —— Citas (5–6 por paciente) ——
      const citasCreadas = [];
      for (let i = 0; i < 6; i++) {
        const fechaCita = addDays(hoy, -90 + i * 25 + (pIdx % 7));
        fechaCita.setHours(9 + (i % 4), 0, 0, 0);
        const estado = pick(ESTADOS_CITA, pIdx + i);
        const cita = await Cita.create({
          id_paciente: paciente.id_paciente,
          id_doctor: doctor?.id_doctor ?? null,
          fecha_cita: fechaCita,
          estado,
          motivo: `Consulta de seguimiento ${i + 1}. Control de patología crónica.`,
          es_primera_consulta: i === 0,
          observaciones: i % 2 === 0 ? 'Paciente colaborador. Cumple tratamiento.' : null,
          fecha_creacion: addDays(hoy, -80 + i * 20)
        });
        citasCreadas.push(cita);
      }
      console.log(`   📅 Citas: ${citasCreadas.length}`);

      // —— Signos vitales (por cita + 2 sueltos) ——
      for (let i = 0; i < citasCreadas.length; i++) {
        const cita = citasCreadas[i];
        const base = 65 + pIdx * 2 + i;
        await SignoVital.create({
          id_paciente: paciente.id_paciente,
          id_cita: cita.id_cita,
          fecha_medicion: cita.fecha_cita,
          peso_kg: base + (i % 3),
          talla_m: 1.6 + (pIdx % 10) * 0.01,
          imc: parseFloat(((base + i) / (1.6 * 1.6)).toFixed(2)),
          presion_sistolica: 118 + (i % 15),
          presion_diastolica: 72 + (i % 10),
          glucosa_mg_dl: 92 + (i % 20),
          colesterol_mg_dl: 175 + (i % 25),
          colesterol_ldl: 100 + (i % 20),
          colesterol_hdl: 48 + (i % 10),
          trigliceridos_mg_dl: 120 + (i % 40),
          hba1c_porcentaje: 6.2 + (i % 10) * 0.1,
          edad_paciente_en_medicion: 45 + (pIdx % 25),
          registrado_por: i % 2 === 0 ? 'doctor' : 'paciente',
          observaciones: 'Registro de control.',
          fecha_creacion: cita.fecha_cita
        });
        if (i % 2 === 0) {
          await SignoVital.create({
            id_paciente: paciente.id_paciente,
            id_cita: cita.id_cita,
            fecha_medicion: addDays(cita.fecha_cita, 1),
            peso_kg: base + 0.5,
            presion_sistolica: 120,
            presion_diastolica: 78,
            glucosa_mg_dl: 98,
            registrado_por: 'paciente',
            fecha_creacion: addDays(cita.fecha_cita, 1)
          });
        }
      }
      await SignoVital.create({
        id_paciente: paciente.id_paciente,
        id_cita: null,
        fecha_medicion: addDays(hoy, -15),
        peso_kg: 70 + pIdx,
        presion_sistolica: 122,
        presion_diastolica: 76,
        glucosa_mg_dl: 95,
        registrado_por: 'paciente',
        fecha_creacion: addDays(hoy, -15)
      });
      await SignoVital.create({
        id_paciente: paciente.id_paciente,
        id_cita: null,
        fecha_medicion: addDays(hoy, -5),
        peso_kg: 70 + pIdx + 0.3,
        presion_sistolica: 119,
        presion_diastolica: 77,
        registrado_por: 'paciente',
        fecha_creacion: addDays(hoy, -5)
      });
      console.log(`   ❤️ Signos vitales: ${citasCreadas.length * 2 + 2} aprox.`);

      // —— Diagnósticos (1–2 por cita + 1 sin cita) ——
      const descripciones = [
        'Control de diabetes tipo 2. Glucemias en rango.',
        'Hipertensión arterial en control con tratamiento.',
        'Dislipidemia. Seguimiento de perfil lipídico.',
        'Obesidad grado I. Educación nutricional y actividad física.',
        'Síndrome metabólico. Control integral.'
      ];
      for (let i = 0; i < citasCreadas.length; i++) {
        await Diagnostico.create({
          id_cita: citasCreadas[i].id_cita,
          descripcion: pick(descripciones, pIdx + i),
          fecha_registro: citasCreadas[i].fecha_cita
        });
        if (i % 2 === 1) {
          await Diagnostico.create({
            id_cita: citasCreadas[i].id_cita,
            descripcion: 'Hallazgo secundario: reflujo gastroesofágico. Medidas higiénico-dietéticas.',
            fecha_registro: citasCreadas[i].fecha_cita
          });
        }
      }
      await Diagnostico.create({
        id_cita: null,
        descripcion: 'Diagnóstico basal previo a primera consulta en unidad.',
        fecha_registro: addDays(hoy, -120)
      });
      console.log(`   📋 Diagnósticos: múltiples`);

      // —— Monitoreo continuo (PuntoChequeo) ——
      for (let i = 0; i < 4; i++) {
        const fechaReg = addDays(hoy, -60 + i * 18);
        await PuntoChequeo.create({
          id_paciente: paciente.id_paciente,
          id_cita: i < 2 ? citasCreadas[i].id_cita : null,
          asistencia: i !== 1,
          motivo_no_asistencia: i === 1 ? 'Trabajo' : null,
          observaciones: 'Punto de chequeo mensual.',
          fecha_registro: fechaReg
        });
      }
      console.log(`   📍 Puntos de chequeo: 4`);

      // —— Planes de medicación y detalles ——
      for (let planIdx = 0; planIdx < 2; planIdx++) {
        const citaRef = citasCreadas[planIdx * 2];
        const plan = await PlanMedicacion.create({
          id_paciente: paciente.id_paciente,
          id_doctor: doctor?.id_doctor ?? null,
          id_cita: citaRef?.id_cita ?? null,
          fecha_inicio: dateOnly(addDays(hoy, -60 - planIdx * 30)),
          fecha_fin: planIdx === 0 ? null : dateOnly(addDays(hoy, 30)),
          activo: planIdx === 0,
          observaciones: 'Plan de medicación crónica.',
          fecha_creacion: citaRef?.fecha_cita ?? hoy
        });
        const meds = [medicamentos[pIdx % medicamentos.length], medicamentos[(pIdx + 2) % medicamentos.length], medicamentos[(pIdx + 4) % medicamentos.length]].filter(Boolean);
        for (let m = 0; m < Math.min(3, meds.length); m++) {
          await PlanDetalle.create({
            id_plan: plan.id_plan,
            id_medicamento: meds[m].id_medicamento,
            dosis: m === 0 ? '1 tableta' : '1 tableta',
            frecuencia: m === 0 ? 'Cada 12 horas' : 'Una vez al día',
            horario: m === 0 ? '08:00 y 20:00' : '08:00',
            via_administracion: 'Oral',
            observaciones: 'Tomar con alimentos.'
          });
        }
      }
      console.log(`   💊 Planes medicación: 2 con detalles`);

      // —— Red de apoyo (3–4) ——
      for (let i = 0; i < 4; i++) {
        await RedApoyo.create({
          id_paciente: paciente.id_paciente,
          nombre_contacto: `Contacto ${nombrePac.split(' ')[0]} ${i + 1}`,
          numero_celular: `555${1000000 + pIdx * 1111 + i}`,
          parentesco: pick(PARENTESCOS, i + pIdx),
          localidad: paciente.localidad || 'Localidad',
          fecha_creacion: addDays(hoy, -200 + i * 30)
        });
      }
      console.log(`   🤝 Red de apoyo: 4`);

      // —— Esquema de vacunación (6–10) ——
      for (let i = 0; i < 8; i++) {
        const vac = pick(vacunas, i + pIdx);
        const fApl = addDays(hoy, -400 + i * 55);
        await EsquemaVacunacion.create({
          id_paciente: paciente.id_paciente,
          vacuna: vac.nombre_vacuna,
          fecha_aplicacion: dateOnly(fApl),
          lote: `LOT-${fApl.getFullYear()}${String((i % 12) + 1).padStart(2, '0')}`,
          observaciones: 'Aplicada en unidad de salud.',
          fecha_creacion: fApl
        });
      }
      console.log(`   💉 Esquema vacunación: 8`);

      // —— Comorbilidades crónicas (PacienteComorbilidad, 2–4 sin duplicar) ——
      const numCom = Math.min(4, comorbilidades.length);
      for (let k = 0; k < numCom; k++) {
        const com = comorbilidades[(pIdx + k) % comorbilidades.length];
        const exists = await PacienteComorbilidad.findOne({
          where: { id_paciente: paciente.id_paciente, id_comorbilidad: com.id_comorbilidad }
        });
        if (!exists) {
          await PacienteComorbilidad.create({
            id_paciente: paciente.id_paciente,
            id_comorbilidad: com.id_comorbilidad,
            fecha_deteccion: dateOnly(addDays(hoy, -365 * (k + 1))),
            anos_padecimiento: (k + 1) * 2,
            es_diagnostico_basal: k === 0,
            es_agregado_posterior: k > 0,
            recibe_tratamiento_farmacologico: true,
            recibe_tratamiento_no_farmacologico: k % 2 === 0,
            año_diagnostico: hoy.getFullYear() - (k + 2)
          });
        }
      }
      console.log(`   🏥 Comorbilidades paciente: hasta ${numCom}`);

      // —— Detección complicaciones (2–4) ——
      for (let i = 0; i < 3; i++) {
        const citaRef = citasCreadas[i];
        await DeteccionComplicacion.create({
          id_paciente: paciente.id_paciente,
          id_cita: citaRef.id_cita,
          id_doctor: doctor?.id_doctor ?? null,
          exploracion_pies: true,
          exploracion_fondo_ojo: i % 2 === 0,
          realiza_auto_monitoreo: true,
          microalbuminuria_realizada: i === 0,
          microalbuminuria_resultado: 12 + (i * 2),
          auto_monitoreo_glucosa: true,
          auto_monitoreo_presion: true,
          tipo_complicacion: i === 0 ? 'Ninguna detectada' : 'En seguimiento',
          fecha_deteccion: dateOnly(citaRef.fecha_cita),
          observaciones: 'Sin complicaciones mayores.',
          registrado_por: 'doctor',
          fue_referido: false,
          fecha_creacion: citaRef.fecha_cita
        });
      }
      console.log(`   🔍 Detección complicaciones: 3`);

      // —— Salud bucal (4–5) ——
      for (let i = 0; i < 5; i++) {
        const citaRef = i < 3 ? citasCreadas[i] : null;
        await SaludBucal.create({
          id_paciente: paciente.id_paciente,
          id_cita: citaRef?.id_cita ?? null,
          fecha_registro: dateOnly(citaRef ? citaRef.fecha_cita : addDays(hoy, -70 + i * 20)),
          presenta_enfermedades_odontologicas: i % 3 === 1,
          recibio_tratamiento_odontologico: i % 2 === 0,
          observaciones: 'Control de salud bucal.',
          fecha_creacion: citaRef ? citaRef.fecha_cita : addDays(hoy, -70 + i * 20)
        });
      }
      console.log(`   🦷 Salud bucal: 5`);

      // —— Sesiones educativas (4–5) ——
      for (let i = 0; i < 5; i++) {
        const citaRef = i < 3 ? citasCreadas[i + 1] : null;
        await SesionEducativa.create({
          id_paciente: paciente.id_paciente,
          id_cita: citaRef?.id_cita ?? null,
          fecha_sesion: dateOnly(citaRef ? citaRef.fecha_cita : addDays(hoy, -80 + i * 22)),
          asistio: i !== 2,
          tipo_sesion: pick(TIPOS_SESION, i + pIdx),
          numero_intervenciones: 1 + (i % 2),
          observaciones: 'Sesión de educación en salud.',
          fecha_creacion: citaRef ? citaRef.fecha_cita : addDays(hoy, -80 + i * 22)
        });
      }
      console.log(`   📚 Sesiones educativas: 5`);

      // —— Detección tuberculosis (3–4) ——
      for (let i = 0; i < 4; i++) {
        const citaRef = citasCreadas[i];
        await DeteccionTuberculosis.create({
          id_paciente: paciente.id_paciente,
          id_cita: citaRef.id_cita,
          fecha_deteccion: dateOnly(citaRef.fecha_cita),
          aplicacion_encuesta: true,
          baciloscopia_realizada: i === 0,
          baciloscopia_resultado: pick(RESULTADOS_BACILO, i + pIdx),
          ingreso_tratamiento: false,
          observaciones: 'Encuesta aplicada. Sin factores de riesgo.',
          fecha_creacion: citaRef.fecha_cita
        });
      }
      console.log(`   🦠 Detección tuberculosis: 4`);
    }

    console.log('\n========================================');
    console.log('✅ SEED COMPLETAR PACIENTES ACTUALES FINALIZADO');
    console.log('========================================');
    console.log(`   Pacientes completados: ${pacientes.length}`);
    console.log('   Por paciente: citas, signos vitales, diagnósticos, monitoreo,');
    console.log('   planes de medicación, red de apoyo, vacunación, comorbilidades,');
    console.log('   complicaciones, salud bucal, sesiones educativas, detección TB.');
    console.log('');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
