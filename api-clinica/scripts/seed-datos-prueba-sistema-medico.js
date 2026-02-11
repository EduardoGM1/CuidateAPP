/**
 * Seed de datos de prueba para sistema médico
 * - 5 doctores, 100 pacientes (distribución equitativa 20 por doctor)
 * - Historial de citas, signos vitales, diagnósticos, comorbilidades,
 *   detección TB, complicaciones, vacunas, notificaciones, chat, módulos
 * - Solo se muestran: PIN de un paciente (2020) y credenciales de un doctor
 *
 * Uso: node scripts/seed-datos-prueba-sistema-medico.js
 * Nota: Ejecutar una vez; si la BD ya tiene datos, se añadirán más (doctores/pacientes por email se reutilizan).
 */

import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import {
  Usuario,
  Paciente,
  Doctor,
  DoctorPaciente,
  Modulo,
  Comorbilidad,
  Medicamento,
  Vacuna,
  Cita,
  SignoVital,
  Diagnostico,
  PacienteComorbilidad,
  DeteccionTuberculosis,
  DeteccionComplicacion,
  EsquemaVacunacion,
  NotificacionDoctor,
  MensajeChat,
  RedApoyo,
  PlanMedicacion,
  PlanDetalle,
  MedicamentoToma
} from '../models/associations.js';
import UnifiedAuthService from '../services/unifiedAuthService.js';

const N_DOCTORES = 5;
const N_PACIENTES = 100;
const PIN_PACIENTE_UNICO = '2020';
const CREDENTIALS_DOCTOR_INDEX = 0; // Solo mostrar credenciales del primer doctor

// --- Datos ficticios realistas ---
const NOMBRES_H = ['Luis', 'Carlos', 'Miguel', 'José', 'Juan', 'Pedro', 'Antonio', 'Francisco', 'Javier', 'Roberto', 'Fernando', 'Daniel', 'Alejandro', 'Ricardo', 'Eduardo', 'Andrés', 'Raúl', 'Sergio', 'Jorge', 'Pablo'];
const NOMBRES_M = ['María', 'Ana', 'Rosa', 'Laura', 'Carmen', 'Patricia', 'Elena', 'Isabel', 'Lucía', 'Adriana', 'Sofia', 'Claudia', 'Mónica', 'Gabriela', 'Diana', 'Valeria', 'Andrea', 'Natalia', 'Paula', 'Daniela'];
const APELLIDOS = ['García', 'Rodríguez', 'Martínez', 'López', 'González', 'Hernández', 'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Cruz', 'Morales', 'Reyes', 'Gutiérrez', 'Ortiz', 'Chávez', 'Ruiz', 'Mendoza', 'Vargas', 'Castillo', 'Jiménez'];
const ESTADOS = ['Aguascalientes', 'CDMX', 'Estado de México', 'Jalisco', 'Puebla', 'Guanajuato', 'Veracruz', 'Nuevo León', 'Chihuahua', 'Oaxaca', 'Querétaro', 'Yucatán', 'Morelos', 'Tabasco', 'Coahuila'];
const INSTITUCIONES = ['IMSS', 'ISSSTE', 'Secretaría de Salud', 'Particular', 'Bienestar', 'PEMEX', 'Ninguna'];
const MOTIVOS_CITA = ['Control de diabetes', 'Control de hipertensión', 'Revisión general', 'Seguimiento de tratamiento', 'Dolor crónico', 'Infección respiratoria', 'Valoración preoperatoria', 'Control prenatal', 'Vacunación', 'Resultados de laboratorio'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, n) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}
function fechaPasada(diasAtras) {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  return d;
}
function fechaFutura(diasAdelante) {
  const d = new Date();
  d.setDate(d.getDate() + diasAdelante);
  return d;
}
function formatDate(d) { return d.toISOString().slice(0, 10); }

