/**
 * Script para agregar 2 doctores y 5 pacientes con historial médico completo
 * Incluye: citas, signos vitales, diagnósticos, planes de medicación y vacunas
 */

import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import { 
  Usuario, Doctor, Paciente, Cita, Diagnostico, PlanMedicacion, 
  SignoVital, EsquemaVacunacion, Modulo, Medicamento, DoctorPaciente,
  PlanDetalle
} from '../models/associations.js';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger.js';

// Datos para 2 doctores nuevos
const nuevosDoctores = [
  {
    nombre: 'Dra. Patricia',
    apellidoPaterno: 'Ramírez',
    apellidoMaterno: 'Moreno',
    email: 'patricia.ramirez@clinica.com',
    password: 'Doctor123!',
    telefono: '555-2010',
    institucion_hospitalaria: 'Hospital Central',
    grado_estudio: 'Especialidad',
    anos_servicio: 8,
    id_modulo: null // Se asignará al primer módulo disponible
  },
  {
    nombre: 'Dr. Fernando',
    apellidoPaterno: 'Delgado',
    apellidoMaterno: 'Torres',
    email: 'fernando.delgado@clinica.com',
    password: 'Doctor123!',
    telefono: '555-2011',
    institucion_hospitalaria: 'Clínica San José',
    grado_estudio: 'Maestría',
    anos_servicio: 12,
    id_modulo: null
  }
];

// Datos para 5 pacientes nuevos
const nuevosPacientes = [
  {
    nombre: 'Carmen',
    apellidoPaterno: 'Mendoza',
    apellidoMaterno: 'Vega',
    fecha_nacimiento: '1978-05-20',
    curp: 'MEVC780520MDFNRG01',
    institucion_salud: 'IMSS',
    sexo: 'Mujer',
    direccion: 'Av. Reforma 456, Col. Juárez',
    localidad: 'Ciudad de México',
    numero_celular: '555-3010',
    id_modulo: null
  },
  {
    nombre: 'Ricardo',
    apellidoPaterno: 'Castillo',
    apellidoMaterno: 'Ruiz',
    fecha_nacimiento: '1982-08-12',
    curp: 'CARR820812HDFRZC02',
    institucion_salud: 'ISSSTE',
    sexo: 'Hombre',
    direccion: 'Calle Hidalgo 789, Col. Centro',
    localidad: 'Guadalajara',
    numero_celular: '555-3011',
    id_modulo: null
  },
  {
    nombre: 'Liliana',
    apellidoPaterno: 'Ortega',
    apellidoMaterno: 'Méndez',
    fecha_nacimiento: '1990-11-03',
    curp: 'OMEL901103MDFRTZ03',
    institucion_salud: 'Bienestar',
    sexo: 'Mujer',
    direccion: 'Blvd. Constitución 321, Col. Las Flores',
    localidad: 'Monterrey',
    numero_celular: '555-3012',
    id_modulo: null
  },
  {
    nombre: 'Mauricio',
    apellidoPaterno: 'Navarro',
    apellidoMaterno: 'Sosa',
    fecha_nacimiento: '1985-02-28',
    curp: 'NASM850228HDFRSV04',
    institucion_salud: 'Particular',
    sexo: 'Hombre',
    direccion: 'Calle Morelos 654, Col. San Rafael',
    localidad: 'Puebla',
    numero_celular: '555-3013',
    id_modulo: null
  },
  {
    nombre: 'Verónica',
    apellidoPaterno: 'Peña',
    apellidoMaterno: 'Cruz',
    fecha_nacimiento: '1988-09-15',
    curp: 'PECV880915MDFNXR05',
    institucion_salud: 'IMSS',
    sexo: 'Mujer',
    direccion: 'Av. Universidad 987, Col. Del Valle',
    localidad: 'Tijuana',
    numero_celular: '555-3014',
    id_modulo: null
  }
];

// Motivos de consulta
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
  'Revisión de signos vitales'
];

// Diagnósticos comunes
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
  'Artritis reumatoide en control'
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
  'Neumococo'
];

