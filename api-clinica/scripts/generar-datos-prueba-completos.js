/**
 * @file generar-datos-prueba-completos.js
 * @description Script para generar datos de prueba completos para testing de la aplicación
 * Genera: Módulos, Doctores, Pacientes, Citas, Signos Vitales, Diagnósticos, Medicamentos, etc.
 */

import sequelize from '../config/db.js';
import bcrypt from 'bcrypt';
import { 
  Usuario, 
  Doctor, 
  Paciente, 
  Modulo, 
  Cita, 
  DoctorPaciente,
  Comorbilidad,
  PacienteComorbilidad,
  SignoVital,
  Medicamento,
  PlanMedicacion,
  RedApoyo,
  Vacuna,
  EsquemaVacunacion,
  Diagnostico,
  SesionEducativa
} from '../models/associations.js';

// ==================== DATOS BASE ====================

const NOMBRES_MASCULINOS = [
  'Juan', 'Carlos', 'Miguel', 'José', 'Luis', 'Francisco', 'Antonio', 'Pedro',
  'Alejandro', 'Ricardo', 'Fernando', 'Roberto', 'Eduardo', 'Daniel', 'Sergio',
  'Andrés', 'Javier', 'Rafael', 'Manuel', 'Arturo', 'Guillermo', 'Héctor',
  'Víctor', 'Óscar', 'Raúl', 'Alberto', 'Enrique', 'Pablo', 'Jorge', 'Adrián'
];

const NOMBRES_FEMENINOS = [
  'María', 'Ana', 'Carmen', 'Laura', 'Patricia', 'Rosa', 'Guadalupe', 'Elena',
  'Sofía', 'Fernanda', 'Lucía', 'Valentina', 'Gabriela', 'Mariana', 'Andrea',
  'Daniela', 'Claudia', 'Verónica', 'Alejandra', 'Mónica', 'Silvia', 'Teresa',
  'Isabel', 'Diana', 'Alicia', 'Beatriz', 'Lorena', 'Sandra', 'Karla', 'Paola'
];

const APELLIDOS = [
  'García', 'Rodríguez', 'Martínez', 'López', 'González', 'Hernández', 'Pérez',
  'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Cruz',
  'Morales', 'Reyes', 'Jiménez', 'Ruiz', 'Vargas', 'Mendoza', 'Aguilar', 'Ortiz',
  'Castillo', 'Romero', 'Santos', 'Guerrero', 'Medina', 'Chávez', 'Vázquez',
  'Ramos', 'Herrera', 'Castro', 'Gutiérrez', 'Núñez', 'Delgado', 'Rojas', 'Salazar'
];

const GRADOS_ESTUDIO = [
  'Médico General',
  'Especialista',
  'Maestría en Ciencias Médicas',
  'Doctorado en Medicina',
  'Subespecialista'
];

const ESPECIALIDADES = [
  'Medicina General', 'Medicina Interna', 'Cardiología', 'Endocrinología',
  'Nefrología', 'Neumología', 'Geriatría', 'Medicina Familiar'
];

const COMORBILIDADES_LISTA = [
  { nombre: 'Diabetes Mellitus Tipo 2', descripcion: 'Trastorno metabólico caracterizado por hiperglucemia' },
  { nombre: 'Hipertensión Arterial', descripcion: 'Presión arterial elevada de forma crónica' },
  { nombre: 'Obesidad', descripcion: 'Exceso de peso corporal' },
  { nombre: 'Dislipidemia', descripcion: 'Alteración en los niveles de lípidos en sangre' },
  { nombre: 'Enfermedad Renal Crónica', descripcion: 'Pérdida gradual de la función renal' },
  { nombre: 'EPOC', descripcion: 'Enfermedad Pulmonar Obstructiva Crónica' },
  { nombre: 'Insuficiencia Cardíaca', descripcion: 'El corazón no bombea sangre eficientemente' },
  { nombre: 'Artritis Reumatoide', descripcion: 'Enfermedad autoinmune que afecta las articulaciones' },
  { nombre: 'Hipotiroidismo', descripcion: 'Producción insuficiente de hormonas tiroideas' },
  { nombre: 'Asma', descripcion: 'Enfermedad inflamatoria crónica de las vías respiratorias' }
];