async function ensureCatalogs() {
  const modulos = [
    { nombre_modulo: 'Gestión clínica' },
    { nombre_modulo: 'Monitoreo' }
  ];
  for (const m of modulos) {
    await Modulo.findOrCreate({ where: { nombre_modulo: m.nombre_modulo }, defaults: m });
  }
  const comorbilidades = [
    { nombre_comorbilidad: 'Diabetes', descripcion: 'Diabetes mellitus tipo 2' },
    { nombre_comorbilidad: 'Hipertensión', descripcion: 'Hipertensión arterial' },
    { nombre_comorbilidad: 'Obesidad', descripcion: 'Obesidad' },
    { nombre_comorbilidad: 'Dislipidemia', descripcion: 'Alteración de lípidos' },
    { nombre_comorbilidad: 'EPOC', descripcion: 'Enfermedad pulmonar obstructiva' },
    { nombre_comorbilidad: 'Asma', descripcion: 'Asma bronquial' },
    { nombre_comorbilidad: 'Tuberculosis', descripcion: 'TB' },
    { nombre_comorbilidad: 'Tabaquismo', descripcion: 'Consumo de tabaco' }
  ];
  for (const c of comorbilidades) {
    await Comorbilidad.findOrCreate({ where: { nombre_comorbilidad: c.nombre_comorbilidad }, defaults: c });
  }
  const medicamentos = [
    { nombre_medicamento: 'Metformina 850mg', descripcion: 'Antidiabético oral' },
    { nombre_medicamento: 'Losartán 50mg', descripcion: 'Antihipertensivo' },
    { nombre_medicamento: 'Atorvastatina 20mg', descripcion: 'Hipolipemiante' },
    { nombre_medicamento: 'Enalapril 10mg', descripcion: 'IECA' },
    { nombre_medicamento: 'Amlodipino 5mg', descripcion: 'Antihipertensivo' },
    { nombre_medicamento: 'Insulina NPH', descripcion: 'Insulina intermedia' },
    { nombre_medicamento: 'Paracetamol 500mg', descripcion: 'Analgésico' },
    { nombre_medicamento: 'Omeprazol 20mg', descripcion: 'IBP' }
  ];
  for (const med of medicamentos) {
    await Medicamento.findOrCreate({ where: { nombre_medicamento: med.nombre_medicamento }, defaults: med });
  }
  const vacunas = [
    { nombre_vacuna: 'COVID-19 (mRNA)', descripcion: 'SARS-CoV-2', tipo: 'Viral' },
    { nombre_vacuna: 'Influenza (Gripe)', descripcion: 'Estacional', tipo: 'Viral' },
    { nombre_vacuna: 'Hepatitis B', descripcion: 'HB', tipo: 'Viral' },
    { nombre_vacuna: 'Tdap', descripcion: 'Tétanos, difteria, tos ferina', tipo: 'Toxoide' },
    { nombre_vacuna: 'BCG (Tuberculosis)', descripcion: 'TB', tipo: 'Bacteriana' }
  ];
  for (const v of vacunas) {
    await Vacuna.findOrCreate({ where: { nombre_vacuna: v.nombre_vacuna }, defaults: v });
  }
  const mods = await Modulo.findAll();
  const coms = await Comorbilidad.findAll();
  const meds = await Medicamento.findAll();
  const vacs = await Vacuna.findAll();
  return { modulos: mods, comorbilidades: coms, medicamentos: meds, vacunas: vacs };
}

async function createDoctors(catalogs) {
  const modulos = catalogs.modulos;
  const credencialUnico = { email: 'doctor.prueba@clinica.com', password: 'DoctorPrueba1!' };
  const doctors = [];
  const nombresDoc = ['Ricardo', 'Elena', 'Oscar', 'Claudia', 'Felipe'];
  const apellidosDoc = [['Mendoza', 'López'], ['Vega', 'Soto'], ['Castro', 'Ríos'], ['Núñez', 'Miranda'], ['Sandoval', 'Fuentes']];
  for (let i = 0; i < N_DOCTORES; i++) {
    const email = i === CREDENTIALS_DOCTOR_INDEX ? credencialUnico.email : `doctor${i + 1}.seed@clinica.com`;
    const password = i === CREDENTIALS_DOCTOR_INDEX ? credencialUnico.password : `DoctorSeed${i + 1}!`;
    let usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) {
      usuario = await Usuario.create({
        email,
        password_hash: '',
        rol: 'Doctor',
        activo: true
      });
      await UnifiedAuthService.setupCredential('Doctor', usuario.id_usuario, 'password', password, { isPrimary: true });
    }
    let doctor = await Doctor.findOne({ where: { id_usuario: usuario.id_usuario } });
    if (!doctor) {
      doctor = await Doctor.create({
        id_usuario: usuario.id_usuario,
        nombre: nombresDoc[i],
        apellido_paterno: apellidosDoc[i][0],
        apellido_materno: apellidosDoc[i][1],
        id_modulo: modulos[i % modulos.length].id_modulo,
        institucion_hospitalaria: 'Clínica Seed',
        grado_estudio: 'Medicina General',
        anos_servicio: 5 + i,
        activo: true
      });
    }
    doctors.push({ usuario, doctor, password: i === CREDENTIALS_DOCTOR_INDEX ? password : null, email: i === CREDENTIALS_DOCTOR_INDEX ? email : null });
  }
  return doctors;
}

