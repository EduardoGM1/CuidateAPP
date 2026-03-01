/**
 * Seed masivo: 15 doctores nuevos + 1 existente (16 total), más de 1000 pacientes
 * y datos en todas las tablas relacionadas (citas, signos vitales, notificaciones,
 * mensajes, diagnósticos, planes medicación, red apoyo, comorbilidades, etc.).
 *
 * Ejecutar desde api-clinica: node scripts/seed-masivo-1000-pacientes.js
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
  SignoVital,
  NotificacionDoctor,
  MensajeChat,
  Diagnostico,
  PlanMedicacion,
  PlanDetalle,
  Medicamento,
  MedicamentoToma,
  RedApoyo,
  EsquemaVacunacion,
  PuntoChequeo,
  SolicitudReprogramacion,
  SesionEducativa,
  SaludBucal,
  DeteccionTuberculosis,
  DeteccionComplicacion,
  SistemaAuditoria,
  Vacuna,
  InstitucionSalud,
} from '../models/associations.js';
import AuthCredential from '../models/AuthCredential.js';
import bcrypt from 'bcryptjs';

const TOTAL_PACIENTES = 1050;
const NUEVOS_DOCTORES = 15;
const BATCH = 50;

const NOMBRES = ['Alejandro', 'Carmen', 'Fernando', 'Dolores', 'Roberto', 'Patricia', 'Luis', 'Sandra', 'Miguel', 'Laura', 'Jorge', 'Claudia', 'Ricardo', 'Gabriela', 'Andrés', 'Mónica', 'Daniel', 'Verónica', 'Eduardo', 'María', 'José', 'Ana', 'Carlos', 'Rosa', 'Francisco', 'Lucía', 'Antonio', 'Elena', 'Pedro', 'Isabel'];
const APELLIDOS_P = ['Ruiz', 'Mora', 'Ríos', 'Castro', 'Núñez', 'Salazar', 'Medina', 'Acosta', 'Sandoval', 'Cortés', 'Vargas', 'Aguilar', 'Fuentes', 'Navarro', 'Delgado', 'Santos', 'Cruz', 'Flores', 'González', 'Hernández', 'López', 'Martínez', 'García', 'Rodríguez', 'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Díaz', 'Moreno'];
const APELLIDOS_M = ['Vega', 'Soto', 'Lara', 'Ortega', 'Guerrero', 'Reyes', 'Jiménez', 'Díaz', 'Moreno', 'Herrera', 'Romero', 'Mendoza', 'Silva', 'Castro', 'Ortiz', 'Gutiérrez', 'Ramos', 'Chávez', 'Ríos', 'Luna', 'Sol', 'Méndez', 'Rojas', 'Herrera', 'Vargas', 'Campos', 'Guzmán', 'Ochoa', 'Maldonado', 'Santiago'];
const ESTADOS_CITA = ['pendiente', 'atendida', 'no_asistida', 'reprogramada', 'cancelada'];
const TIPOS_NOTIF = ['cita_actualizada', 'cita_reprogramada', 'nuevo_mensaje', 'alerta_signos_vitales', 'paciente_registro_signos', 'solicitud_reprogramacion'];
const TIPOS_SESION = ['nutricional', 'actividad_fisica', 'medico_preventiva', 'trabajo_social', 'psicologica', 'odontologica'];

function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rndInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function fechaPasada(diasAtras) {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  return d.toISOString().slice(0, 10);
}
function fechaEntre(diasMin, diasMax) {
  const d = new Date();
  d.setDate(d.getDate() - rndInt(diasMin, diasMax));
  return d;
}

async function ensureCatalogos() {
  const modulos = await Modulo.findAll({ order: [['id_modulo', 'ASC']] });
  if (modulos.length === 0) {
    for (const n of ['Módulo Diabetes', 'Módulo Obesidad', 'Módulo Preventivo']) {
      await Modulo.create({ nombre_modulo: n, created_at: new Date(), updated_at: new Date() });
    }
  }
  const mods = await Modulo.findAll({ order: [['id_modulo', 'ASC']] });

  const comorbNombres = ['Diabetes', 'Hipertensión', 'Obesidad', 'Dislipidemia', 'Tuberculosis', 'EPOC', 'Asma'];
  for (const n of comorbNombres) {
    await Comorbilidad.findOrCreate({ where: { nombre_comorbilidad: n }, defaults: { nombre_comorbilidad: n } });
  }
  const comorbs = await Comorbilidad.findAll({ order: [['id_comorbilidad', 'ASC']] });

  const medNombres = ['Metformina 850mg', 'Losartán 50mg', 'Omeprazol 20mg', 'Paracetamol 500mg', 'Ácido acetilsalicílico 100mg'];
  for (const n of medNombres) {
    await Medicamento.findOrCreate({ where: { nombre_medicamento: n }, defaults: { nombre_medicamento: n } });
  }
  const meds = await Medicamento.findAll({ order: [['id_medicamento', 'ASC']] });

  const vacNombres = ['COVID-19', 'Influenza', 'Hepatitis B', 'Neumococo'];
  for (const n of vacNombres) {
    await Vacuna.findOrCreate({ where: { nombre_vacuna: n }, defaults: { nombre_vacuna: n, tipo: n } });
  }

  const instNombres = ['IMSS', 'ISSSTE', 'Particular', 'Bienestar'];
  for (const n of instNombres) {
    await InstitucionSalud.findOrCreate({ where: { nombre: n }, defaults: { nombre: n, activo: true, orden: 1, created_at: new Date() } });
  }

  return { modulos: await Modulo.findAll({ order: [['id_modulo', 'ASC']] }), comorbilidades: comorbs, medicamentos: meds };
}

async function getOrCreateDoctoresExistentes(modulos) {
  let doctores = await Doctor.findAll({
    include: [{ model: Usuario, as: 'Usuario', required: false }],
    order: [['id_doctor', 'ASC']]
  });
  if (doctores.length === 0) {
    const passHash = await bcrypt.hash('Admin123!', 10);
    const admin = await Usuario.create({
      email: 'admin@seed.com',
      password_hash: passHash,
      rol: 'Admin',
      activo: true,
      fecha_creacion: new Date()
    });
    const passDoc = await bcrypt.hash('Doctor123!', 10);
    const userDoc = await Usuario.create({
      email: 'doctor1@seed.com',
      password_hash: passDoc,
      rol: 'Doctor',
      activo: true,
      fecha_creacion: new Date()
    });
    await AuthCredential.create({
      user_type: 'Doctor',
      user_id: userDoc.id_usuario,
      auth_method: 'password',
      credential_value: passDoc,
      is_primary: true,
      activo: true,
      created_at: new Date(),
      updated_at: new Date()
    });
    const doc = await Doctor.create({
      id_usuario: userDoc.id_usuario,
      nombre: 'Doctor',
      apellido_paterno: 'Existente',
      apellido_materno: 'Seed',
      telefono: '5550000001',
      id_modulo: modulos[0]?.id_modulo || null,
      activo: true,
      fecha_registro: new Date()
    });
    doctores = [doc];
    console.log('   Creado 1 doctor por defecto (doctor1@seed.com / Doctor123!)');
  }
  return doctores;
}

async function crear15Doctores(modulos) {
  const creados = [];
  const passHash = await bcrypt.hash('Doctor123!', 10);
  const nombresDoc = ['Juan', 'María', 'Roberto', 'Ana', 'Carlos', 'Laura', 'Pedro', 'Sofia', 'Luis', 'Elena', 'Miguel', 'Carmen', 'José', 'Patricia', 'Francisco'];
  const apellidosDoc = ['García', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Ramírez', 'Torres', 'Flores', 'González', 'Hernández', 'Díaz', 'Moreno', 'Álvarez', 'Romero', 'Ruiz'];

  for (let i = 0; i < NUEVOS_DOCTORES; i++) {
    const email = `doctor.masivo.${i + 1}@seed.com`;
    const exist = await Usuario.findOne({ where: { email } });
    if (exist) continue;
    const usuario = await Usuario.create({
      email,
      password_hash: passHash,
      rol: 'Doctor',
      activo: true,
      fecha_creacion: new Date()
    });
    await AuthCredential.create({
      user_type: 'Doctor',
      user_id: usuario.id_usuario,
      auth_method: 'password',
      credential_value: passHash,
      is_primary: true,
      activo: true,
      created_at: new Date(),
      updated_at: new Date()
    });
    const doctor = await Doctor.create({
      id_usuario: usuario.id_usuario,
      nombre: nombresDoc[i],
      apellido_paterno: apellidosDoc[i],
      apellido_materno: 'Sistema',
      telefono: `555${String(1000000 + i).slice(0, 7)}`,
      institucion_hospitalaria: 'Clínica Seed',
      grado_estudio: 'Medicina General',
      anos_servicio: 3 + (i % 10),
      id_modulo: modulos[i % modulos.length]?.id_modulo || null,
      activo: true,
      fecha_registro: new Date()
    });
    creados.push(doctor);
  }
  return creados;
}

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos OK\n');

    const { modulos, comorbilidades, medicamentos } = await ensureCatalogos();
    console.log(`📂 Catálogos: ${modulos.length} módulos, ${comorbilidades.length} comorbilidades, ${medicamentos.length} medicamentos\n`);

    const doctoresExistentes = await getOrCreateDoctoresExistentes(modulos);
    const doctoresNuevos = await crear15Doctores(modulos);
    const todosDoctores = [...doctoresExistentes, ...doctoresNuevos];
    console.log(`👨‍⚕️ Doctores totales: ${todosDoctores.length} (${doctoresExistentes.length} existente(s) + ${doctoresNuevos.length} nuevos)\n`);

    const hoy = fechaPasada(0);
    let pacientesCreados = [];
    let totalPacientes = 0;

    for (let batchStart = 0; batchStart < TOTAL_PACIENTES; batchStart += BATCH) {
      const batchSize = Math.min(BATCH, TOTAL_PACIENTES - batchStart);
      for (let i = 0; i < batchSize; i++) {
        const idx = batchStart + i;
        const nombre = NOMBRES[idx % NOMBRES.length];
        const ap = APELLIDOS_P[idx % APELLIDOS_P.length];
        const am = APELLIDOS_M[idx % APELLIDOS_M.length];
        const añoNac = 1950 + (idx % 55);
        const mes = String(1 + (idx % 12)).padStart(2, '0');
        const dia = String(1 + (idx % 28)).padStart(2, '0');
        const fechaNac = `${añoNac}-${mes}-${dia}`;
        const sexo = idx % 2 === 0 ? 'Hombre' : 'Mujer';
        const idModulo = modulos[idx % modulos.length]?.id_modulo || null;
        const idDoctor = todosDoctores[idx % todosDoctores.length]?.id_doctor;

        const paciente = await Paciente.create({
          id_usuario: null,
          nombre,
          apellido_paterno: ap,
          apellido_materno: am,
          fecha_nacimiento: fechaNac,
          curp: null,
          sexo,
          institucion_salud: 'IMSS',
          direccion: `Calle ${idx + 1} Col. Centro`,
          estado: 'activos',
          localidad: 'Ciudad de México',
          numero_celular: `555${String(2000000 + idx).slice(0, 7)}`,
          id_modulo: idModulo,
          activo: true,
          fecha_registro: fechaEntre(365, 30)
        });

        await DoctorPaciente.create({
          id_doctor: idDoctor,
          id_paciente: paciente.id_paciente,
          fecha_asignacion: hoy
        });

        const nComorb = 1 + (idx % 3);
        for (let c = 0; c < nComorb && c < comorbilidades.length; c++) {
          const com = comorbilidades[(idx + c) % comorbilidades.length];
          await PacienteComorbilidad.create({
            id_paciente: paciente.id_paciente,
            id_comorbilidad: com.id_comorbilidad,
            fecha_deteccion: fechaPasada(180 + c * 60),
            anos_padecimiento: 1 + c,
            es_diagnostico_basal: c === 0,
            es_agregado_posterior: c > 0,
            recibe_tratamiento_farmacologico: true,
            recibe_tratamiento_no_farmacologico: idx % 2 === 0,
            año_diagnostico: new Date().getFullYear() - (2 + c)
          });
        }

        pacientesCreados.push({ paciente, id_doctor: idDoctor });
        totalPacientes++;
      }
      console.log(`   Pacientes: ${totalPacientes}/${TOTAL_PACIENTES}`);
    }

    console.log(`\n📅 Creando citas (~3 por paciente)...`);
    let totalCitas = 0;
    for (let i = 0; i < pacientesCreados.length; i++) {
      const { paciente, id_doctor } = pacientesCreados[i];
      const numCitas = 2 + (i % 3);
      for (let k = 0; k < numCitas; k++) {
        const fechaCita = fechaEntre(90 + k * 30, 1 + k * 15);
        const estado = rnd(ESTADOS_CITA);
        await Cita.create({
          id_paciente: paciente.id_paciente,
          id_doctor,
          fecha_cita: fechaCita,
          estado,
          asistencia: estado === 'atendida',
          motivo: `Consulta seguimiento paciente ${paciente.id_paciente}`,
          es_primera_consulta: k === 0,
          observaciones: null,
          fecha_creacion: new Date()
        });
        totalCitas++;
      }
      if ((i + 1) % 200 === 0) console.log(`   Citas: ${totalCitas}`);
    }
    console.log(`   ✅ ${totalCitas} citas creadas.\n`);

    console.log('🩺 Signos vitales (1-2 por paciente, algunos en cita)...');
    const citas = await Cita.findAll({ order: [['id_cita', 'ASC']], limit: 5000 });
    let totalSignos = 0;
    for (let i = 0; i < pacientesCreados.length; i++) {
      const { paciente, id_doctor } = pacientesCreados[i];
      const nSignos = 1 + (i % 2);
      for (let s = 0; s < nSignos; s++) {
        await SignoVital.create({
          id_paciente: paciente.id_paciente,
          id_cita: citas[totalSignos % citas.length]?.id_cita || null,
          fecha_medicion: fechaEntre(60, 1),
          peso_kg: 55 + (i % 40),
          talla_m: 1.5 + (i % 50) / 100,
          imc: 20 + (i % 15),
          presion_sistolica: String(110 + (i % 30)),
          presion_diastolica: String(70 + (i % 20)),
          glucosa_mg_dl: String(80 + (i % 60)),
          registrado_por: 'doctor',
          fecha_creacion: new Date()
        });
        totalSignos++;
      }
    }
    console.log(`   ✅ ${totalSignos} signos vitales.\n`);

    console.log('🔔 Notificaciones doctor...');
    let totalNotif = 0;
    for (let i = 0; i < Math.min(800, pacientesCreados.length * 2); i++) {
      const { paciente, id_doctor } = pacientesCreados[i % pacientesCreados.length];
      const cita = await Cita.findOne({ where: { id_paciente: paciente.id_paciente }, order: [['id_cita', 'DESC']] });
      await NotificacionDoctor.create({
        id_doctor: id_doctor,
        id_paciente: paciente.id_paciente,
        id_cita: cita?.id_cita || null,
        id_mensaje: null,
        tipo: rnd(TIPOS_NOTIF),
        titulo: `Notificación ${i + 1}`,
        mensaje: `Mensaje de notificación para paciente ${paciente.nombre}.`,
        estado: rnd(['enviada', 'leida', 'archivada']),
        fecha_envio: fechaEntre(30, 1)
      });
      totalNotif++;
    }
    console.log(`   ✅ ${totalNotif} notificaciones.\n`);

    console.log('💬 Mensajes chat...');
    let totalMsg = 0;
    for (let i = 0; i < Math.min(500, pacientesCreados.length); i++) {
      const { paciente, id_doctor } = pacientesCreados[i];
      await MensajeChat.create({
        id_paciente: paciente.id_paciente,
        id_doctor,
        remitente: rnd(['Paciente', 'Doctor', 'Sistema']),
        mensaje_texto: `Mensaje de prueba ${i + 1} para paciente ${paciente.id_paciente}.`,
        leido: Math.random() > 0.3,
        fecha_envio: fechaEntre(60, 1)
      });
      totalMsg++;
    }
    console.log(`   ✅ ${totalMsg} mensajes.\n`);

    console.log('📋 Diagnósticos (por cita)...');
    let totalDiag = 0;
    const citasConPaciente = await Cita.findAll({ where: { estado: 'atendida' }, limit: 2000 });
    for (let i = 0; i < Math.min(1500, citasConPaciente.length); i++) {
      const cita = citasConPaciente[i];
      await Diagnostico.create({
        id_cita: cita.id_cita,
        descripcion: `Diagnóstico de seguimiento para cita ${cita.id_cita}.`,
        fecha_registro: new Date()
      });
      totalDiag++;
    }
    console.log(`   ✅ ${totalDiag} diagnósticos.\n`);

    console.log('💊 Planes medicación y tomas...');
    let totalPlanes = 0;
    for (let i = 0; i < Math.min(400, pacientesCreados.length); i++) {
      const { paciente, id_doctor } = pacientesCreados[i];
      const cita = await Cita.findOne({ where: { id_paciente: paciente.id_paciente } });
      const plan = await PlanMedicacion.create({
        id_paciente: paciente.id_paciente,
        id_doctor,
        id_cita: cita?.id_cita || null,
        fecha_inicio: fechaPasada(60),
        fecha_fin: fechaPasada(10),
        observaciones: 'Plan seed masivo',
        activo: true,
        fecha_creacion: new Date()
      });
      const med = medicamentos[i % medicamentos.length];
      const detalle = await PlanDetalle.create({
        id_plan: plan.id_plan,
        id_medicamento: med.id_medicamento,
        dosis: '1 tableta',
        frecuencia: 'Cada 8 horas',
        horario: '08:00',
        via_administracion: 'Oral',
        observaciones: null
      });
      await MedicamentoToma.create({
        id_plan_medicacion: plan.id_plan,
        id_plan_detalle: detalle.id_detalle,
        fecha_toma: new Date(),
        confirmado_por: 'Paciente',
        fecha_creacion: new Date()
      });
      totalPlanes++;
    }
    console.log(`   ✅ ${totalPlanes} planes + detalle + tomas.\n`);

    console.log('👥 Red apoyo...');
    let totalRed = 0;
    for (let i = 0; i < Math.min(600, pacientesCreados.length); i++) {
      const { paciente } = pacientesCreados[i];
      await RedApoyo.create({
        id_paciente: paciente.id_paciente,
        nombre_contacto: `Familiar ${i + 1}`,
        numero_celular: `555${String(3000000 + i).slice(0, 7)}`,
        parentesco: rnd(['Cónyuge', 'Hijo(a)', 'Hermano(a)', 'Padre', 'Madre']),
        fecha_creacion: new Date()
      });
      totalRed++;
    }
    console.log(`   ✅ ${totalRed} contactos red apoyo.\n`);

    console.log('💉 Esquema vacunación...');
    const vacunas = await Vacuna.findAll();
    let totalVac = 0;
    for (let i = 0; i < Math.min(500, pacientesCreados.length); i++) {
      const { paciente } = pacientesCreados[i];
      const vac = vacunas[i % vacunas.length];
      await EsquemaVacunacion.create({
        id_paciente: paciente.id_paciente,
        vacuna: vac?.nombre_vacuna || 'COVID-19',
        fecha_aplicacion: fechaPasada(180 + (i % 90)),
        lote: `LOT${1000 + i}`,
        observaciones: null,
        fecha_creacion: new Date()
      });
      totalVac++;
    }
    console.log(`   ✅ ${totalVac} registros vacunación.\n`);

    console.log('✓ Puntos chequeo...');
    let totalPunto = 0;
    for (let i = 0; i < Math.min(400, citas.length); i++) {
      const c = citas[i];
      await PuntoChequeo.create({
        id_cita: c.id_cita,
        id_paciente: c.id_paciente,
        asistencia: c.estado === 'atendida',
        fecha_registro: new Date()
      });
      totalPunto++;
    }
    console.log(`   ✅ ${totalPunto} puntos chequeo.\n`);

    console.log('📅 Solicitudes reprogramación...');
    let totalSol = 0;
    const citasPend = await Cita.findAll({ where: { estado: 'pendiente' }, limit: 300 });
    for (let i = 0; i < Math.min(200, citasPend.length); i++) {
      const c = citasPend[i];
      await SolicitudReprogramacion.create({
        id_cita: c.id_cita,
        id_paciente: c.id_paciente,
        motivo: `Solicitud seed ${i + 1}`,
        fecha_solicitada: fechaPasada(-7),
        estado: rnd(['pendiente', 'aprobada', 'rechazada']),
        fecha_creacion: new Date()
      });
      totalSol++;
    }
    console.log(`   ✅ ${totalSol} solicitudes.\n`);

    console.log('📚 Sesiones educativas...');
    let totalSes = 0;
    for (let i = 0; i < Math.min(400, pacientesCreados.length); i++) {
      const { paciente } = pacientesCreados[i];
      const cita = await Cita.findOne({ where: { id_paciente: paciente.id_paciente } });
      await SesionEducativa.create({
        id_paciente: paciente.id_paciente,
        id_cita: cita?.id_cita || null,
        fecha_sesion: fechaPasada(rndInt(1, 90)),
        asistio: Math.random() > 0.2,
        tipo_sesion: rnd(TIPOS_SESION),
        numero_intervenciones: 1 + (i % 3),
        fecha_creacion: new Date()
      });
      totalSes++;
    }
    console.log(`   ✅ ${totalSes} sesiones.\n`);

    console.log('🦷 Salud bucal...');
    let totalBucal = 0;
    for (let i = 0; i < Math.min(350, pacientesCreados.length); i++) {
      const { paciente } = pacientesCreados[i];
      await SaludBucal.create({
        id_paciente: paciente.id_paciente,
        id_cita: null,
        fecha_registro: fechaPasada(rndInt(1, 180)),
        presenta_enfermedades_odontologicas: Math.random() > 0.6,
        recibio_tratamiento_odontologico: Math.random() > 0.7,
        fecha_creacion: new Date()
      });
      totalBucal++;
    }
    console.log(`   ✅ ${totalBucal} registros salud bucal.\n`);

    console.log('🫁 Detección tuberculosis...');
    let totalTB = 0;
    for (let i = 0; i < Math.min(300, pacientesCreados.length); i++) {
      const { paciente } = pacientesCreados[i];
      const cita = await Cita.findOne({ where: { id_paciente: paciente.id_paciente } });
      await DeteccionTuberculosis.create({
        id_paciente: paciente.id_paciente,
        id_cita: cita?.id_cita || null,
        fecha_deteccion: fechaPasada(rndInt(1, 365)),
        aplicacion_encuesta: Math.random() > 0.3,
        baciloscopia_realizada: Math.random() > 0.6,
        baciloscopia_resultado: rnd(['negativo', 'pendiente', 'no_aplicable']),
        ingreso_tratamiento: false,
        fecha_creacion: new Date()
      });
      totalTB++;
    }
    console.log(`   ✅ ${totalTB} detecciones TB.\n`);

    console.log('🔬 Detección complicaciones...');
    let totalDet = 0;
    for (let i = 0; i < Math.min(350, pacientesCreados.length); i++) {
      const { paciente, id_doctor } = pacientesCreados[i];
      const cita = await Cita.findOne({ where: { id_paciente: paciente.id_paciente } });
      const com = comorbilidades[i % comorbilidades.length];
      await DeteccionComplicacion.create({
        id_paciente: paciente.id_paciente,
        id_comorbilidad: com?.id_comorbilidad || null,
        id_cita: cita?.id_cita || null,
        id_doctor,
        exploracion_pies: Math.random() > 0.5,
        exploracion_fondo_ojo: Math.random() > 0.6,
        realiza_auto_monitoreo: Math.random() > 0.4,
        microalbuminuria_realizada: Math.random() > 0.5,
        fecha_deteccion: fechaPasada(rndInt(1, 180)),
        registrado_por: 'doctor',
        fue_referido: false,
        fecha_creacion: new Date()
      });
      totalDet++;
    }
    console.log(`   ✅ ${totalDet} detecciones complicaciones.\n`);

    console.log('📜 Sistema auditoría...');
    const usuarios = await Usuario.findAll({ limit: 50 });
    let totalAud = 0;
    const tiposAccion = ['paciente_creado', 'cita_estado_actualizado', 'asignacion_paciente', 'login_exitoso', 'sistema_automatico'];
    for (let i = 0; i < 200; i++) {
      const u = usuarios[i % usuarios.length];
      await SistemaAuditoria.create({
        id_usuario: u?.id_usuario || null,
        tipo_accion: rnd(tiposAccion),
        entidad_afectada: rnd(['cita', 'paciente', 'doctor', 'sistema']),
        id_entidad: pacientesCreados[i % pacientesCreados.length]?.paciente?.id_paciente || null,
        descripcion: `Acción seed auditoría ${i + 1}`,
        severidad: rnd(['info', 'warning']),
        fecha_creacion: fechaEntre(30, 1)
      });
      totalAud++;
    }
    console.log(`   ✅ ${totalAud} registros auditoría.\n`);

    console.log('========================================');
    console.log('✅ SEED MASIVO COMPLETADO');
    console.log('========================================');
    console.log(`   Doctores: ${todosDoctores.length} (1 existente + ${NUEVOS_DOCTORES} nuevos)`);
    console.log(`   Pacientes: ${totalPacientes}`);
    console.log(`   Citas: ${totalCitas}`);
    console.log(`   Signos vitales: ${totalSignos}`);
    console.log(`   Notificaciones: ${totalNotif}`);
    console.log(`   Mensajes chat: ${totalMsg}`);
    console.log(`   Diagnósticos: ${totalDiag}`);
    console.log(`   Planes medicación: ${totalPlanes}`);
    console.log(`   Red apoyo: ${totalRed}`);
    console.log(`   Vacunación: ${totalVac}`);
    console.log(`   Puntos chequeo: ${totalPunto}`);
    console.log(`   Solicitudes reprogramación: ${totalSol}`);
    console.log(`   Sesiones educativas: ${totalSes}`);
    console.log(`   Salud bucal: ${totalBucal}`);
    console.log(`   Detección TB: ${totalTB}`);
    console.log(`   Detección complicaciones: ${totalDet}`);
    console.log(`   Auditoría: ${totalAud}`);
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
