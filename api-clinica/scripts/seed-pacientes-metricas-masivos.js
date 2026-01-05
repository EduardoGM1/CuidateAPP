/**
 * Script para agregar múltiples pacientes con historial médico completo
 * Para pruebas de métricas principales
 * Genera al menos 20 pacientes por doctor con:
 * - Citas en días anteriores y posteriores
 * - Signos vitales asociados
 * - Diagnósticos
 * - Planes de medicación
 * - Vacunas
 * - Comorbilidades
 */

import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import { 
  Usuario, Doctor, Paciente, Cita, Diagnostico, PlanMedicacion, 
  SignoVital, EsquemaVacunacion, Modulo, Medicamento, DoctorPaciente,
  PlanDetalle, Comorbilidad, PacienteComorbilidad
} from '../models/associations.js';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger.js';

// Nombres y apellidos para generar pacientes
const nombres = [
  'Ana', 'María', 'Laura', 'Carmen', 'Patricia', 'Guadalupe', 'Rosa', 'Martha', 'Juana', 'Silvia',
  'Carlos', 'José', 'Juan', 'Miguel', 'Roberto', 'Luis', 'Francisco', 'Pedro', 'Antonio', 'Manuel',
  'Fernando', 'Ricardo', 'Eduardo', 'Sergio', 'Diego', 'Alejandro', 'Daniel', 'Andrés', 'Héctor', 'Arturo'
];

const apellidosPaterno = [
  'García', 'Rodríguez', 'López', 'Martínez', 'González', 'Pérez', 'Sánchez', 'Ramírez', 'Cruz', 'Flores',
  'Torres', 'Rivera', 'Gómez', 'Díaz', 'Reyes', 'Morales', 'Ortiz', 'Gutiérrez', 'Chávez', 'Ramos',
  'Ruiz', 'Herrera', 'Jiménez', 'Mendoza', 'Vargas', 'Castro', 'Romero', 'Alvarez', 'Méndez', 'Guerrero'
];

const apellidosMaterno = [
  'Hernández', 'Moreno', 'Vega', 'Castillo', 'Navarro', 'Soto', 'Delgado', 'Peña', 'Ortega', 'Ramos',
  'Silva', 'Medina', 'Campos', 'Aguilar', 'Valdez', 'Franco', 'Marín', 'Núñez', 'Salazar', 'Cortés'
];

const institucionesSalud = ['IMSS', 'ISSSTE', 'Bienestar', 'Particular'];
const sexos = ['Hombre', 'Mujer'];

// Motivos de consulta variados
const motivosConsulta = [
  'Consulta de control',
  'Revisión general',
  'Control de diabetes',
  'Control de hipertensión',
  'Síntomas respiratorios',
  'Dolor de cabeza persistente',
  'Fatiga y debilidad',
  'Consulta de seguimiento',
  'Control de medicación',
  'Revisión de signos vitales',
  'Chequeo rutinario',
  'Evaluación de comorbilidades',
  'Seguimiento de tratamiento',
  'Consulta preventiva',
  'Control de peso'
];

// Diagnósticos variados
const diagnosticos = [
  'Hipertensión arterial controlada',
  'Diabetes tipo 2 en tratamiento',
  'Obesidad grado 1',
  'Dislipidemia mixta',
  'Ansiedad leve',
  'Síndrome metabólico',
  'Asma bronquial controlada',
  'Gastritis crónica',
  'Anemia ferropénica leve',
  'Artritis reumatoide en control',
  'Enfermedad pulmonar obstructiva crónica',
  'Depresión leve',
  'Hipertensión arterial grado 2',
  'Diabetes tipo 2 descompensada',
  'Colesterol elevado',
  'Triglicéridos altos',
  'Pre-diabetes',
  'Obesidad grado 2',
  'Ansiedad moderada'
];

// Vacunas disponibles
const vacunasDisponibles = [
  'Hepatitis B',
  'Influenza (Gripe)',
  'Tétanos',
  'Difteria',
  'Sarampión',
  'COVID-19',
  'Varicela',
  'Neumococo',
  'Rubéola',
  'Paperas'
];

