import sequelize from '../config/db.js';
import {
  Usuario,
  Doctor,
  Paciente,
  Cita,
  Diagnostico,
  SignoVital,
  Modulo,
  Comorbilidad,
  PacienteComorbilidad,
  DoctorPaciente,
} from '../models/associations.js';

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

async function ensureBaseComorbilidades(transaction) {
  const names = [
    'Hipertensión arterial',
    'Diabetes mellitus',
    'Asma',
    'EPOC',
    'Dislipidemia',
    'Hipotiroidismo',
  ];
  const created = [];
  for (const nombre of names) {
    const [c] = await Comorbilidad.findOrCreate({
      where: { nombre_comorbilidad: nombre },
      defaults: { nombre_comorbilidad: nombre, descripcion: `Comorbilidad: ${nombre}` },
      transaction,
    });
    created.push(c);
  }
  return created;
}

// DESHABILITADO: Los módulos deben crearse manualmente desde la interfaz de gestión
async function ensureModulos(transaction) {
  // const nombres = ['Modulo 1', 'Modulo 2', 'Modulo 3', 'Modulo 4', 'Modulo 5'];
  // const created = [];
  // for (const nombre_modulo of nombres) {
  //   const [m] = await Modulo.findOrCreate({
  //     where: { nombre_modulo },
  //     defaults: { nombre_modulo, created_at: new Date() },
  //     transaction,
  //   });
  //   created.push(m);
  // }
  // return created;
  console.log('📦 Módulos: Se deben crear manualmente desde la interfaz de gestión');
  return [];
}

async function createDoctor(transaction) {
  const [usuario] = await Usuario.findOrCreate({
    where: { email: 'dr.prueba@example.com' },
    defaults: {
      email: 'dr.prueba@example.com',
      password_hash: 'bcrypt$dummy-hash',
      rol: 'Doctor',
      activo: true,
    },
    transaction,
  });

  const [doctor] = await Doctor.findOrCreate({
    where: { id_usuario: usuario.id_usuario },
    defaults: {
      id_usuario: usuario.id_usuario,
      nombre: 'Laura',
      apellido_paterno: 'Gómez',
      telefono: '555-000-0000',
    },
    transaction,
  });
  return { usuario, doctor };
}

async function createPacientes(num, transaction) {
  const nombres = ['Carlos', 'María', 'José', 'Ana', 'Luis', 'Elena', 'Raúl'];
  const apellidos = ['Pérez', 'López', 'García', 'Ramírez', 'Hernández'];
  const pacientes = [];
  for (let i = 0; i < num; i++) {
    const nombre = randomChoice(nombres);
    const apellido = randomChoice(apellidos);
    const paciente = await Paciente.create(
      {
        nombre,
        apellido_paterno: apellido,
        fecha_nacimiento: '1990-01-15',
        sexo: randomChoice(['Hombre', 'Mujer']),
        numero_celular: `555000${100 + i}`,
        direccion: `Calle ${10 + i}, Colonia Demo`,
        localidad: 'CDMX',
        institucion_salud: randomChoice(['IMSS', 'ISSSTE', 'Bienestar', 'Particular', 'Otro']),
      },
      { transaction }
    );
    pacientes.push(paciente);
  }
  return pacientes;
}

async function linkDoctorPacientes(doctor, pacientes, transaction) {
  for (const p of pacientes) {
    await DoctorPaciente.findOrCreate({
      where: { id_doctor: doctor.id_doctor, id_paciente: p.id_paciente },
      defaults: { id_doctor: doctor.id_doctor, id_paciente: p.id_paciente },
      transaction,
    });
  }
}

async function assignComorbilidades(paciente, comorbilidades, transaction) {
  const pick = [...comorbilidades].sort(() => 0.5 - Math.random()).slice(0, 2);
  for (const c of pick) {
    await PacienteComorbilidad.findOrCreate({
      where: { id_paciente: paciente.id_paciente, id_comorbilidad: c.id_comorbilidad },
      defaults: {
        id_paciente: paciente.id_paciente,
        id_comorbilidad: c.id_comorbilidad,
        fecha_deteccion: addDays(new Date(), -300),
        observaciones: 'Detectada en control rutinario',
      },
      transaction,
    });
  }
}

async function createCitaCompleta(paciente, doctor, transaction) {
  const cita = await Cita.create(
    {
      id_paciente: paciente.id_paciente,
      id_doctor: doctor.id_doctor,
      fecha_cita: new Date(),
      motivo: 'Consulta de control',
      estado: 'completada',
      observaciones: 'Paciente en buen estado general',
    },
    { transaction }
  );

  await Diagnostico.create(
    {
      id_cita: cita.id_cita,
      descripcion: 'Diagnóstico de prueba: control general',
      fecha_registro: new Date(),
    },
    { transaction }
  );

  await SignoVital.create(
    {
      id_paciente: paciente.id_paciente,
      id_cita: cita.id_cita,
      registrado_por: 'doctor',
      fecha_medicion: new Date(),
      peso_kg: 72 + Math.floor(Math.random() * 8),
      talla_m: 1.68,
      presion_sistolica: 120 + Math.floor(Math.random() * 10),
      presion_diastolica: 80 + Math.floor(Math.random() * 5),
      glucosa_mg_dl: 95 + Math.floor(Math.random() * 10),
      colesterol_mg_dl: 180 + Math.floor(Math.random() * 20),
      trigliceridos_mg_dl: 140 + Math.floor(Math.random() * 20),
      observaciones: 'Signos vitales dentro de parámetros normales',
    },
    { transaction }
  );

  return cita;
}

async function main() {
  const transaction = await sequelize.transaction();
  try {
    const modulos = await ensureModulos(transaction);
    const comorbilidades = await ensureBaseComorbilidades(transaction);
    const { doctor } = await createDoctor(transaction);
    const pacientes = await createPacientes(5, transaction);

    await linkDoctorPacientes(doctor, pacientes, transaction);

    for (const p of pacientes) {
      await assignComorbilidades(p, comorbilidades, transaction);
      await createCitaCompleta(p, doctor, transaction);
    }

    await transaction.commit();
    // eslint-disable-next-line no-console
    console.log('✅ Seed completado: Módulos creados:', modulos.length);
    console.log('✅ Seed completado: 1 doctor y 5 pacientes con cita, signos, diagnóstico y comorbilidades.');
    process.exit(0);
  } catch (err) {
    await transaction.rollback();
    // eslint-disable-next-line no-console
    console.error('❌ Error en seed:', err.message);
    process.exit(1);
  }
}

main();