const MEDICAMENTOS_LISTA = [
  { nombre_medicamento: 'Metformina 850mg', descripcion: 'Control de glucosa - Tabletas' },
  { nombre_medicamento: 'Losartán 50mg', descripcion: 'Control de presión arterial - Tabletas' },
  { nombre_medicamento: 'Atorvastatina 20mg', descripcion: 'Control de colesterol - Tabletas' },
  { nombre_medicamento: 'Omeprazol 20mg', descripcion: 'Protector gástrico - Cápsulas' },
  { nombre_medicamento: 'Amlodipino 5mg', descripcion: 'Antihipertensivo - Tabletas' },
  { nombre_medicamento: 'Insulina Glargina', descripcion: 'Control de diabetes - Inyectable' },
  { nombre_medicamento: 'Aspirina 100mg', descripcion: 'Antiagregante plaquetario - Tabletas' },
  { nombre_medicamento: 'Levotiroxina 100mcg', descripcion: 'Hipotiroidismo - Tabletas' },
  { nombre_medicamento: 'Enalapril 10mg', descripcion: 'Antihipertensivo - Tabletas' },
  { nombre_medicamento: 'Glibenclamida 5mg', descripcion: 'Antidiabético oral - Tabletas' }
];

const VACUNAS_LISTA = [
  { nombre_vacuna: 'Influenza', descripcion: 'Vacuna contra la influenza estacional' },
  { nombre_vacuna: 'Neumococo', descripcion: 'Vacuna contra neumonía neumocócica' },
  { nombre_vacuna: 'COVID-19', descripcion: 'Vacuna contra SARS-CoV-2' },
  { nombre_vacuna: 'Hepatitis B', descripcion: 'Vacuna contra hepatitis B' },
  { nombre_vacuna: 'Tétanos', descripcion: 'Vacuna antitetánica' },
  { nombre_vacuna: 'Herpes Zóster', descripcion: 'Vacuna contra el herpes zóster' }
];

const MOTIVOS_CITA = [
  'Consulta de control',
  'Seguimiento de tratamiento',
  'Revisión de estudios',
  'Control de diabetes',
  'Control de hipertensión',
  'Síntomas respiratorios',
  'Dolor abdominal',
  'Cefalea recurrente',
  'Fatiga crónica',
  'Control mensual'
];

const DIAGNOSTICOS_LISTA = [
  'Diabetes Mellitus Tipo 2 controlada',
  'Hipertensión arterial sistémica',
  'Síndrome metabólico',
  'Obesidad grado I',
  'Dislipidemia mixta',
  'Neuropatía diabética',
  'Retinopatía diabética no proliferativa',
  'Enfermedad renal crónica estadio 2',
  'Pie diabético sin úlcera',
  'Hipotiroidismo primario'
];