// Funciones auxiliares
function generarNombreAleatorio() {
  const nombre = nombres[Math.floor(Math.random() * nombres.length)];
  const apellidoP = apellidosPaterno[Math.floor(Math.random() * apellidosPaterno.length)];
  const apellidoM = apellidosMaterno[Math.floor(Math.random() * apellidosMaterno.length)];
  return { nombre, apellidoP, apellidoM };
}

function generarCURP(nombre, apellidoP, apellidoM, fechaNacimiento, sexo) {
  const ano = fechaNacimiento.split('-')[0].slice(-2);
  const mes = fechaNacimiento.split('-')[1];
  const dia = fechaNacimiento.split('-')[2];
  const letra1 = apellidoP.charAt(0);
  const letra2 = apellidoP.charAt(1) || 'X';
  const letra3 = apellidoM.charAt(0) || 'X';
  const letra4 = nombre.charAt(0);
  const genero = sexo === 'Mujer' ? 'M' : 'H';
  const estado = 'DF';
  const letrasRandom = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const letrasFinal = Array.from({ length: 2 }, () => letrasRandom[Math.floor(Math.random() * letrasRandom.length)]).join('');
  
  return `${letra1}${letra2}${letra3}${letra4}${ano}${mes}${dia}${genero}${estado}${letrasFinal}`.toUpperCase();
}