async function createPacientes(catalogs, doctors) {
  const modulos = catalogs.modulos;
  const pacientes = [];
  let pacienteConPin = null;
  const hoy = new Date();
  for (let i = 0; i < N_PACIENTES; i++) {
    const esHombre = i % 2 === 0;
    const nombres = esHombre ? NOMBRES_H : NOMBRES_M;
    const nombre = nombres[i % nombres.length];
    const ap1 = APELLIDOS[i % APELLIDOS.length];
    const ap2 = APELLIDOS[(i + 5) % APELLIDOS.length];
    const fechaNac = new Date(hoy.getFullYear() - (25 + (i % 50)), i % 12, 1 + (i % 28));
    const idModulo = modulos[i % modulos.length].id_modulo;
    const crearUsuarioConPin = (i === 0);
    const emailPacientePin = 'paciente.pin2020@clinica.seed';
    if (crearUsuarioConPin) {
      const [usuario, createdUsuario] = await Usuario.findOrCreate({
        where: { email: emailPacientePin },
        defaults: { password_hash: '', rol: 'Paciente', activo: true }
      });
      let paciente = await Paciente.findOne({ where: { id_usuario: usuario.id_usuario } });
      if (!paciente) {
        paciente = await Paciente.create({
          id_usuario: usuario.id_usuario,
          nombre,
          apellido_paterno: ap1,
          apellido_materno: ap2,
          fecha_nacimiento: formatDate(fechaNac),
          sexo: esHombre ? 'Hombre' : 'Mujer',
          estado: pick(ESTADOS),
          localidad: 'Localidad Seed',
          institucion_salud: pick(INSTITUCIONES),
          id_modulo: idModulo,
          activo: true
        });
        await UnifiedAuthService.setupCredential('Paciente', paciente.id_paciente, 'pin', PIN_PACIENTE_UNICO, { isPrimary: true, deviceId: 'seed-paciente-pin' });
      }
      pacienteConPin = paciente;
      pacientes.push(paciente);
      continue;
    }
    const paciente = await Paciente.create({
      id_usuario: null,
      nombre,
      apellido_paterno: ap1,
      apellido_materno: ap2,
      fecha_nacimiento: formatDate(fechaNac),
      sexo: esHombre ? 'Hombre' : 'Mujer',
      estado: pick(ESTADOS),
      localidad: 'Localidad Seed',
      institucion_salud: pick(INSTITUCIONES),
      id_modulo: idModulo,
      activo: true
    });
    pacientes.push(paciente);
  }
  return { pacientes, pacienteConPin };
}

async function assignDoctorPaciente(pacientes, doctors) {
  const porDoctor = Math.ceil(pacientes.length / doctors.length);
  for (let i = 0; i < pacientes.length; i++) {
    const docIndex = Math.floor(i / porDoctor) % doctors.length;
    const doctor = doctors[docIndex].doctor;
    await DoctorPaciente.findOrCreate({
      where: { id_doctor: doctor.id_doctor, id_paciente: pacientes[i].id_paciente },
      defaults: { id_doctor: doctor.id_doctor, id_paciente: pacientes[i].id_paciente, fecha_asignacion: formatDate(new Date()) }
    });
  }
}

async function createCitas(pacientes, doctors) {
  const porDoctor = Math.ceil(pacientes.length / doctors.length);
  const estados = ['pendiente', 'atendida', 'no_asistida', 'reprogramada', 'cancelada'];
  for (let i = 0; i < pacientes.length; i++) {
    const docIndex = Math.floor(i / porDoctor) % doctors.length;
    const doctor = doctors[docIndex].doctor;
    const nCitas = 3 + (i % 8);
    for (let c = 0; c < nCitas; c++) {
      const dias = c % 2 === 0 ? -(30 + c * 20) : (c * 7);
      const fecha = dias < 0 ? fechaPasada(-dias) : fechaFutura(dias);
      fecha.setHours(9 + (c % 6), 0, 0, 0);
      const estado = dias < 0 ? pick(estados) : (dias === 0 ? 'pendiente' : 'pendiente');
      await Cita.create({
        id_paciente: pacientes[i].id_paciente,
        id_doctor: doctor.id_doctor,
        fecha_cita: fecha,
        estado,
        motivo: pick(MOTIVOS_CITA),
        es_primera_consulta: c === 0
      });
    }
  }
}

