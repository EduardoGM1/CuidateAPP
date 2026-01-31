/**
 * Seed de datos simulados y realistas:
 * - 10 medicamentos
 * - 10 vacunas
 * - 3 módulos
 * - 5 pacientes con registro completo en todas sus tablas relacionadas
 * - Citas programadas para esta semana
 * Ejecutar: node scripts/seed-datos-simulados.js
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
  Medicamento,
  Vacuna,
  Comorbilidad,
  PacienteComorbilidad,
  Cita,
  SignoVital,
  Diagnostico,
  PlanMedicacion,
  PlanDetalle,
  RedApoyo,
  EsquemaVacunacion,
  DeteccionComplicacion,
  SaludBucal,
  SesionEducativa,
  DeteccionTuberculosis,
  AuthCredential
} from '../models/associations.js';
import UnifiedAuthService from '../services/unifiedAuthService.js';
import bcrypt from 'bcryptjs';

// --- Fechas: esta semana (lunes a viernes) ---
function fechasEstaSemana() {
  const hoy = new Date();
  const dia = hoy.getDay(); // 0=domingo, 1=lunes...
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - (dia === 0 ? 6 : dia - 1));
  lunes.setHours(9, 0, 0, 0);
  const fechas = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    fechas.push(d);
  }
  return fechas;
}

// --- 10 Medicamentos (simuladamente reales) ---
const MEDICAMENTOS = [
  { nombre_medicamento: 'Metformina 850 mg', descripcion: 'Antidiabético oral. Indicado en diabetes mellitus tipo 2. Tomar con alimentos.' },
  { nombre_medicamento: 'Losartán 50 mg', descripcion: 'Antihipertensivo. Bloqueador del receptor de angiotensina II. Una tableta al día.' },
  { nombre_medicamento: 'Atorvastatina 20 mg', descripcion: 'Hipolipemiante. Reducción de colesterol LDL. Tomar por la noche.' },
  { nombre_medicamento: 'Omeprazol 20 mg', descripcion: 'Inhibidor de bomba de protones. Para reflujo y gastritis. En ayunas.' },
  { nombre_medicamento: 'Paracetamol 500 mg', descripcion: 'Analgésico y antipirético. Dosis máxima 4 g/día en adultos.' },
  { nombre_medicamento: 'Enalapril 10 mg', descripcion: 'Antihipertensivo IECA. Control de presión arterial. Puede causar tos seca.' },
  { nombre_medicamento: 'Glibenclamida 5 mg', descripcion: 'Antidiabético oral. Estimula liberación de insulina. Tomar antes del desayuno.' },
  { nombre_medicamento: 'Ácido Acetilsalicílico 100 mg', descripcion: 'Antiagregante plaquetario. Prevención cardiovascular. Con alimentos.' },
  { nombre_medicamento: 'Amlodipino 5 mg', descripcion: 'Antihipertensivo bloqueador de canales de calcio. Una vez al día.' },
  { nombre_medicamento: 'Insulina NPH', descripcion: 'Insulina de acción intermedia. Aplicación subcutánea según indicación médica.' }
];

// --- 10 Vacunas ---
const VACUNAS = [
  { nombre_vacuna: 'COVID-19 (mRNA)', descripcion: 'Vacuna contra SARS-CoV-2. Esquema según normativa vigente.', tipo: 'COVID-19' },
  { nombre_vacuna: 'Influenza estacional', descripcion: 'Vacuna antigripal. Aplicación anual recomendada.', tipo: 'Influenza' },
  { nombre_vacuna: 'Hepatitis B', descripcion: 'Esquema de 3 dosis. Prevención de hepatitis B.', tipo: 'Hepatitis' },
  { nombre_vacuna: 'Tdap', descripcion: 'Tétanos, difteria y tos ferina acelular. Refuerzo cada 10 años.', tipo: 'Tétanos' },
  { nombre_vacuna: 'Triple viral (SRP)', descripcion: 'Sarampión, rubéola y parotiditis. Esquema en dos dosis.', tipo: 'Viral' },
  { nombre_vacuna: 'Neumocócica conjugada', descripcion: 'Prevención de enfermedad neumocócica. Adultos mayores y grupos de riesgo.', tipo: 'Neumococo' },
  { nombre_vacuna: 'VPH', descripcion: 'Virus del papiloma humano. Prevención de cáncer cérvico-uterino.', tipo: 'VPH' },
  { nombre_vacuna: 'Varicela', descripcion: 'Vacuna contra varicela. Esquema de dos dosis.', tipo: 'Varicela' },
  { nombre_vacuna: 'Hepatitis A', descripcion: 'Esquema de 2 dosis. Prevención de hepatitis A.', tipo: 'Hepatitis' },
  { nombre_vacuna: 'Herpes zóster', descripcion: 'Vacuna recombinante. Adultos mayores de 50 años.', tipo: 'Herpes zóster' }
];

// --- 3 Módulos ---
const MODULOS = [
  { nombre_modulo: 'Módulo Diabetes e Hipertensión', created_at: new Date(), updated_at: new Date() },
  { nombre_modulo: 'Módulo Obesidad y Riesgo Cardiovascular', created_at: new Date(), updated_at: new Date() },
  { nombre_modulo: 'Módulo Atención Preventiva', created_at: new Date(), updated_at: new Date() }
];

// --- Comorbilidades (para asignar a pacientes) ---
const COMORBILIDADES_NOMBRES = [
  'Diabetes', 'Hipertensión', 'Obesidad', 'Dislipidemia', 'Enfermedad Renal Crónica',
  'EPOC', 'Asma', 'Tabaquismo', 'Enfermedad Cardiovascular'
];

// --- 5 Pacientes con datos simulados (PINs seguros: 4 dígitos, no secuenciales ni repetidos) ---
const PACIENTES_DATA = [
  { pin: '2580', nombre: 'Rosa María', apellido_paterno: 'García', apellido_materno: 'López', fecha_nacimiento: '1968-03-12', curp: 'GALR680312MDFRPS01', sexo: 'Mujer', institucion_salud: 'IMSS', direccion: 'Av. Insurgentes Sur 1458, Col. Actipan', estado: 'Ciudad de México', localidad: 'Benito Juárez', numero_celular: '5551012345' },
  { pin: '3691', nombre: 'José Luis', apellido_paterno: 'Martínez', apellido_materno: 'Sánchez', fecha_nacimiento: '1955-07-28', curp: 'MASJ550728HDFRRS02', sexo: 'Hombre', institucion_salud: 'ISSSTE', direccion: 'Calle Eje Central 234', estado: 'Ciudad de México', localidad: 'Cuauhtémoc', numero_celular: '5552023456' },
  { pin: '7410', nombre: 'María Elena', apellido_paterno: 'Hernández', apellido_materno: 'Ramírez', fecha_nacimiento: '1972-11-05', curp: 'HERM721105MDFRMR03', sexo: 'Mujer', institucion_salud: 'Bienestar', direccion: 'Calle Hidalgo 567', estado: 'Estado de México', localidad: 'Toluca', numero_celular: '5553034567' },
  { pin: '5820', nombre: 'Carlos Alberto', apellido_paterno: 'López', apellido_materno: 'González', fecha_nacimiento: '1980-01-20', curp: 'LOGC800120HDFPLR04', sexo: 'Hombre', institucion_salud: 'IMSS', direccion: 'Av. Revolución 890', estado: 'Ciudad de México', localidad: 'Álvaro Obregón', numero_celular: '5554045678' },
  { pin: '6931', nombre: 'Ana Patricia', apellido_paterno: 'Díaz', apellido_materno: 'Flores', fecha_nacimiento: '1990-09-15', curp: 'DIFA900915MDFRLN05', sexo: 'Mujer', institucion_salud: 'Particular', direccion: 'Calle Amsterdam 123', estado: 'Ciudad de México', localidad: 'Condesa', numero_celular: '5555056789' }
];

async function seedMedicamentos() {
  console.log('\n📦 Creando 10 medicamentos...');
  for (const m of MEDICAMENTOS) {
    const [med] = await Medicamento.findOrCreate({
      where: { nombre_medicamento: m.nombre_medicamento },
      defaults: { nombre_medicamento: m.nombre_medicamento, descripcion: m.descripcion }
    });
    if (med) console.log(`   ✅ ${m.nombre_medicamento}`);
  }
}

async function seedVacunas() {
  console.log('\n💉 Creando 10 vacunas...');
  for (const v of VACUNAS) {
    const [vac] = await Vacuna.findOrCreate({
      where: { nombre_vacuna: v.nombre_vacuna },
      defaults: { nombre_vacuna: v.nombre_vacuna, descripcion: v.descripcion, tipo: v.tipo }
    });
    if (vac) console.log(`   ✅ ${v.nombre_vacuna}`);
  }
}

async function seedModulos() {
  console.log('\n📂 Creando 3 módulos...');
  for (const mod of MODULOS) {
    const [m] = await Modulo.findOrCreate({
      where: { nombre_modulo: mod.nombre_modulo },
      defaults: mod
    });
    if (m) console.log(`   ✅ ${mod.nombre_modulo}`);
  }
}

async function ensureComorbilidades() {
  console.log('\n🏥 Asegurando comorbilidades en catálogo...');
  for (const nombre of COMORBILIDADES_NOMBRES) {
    await Comorbilidad.findOrCreate({
      where: { nombre_comorbilidad: nombre },
      defaults: { nombre_comorbilidad: nombre, descripcion: `Comorbilidad: ${nombre}` }
    });
  }
  console.log(`   ✅ ${COMORBILIDADES_NOMBRES.length} comorbilidades disponibles`);
}

async function getOrCreateDoctor(modulos) {
  let doctor = await Doctor.findOne({ include: [{ model: Usuario, as: 'Usuario' }] });
  if (doctor) {
    console.log('\n👨‍⚕️ Usando doctor existente:', doctor.nombre, doctor.apellido_paterno);
    return doctor;
  }
  const passwordHash = await bcrypt.hash('Doctor123!', 10);
  const usuario = await Usuario.create({
    email: 'doctor@clinica.com',
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
  doctor = await Doctor.create({
    id_usuario: usuario.id_usuario,
    nombre: 'Juan Carlos',
    apellido_paterno: 'Médico',
    apellido_materno: 'Sistema',
    telefono: '5551234567',
    institucion_hospitalaria: 'Clínica de Práctica',
    grado_estudio: 'Medicina General',
    anos_servicio: 8,
    id_modulo: modulos[0]?.id_modulo || null,
    activo: true,
    fecha_registro: new Date()
  });
  console.log('\n👨‍⚕️ Doctor creado:', doctor.nombre, doctor.apellido_paterno);
  return doctor;
}

async function seedPacientesConTodo(doctor, modulos, fechasSemana) {
  const medicamentos = await Medicamento.findAll({ limit: 10 });
  const vacunas = await Vacuna.findAll({ limit: 10 });
  const comorbilidades = await Comorbilidad.findAll({ where: { nombre_comorbilidad: COMORBILIDADES_NOMBRES } });

  for (let i = 0; i < PACIENTES_DATA.length; i++) {
    const datos = PACIENTES_DATA[i];
    const idModulo = modulos[i % modulos.length]?.id_modulo || null;

    console.log(`\n👤 Paciente ${i + 1}: ${datos.nombre} ${datos.apellido_paterno}`);

    const paciente = await Paciente.create({
      id_usuario: null,
      nombre: datos.nombre,
      apellido_paterno: datos.apellido_paterno,
      apellido_materno: datos.apellido_materno,
      fecha_nacimiento: datos.fecha_nacimiento,
      curp: datos.curp,
      sexo: datos.sexo,
      institucion_salud: datos.institucion_salud,
      direccion: datos.direccion,
      estado: datos.estado,
      localidad: datos.localidad,
      numero_celular: datos.numero_celular,
      id_modulo: idModulo,
      activo: true
    });

    await UnifiedAuthService.setupCredential('Paciente', paciente.id_paciente, 'pin', datos.pin, {
      deviceId: `seed-${paciente.id_paciente}`,
      deviceName: 'Dispositivo Principal',
      deviceType: 'mobile',
      isPrimary: true
    });

    await DoctorPaciente.findOrCreate({
      where: { id_doctor: doctor.id_doctor, id_paciente: paciente.id_paciente },
      defaults: { id_doctor: doctor.id_doctor, id_paciente: paciente.id_paciente, fecha_asignacion: new Date().toISOString().split('T')[0] }
    });

    const fechaCita = fechasSemana[i % fechasSemana.length];
    const cita = await Cita.create({
      id_paciente: paciente.id_paciente,
      id_doctor: doctor.id_doctor,
      fecha_cita: fechaCita,
      estado: 'pendiente',
      motivo: 'Consulta de seguimiento y control',
      es_primera_consulta: false,
      observaciones: 'Paciente en control regular.',
      fecha_creacion: new Date()
    });
    console.log(`   📅 Cita programada: ${fechaCita.toISOString().split('T')[0]} ${fechaCita.getHours()}:00`);

    await SignoVital.create({
      id_paciente: paciente.id_paciente,
      id_cita: cita.id_cita,
      fecha_medicion: new Date(),
      peso_kg: 70 + (i * 3),
      talla_m: 1.65 + (i * 0.02),
      imc: parseFloat((70 / (1.65 * 1.65) + i * 0.5).toFixed(2)),
      presion_sistolica: 120 + (i * 2),
      presion_diastolica: 78 + (i % 3),
      glucosa_mg_dl: 95 + (i * 5),
      colesterol_mg_dl: 180 + (i * 8),
      registrado_por: 'doctor',
      observaciones: 'Registro de control.',
      fecha_creacion: new Date()
    });

    await Diagnostico.create({
      id_cita: cita.id_cita,
      descripcion: `Control de paciente. Seguimiento según plan de tratamiento. Paciente estable.`,
      fecha_registro: new Date()
    });

    const plan = await PlanMedicacion.create({
      id_paciente: paciente.id_paciente,
      id_doctor: doctor.id_doctor,
      id_cita: cita.id_cita,
      fecha_inicio: new Date().toISOString().split('T')[0],
      activo: true,
      observaciones: 'Plan de medicación activo.',
      fecha_creacion: new Date()
    });
    const med1 = medicamentos[i % medicamentos.length];
    const med2 = medicamentos[(i + 2) % medicamentos.length];
    await PlanDetalle.create({
      id_plan: plan.id_plan,
      id_medicamento: med1.id_medicamento,
      dosis: '1 tableta',
      frecuencia: 'Cada 12 horas',
      horario: '08:00 y 20:00',
      via_administracion: 'Oral',
      observaciones: 'Tomar con alimentos.'
    });
    await PlanDetalle.create({
      id_plan: plan.id_plan,
      id_medicamento: med2.id_medicamento,
      dosis: '1 tableta',
      frecuencia: 'Una vez al día',
      horario: '08:00',
      via_administracion: 'Oral',
      observaciones: null
    });

    await RedApoyo.create({
      id_paciente: paciente.id_paciente,
      nombre_contacto: `Familiar ${datos.nombre.split(' ')[0]}`,
      numero_celular: '5559000000',
      parentesco: 'Cónyuge',
      localidad: datos.localidad,
      fecha_creacion: new Date()
    });

    for (let j = 0; j < 3; j++) {
      const vac = vacunas[(i + j) % vacunas.length];
      const fApl = new Date();
      fApl.setMonth(fApl.getMonth() - (j + 1) * 2);
      await EsquemaVacunacion.create({
        id_paciente: paciente.id_paciente,
        vacuna: vac.nombre_vacuna,
        fecha_aplicacion: fApl.toISOString().split('T')[0],
        lote: `LOT-${2024}${String(j + 1).padStart(2, '0')}`,
        observaciones: 'Aplicada en unidad de salud.',
        fecha_creacion: new Date()
      });
    }

    for (let k = 0; k < 2; k++) {
      const com = comorbilidades[(i + k) % comorbilidades.length];
      await PacienteComorbilidad.create({
        id_paciente: paciente.id_paciente,
        id_comorbilidad: com.id_comorbilidad,
        fecha_deteccion: new Date(Date.now() - (k + 1) * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        anos_padecimiento: (k + 1) * 2,
        es_diagnostico_basal: k === 0,
        es_agregado_posterior: k > 0,
        recibe_tratamiento_farmacologico: true,
        recibe_tratamiento_no_farmacologico: true,
        año_diagnostico: new Date().getFullYear() - (k + 2)
      });
    }

    await DeteccionComplicacion.create({
      id_paciente: paciente.id_paciente,
      id_cita: cita.id_cita,
      id_doctor: doctor.id_doctor,
      exploracion_pies: true,
      exploracion_fondo_ojo: true,
      realiza_auto_monitoreo: true,
      microalbuminuria_realizada: true,
      microalbuminuria_resultado: 15.5,
      auto_monitoreo_glucosa: true,
      auto_monitoreo_presion: true,
      tipo_complicacion: 'Ninguna detectada',
      fecha_deteccion: new Date().toISOString().split('T')[0],
      observaciones: 'Sin complicaciones al momento.',
      registrado_por: 'doctor',
      fecha_creacion: new Date()
    });

    await SaludBucal.create({
      id_paciente: paciente.id_paciente,
      id_cita: cita.id_cita,
      fecha_registro: new Date().toISOString().split('T')[0],
      presenta_enfermedades_odontologicas: false,
      recibio_tratamiento_odontologico: false,
      observaciones: 'Buen estado de salud bucal.',
      fecha_creacion: new Date()
    });

    await SesionEducativa.create({
      id_paciente: paciente.id_paciente,
      id_cita: cita.id_cita,
      fecha_sesion: new Date().toISOString().split('T')[0],
      asistio: true,
      tipo_sesion: ['nutricional', 'actividad_fisica', 'medico_preventiva'][i % 3],
      numero_intervenciones: 1,
      observaciones: 'Sesión de educación en salud.',
      fecha_creacion: new Date()
    });

    await DeteccionTuberculosis.create({
      id_paciente: paciente.id_paciente,
      id_cita: cita.id_cita,
      fecha_deteccion: new Date().toISOString().split('T')[0],
      aplicacion_encuesta: true,
      baciloscopia_realizada: false,
      baciloscopia_resultado: 'no_aplicable',
      ingreso_tratamiento: false,
      observaciones: 'Encuesta negativa. Sin factores de riesgo.',
      fecha_creacion: new Date()
    });

    console.log(`   ✅ Paciente completo (ID: ${paciente.id_paciente}) - PIN: ${datos.pin}`);
  }
}

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida.');

    const fechasSemana = fechasEstaSemana();
    console.log('\n📅 Fechas de esta semana para citas:', fechasSemana.map(d => d.toISOString().split('T')[0]).join(', '));

    await seedMedicamentos();
    await seedVacunas();
    await seedModulos();
    await ensureComorbilidades();

    const modulos = await Modulo.findAll({ where: { nombre_modulo: MODULOS.map(m => m.nombre_modulo) } });
    const doctor = await getOrCreateDoctor(modulos);

    await seedPacientesConTodo(doctor, modulos, fechasSemana);

    console.log('\n========================================');
    console.log('✅ SEED COMPLETADO');
    console.log('========================================');
    console.log('   • 10 medicamentos');
    console.log('   • 10 vacunas');
    console.log('   • 3 módulos');
    console.log('   • 5 pacientes con:');
    console.log('     - Cita(s) esta semana');
    console.log('     - Signos vitales, diagnóstico, plan de medicación, red de apoyo');
    console.log('     - Esquema de vacunación, comorbilidades');
    console.log('     - Detección complicaciones, salud bucal, sesión educativa, detección tuberculosis');
    console.log('\n   PINs de login paciente: 2580, 3691, 7410, 5820, 6931');
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