function generarFechaNacimiento() {
  const ano = 1950 + Math.floor(Math.random() * 50); // 1950-2000
  const mes = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const dia = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function generarTelefono() {
  return `555-${Math.floor(Math.random() * 9000) + 1000}`;
}

async function seedPacientesMasivos() {
  const transaction = await sequelize.transaction();
  
  try {
    logger.info('🌱 INICIANDO CREACIÓN MASIVA DE PACIENTES PARA MÉTRICAS');
    logger.info('='.repeat(80));

    // 1. Obtener todos los doctores activos
    const doctores = await Doctor.findAll({ 
      where: { activo: true },
      include: [{ model: Usuario, attributes: ['id_usuario'] }]
    });
    
    if (doctores.length === 0) {
      throw new Error('No hay doctores disponibles. Crea doctores primero.');
    }

    // 2. Obtener módulos disponibles
    const modulos = await Modulo.findAll({ limit: 10 });
    if (modulos.length === 0) {
      throw new Error('No hay módulos disponibles. Crea módulos primero.');
    }

    // 3. Obtener medicamentos disponibles
    const medicamentos = await Medicamento.findAll({ limit: 20 });
    if (medicamentos.length === 0) {
      throw new Error('No hay medicamentos disponibles. Crea medicamentos primero.');
    }

    // 4. Obtener comorbilidades disponibles
    const comorbilidades = await Comorbilidad.findAll({ limit: 15 });
    if (comorbilidades.length === 0) {
      logger.warn('No hay comorbilidades disponibles. Se crearán pacientes sin comorbilidades.');
    }

    logger.info(`✅ Doctores encontrados: ${doctores.length}`);
    logger.info(`✅ Módulos disponibles: ${modulos.length}`);
    logger.info(`✅ Medicamentos disponibles: ${medicamentos.length}`);
    logger.info(`✅ Comorbilidades disponibles: ${comorbilidades.length}`);

    const pacientesPorDoctor = 20; // Mínimo 20 pacientes por doctor
    const pacientesCreados = [];
    const citasCreadas = [];
    const signosVitalesCreados = [];
    const diagnosticosCreados = [];
    const planesCreados = [];
    const vacunasCreadas = [];
    const comorbilidadesAsignadas = [];

    // 5. Crear pacientes para cada doctor
    for (const doctor of doctores) {
      logger.info(`\n👨‍⚕️ Creando ${pacientesPorDoctor} pacientes para doctor ${doctor.nombre} ${doctor.apellido_paterno} (ID: ${doctor.id_doctor})`);
      
      for (let i = 0; i < pacientesPorDoctor; i++) {
        const { nombre, apellidoP, apellidoM } = generarNombreAleatorio();
        const fechaNacimiento = generarFechaNacimiento();
        const sexo = sexos[Math.floor(Math.random() * sexos.length)];
        const curp = generarCURP(nombre, apellidoP, apellidoM, fechaNacimiento, sexo);
        const modulo = modulos[i % modulos.length];
        const institucion = institucionesSalud[Math.floor(Math.random() * institucionesSalud.length)];

        // Crear usuario para paciente
        const emailPaciente = `paciente_${Date.now()}_${doctor.id_doctor}_${i}@temp.com`;
        const passwordPaciente = Math.random().toString(36).slice(-8);
        const hashedPasswordPaciente = await bcrypt.hash(passwordPaciente, 10);
        
        const usuarioPaciente = await Usuario.create({
          email: emailPaciente,
          password_hash: hashedPasswordPaciente,
          rol: 'Paciente',
          activo: true
        }, { transaction });

        // Crear paciente
        const paciente = await Paciente.create({
          id_usuario: usuarioPaciente.id_usuario,
          nombre: nombre,
          apellido_paterno: apellidoP,
          apellido_materno: apellidoM,
          fecha_nacimiento: fechaNacimiento,
          curp: curp,
          institucion_salud: institucion,
          sexo: sexo,
          direccion: `Calle ${Math.floor(Math.random() * 1000)} #${Math.floor(Math.random() * 100) + 1}`,
          localidad: 'Ciudad de México',
          numero_celular: generarTelefono(),
          id_modulo: modulo.id_modulo,
          fecha_registro: new Date(),
          activo: true
        }, { transaction });

        pacientesCreados.push({ paciente, doctor });

        // Asignar paciente al doctor
        await DoctorPaciente.create({
          id_doctor: doctor.id_doctor,
          id_paciente: paciente.id_paciente,
          fecha_asignacion: new Date().toISOString().split('T')[0],
          observaciones: 'Asignación automática para métricas'
        }, { transaction });

        // Asignar 1-3 comorbilidades aleatorias
        if (comorbilidades.length > 0) {
          const numComorbilidades = 1 + Math.floor(Math.random() * 3);
          const comorbilidadesSeleccionadas = comorbilidades
            .sort(() => Math.random() - 0.5)
            .slice(0, numComorbilidades);

          for (const comorbilidad of comorbilidadesSeleccionadas) {
            const fechaDeteccion = new Date();
            fechaDeteccion.setDate(fechaDeteccion.getDate() - Math.floor(Math.random() * 365)); // Último año

            await PacienteComorbilidad.create({
              id_paciente: paciente.id_paciente,
              id_comorbilidad: comorbilidad.id_comorbilidad,
              fecha_deteccion: fechaDeteccion.toISOString().split('T')[0],
              observaciones: `Comorbilidad detectada en consulta`
            }, { transaction });

            comorbilidadesAsignadas.push({ paciente: paciente.id_paciente, comorbilidad: comorbilidad.id_comorbilidad });
          }
        }

        // Crear citas (2-6 citas por paciente, distribuidas en el pasado y futuro)
        const numCitas = 2 + Math.floor(Math.random() * 5); // 2-6 citas
        const citasPaciente = [];

        for (let j = 0; j < numCitas; j++) {
          // Distribuir citas: 70% en el pasado, 30% en el futuro
          const esPasado = Math.random() < 0.7;
          const diasOffset = esPasado 
            ? -(30 + Math.floor(Math.random() * 330)) // 30-360 días atrás
            : (1 + Math.floor(Math.random() * 90));  // 1-90 días adelante

          const fechaCita = new Date();
          fechaCita.setDate(fechaCita.getDate() + diasOffset);
          fechaCita.setHours(8 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 4) * 15, 0, 0); // 8:00-16:00

          const motivo = motivosConsulta[Math.floor(Math.random() * motivosConsulta.length)];
          const esPrimeraConsulta = j === 0;
          const asistencia = esPasado ? (Math.random() > 0.2) : null; // 80% asistencia en citas pasadas

          const cita = await Cita.create({
            id_paciente: paciente.id_paciente,
            id_doctor: doctor.id_doctor,
            fecha_cita: fechaCita,
            asistencia: asistencia,
            motivo: motivo,
            es_primera_consulta: esPrimeraConsulta,
            observaciones: `Cita de ${esPrimeraConsulta ? 'primera consulta' : 'control'} - ${motivo}`,
            fecha_creacion: fechaCita
          }, { transaction });

          citasPaciente.push(cita);
          citasCreadas.push(cita);

          // Crear signos vitales para citas pasadas y algunas futuras (si asistencia es true)
          if ((esPasado && asistencia) || (!esPasado && Math.random() > 0.5)) {
            const pesoBase = 55 + Math.random() * 45; // 55-100 kg
            const tallaBase = 1.50 + Math.random() * 0.40; // 1.50-1.90 m
            const imc = parseFloat((pesoBase / (tallaBase * tallaBase)).toFixed(2));

            await SignoVital.create({
              id_paciente: paciente.id_paciente,
              id_cita: cita.id_cita,
              fecha_medicion: fechaCita,
              peso_kg: parseFloat(pesoBase.toFixed(1)),
              talla_m: parseFloat(tallaBase.toFixed(2)),
              imc: imc,
              medida_cintura_cm: parseFloat((75 + Math.random() * 25).toFixed(1)), // 75-100 cm
              presion_sistolica: 110 + Math.floor(Math.random() * 30), // 110-140
              presion_diastolica: 70 + Math.floor(Math.random() * 20), // 70-90
              glucosa_mg_dl: parseFloat((80 + Math.random() * 60).toFixed(1)), // 80-140
              colesterol_mg_dl: parseFloat((150 + Math.random() * 50).toFixed(1)), // 150-200
              trigliceridos_mg_dl: parseFloat((100 + Math.random() * 80).toFixed(1)), // 100-180
              registrado_por: 'doctor',
              observaciones: 'Signos vitales dentro de parámetros normales'
            }, { transaction });

            signosVitalesCreados.push({ cita: cita.id_cita });
          }

          // Crear diagnóstico para 80% de las citas pasadas
          if (esPasado && asistencia && Math.random() > 0.2) {
            const diagnostico = diagnosticos[Math.floor(Math.random() * diagnosticos.length)];
            await Diagnostico.create({
              id_cita: cita.id_cita,
              descripcion: diagnostico,
              fecha_registro: fechaCita
            }, { transaction });

            diagnosticosCreados.push({ cita: cita.id_cita });
          }

          // Crear plan de medicación para 60% de las citas pasadas con diagnóstico
          if (esPasado && asistencia && Math.random() > 0.4) {
            const fechaInicio = new Date(fechaCita);
            const fechaFin = new Date(fechaInicio);
            fechaFin.setMonth(fechaFin.getMonth() + (3 + Math.floor(Math.random() * 3))); // 3-6 meses

            const plan = await PlanMedicacion.create({
              id_paciente: paciente.id_paciente,
              id_doctor: doctor.id_doctor,
              id_cita: cita.id_cita,
              fecha_inicio: fechaInicio.toISOString().split('T')[0],
              fecha_fin: fechaFin.toISOString().split('T')[0],
              observaciones: 'Plan de medicación según diagnóstico',
              activo: Math.random() > 0.3, // 70% activos
              fecha_creacion: fechaCita
            }, { transaction });

            // Agregar 2-4 medicamentos al plan
            const numMedicamentos = 2 + Math.floor(Math.random() * 3);
            const medicamentosSeleccionados = medicamentos
              .sort(() => Math.random() - 0.5)
              .slice(0, numMedicamentos);

            for (const med of medicamentosSeleccionados) {
              const dosis = ['500mg', '250mg', '100mg', '50mg', '20mg'][Math.floor(Math.random() * 5)];
              const frecuencia = ['1 vez al día', '2 veces al día', '3 veces al día', 'Cada 12 horas'][Math.floor(Math.random() * 4)];
              const horario = ['08:00', '12:00', '20:00'][Math.floor(Math.random() * 3)];

              await PlanDetalle.create({
                id_plan: plan.id_plan,
                id_medicamento: med.id_medicamento,
                dosis: dosis,
                frecuencia: frecuencia,
                horario: horario,
                via_administracion: 'Oral',
                observaciones: 'Seguir indicaciones médicas'
              }, { transaction });
            }

            planesCreados.push({ plan: plan.id_plan, medicamentos: numMedicamentos });
          }

          // Crear vacunas (2-4 vacunas por paciente, distribuidas en diferentes fechas)
          if (j === 0 || Math.random() > 0.6) {
            const numVacunas = j === 0 ? 2 : 1;
            const vacunasSeleccionadas = vacunasDisponibles
              .sort(() => Math.random() - 0.5)
              .slice(0, numVacunas);

            for (const nombreVacuna of vacunasSeleccionadas) {
              const fechaAplicacion = new Date(fechaCita);
              fechaAplicacion.setDate(fechaAplicacion.getDate() - Math.floor(Math.random() * 30)); // Hasta 30 días antes

              await EsquemaVacunacion.create({
                id_paciente: paciente.id_paciente,
                vacuna: nombreVacuna,
                fecha_aplicacion: fechaAplicacion.toISOString().split('T')[0],
                lote: `LOTE${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
                observaciones: `Aplicación de ${nombreVacuna}`
              }, { transaction });

              vacunasCreadas.push({ paciente: paciente.id_paciente, vacuna: nombreVacuna });
            }
          }
        }

        if ((i + 1) % 5 === 0) {
          logger.info(`   ✅ ${i + 1}/${pacientesPorDoctor} pacientes creados`);
        }
      }
    }

    await transaction.commit();

    logger.info('\n✅ PROCESO COMPLETADO EXITOSAMENTE');
    logger.info('='.repeat(80));
    logger.info(`👨‍⚕️ Doctores procesados: ${doctores.length}`);
    logger.info(`👥 Pacientes creados: ${pacientesCreados.length}`);
    logger.info(`📅 Citas creadas: ${citasCreadas.length}`);
    logger.info(`💓 Signos vitales creados: ${signosVitalesCreados.length}`);
    logger.info(`🩺 Diagnósticos creados: ${diagnosticosCreados.length}`);
    logger.info(`💊 Planes de medicación creados: ${planesCreados.length}`);
    logger.info(`💉 Vacunas creadas: ${vacunasCreadas.length}`);
    logger.info(`🏥 Comorbilidades asignadas: ${comorbilidadesAsignadas.length}`);
    logger.info('\n📊 DISTRIBUCIÓN DE DATOS:');
    logger.info(`   - Citas pasadas: ~${Math.round(citasCreadas.length * 0.7)} (70%)`);
    logger.info(`   - Citas futuras: ~${Math.round(citasCreadas.length * 0.3)} (30%)`);
    logger.info(`   - Promedio de citas por paciente: ${(citasCreadas.length / pacientesCreados.length).toFixed(1)}`);
    logger.info(`   - Promedio de signos vitales por paciente: ${(signosVitalesCreados.length / pacientesCreados.length).toFixed(1)}`);
    logger.info(`   - Promedio de diagnósticos por paciente: ${(diagnosticosCreados.length / pacientesCreados.length).toFixed(1)}`);
    logger.info('\n✅ Los datos están listos para pruebas de métricas principales');

  } catch (error) {
    await transaction.rollback();
    logger.error('❌ Error en el proceso:', {
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
}

// Ejecutar el script
seedPacientesMasivos()
  .then(() => {
    logger.info('\n✅ Script finalizado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('\n❌ Error ejecutando script:', error);
    process.exit(1);
  });