async function createSignosVitales(pacientes) {
  const citasPorPaciente = await Promise.all(pacientes.map(p =>
    Cita.findAll({ where: { id_paciente: p.id_paciente }, limit: 5, order: [['fecha_cita', 'DESC']] })
  ));
  for (let i = 0; i < pacientes.length; i++) {
    const p = pacientes[i];
    const citas = citasPorPaciente[i];
    const nMonitoreo = 2 + (i % 4);
    for (let k = 0; k < nMonitoreo; k++) {
      await SignoVital.create({
        id_paciente: p.id_paciente,
        id_cita: null,
        fecha_medicion: fechaPasada(k * 15),
        peso_kg: 60 + (i % 35) + (k * 0.5),
        talla_m: 1.55 + (i % 45) / 100,
        presion_sistolica: String(110 + (i % 30)),
        presion_diastolica: String(70 + (i % 20)),
        glucosa_mg_dl: String(80 + (i % 80)),
        registrado_por: k % 2 === 0 ? 'paciente' : 'doctor'
      });
    }
    for (const cita of citas.slice(0, 2)) {
      await SignoVital.create({
        id_paciente: p.id_paciente,
        id_cita: cita.id_cita,
        fecha_medicion: cita.fecha_cita,
        peso_kg: 65 + (i % 30),
        talla_m: 1.6,
        presion_sistolica: String(120 + (i % 25)),
        presion_diastolica: String(78 + (i % 15)),
        registrado_por: 'doctor'
      });
    }
  }
}

async function createDiagnosticos(pacientes) {
  for (const p of pacientes) {
    const citas = await Cita.findAll({ where: { id_paciente: p.id_paciente, estado: 'atendida' }, limit: 3 });
    for (const c of citas) {
      await Diagnostico.create({
        id_cita: c.id_cita,
        descripcion: `Control y seguimiento. ${pick(MOTIVOS_CITA)}. Evolución favorable.`
      });
    }
    if (citas.length === 0) {
      const cCualquiera = await Cita.findOne({ where: { id_paciente: p.id_paciente } });
      if (cCualquiera) {
        await Diagnostico.create({
          id_cita: cCualquiera.id_cita,
          descripcion: 'Valoración inicial. Indicaciones y seguimiento.'
        });
      }
    }
  }
}

async function createPacienteComorbilidad(pacientes, catalogs) {
  const coms = catalogs.comorbilidades;
  for (const p of pacientes) {
    const n = 1 + (p.id_paciente % 4);
    const elegidas = pickN(coms, n);
    for (const c of elegidas) {
      await PacienteComorbilidad.findOrCreate({
        where: { id_paciente: p.id_paciente, id_comorbilidad: c.id_comorbilidad },
        defaults: {
          id_paciente: p.id_paciente,
          id_comorbilidad: c.id_comorbilidad,
          fecha_deteccion: formatDate(fechaPasada(100 + p.id_paciente)),
          es_diagnostico_basal: true,
          recibe_tratamiento_farmacologico: true
        }
      });
    }
  }
}

async function createDeteccionTuberculosis(pacientes) {
  const citas = await Cita.findAll({ attributes: ['id_cita', 'id_paciente'], limit: 150 });
  const usados = new Set();
  for (const c of citas) {
    if (usados.has(c.id_paciente)) continue;
    if (Math.random() > 0.3) continue;
    usados.add(c.id_paciente);
    await DeteccionTuberculosis.create({
      id_paciente: c.id_paciente,
      id_cita: c.id_cita,
      fecha_deteccion: formatDate(fechaPasada(60)),
      aplicacion_encuesta: true,
      baciloscopia_realizada: true,
      baciloscopia_resultado: 'negativo',
      ingreso_tratamiento: false
    });
  }
}

async function createDeteccionComplicacion(pacientes, doctors, catalogs) {
  const coms = catalogs.comorbilidades;
  const porDoctor = Math.ceil(pacientes.length / doctors.length);
  for (let i = 0; i < pacientes.length; i++) {
    if (i % 3 !== 0) continue;
    const docIndex = Math.floor(i / porDoctor) % doctors.length;
    const doctor = doctors[docIndex].doctor;
    const cita = await Cita.findOne({ where: { id_paciente: pacientes[i].id_paciente } });
    const com = pick(coms);
    await DeteccionComplicacion.create({
      id_paciente: pacientes[i].id_paciente,
      id_doctor: doctor.id_doctor,
      id_cita: cita?.id_cita || null,
      id_comorbilidad: com.id_comorbilidad,
      fecha_deteccion: formatDate(fechaPasada(30)),
      exploracion_pies: true,
      exploracion_fondo_ojo: false,
      realiza_auto_monitoreo: true,
      registrado_por: 'doctor'
    });
  }
}

