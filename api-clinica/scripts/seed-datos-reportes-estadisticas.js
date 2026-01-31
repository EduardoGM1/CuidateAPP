/**
 * Seed de datos para probar la pantalla "Reportes y Estadísticas" (admin).
 *
 * Inserta:
 * - 2-3 doctores (si no existen)
 * - 18 pacientes con variedad de edad, género, módulo y comorbilidades
 * - Asignación doctor-paciente (DoctorPaciente)
 * - 40+ citas: hoy, últimos 7 días, último mes; varios estados (atendida, pendiente, cancelada, etc.)
 *
 * Así se cubren: resumen general, gráfico citas 7 días, pacientes nuevos 7 días,
 * distribución por doctor, citas por estado, top doctores activos, citas por día,
 * distribución por edad y género, comorbilidades más frecuentes.
 *
 * Ejecutar desde api-clinica: node scripts/seed-datos-reportes-estadisticas.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import sequelize from '../config/db.js';
import {
  Usuario,
  Paciente,
  Doctor,
  DoctorPaciente,
  Modulo,
  Comorbilidad,
  PacienteComorbilidad,
  Cita,
} from '../models/associations.js';
import bcrypt from 'bcryptjs';
import AuthCredential from '../models/AuthCredential.js';

const COMORBILIDADES_NOMBRES = [
  'Diabetes', 'Hipertensión', 'Obesidad', 'Dislipidemia', 'Enfermedad Renal Crónica',
  'EPOC', 'Asma', 'Tabaquismo', 'Enfermedad Cardiovascular'
];

// Pacientes solo para estadísticas (sin PIN/login; variedad edad y género)
const PACIENTES_REPORTES = [
  { nombre: 'Alejandro', apellido_paterno: 'Ruiz', apellido_materno: 'Vega', fecha_nacimiento: '2015-05-10', sexo: 'Hombre' },   // 0-18
  { nombre: 'Carmen', apellido_paterno: 'Mora', apellido_materno: 'Soto', fecha_nacimiento: '1998-02-20', sexo: 'Mujer' },      // 19-35
  { nombre: 'Fernando', apellido_paterno: 'Ríos', apellido_materno: 'Lara', fecha_nacimiento: '1985-11-03', sexo: 'Hombre' },   // 36-50
  { nombre: 'Dolores', apellido_paterno: 'Castro', apellido_materno: 'Ortega', fecha_nacimiento: '1970-07-15', sexo: 'Mujer' },  // 51-65
  { nombre: 'Roberto', apellido_paterno: 'Núñez', apellido_materno: 'Guerrero', fecha_nacimiento: '1955-01-28', sexo: 'Hombre' }, // 65+
  { nombre: 'Patricia', apellido_paterno: 'Salazar', apellido_materno: 'Reyes', fecha_nacimiento: '2000-09-12', sexo: 'Mujer' },
  { nombre: 'Luis', apellido_paterno: 'Medina', apellido_materno: 'Jiménez', fecha_nacimiento: '1988-04-05', sexo: 'Hombre' },
  { nombre: 'Sandra', apellido_paterno: 'Acosta', apellido_materno: 'Díaz', fecha_nacimiento: '1975-12-22', sexo: 'Mujer' },
  { nombre: 'Miguel', apellido_paterno: 'Sandoval', apellido_materno: 'Moreno', fecha_nacimiento: '1962-08-30', sexo: 'Hombre' },
  { nombre: 'Laura', apellido_paterno: 'Cortés', apellido_materno: 'Herrera', fecha_nacimiento: '1992-03-17', sexo: 'Mujer' },
  { nombre: 'Jorge', apellido_paterno: 'Vargas', apellido_materno: 'Romero', fecha_nacimiento: '1980-10-08', sexo: 'Hombre' },
  { nombre: 'Claudia', apellido_paterno: 'Aguilar', apellido_materno: 'Mendoza', fecha_nacimiento: '1968-06-14', sexo: 'Mujer' },
  { nombre: 'Ricardo', apellido_paterno: 'Fuentes', apellido_materno: 'Silva', fecha_nacimiento: '1995-01-25', sexo: 'Hombre' },
  { nombre: 'Gabriela', apellido_paterno: 'Navarro', apellido_materno: 'Castro', fecha_nacimiento: '1972-11-11', sexo: 'Mujer' },
  { nombre: 'Andrés', apellido_paterno: 'Delgado', apellido_materno: 'Ortiz', fecha_nacimiento: '1982-07-07', sexo: 'Hombre' },
  { nombre: 'Mónica', apellido_paterno: 'Santos', apellido_materno: 'Gutiérrez', fecha_nacimiento: '1965-04-19', sexo: 'Mujer' },
  { nombre: 'Daniel', apellido_paterno: 'Cruz', apellido_materno: 'Ramos', fecha_nacimiento: '1998-12-01', sexo: 'Hombre' },
  { nombre: 'Verónica', apellido_paterno: 'Flores', apellido_materno: 'Chávez', fecha_nacimiento: '1978-09-23', sexo: 'Mujer' },
];

async function ensureModulos() {
  const nombres = [
    'Módulo Diabetes e Hipertensión',
    'Módulo Obesidad y Riesgo Cardiovascular',
    'Módulo Atención Preventiva'
  ];
  for (const nombre of nombres) {
    await Modulo.findOrCreate({
      where: { nombre_modulo: nombre },
      defaults: { nombre_modulo: nombre, created_at: new Date(), updated_at: new Date() }
    });
  }
  return Modulo.findAll({ order: [['id_modulo', 'ASC']] });
}

async function ensureComorbilidades() {
  for (const nombre of COMORBILIDADES_NOMBRES) {
    await Comorbilidad.findOrCreate({
      where: { nombre_comorbilidad: nombre },
      defaults: { nombre_comorbilidad: nombre, descripcion: `Comorbilidad: ${nombre}` }
    });
  }
  return Comorbilidad.findAll({ where: { nombre_comorbilidad: COMORBILIDADES_NOMBRES } });
}

async function getOrCreateDoctores(modulos) {
  const doctores = await Doctor.findAll({
    include: [{ model: Usuario, as: 'Usuario' }],
    order: [['id_doctor', 'ASC']],
    limit: 3
  });

  const result = [];
  for (let i = 0; i < 3; i++) {
    if (doctores[i]) {
      result.push(doctores[i]);
      console.log(`   👨‍⚕️ Doctor ${i + 1} existente: ${doctores[i].nombre} ${doctores[i].apellido_paterno}`);
      continue;
    }
    const passwordHash = await bcrypt.hash('Doctor123!', 10);
    const usuario = await Usuario.create({
      email: `doctor${i + 1}@reportes.com`,
      password_hash: passwordHash,
      rol: 'Doctor',
      activo: true,
      fecha_creacion: new Date()
    });
    await AuthCredential.create({
      user_type: 'Doctor',
      user_id: usuario.id_usuario,
      auth_method: 'password',
      credential_value: passwordHash,
      is_primary: true,
      activo: true,
      created_at: new Date(),
      updated_at: new Date()
    });
    const doctor = await Doctor.create({
      id_usuario: usuario.id_usuario,
      nombre: ['Juan Carlos', 'María Elena', 'Roberto'][i],
      apellido_paterno: ['Médico', 'Salud', 'Clínico'][i],
      apellido_materno: 'Sistema',
      telefono: `555123456${i}`,
      institucion_hospitalaria: 'Clínica Reportes',
      grado_estudio: 'Medicina General',
      anos_servicio: 5 + i,
      id_modulo: modulos[i % modulos.length]?.id_modulo || null,
      activo: true,
      fecha_registro: new Date()
    });
    result.push(doctor);
    console.log(`   👨‍⚕️ Doctor ${i + 1} creado: ${doctor.nombre} ${doctor.apellido_paterno}`);
  }
  return result;
}

function fechasParaCitas() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const citas = [];

  // 2-3 citas hoy
  for (let h = 9; h <= 11; h++) {
    const d = new Date(hoy);
    d.setHours(h, 0, 0, 0);
    citas.push({ fecha: d, estado: h === 9 ? 'atendida' : 'pendiente' });
  }

  // Últimos 7 días (varios por día para gráfico)
  for (let dias = 0; dias < 7; dias++) {
    const d = new Date(hoy);
    d.setDate(d.getDate() - (6 - dias));
    for (let h = 9; h <= 9 + (dias % 3); h++) {
      const f = new Date(d);
      f.setHours(h, 0, 0, 0);
      citas.push({
        fecha: f,
        estado: ['atendida', 'atendida', 'pendiente', 'cancelada', 'no_asistida'][(dias + h) % 5]
      });
    }
  }

  // Últimos 30 días (más citas para estadísticas por estado y por día de semana)
  for (let dias = 7; dias < 30; dias++) {
    const d = new Date(hoy);
    d.setDate(d.getDate() - dias);
    const numCitas = 1 + (dias % 2);
    for (let h = 0; h < numCitas; h++) {
      const f = new Date(d);
      f.setHours(9 + h * 2, 0, 0, 0);
      const estados = ['atendida', 'atendida', 'pendiente', 'cancelada', 'no_asistida', 'reprogramada'];
      citas.push({ fecha: f, estado: estados[(dias + h) % estados.length] });
    }
  }

  return citas;
}

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida.\n');

    console.log('📂 Módulos y comorbilidades...');
    const modulos = await ensureModulos();
    const comorbilidades = await ensureComorbilidades();
    console.log(`   Módulos: ${modulos.length}, Comorbilidades: ${comorbilidades.length}\n`);

    console.log('👨‍⚕️ Doctores (2-3)...');
    const doctores = await getOrCreateDoctores(modulos);
    if (doctores.length < 2) {
      console.log('   Se requieren al menos 2 doctores para reportes. Creados:', doctores.length);
    }

    console.log('\n👤 Pacientes para reportes (18)...');
    const pacientesCreados = [];
    const hoy = new Date();
    const hace7 = new Date(hoy);
    hace7.setDate(hace7.getDate() - 7);

    for (let i = 0; i < PACIENTES_REPORTES.length; i++) {
      const p = PACIENTES_REPORTES[i];
      const idModulo = modulos[i % modulos.length]?.id_modulo || null;
      const idDoctor = doctores[i % doctores.length]?.id_doctor;
      const fechaRegistro = i < 5 ? new Date(hace7.getTime() + (i * 24 * 60 * 60 * 1000)) : new Date();

      const paciente = await Paciente.create({
        id_usuario: null,
        nombre: p.nombre,
        apellido_paterno: p.apellido_paterno,
        apellido_materno: p.apellido_materno,
        fecha_nacimiento: p.fecha_nacimiento,
        curp: null,
        sexo: p.sexo,
        institucion_salud: 'IMSS',
        direccion: 'Dirección ejemplo',
        estado: 'Ciudad de México',
        localidad: 'Benito Juárez',
        numero_celular: `555${String(1000000 + i).slice(0, 7)}`,
        id_modulo: idModulo,
        activo: true,
        fecha_registro: fechaRegistro
      });

      await DoctorPaciente.findOrCreate({
        where: { id_doctor: idDoctor, id_paciente: paciente.id_paciente },
        defaults: { id_doctor: idDoctor, id_paciente: paciente.id_paciente, fecha_asignacion: hoy.toISOString().split('T')[0] }
      });

      for (let k = 0; k < 1 + (i % 3); k++) {
        const com = comorbilidades[(i + k) % comorbilidades.length];
        await PacienteComorbilidad.findOrCreate({
          where: { id_paciente: paciente.id_paciente, id_comorbilidad: com.id_comorbilidad },
          defaults: {
            id_paciente: paciente.id_paciente,
            id_comorbilidad: com.id_comorbilidad,
            fecha_deteccion: new Date(Date.now() - (k + 1) * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            anos_padecimiento: (k + 1) * 2,
            es_diagnostico_basal: k === 0,
            es_agregado_posterior: k > 0,
            recibe_tratamiento_farmacologico: true,
            recibe_tratamiento_no_farmacologico: true,
            año_diagnostico: hoy.getFullYear() - (k + 2)
          }
        });
      }

      pacientesCreados.push({ paciente, id_doctor: idDoctor });
      if ((i + 1) % 5 === 0) console.log(`   ${i + 1} pacientes creados`);
    }
    console.log(`   ✅ ${pacientesCreados.length} pacientes con comorbilidades y asignación a doctores.\n`);

    const fechasCitas = fechasParaCitas();
    console.log(`📅 Creando ${fechasCitas.length} citas (hoy, últimos 7 días, último mes)...`);

    let creadas = 0;
    for (let i = 0; i < fechasCitas.length; i++) {
      const { fecha, estado } = fechasCitas[i];
      const idx = i % pacientesCreados.length;
      const { paciente, id_doctor } = pacientesCreados[idx];
      if (!id_doctor) continue;

      await Cita.findOrCreate({
        where: {
          id_paciente: paciente.id_paciente,
          id_doctor,
          fecha_cita: fecha
        },
        defaults: {
          id_paciente: paciente.id_paciente,
          id_doctor,
          fecha_cita: fecha,
          estado,
          asistencia: estado === 'atendida',
          motivo: 'Consulta de seguimiento - datos para reportes',
          es_primera_consulta: false,
          observaciones: 'Seed reportes y estadísticas',
          fecha_creacion: new Date()
        }
      });
      creadas++;
    }
    console.log(`   ✅ ${creadas} citas creadas o ya existentes.\n`);

    console.log('========================================');
    console.log('✅ SEED REPORTES Y ESTADÍSTICAS COMPLETADO');
    console.log('========================================');
    console.log('   • Doctores:', doctores.length);
    console.log('   • Pacientes:', pacientesCreados.length, '(con edad/género/comorbilidades variados)');
    console.log('   • Citas: ~', creadas, '(hoy, últimos 7 días, último mes; varios estados)');
    console.log('\n   En la app: inicia sesión como Admin y abre Reportes y Estadísticas.');
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