// ==================== FUNCIONES AUXILIARES ====================

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomElements(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generarCURP() {
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numeros = '0123456789';
  let curp = '';
  for (let i = 0; i < 4; i++) curp += letras[randomInt(0, 25)];
  for (let i = 0; i < 6; i++) curp += numeros[randomInt(0, 9)];
  curp += letras[randomInt(0, 25)];
  curp += letras[randomInt(0, 25)];
  for (let i = 0; i < 3; i++) curp += letras[randomInt(0, 25)];
  for (let i = 0; i < 2; i++) curp += numeros[randomInt(0, 9)];
  return curp;
}

function generarTelefono() {
  return `55${randomInt(10000000, 99999999)}`;
}

function generarFechaAleatoria(diasAtras, diasAdelante = 0) {
  const ahora = new Date();
  const diasOffset = randomInt(-diasAtras, diasAdelante);
  const fecha = new Date(ahora);
  fecha.setDate(fecha.getDate() + diasOffset);
  return fecha;
}

function generarFechaNacimiento(edadMin, edadMax) {
  const edad = randomInt(edadMin, edadMax);
  const fecha = new Date();
  fecha.setFullYear(fecha.getFullYear() - edad);
  fecha.setMonth(randomInt(0, 11));
  fecha.setDate(randomInt(1, 28));
  return fecha;
}

// ==================== FUNCIONES DE GENERACIÓN ====================

async function crearModulos() {
  console.log('\n📦 Creando/Verificando Módulos...');
  
  const modulosData = [
    { nombre_modulo: 'Módulo 1', descripcion: 'Módulo principal de atención primaria', ubicacion: 'Edificio A, Planta Baja' },
    { nombre_modulo: 'Módulo 2', descripcion: 'Módulo de especialidades', ubicacion: 'Edificio B, Primer Piso' },
    { nombre_modulo: 'Módulo 3', descripcion: 'Módulo de atención geriátrica', ubicacion: 'Edificio C, Planta Baja' }
  ];
  
  const modulos = [];
  for (const moduloData of modulosData) {
    const [modulo, created] = await Modulo.findOrCreate({
      where: { nombre_modulo: moduloData.nombre_modulo },
      defaults: moduloData
    });
    modulos.push(modulo);
    console.log(`   ${created ? '✅ Creado' : '📌 Existente'}: ${modulo.nombre_modulo}`);
  }
  
  return modulos;
}

async function crearComorbilidades() {
  console.log('\n🏥 Creando/Verificando Comorbilidades...');
  
  const comorbilidades = [];
  for (const comorb of COMORBILIDADES_LISTA) {
    const [comorbilidad, created] = await Comorbilidad.findOrCreate({
      where: { nombre_comorbilidad: comorb.nombre },
      defaults: { nombre_comorbilidad: comorb.nombre, descripcion: comorb.descripcion }
    });
    comorbilidades.push(comorbilidad);
  }
  console.log(`   ✅ ${comorbilidades.length} comorbilidades disponibles`);
  return comorbilidades;
}

async function crearMedicamentos() {
  console.log('\n💊 Creando/Verificando Medicamentos...');
  
  const medicamentos = [];
  for (const med of MEDICAMENTOS_LISTA) {
    const [medicamento, created] = await Medicamento.findOrCreate({
      where: { nombre_medicamento: med.nombre_medicamento },
      defaults: med
    });
    medicamentos.push(medicamento);
  }
  console.log(`   ✅ ${medicamentos.length} medicamentos disponibles`);
  return medicamentos;
}

async function crearVacunas() {
  console.log('\n💉 Creando/Verificando Vacunas...');
  
  const vacunas = [];
  for (const vac of VACUNAS_LISTA) {
    const [vacuna, created] = await Vacuna.findOrCreate({
      where: { nombre_vacuna: vac.nombre_vacuna },
      defaults: vac
    });
    vacunas.push(vacuna);
  }
  console.log(`   ✅ ${vacunas.length} vacunas disponibles`);
  return vacunas;
}

async function crearDoctores(modulos, cantidad = 30) {
  console.log(`\n👨‍⚕️ Creando ${cantidad} Doctores...`);
  
  const doctores = [];
  const passwordHash = await bcrypt.hash('Doctor123!', 10);
  
  for (let i = 1; i <= cantidad; i++) {
    const genero = randomInt(0, 1) === 0 ? 'M' : 'F';
    const nombres = genero === 'M' ? NOMBRES_MASCULINOS : NOMBRES_FEMENINOS;
    const nombre = randomElement(nombres);
    const apellidoPaterno = randomElement(APELLIDOS);
    const apellidoMaterno = randomElement(APELLIDOS);
    const modulo = randomElement(modulos);
    const activo = Math.random() > 0.15; // 85% activos
    
    try {
      // Crear usuario
      const usuario = await Usuario.create({
        email: `doctor${i}@clinica.com`,
        password_hash: passwordHash,
        rol: 'Doctor',
        activo: activo,
        fecha_creacion: generarFechaAleatoria(730) // Últimos 2 años
      });
      
      // Crear doctor
      const doctor = await Doctor.create({
        id_usuario: usuario.id_usuario,
        id_modulo: modulo.id_modulo,
        nombre: nombre,
        apellido_paterno: apellidoPaterno,
        apellido_materno: apellidoMaterno,
        grado_estudio: randomElement(GRADOS_ESTUDIO),
        especialidad: randomElement(ESPECIALIDADES),
        cedula_profesional: `CED${String(i).padStart(6, '0')}`,
        telefono: generarTelefono(),
        activo: activo
      });
      
      doctores.push(doctor);
      
      if (i % 10 === 0) {
        console.log(`   ✅ ${i}/${cantidad} doctores creados...`);
      }
    } catch (error) {
      console.log(`   ⚠️ Doctor ${i} ya existe o error: ${error.message}`);
    }
  }
  
  console.log(`   ✅ Total: ${doctores.length} doctores creados`);
  return doctores;
}

async function crearPacientes(modulos, cantidad = 100) {
  console.log(`\n👥 Creando ${cantidad} Pacientes...`);
  
  const pacientes = [];
  const passwordHash = await bcrypt.hash('Paciente123!', 10);
  
  for (let i = 1; i <= cantidad; i++) {
    const genero = randomInt(0, 1) === 0 ? 'Masculino' : 'Femenino';
    const nombres = genero === 'Masculino' ? NOMBRES_MASCULINOS : NOMBRES_FEMENINOS;
    const nombre = randomElement(nombres);
    const apellidoPaterno = randomElement(APELLIDOS);
    const apellidoMaterno = randomElement(APELLIDOS);
    const modulo = randomElement(modulos);
    const activo = Math.random() > 0.1; // 90% activos
    
    try {
      // Crear usuario
      const usuario = await Usuario.create({
        email: `paciente${i}@email.com`,
        password_hash: passwordHash,
        rol: 'Paciente',
        activo: activo,
        fecha_creacion: generarFechaAleatoria(365) // Último año
      });
      
      // Crear paciente
      const paciente = await Paciente.create({
        id_usuario: usuario.id_usuario,
        id_modulo: modulo.id_modulo,
        nombre: nombre,
        apellido_paterno: apellidoPaterno,
        apellido_materno: apellidoMaterno,
        fecha_nacimiento: generarFechaNacimiento(25, 80),
        genero: genero,
        curp: generarCURP(),
        telefono: generarTelefono(),
        direccion: `Calle ${randomInt(1, 100)} #${randomInt(1, 500)}, Colonia ${randomElement(APELLIDOS)}`,
        activo: activo,
        fecha_registro: generarFechaAleatoria(365)
      });
      
      pacientes.push(paciente);
      
      if (i % 20 === 0) {
        console.log(`   ✅ ${i}/${cantidad} pacientes creados...`);
      }
    } catch (error) {
      console.log(`   ⚠️ Paciente ${i} ya existe o error: ${error.message}`);
    }
  }
  
  console.log(`   ✅ Total: ${pacientes.length} pacientes creados`);
  return pacientes;
}

async function asignarPacientesADoctores(doctores, pacientes) {
  console.log('\n🔗 Asignando pacientes a doctores...');
  
  let asignaciones = 0;
  
  for (const paciente of pacientes) {
    // Cada paciente tiene 1-3 doctores
    const numDoctores = randomInt(1, 3);
    const doctoresAsignados = randomElements(doctores, numDoctores);
    
    for (const doctor of doctoresAsignados) {
      try {
        await DoctorPaciente.findOrCreate({
          where: {
            id_doctor: doctor.id_doctor,
            id_paciente: paciente.id_paciente
          },
          defaults: {
            fecha_asignacion: generarFechaAleatoria(180),
            observaciones: 'Asignación automática de prueba'
          }
        });
        asignaciones++;
      } catch (error) {
        // Ignorar duplicados
      }
    }
  }
  
  console.log(`   ✅ ${asignaciones} asignaciones doctor-paciente creadas`);
}

async function crearComorbilidadesPacientes(pacientes, comorbilidades) {
  console.log('\n🏥 Asignando comorbilidades a pacientes...');
  
  let asignaciones = 0;
  
  for (const paciente of pacientes) {
    // Cada paciente tiene 0-4 comorbilidades
    const numComorbilidades = randomInt(0, 4);
    if (numComorbilidades === 0) continue;
    
    const comorbilidadesAsignadas = randomElements(comorbilidades, numComorbilidades);
    
    for (const comorbilidad of comorbilidadesAsignadas) {
      try {
        await PacienteComorbilidad.create({
          id_paciente: paciente.id_paciente,
          id_comorbilidad: comorbilidad.id_comorbilidad,
          fecha_deteccion: generarFechaAleatoria(1095), // Últimos 3 años
          observaciones: `Detectado en consulta de rutina`
        });
        asignaciones++;
      } catch (error) {
        // Ignorar duplicados
      }
    }
  }
  
  console.log(`   ✅ ${asignaciones} comorbilidades asignadas`);
}

async function crearSignosVitales(pacientes) {
  console.log('\n💓 Creando registros de signos vitales...');
  
  let registros = 0;
  
  for (const paciente of pacientes) {
    // Cada paciente tiene 3-8 registros de signos vitales
    const numRegistros = randomInt(3, 8);
    
    for (let i = 0; i < numRegistros; i++) {
      try {
        await SignoVital.create({
          id_paciente: paciente.id_paciente,
          fecha_registro: generarFechaAleatoria(180),
          presion_sistolica: randomInt(100, 160),
          presion_diastolica: randomInt(60, 100),
          frecuencia_cardiaca: randomInt(55, 100),
          frecuencia_respiratoria: randomInt(12, 22),
          temperatura: (36 + Math.random() * 2).toFixed(1),
          peso: randomInt(50, 120),
          talla: randomInt(150, 190),
          glucosa: randomInt(70, 200),
          saturacion_oxigeno: randomInt(92, 100),
          observaciones: Math.random() > 0.7 ? 'Valores dentro de parámetros normales' : null
        });
        registros++;
      } catch (error) {
        // Continuar si hay error
      }
    }
  }
  
  console.log(`   ✅ ${registros} registros de signos vitales creados`);
}

async function crearMedicamentosPacientes(pacientes, medicamentos) {
  console.log('\n💊 Asignando planes de medicación a pacientes...');
  
  let asignaciones = 0;
  const frecuencias = ['Cada 8 horas', 'Cada 12 horas', 'Cada 24 horas', 'Una vez al día', 'Dos veces al día'];
  
  for (const paciente of pacientes) {
    // Cada paciente tiene 0-3 planes de medicación
    const numPlanes = randomInt(0, 3);
    if (numPlanes === 0) continue;
    
    for (let p = 0; p < numPlanes; p++) {
      try {
        // Crear plan de medicación
        const plan = await PlanMedicacion.create({
          id_paciente: paciente.id_paciente,
          nombre_plan: `Plan de tratamiento ${p + 1}`,
          fecha_inicio: generarFechaAleatoria(365),
          fecha_fin: Math.random() > 0.5 ? generarFechaAleatoria(0, 180) : null,
          activo: Math.random() > 0.2,
          observaciones: 'Plan de medicación generado para pruebas'
        });
        asignaciones++;
      } catch (error) {
        // Continuar
      }
    }
  }
  
  console.log(`   ✅ ${asignaciones} planes de medicación creados`);
}

async function crearRedApoyo(pacientes) {
  console.log('\n👨‍👩‍👧‍👦 Creando red de apoyo...');
  
  let contactos = 0;
  const parentescos = ['Esposo(a)', 'Hijo(a)', 'Hermano(a)', 'Padre', 'Madre', 'Sobrino(a)', 'Nieto(a)'];
  
  for (const paciente of pacientes) {
    // Cada paciente tiene 1-3 contactos
    const numContactos = randomInt(1, 3);
    
    for (let i = 0; i < numContactos; i++) {
      const generoContacto = randomInt(0, 1) === 0 ? 'M' : 'F';
      const nombres = generoContacto === 'M' ? NOMBRES_MASCULINOS : NOMBRES_FEMENINOS;
      
      try {
        await RedApoyo.create({
          id_paciente: paciente.id_paciente,
          nombre_contacto: `${randomElement(nombres)} ${randomElement(APELLIDOS)}`,
          parentesco: randomElement(parentescos),
          telefono: generarTelefono(),
          es_contacto_emergencia: i === 0, // El primero es contacto de emergencia
          observaciones: Math.random() > 0.7 ? 'Disponible en horario laboral' : null
        });
        contactos++;
      } catch (error) {
        // Continuar
      }
    }
  }
  
  console.log(`   ✅ ${contactos} contactos de red de apoyo creados`);
}

async function crearEsquemaVacunacion(pacientes, vacunas) {
  console.log('\n💉 Creando esquema de vacunación...');
  
  let aplicaciones = 0;
  
  for (const paciente of pacientes) {
    // Cada paciente tiene 2-6 vacunas
    const numVacunas = randomInt(2, 6);
    const vacunasAsignadas = randomElements(vacunas, numVacunas);
    
    for (const vacuna of vacunasAsignadas) {
      try {
        await EsquemaVacunacion.create({
          id_paciente: paciente.id_paciente,
          id_vacuna: vacuna.id_vacuna,
          fecha_aplicacion: generarFechaAleatoria(730),
          dosis: randomInt(1, 3),
          lote: `LOT${randomInt(10000, 99999)}`,
          observaciones: 'Aplicación sin complicaciones'
        });
        aplicaciones++;
      } catch (error) {
        // Ignorar duplicados
      }
    }
  }
  
  console.log(`   ✅ ${aplicaciones} vacunas aplicadas`);
}

async function crearDiagnosticos(pacientes) {
  console.log('\n📋 Creando diagnósticos...');
  
  let diagnosticos = 0;
  
  for (const paciente of pacientes) {
    // Cada paciente tiene 1-4 diagnósticos
    const numDiagnosticos = randomInt(1, 4);
    const diagnosticosSeleccionados = randomElements(DIAGNOSTICOS_LISTA, numDiagnosticos);
    
    for (const diagnostico of diagnosticosSeleccionados) {
      try {
        await Diagnostico.create({
          id_paciente: paciente.id_paciente,
          descripcion: diagnostico,
          fecha_diagnostico: generarFechaAleatoria(730),
          activo: Math.random() > 0.2,
          observaciones: Math.random() > 0.5 ? 'Requiere seguimiento' : null
        });
        diagnosticos++;
      } catch (error) {
        // Continuar
      }
    }
  }
  
  console.log(`   ✅ ${diagnosticos} diagnósticos creados`);
}

async function crearSesionesEducativas(pacientes) {
  console.log('\n📚 Creando sesiones educativas...');
  
  let sesiones = 0;
  const temas = [
    'Alimentación saludable',
    'Cuidado del pie diabético',
    'Importancia del ejercicio',
    'Manejo del estrés',
    'Automonitoreo de glucosa',
    'Prevención de complicaciones'
  ];
  
  for (const paciente of pacientes) {
    // Cada paciente tiene 0-3 sesiones
    const numSesiones = randomInt(0, 3);
    
    for (let i = 0; i < numSesiones; i++) {
      try {
        await SesionEducativa.create({
          id_paciente: paciente.id_paciente,
          tema: randomElement(temas),
          fecha_sesion: generarFechaAleatoria(365),
          duracion_minutos: randomInt(30, 90),
          observaciones: 'Paciente participativo',
          completada: Math.random() > 0.2
        });
        sesiones++;
      } catch (error) {
        // Continuar
      }
    }
  }
  
  console.log(`   ✅ ${sesiones} sesiones educativas creadas`);
}

async function crearCitas(doctores, pacientes) {
  console.log('\n📅 Creando citas...');
  
  let citasCreadas = 0;
  const estados = ['pendiente', 'atendida', 'cancelada', 'no_asistio'];
  
  // Obtener asignaciones doctor-paciente
  const asignaciones = await DoctorPaciente.findAll();
  
  for (const asignacion of asignaciones) {
    // Cada relación doctor-paciente tiene 1-5 citas
    const numCitas = randomInt(1, 5);
    
    for (let i = 0; i < numCitas; i++) {
      const esFutura = Math.random() > 0.6;
      const fecha = esFutura 
        ? generarFechaAleatoria(0, 30) // Próximos 30 días
        : generarFechaAleatoria(180, 0); // Últimos 180 días
      
      let estado;
      if (esFutura) {
        estado = 'pendiente';
      } else {
        // Citas pasadas: 60% atendidas, 25% no asistió, 15% canceladas
        const rand = Math.random();
        if (rand < 0.6) estado = 'atendida';
        else if (rand < 0.85) estado = 'no_asistio';
        else estado = 'cancelada';
      }
      
      try {
        await Cita.create({
          id_paciente: asignacion.id_paciente,
          id_doctor: asignacion.id_doctor,
          fecha_cita: fecha,
          hora_cita: `${randomInt(8, 18)}:${randomInt(0, 1) === 0 ? '00' : '30'}:00`,
          motivo: randomElement(MOTIVOS_CITA),
          estado: estado,
          notas: estado === 'atendida' ? 'Consulta realizada sin complicaciones' : null,
          asistencia: estado === 'atendida' ? true : (estado === 'no_asistio' ? false : null)
        });
        citasCreadas++;
      } catch (error) {
        // Continuar
      }
    }
  }
  
  console.log(`   ✅ ${citasCreadas} citas creadas`);
}

// ==================== FUNCIÓN PRINCIPAL ====================

async function generarDatosPrueba() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 GENERADOR DE DATOS DE PRUEBA COMPLETOS');
  console.log('='.repeat(60));
  
  try {
    // 1. Crear módulos
    const modulos = await crearModulos();
    
    // 2. Crear catálogos base
    const comorbilidades = await crearComorbilidades();
    const medicamentos = await crearMedicamentos();
    const vacunas = await crearVacunas();
    
    // 3. Crear doctores
    const doctores = await crearDoctores(modulos, 30);
    
    // 4. Crear pacientes
    const pacientes = await crearPacientes(modulos, 100);
    
    // 5. Asignar pacientes a doctores
    await asignarPacientesADoctores(doctores, pacientes);
    
    // 6. Crear datos médicos de pacientes
    await crearComorbilidadesPacientes(pacientes, comorbilidades);
    await crearSignosVitales(pacientes);
    await crearMedicamentosPacientes(pacientes, medicamentos);
    await crearRedApoyo(pacientes);
    await crearEsquemaVacunacion(pacientes, vacunas);
    await crearDiagnosticos(pacientes);
    await crearSesionesEducativas(pacientes);
    
    // 7. Crear citas
    await crearCitas(doctores, pacientes);
    
    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('✅ GENERACIÓN DE DATOS COMPLETADA');
    console.log('='.repeat(60));
    console.log(`
📊 RESUMEN:
   • Módulos: ${modulos.length}
   • Doctores: ${doctores.length}
   • Pacientes: ${pacientes.length}
   • Comorbilidades disponibles: ${comorbilidades.length}
   • Medicamentos disponibles: ${medicamentos.length}
   • Vacunas disponibles: ${vacunas.length}
   
🔐 CREDENCIALES DE PRUEBA:
   • Doctores: doctor1@clinica.com a doctor30@clinica.com
     Contraseña: Doctor123!
   • Pacientes: paciente1@email.com a paciente100@email.com
     Contraseña: Paciente123!
`);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error);
  } finally {
    await sequelize.close();
    console.log('\n🔒 Conexión a base de datos cerrada.');
  }
}

// Ejecutar
generarDatosPrueba();