async function createEsquemaVacunacion(pacientes, catalogs) {
  const vacunas = catalogs.vacunas;
  for (const p of pacientes) {
    const n = 2 + (p.id_paciente % 3);
    const elegidas = pickN(vacunas, n);
    for (const v of elegidas) {
      await EsquemaVacunacion.create({
        id_paciente: p.id_paciente,
        vacuna: v.nombre_vacuna,
        fecha_aplicacion: formatDate(fechaPasada(50 + p.id_paciente % 200)),
        lote: `LOT-${1000 + p.id_paciente}`,
        observaciones: 'Aplicación en centro de salud'
      });
    }
  }
}

async function createNotificaciones(doctors, pacientes) {
  const porDoctor = Math.ceil(pacientes.length / doctors.length);
  const tipos = ['cita_actualizada', 'nuevo_mensaje', 'alerta_signos_vitales', 'solicitud_reprogramacion'];
  for (let d = 0; d < doctors.length; d++) {
    const doctor = doctors[d].doctor;
    const pacientesDoc = pacientes.slice(d * porDoctor, (d + 1) * porDoctor);
    if (pacientesDoc.length === 0) continue;
    for (let n = 0; n < 8; n++) {
      const p = pick(pacientesDoc);
      const cita = await Cita.findOne({ where: { id_doctor: doctor.id_doctor, id_paciente: p.id_paciente } });
      await NotificacionDoctor.create({
        id_doctor: doctor.id_doctor,
        id_paciente: p.id_paciente,
        id_cita: cita?.id_cita || null,
        tipo: pick(tipos),
        titulo: 'Notificación de prueba',
        mensaje: 'Mensaje generado por el sistema para pruebas.',
        estado: 'enviada',
        fecha_envio: new Date()
      });
    }
  }
}

async function createMensajesChat(pacientes, doctors) {
  const porDoctor = Math.ceil(pacientes.length / doctors.length);
  const textos = ['Buenos días, tengo una duda sobre mi tratamiento.', 'Gracias doctor, entendido.', '¿Puedo agendar cita para la próxima semana?', 'Mis signos vitales los registré en la app.', 'De acuerdo, seguiré las indicaciones.'];
  for (let i = 0; i < pacientes.length; i++) {
    const docIndex = Math.floor(i / porDoctor) % doctors.length;
    const doctor = doctors[docIndex].doctor;
    const nMsg = 2 + (i % 4);
    for (let m = 0; m < nMsg; m++) {
      await MensajeChat.create({
        id_paciente: pacientes[i].id_paciente,
        id_doctor: doctor.id_doctor,
        remitente: m % 2 === 0 ? 'Paciente' : 'Doctor',
        mensaje_texto: pick(textos),
        leido: m < nMsg - 1,
        fecha_envio: fechaPasada(nMsg - m)
      });
    }
  }
}

async function createRedApoyo(pacientes) {
  for (let i = 0; i < pacientes.length; i += 2) {
    await RedApoyo.create({
      id_paciente: pacientes[i].id_paciente,
      nombre_contacto: `Contacto ${pacientes[i].nombre} ${pacientes[i].apellido_paterno}`,
      parentesco: pick(['Cónyuge', 'Hijo/a', 'Hermano/a', 'Padre', 'Madre']),
      localidad: pacientes[i].localidad
    });
  }
}

