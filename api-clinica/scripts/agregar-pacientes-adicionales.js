/**
 * @file agregar-pacientes-adicionales.js
 * @description Script para agregar 50 pacientes adicionales con datos completos
 * Fechas de registro variadas (1-6 meses atrás) para probar filtros y gráficos
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
  'Víctor', 'Óscar', 'Raúl', 'Alberto', 'Enrique', 'Pablo', 'Jorge', 'Adrián',
  'Ignacio', 'Ramón', 'Salvador', 'Ernesto', 'Alfredo', 'Mauricio', 'César'
];

const NOMBRES_FEMENINOS = [
  'María', 'Ana', 'Carmen', 'Laura', 'Patricia', 'Rosa', 'Guadalupe', 'Elena',
  'Sofía', 'Fernanda', 'Lucía', 'Valentina', 'Gabriela', 'Mariana', 'Andrea',
  'Daniela', 'Claudia', 'Verónica', 'Alejandra', 'Mónica', 'Silvia', 'Teresa',
  'Isabel', 'Diana', 'Alicia', 'Beatriz', 'Lorena', 'Sandra', 'Karla', 'Paola',
  'Natalia', 'Jimena', 'Adriana', 'Carolina', 'Martha', 'Estela', 'Rocío'
];

const APELLIDOS = [
  'García', 'Rodríguez', 'Martínez', 'López', 'González', 'Hernández', 'Pérez',
  'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Cruz',
  'Morales', 'Reyes', 'Jiménez', 'Ruiz', 'Vargas', 'Mendoza', 'Aguilar', 'Ortiz',
  'Castillo', 'Romero', 'Santos', 'Guerrero', 'Medina', 'Chávez', 'Vázquez',
  'Ramos', 'Herrera', 'Castro', 'Gutiérrez', 'Núñez', 'Delgado', 'Rojas', 'Salazar',
  'Orozco', 'Cervantes', 'Luna', 'Ibarra', 'Espinoza', 'Contreras', 'Fuentes'
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
  'Control mensual',
  'Revisión general',
  'Ajuste de medicación'
];

const DIAGNOSTICOS_LISTA = [
  'Diabetes Mellitus Tipo 2 controlada',
  'Hipertensión arterial sistémica',
  'Síndrome metabólico',
  'Obesidad grado I',
  'Dislipidemia mixta',
  'Neuropatía diabética leve',
  'Retinopatía diabética no proliferativa',
  'Enfermedad renal crónica estadio 2',
  'Pie diabético sin úlcera activa',
  'Hipotiroidismo primario compensado',
  'Prediabetes',
  'Resistencia a la insulina'
];

const TEMAS_EDUCATIVOS = [
  'Alimentación saludable para diabéticos',
  'Cuidado del pie diabético',
  'Importancia del ejercicio físico',
  'Manejo del estrés y ansiedad',
  'Automonitoreo de glucosa capilar',
  'Prevención de complicaciones crónicas',
  'Uso correcto de medicamentos',
  'Signos de alarma en diabetes'
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
  return shuffled.slice(0, Math.min(count, array.length));
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

// Generar fecha de registro entre 1 y 6 meses atrás
function generarFechaRegistro() {
  const ahora = new Date();
  const diasAtras = randomInt(30, 180); // Entre 1 y 6 meses atrás
  const fecha = new Date(ahora);
  fecha.setDate(fecha.getDate() - diasAtras);
  return fecha;
}

// Generar fecha aleatoria
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

async function obtenerDatosExistentes() {
  console.log('\n📋 Obteniendo datos existentes...');
  
  const modulos = await Modulo.findAll();
  const doctores = await Doctor.findAll({ where: { activo: true } });
  const comorbilidades = await Comorbilidad.findAll();
  const vacunas = await Vacuna.findAll();
  
  // Contar pacientes existentes para determinar el siguiente índice
  const ultimoPaciente = await Paciente.findOne({
    order: [['id_paciente', 'DESC']]
  });
  
  const ultimoUsuario = await Usuario.findOne({
    order: [['id_usuario', 'DESC']]
  });
  
  console.log(`   📦 Módulos: ${modulos.length}`);
  console.log(`   👨‍⚕️ Doctores activos: ${doctores.length}`);
  console.log(`   🏥 Comorbilidades: ${comorbilidades.length}`);
  console.log(`   💉 Vacunas: ${vacunas.length}`);
  console.log(`   👥 Último ID paciente: ${ultimoPaciente?.id_paciente || 0}`);
  
  return { modulos, doctores, comorbilidades, vacunas, ultimoUsuario };
}

async function crearPacientesAdicionales(modulos, cantidad = 50, startIndex = 51) {
  console.log(`\n👥 Creando ${cantidad} pacientes adicionales (índice inicial: ${startIndex})...`);
  
  const pacientes = [];
  const passwordHash = await bcrypt.hash('Paciente123!', 10);
  const estados = ['Ciudad de México', 'Estado de México', 'Jalisco', 'Nuevo León', 'Puebla', 'Guanajuato', 'Veracruz', 'Chiapas', 'Oaxaca', 'Querétaro'];
  
  for (let i = 0; i < cantidad; i++) {
    const index = startIndex + i;
    const sexo = randomInt(0, 1) === 0 ? 'Hombre' : 'Mujer';
    const nombres = sexo === 'Hombre' ? NOMBRES_MASCULINOS : NOMBRES_FEMENINOS;
    const nombre = randomElement(nombres);
    const apellidoPaterno = randomElement(APELLIDOS);
    const apellidoMaterno = randomElement(APELLIDOS);
    const modulo = randomElement(modulos);
    const activo = Math.random() > 0.08; // 92% activos
    const fechaRegistro = generarFechaRegistro(); // 1-6 meses atrás
    
    // Generar fecha de nacimiento como string YYYY-MM-DD
    const fechaNac = generarFechaNacimiento(25, 80);
    const fechaNacString = fechaNac.toISOString().split('T')[0];
    
    try {
      // Crear usuario
      const usuario = await Usuario.create({
        email: `paciente${index}@email.com`,
        password_hash: passwordHash,
        rol: 'Paciente',
        activo: activo,
        fecha_creacion: fechaRegistro
      });
      
      // Crear paciente con fecha de registro variada
      const paciente = await Paciente.create({
        id_usuario: usuario.id_usuario,
        id_modulo: modulo.id_modulo,
        nombre: nombre,
        apellido_paterno: apellidoPaterno,
        apellido_materno: apellidoMaterno,
        fecha_nacimiento: fechaNacString,
        sexo: sexo,
        curp: generarCURP(),
        numero_celular: generarTelefono(),
        direccion: `Calle ${randomInt(1, 200)} #${randomInt(1, 999)}, Col. ${randomElement(APELLIDOS)}`,
        estado: randomElement(estados),
        localidad: `Localidad ${randomInt(1, 50)}`,
        activo: activo,
        fecha_registro: fechaRegistro
      });
      
      pacientes.push(paciente);
      
      // Mostrar progreso cada 10 pacientes
      if ((i + 1) % 10 === 0) {
        console.log(`   ✅ ${i + 1}/${cantidad} pacientes creados...`);
      }
    } catch (error) {
      console.log(`   ⚠️ Error creando paciente ${index}: ${error.message}`);
    }
  }
  
  console.log(`   ✅ Total: ${pacientes.length} pacientes nuevos creados`);
  return pacientes;
}

async function asignarPacientesADoctores(doctores, pacientes) {
  console.log('\n🔗 Asignando pacientes a doctores...');
  
  let asignaciones = 0;
  
  for (const paciente of pacientes) {
    // Cada paciente tiene 1-2 doctores asignados
    const numDoctores = randomInt(1, 2);
    const doctoresAsignados = randomElements(doctores, numDoctores);
    
    for (const doctor of doctoresAsignados) {
      try {
        await DoctorPaciente.findOrCreate({
          where: {
            id_doctor: doctor.id_doctor,
            id_paciente: paciente.id_paciente
          },
          defaults: {
            fecha_asignacion: paciente.fecha_registro || new Date(),
            observaciones: 'Asignación de prueba'
          }
        });
        asignaciones++;
      } catch (error) {
        // Ignorar duplicados
      }
    }
  }
  
  console.log(`   ✅ ${asignaciones} asignaciones doctor-paciente creadas`);
  return asignaciones;
}

async function crearComorbilidadesPacientes(pacientes, comorbilidades) {
  console.log('\n🏥 Asignando comorbilidades a pacientes...');
  
  let asignaciones = 0;
  
  for (const paciente of pacientes) {
    const numComorbilidades = randomInt(1, 4); // 1-4 comorbilidades
    const comorbilidadesAsignadas = randomElements(comorbilidades, numComorbilidades);
    
    for (const comorbilidad of comorbilidadesAsignadas) {
      try {
        // Fecha de detección posterior a la fecha de registro
        const fechaRegistro = new Date(paciente.fecha_registro);
        const diasDespues = randomInt(1, 60);
        const fechaDeteccion = new Date(fechaRegistro);
        fechaDeteccion.setDate(fechaDeteccion.getDate() + diasDespues);
        
        await PacienteComorbilidad.create({
          id_paciente: paciente.id_paciente,
          id_comorbilidad: comorbilidad.id_comorbilidad,
          fecha_deteccion: fechaDeteccion,
          observaciones: 'Detectado en consulta de rutina'
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
    const numRegistros = randomInt(4, 10); // 4-10 registros por paciente
    const fechaRegistro = new Date(paciente.fecha_registro);
    
    for (let i = 0; i < numRegistros; i++) {
      try {
        // Distribuir las fechas desde el registro hasta hoy
        const diasDespues = randomInt(1, Math.floor((new Date() - fechaRegistro) / (1000 * 60 * 60 * 24)));
        const fechaSignos = new Date(fechaRegistro);
        fechaSignos.setDate(fechaSignos.getDate() + diasDespues);
        
        await SignoVital.create({
          id_paciente: paciente.id_paciente,
          fecha_registro: fechaSignos,
          presion_sistolica: randomInt(100, 160),
          presion_diastolica: randomInt(60, 100),
          frecuencia_cardiaca: randomInt(55, 100),
          frecuencia_respiratoria: randomInt(12, 22),
          temperatura: (36 + Math.random() * 2).toFixed(1),
          peso: randomInt(50, 120),
          talla: randomInt(150, 190),
          glucosa: randomInt(70, 250), // Variado para ver diferencias en gráficos
          saturacion_oxigeno: randomInt(92, 100),
          observaciones: Math.random() > 0.6 ? 'Registro de control' : null
        });
        registros++;
      } catch (error) {
        // Continuar
      }
    }
  }
  
  console.log(`   ✅ ${registros} registros de signos vitales creados`);
}

async function crearRedApoyo(pacientes) {
  console.log('\n👨‍👩‍👧‍👦 Creando red de apoyo...');
  
  let contactos = 0;
  const parentescos = ['Esposo(a)', 'Hijo(a)', 'Hermano(a)', 'Padre', 'Madre', 'Sobrino(a)', 'Nieto(a)', 'Amigo(a)'];
  
  for (const paciente of pacientes) {
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
          es_contacto_emergencia: i === 0,
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
    const numVacunas = randomInt(2, Math.min(5, vacunas.length));
    const vacunasAsignadas = randomElements(vacunas, numVacunas);
    
    for (const vacuna of vacunasAsignadas) {
      try {
        await EsquemaVacunacion.create({
          id_paciente: paciente.id_paciente,
          id_vacuna: vacuna.id_vacuna,
          fecha_aplicacion: generarFechaAleatoria(365),
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
    const numDiagnosticos = randomInt(1, 4);
    const diagnosticosSeleccionados = randomElements(DIAGNOSTICOS_LISTA, numDiagnosticos);
    
    for (const diagnostico of diagnosticosSeleccionados) {
      try {
        const fechaRegistro = new Date(paciente.fecha_registro);
        const diasDespues = randomInt(5, 90);
        const fechaDiagnostico = new Date(fechaRegistro);
        fechaDiagnostico.setDate(fechaDiagnostico.getDate() + diasDespues);
        
        await Diagnostico.create({
          id_paciente: paciente.id_paciente,
          descripcion: diagnostico,
          fecha_diagnostico: fechaDiagnostico,
          activo: Math.random() > 0.15,
          observaciones: Math.random() > 0.5 ? 'Requiere seguimiento continuo' : null
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
  
  for (const paciente of pacientes) {
    const numSesiones = randomInt(0, 4);
    
    for (let i = 0; i < numSesiones; i++) {
      try {
        await SesionEducativa.create({
          id_paciente: paciente.id_paciente,
          tema: randomElement(TEMAS_EDUCATIVOS),
          fecha_sesion: generarFechaAleatoria(120),
          duracion_minutos: randomInt(30, 90),
          observaciones: 'Paciente participativo',
          completada: Math.random() > 0.15
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
  
  // Obtener asignaciones de estos pacientes
  const pacienteIds = pacientes.map(p => p.id_paciente);
  const asignaciones = await DoctorPaciente.findAll({
    where: { id_paciente: pacienteIds }
  });
  
  for (const asignacion of asignaciones) {
    const numCitas = randomInt(2, 6); // 2-6 citas por relación
    
    for (let i = 0; i < numCitas; i++) {
      const esFutura = Math.random() > 0.65; // 35% futuras
      const fecha = esFutura 
        ? generarFechaAleatoria(0, 45) // Próximos 45 días
        : generarFechaAleatoria(150, 0); // Últimos 150 días
      
      let estado;
      let asistencia = null;
      
      if (esFutura) {
        estado = 'pendiente';
      } else {
        const rand = Math.random();
        if (rand < 0.55) {
          estado = 'atendida';
          asistencia = true;
        } else if (rand < 0.80) {
          estado = 'no_asistio';
          asistencia = false;
        } else {
          estado = 'cancelada';
        }
      }
      
      try {
        await Cita.create({
          id_paciente: asignacion.id_paciente,
          id_doctor: asignacion.id_doctor,
          fecha_cita: fecha,
          hora_cita: `${randomInt(8, 18)}:${randomInt(0, 1) === 0 ? '00' : '30'}:00`,
          motivo: randomElement(MOTIVOS_CITA),
          estado: estado,
          notas: estado === 'atendida' ? 'Consulta realizada satisfactoriamente' : null,
          asistencia: asistencia
        });
        citasCreadas++;
      } catch (error) {
        // Continuar
      }
    }
  }
  
  console.log(`   ✅ ${citasCreadas} citas creadas`);
}

async function crearPlanesMedicacion(pacientes) {
  console.log('\n💊 Creando planes de medicación...');
  
  let planes = 0;
  
  for (const paciente of pacientes) {
    const numPlanes = randomInt(0, 2);
    
    for (let i = 0; i < numPlanes; i++) {
      try {
        await PlanMedicacion.create({
          id_paciente: paciente.id_paciente,
          nombre_plan: `Plan de tratamiento ${i + 1}`,
          fecha_inicio: generarFechaAleatoria(180),
          fecha_fin: Math.random() > 0.5 ? generarFechaAleatoria(0, 90) : null,
          activo: Math.random() > 0.2,
          observaciones: 'Plan de medicación para control de enfermedad crónica'
        });
        planes++;
      } catch (error) {
        // Continuar
      }
    }
  }
  
  console.log(`   ✅ ${planes} planes de medicación creados`);
}

// ==================== FUNCIÓN PRINCIPAL ====================

async function agregarPacientesAdicionales() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 AGREGANDO 50 PACIENTES ADICIONALES');
  console.log('='.repeat(60));
  
  try {
    // Obtener datos existentes
    const { modulos, doctores, comorbilidades, vacunas } = await obtenerDatosExistentes();
    
    if (modulos.length === 0 || doctores.length === 0) {
      console.log('❌ No hay módulos o doctores disponibles. Ejecuta primero el script principal.');
      return;
    }
    
    // Contar pacientes existentes y buscar el índice más alto de email
    const pacientesExistentes = await Paciente.count();
    
    // Buscar el índice más alto usado en emails de pacientes
    const [maxEmailResult] = await sequelize.query(
      "SELECT MAX(CAST(REPLACE(REPLACE(email, 'paciente', ''), '@email.com', '') AS UNSIGNED)) as max_idx FROM usuarios WHERE email LIKE 'paciente%@email.com'"
    );
    const maxEmailIndex = maxEmailResult[0]?.max_idx || 0;
    const startIndex = Math.max(pacientesExistentes + 1, maxEmailIndex + 1, 101); // Empezar al menos desde 101
    
    console.log(`\n📊 Pacientes existentes: ${pacientesExistentes}`);
    console.log(`   Índice máximo de email existente: ${maxEmailIndex}`);
    console.log(`   Creando pacientes ${startIndex} a ${startIndex + 49}...`);
    
    // Crear nuevos pacientes
    const pacientes = await crearPacientesAdicionales(modulos, 50, startIndex);
    
    if (pacientes.length === 0) {
      console.log('❌ No se pudieron crear pacientes nuevos.');
      return;
    }
    
    // Crear todos los datos relacionados
    await asignarPacientesADoctores(doctores, pacientes);
    await crearComorbilidadesPacientes(pacientes, comorbilidades);
    await crearSignosVitales(pacientes);
    await crearRedApoyo(pacientes);
    await crearEsquemaVacunacion(pacientes, vacunas);
    await crearDiagnosticos(pacientes);
    await crearSesionesEducativas(pacientes);
    await crearPlanesMedicacion(pacientes);
    await crearCitas(doctores, pacientes);
    
    // Resumen final
    const totalPacientes = await Paciente.count();
    const totalCitas = await Cita.count();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ PACIENTES ADICIONALES AGREGADOS');
    console.log('='.repeat(60));
    console.log(`
📊 RESUMEN FINAL:
   • Pacientes totales: ${totalPacientes}
   • Nuevos pacientes: ${pacientes.length}
   • Citas totales: ${totalCitas}
   
📅 FECHAS DE REGISTRO:
   • Los pacientes tienen fechas de registro entre 1 y 6 meses atrás
   • Esto permite probar filtros y gráficos por fecha

🔐 CREDENCIALES:
   • Nuevos pacientes: paciente${startIndex}@email.com a paciente${startIndex + pacientes.length - 1}@email.com
   • Contraseña: Paciente123!
`);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error);
  } finally {
    await sequelize.close();
    console.log('\n🔒 Conexión a base de datos cerrada.');
  }
}

// Ejecutar
agregarPacientesAdicionales();