async function seedPacientesYDoctores() {
  const transaction = await sequelize.transaction();
  
  try {
    logger.info('🌱 INICIANDO CREACIÓN DE DOCTORES Y PACIENTES CON HISTORIAL COMPLETO');
    logger.info('='.repeat(80));

    // 1. Obtener módulos disponibles
    const modulos = await Modulo.findAll({ limit: 5 });
    if (modulos.length === 0) {
      throw new Error('No hay módulos disponibles. Crea módulos primero desde la interfaz.');
    }

    // 2. Obtener medicamentos disponibles
    const medicamentos = await Medicamento.findAll({ limit: 10 });
    if (medicamentos.length === 0) {
      throw new Error('No hay medicamentos disponibles. Crea medicamentos primero desde la interfaz.');
    }

    logger.info(`✅ Módulos disponibles: ${modulos.length}`);
    logger.info(`✅ Medicamentos disponibles: ${medicamentos.length}`);

    // 3. Crear 2 doctores nuevos
    logger.info('\n👨‍⚕️ Creando 2 doctores nuevos...');
    const doctoresCreados = [];

    for (let i = 0; i < nuevosDoctores.length; i++) {
      const doctorData = nuevosDoctores[i];
      const modulo = modulos[i % modulos.length];

      // Crear usuario
      const hashedPassword = await bcrypt.hash(doctorData.password, 10);
      const usuario = await Usuario.create({
        email: doctorData.email,
        password_hash: hashedPassword,
        rol: 'Doctor',
        activo: true
      }, { transaction });

      // Crear doctor
      const doctor = await Doctor.create({
        id_usuario: usuario.id_usuario,
        nombre: doctorData.nombre,
        apellido_paterno: doctorData.apellidoPaterno,
        apellido_materno: doctorData.apellidoMaterno,
        telefono: doctorData.telefono,
        institucion_hospitalaria: doctorData.institucion_hospitalaria,
        grado_estudio: doctorData.grado_estudio,
        anos_servicio: doctorData.anos_servicio,
        id_modulo: modulo.id_modulo,
        activo: true
      }, { transaction });

      doctoresCreados.push({ doctor, usuario });
      logger.info(`   ✅ Doctor creado: ${doctorData.nombre} ${doctorData.apellidoPaterno} (ID: ${doctor.id_doctor})`);
    }

    // 4. Crear 5 pacientes con historial completo
    logger.info('\n👥 Creando 5 pacientes con historial médico completo...');
    const pacientesCreados = [];

    for (let i = 0; i < nuevosPacientes.length; i++) {
      const pacienteData = nuevosPacientes[i];
      const modulo = modulos[i % modulos.length];
      const doctor = doctoresCreados[i % doctoresCreados.length].doctor;

      // Crear usuario para paciente
      const emailPaciente = `paciente_${Date.now()}_${i}@temp.com`;
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
        nombre: pacienteData.nombre,
        apellido_paterno: pacienteData.apellidoPaterno,
        apellido_materno: pacienteData.apellidoMaterno,
        fecha_nacimiento: pacienteData.fecha_nacimiento,
        curp: pacienteData.curp,
        institucion_salud: pacienteData.institucion_salud,
        sexo: pacienteData.sexo,
        direccion: pacienteData.direccion,
        localidad: pacienteData.localidad,
        numero_celular: pacienteData.numero_celular,
        id_modulo: modulo.id_modulo,
        fecha_registro: new Date(),
        activo: true
      }, { transaction });

      // Asignar paciente al doctor
      await DoctorPaciente.create({
        id_doctor: doctor.id_doctor,
        id_paciente: paciente.id_paciente,
        fecha_asignacion: new Date().toISOString().split('T')[0],
        observaciones: 'Asignación inicial'
      }, { transaction });

      pacientesCreados.push({ paciente, doctor });
      logger.info(`   ✅ Paciente creado: ${pacienteData.nombre} ${pacienteData.apellidoPaterno} (ID: ${paciente.id_paciente})`);

      // 5. Crear citas para este paciente (2-4 citas)
      const numCitas = 2 + Math.floor(Math.random() * 3); // 2-4 citas
      const citasCreadas = [];

      for (let j = 0; j < numCitas; j++) {
        // Fechas en el pasado (últimos 90 días)
        const diasAtras = 90 - (j * 30); // Espaciadas cada ~30 días
        const fechaCita = new Date();
        fechaCita.setDate(fechaCita.getDate() - diasAtras);
        fechaCita.setHours(9 + j, 0, 0, 0); // 9:00, 10:00, etc.

        const motivo = motivosConsulta[Math.floor(Math.random() * motivosConsulta.length)];
        const esPrimeraConsulta = j === 0;

        const cita = await Cita.create({
          id_paciente: paciente.id_paciente,
          id_doctor: doctor.id_doctor,
          fecha_cita: fechaCita,
          asistencia: true,
          motivo: motivo,
          es_primera_consulta: esPrimeraConsulta,
          observaciones: `Cita de ${j === 0 ? 'primera consulta' : 'control'} - ${motivo}`,
          fecha_creacion: fechaCita
        }, { transaction });

        citasCreadas.push(cita);

        // 6. Crear signos vitales para cada cita
        const pesoBase = 65 + Math.random() * 25; // 65-90 kg
        const tallaBase = 1.55 + Math.random() * 0.35; // 1.55-1.90 m
        const imc = (pesoBase / (tallaBase * tallaBase)).toFixed(2);

        await SignoVital.create({
          id_paciente: paciente.id_paciente,
          id_cita: cita.id_cita,
          fecha_medicion: fechaCita,
          peso_kg: parseFloat(pesoBase.toFixed(1)),
          talla_m: parseFloat(tallaBase.toFixed(2)),
          imc: parseFloat(imc),
          medida_cintura_cm: 80 + Math.random() * 20, // 80-100 cm
          presion_sistolica: 110 + Math.floor(Math.random() * 30), // 110-140
          presion_diastolica: 70 + Math.floor(Math.random() * 20), // 70-90
          glucosa_mg_dl: 85 + Math.floor(Math.random() * 40), // 85-125
          colesterol_mg_dl: 160 + Math.floor(Math.random() * 40), // 160-200
          trigliceridos_mg_dl: 120 + Math.floor(Math.random() * 60), // 120-180
          registrado_por: 'doctor',
          observaciones: 'Signos vitales dentro de parámetros normales'
        }, { transaction });

        // 7. Crear diagnóstico para algunas citas (70% de probabilidad)
        if (Math.random() > 0.3) {
          const diagnostico = diagnosticos[Math.floor(Math.random() * diagnosticos.length)];
          await Diagnostico.create({
            id_cita: cita.id_cita,
            descripcion: diagnostico,
            fecha_registro: fechaCita
          }, { transaction });
        }

        // 8. Crear plan de medicación para la primera cita y algunas otras
        if (j === 0 || Math.random() > 0.5) {
          const fechaInicio = new Date(fechaCita);
          const fechaFin = new Date(fechaInicio);
          fechaFin.setMonth(fechaFin.getMonth() + 3); // Plan de 3 meses

          const plan = await PlanMedicacion.create({
            id_paciente: paciente.id_paciente,
            id_doctor: doctor.id_doctor,
            id_cita: cita.id_cita,
            fecha_inicio: fechaInicio.toISOString().split('T')[0],
            fecha_fin: fechaFin.toISOString().split('T')[0],
            observaciones: 'Plan de medicación según diagnóstico',
            activo: true,
            fecha_creacion: fechaCita
          }, { transaction });

          // Agregar 2-3 medicamentos al plan
          const numMedicamentos = 2 + Math.floor(Math.random() * 2); // 2-3 medicamentos
          const medicamentosSeleccionados = medicamentos
            .sort(() => Math.random() - 0.5)
            .slice(0, numMedicamentos);

          for (const med of medicamentosSeleccionados) {
            const dosis = ['500mg', '250mg', '100mg', '50mg'][Math.floor(Math.random() * 4)];
            const frecuencia = ['1 vez al día', '2 veces al día', '3 veces al día'][Math.floor(Math.random() * 3)];
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

          logger.info(`      ✅ Plan de medicación creado con ${medicamentosSeleccionados.length} medicamentos`);
        }

        // 9. Crear vacunas (2-3 vacunas por paciente)
        if (j === 0 || Math.random() > 0.6) {
          const numVacunas = j === 0 ? 2 : 1;
          const vacunasSeleccionadas = vacunasDisponibles
            .sort(() => Math.random() - 0.5)
            .slice(0, numVacunas);

          for (const nombreVacuna of vacunasSeleccionadas) {
            const fechaAplicacion = new Date(fechaCita);
            fechaAplicacion.setDate(fechaAplicacion.getDate() - Math.floor(Math.random() * 7)); // Hasta 7 días antes

            await EsquemaVacunacion.create({
              id_paciente: paciente.id_paciente,
              vacuna: nombreVacuna,
              fecha_aplicacion: fechaAplicacion.toISOString().split('T')[0],
              lote: `LOTE${Math.floor(Math.random() * 10000)}`,
              observaciones: `Aplicación de ${nombreVacuna}`
            }, { transaction });
          }
        }
      }

      logger.info(`      ✅ ${numCitas} citas creadas con signos vitales, diagnósticos y planes de medicación`);
    }

    await transaction.commit();

    logger.info('\n✅ PROCESO COMPLETADO EXITOSAMENTE');
    logger.info('='.repeat(80));
    logger.info(`👨‍⚕️ Doctores creados: ${doctoresCreados.length}`);
    logger.info(`👥 Pacientes creados: ${pacientesCreados.length}`);
    logger.info('\n📋 CREDENCIALES DE DOCTORES:');
    doctoresCreados.forEach((d, i) => {
      logger.info(`   ${i + 1}. Email: ${nuevosDoctores[i].email}`);
      logger.info(`      Password: ${nuevosDoctores[i].password}`);
    });
    logger.info('\n✅ Todos los pacientes tienen historial completo de:');
    logger.info('   - Citas con fechas variadas');
    logger.info('   - Signos vitales asociados a cada cita');
    logger.info('   - Diagnósticos en múltiples citas');
    logger.info('   - Planes de medicación con medicamentos');
    logger.info('   - Esquemas de vacunación');

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
seedPacientesYDoctores()
  .then(() => {
    logger.info('\n✅ Script finalizado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('\n❌ Error ejecutando script:', error);
    process.exit(1);
  });