async function createPlanesMedicacion(pacientes, doctors, catalogs) {
  const medicamentos = catalogs.medicamentos;
  const porDoctor = Math.ceil(pacientes.length / doctors.length);
  for (let i = 0; i < pacientes.length; i += 3) {
    const docIndex = Math.floor(i / porDoctor) % doctors.length;
    const doctor = doctors[docIndex].doctor;
    const cita = await Cita.findOne({ where: { id_paciente: pacientes[i].id_paciente } });
    const plan = await PlanMedicacion.create({
      id_paciente: pacientes[i].id_paciente,
      id_doctor: doctor.id_doctor,
      id_cita: cita?.id_cita || null,
      fecha_inicio: formatDate(fechaPasada(60)),
      fecha_fin: formatDate(fechaFutura(90)),
      activo: true,
      observaciones: 'Seguimiento mensual'
    });
    const med = pick(medicamentos);
    const detalle = await PlanDetalle.create({
      id_plan: plan.id_plan,
      id_medicamento: med.id_medicamento,
      dosis: '1 tableta',
      frecuencia: 'Cada 12 horas',
      horario: '08:00',
      via_administracion: 'Oral',
      observaciones: 'Tomar con alimentos'
    });
    await MedicamentoToma.create({
      id_plan_medicacion: plan.id_plan,
      id_plan_detalle: detalle.id_detalle,
      fecha_toma: new Date(),
      confirmado_por: 'Paciente'
    });
  }
}

async function main() {
  console.log('\n========== SEED DATOS DE PRUEBA - SISTEMA MÉDICO ==========\n');
  await sequelize.authenticate();
  console.log('1. Catálogos (módulos, comorbilidades, medicamentos, vacunas)...');
  const catalogs = await ensureCatalogs();
  console.log('2. Creando 5 doctores...');
  const doctors = await createDoctors(catalogs);
  console.log('3. Creando 100 pacientes (1 con PIN 2020)...');
  const { pacientes, pacienteConPin } = await createPacientes(catalogs, doctors);
  console.log('4. Asignando paciente a doctor (20 por doctor)...');
  await assignDoctorPaciente(pacientes, doctors);
  console.log('5. Citas (historial y futuras)...');
  await createCitas(pacientes, doctors);
  console.log('6. Signos vitales (monitoreo y en cita)...');
  await createSignosVitales(pacientes);
  console.log('7. Diagnósticos...');
  await createDiagnosticos(pacientes);
  console.log('8. Comorbilidades por paciente...');
  await createPacienteComorbilidad(pacientes, catalogs);
  console.log('9. Detección tuberculosis...');
  await createDeteccionTuberculosis(pacientes);
  console.log('10. Detección complicaciones...');
  await createDeteccionComplicacion(pacientes, doctors, catalogs);
  console.log('11. Esquema vacunación...');
  await createEsquemaVacunacion(pacientes, catalogs);
  console.log('12. Notificaciones doctor...');
  await createNotificaciones(doctors, pacientes);
  console.log('13. Mensajes chat paciente-doctor...');
  await createMensajesChat(pacientes, doctors);
  console.log('14. Red de apoyo...');
  await createRedApoyo(pacientes);
  console.log('15. Planes medicación y tomas...');
  await createPlanesMedicacion(pacientes, doctors, catalogs);

  console.log('\n========== CREDENCIALES DE ACCESO (SOLO ESTAS) ==========\n');
  console.log('--- PACIENTE CON PIN (solo este paciente) ---');
  console.log(`   PIN: ${PIN_PACIENTE_UNICO}`);
  if (pacienteConPin) {
    console.log(`   ID Paciente: ${pacienteConPin.id_paciente}`);
    console.log(`   Nombre: ${pacienteConPin.nombre} ${pacienteConPin.apellido_paterno} ${pacienteConPin.apellido_materno}`);
  }
  console.log('   Login app paciente: POST /api/auth-unified/login-paciente con body { "pin": "2020" } (y device_id si aplica)\n');
  const docExpuesto = doctors[CREDENTIALS_DOCTOR_INDEX];
  console.log('--- DOCTOR (solo estas credenciales) ---');
  console.log(`   Email: ${docExpuesto.email}`);
  console.log(`   Password: ${docExpuesto.password}`);
  console.log(`   ID Usuario: ${docExpuesto.usuario.id_usuario}`);
  console.log(`   ID Doctor: ${docExpuesto.doctor.id_doctor}`);
  console.log(`   Nombre: ${docExpuesto.doctor.nombre} ${docExpuesto.doctor.apellido_paterno} ${docExpuesto.doctor.apellido_materno}`);
  console.log('   Login: POST /api/auth/login con body { "email": "...", "password": "..." }');
  console.log('\n========== FIN SEED ==========\n');
  await sequelize.close();
}

main().catch((e) => {
  console.error('Error:', e.message);
  if (e.name === 'SequelizeValidationError' && e.errors) console.error('Detalles:', e.errors.map((x) => ({ path: x.path, message: x.message })));
  if (e.name === 'SequelizeUniqueConstraintError' && e.fields) console.error('Campos duplicados:', e.fields);
  process.exit(1);
});
