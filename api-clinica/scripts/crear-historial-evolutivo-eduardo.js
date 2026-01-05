import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import logger from '../utils/logger.js';
import { 
  Usuario, 
  Paciente, 
  Doctor, 
  Cita,
  SignoVital,
  Diagnostico,
} from '../models/associations.js';

/**
 * Script para crear historial médico evolutivo con diferentes fechas
 * para el paciente Eduardo González González (id_paciente: 7, id_usuario: 9)
 * 
 * Este script crea:
 * - 8 citas médicas distribuidas en los últimos 4 meses
 * - Signos vitales asociados a cada cita con evolución progresiva
 * - Diagnósticos asociados a las citas
 * 
 * Uso: node api-clinica/scripts/crear-historial-evolutivo-eduardo.js
 */

async function crearHistorialEvolutivo() {
  const transaction = await sequelize.transaction();
  
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida\n');

    const idPaciente = 7;
    const idUsuario = 9;

    // Verificar que el paciente existe
    logger.info(`📝 Buscando paciente con ID: ${idPaciente}...`);
    const paciente = await Paciente.findByPk(idPaciente, {
      include: [{
        model: Usuario,
        attributes: ['id_usuario', 'email', 'rol']
      }]
    });

    if (!paciente) {
      throw new Error(`No se encontró el paciente con ID ${idPaciente}`);
    }

    if (paciente.id_usuario !== idUsuario) {
      logger.warn(`⚠️  El paciente tiene id_usuario ${paciente.id_usuario}, no ${idUsuario}. Continuando...`);
    }

    logger.info(`✅ Paciente encontrado: ${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno}`);

    // Obtener doctor asignado
    logger.info('\n1️⃣ Buscando doctor asignado...');
    const { DoctorPaciente } = await import('../models/associations.js');
    const doctorPaciente = await DoctorPaciente.findOne({
      where: { id_paciente: idPaciente }
    });

    if (!doctorPaciente) {
      throw new Error('No se encontró un doctor asignado al paciente');
    }

    // Obtener el doctor directamente usando el id_doctor
    const doctor = await Doctor.findByPk(doctorPaciente.id_doctor, {
      include: [{ model: Usuario }]
    });

    if (!doctor) {
      throw new Error(`No se encontró el doctor con ID ${doctorPaciente.id_doctor}`);
    }

    logger.info(`✅ Doctor encontrado: ${doctor.nombre} ${doctor.apellido_paterno} (ID: ${doctor.id_doctor})`);

    // Fechas base (últimos 4 meses)
    const ahora = new Date();
    const fechasCitas = [
      new Date(ahora.getTime() - 120 * 24 * 60 * 60 * 1000), // Hace 120 días (4 meses)
      new Date(ahora.getTime() - 90 * 24 * 60 * 60 * 1000),  // Hace 90 días (3 meses)
      new Date(ahora.getTime() - 60 * 24 * 60 * 60 * 1000),  // Hace 60 días (2 meses)
      new Date(ahora.getTime() - 45 * 24 * 60 * 60 * 1000),  // Hace 45 días
      new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000),  // Hace 30 días (1 mes)
      new Date(ahora.getTime() - 15 * 24 * 60 * 60 * 1000),  // Hace 15 días
      new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000),   // Hace 7 días
      new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000),    // En 7 días (futura)
    ];

    const motivosCitas = [
      'Consulta inicial',
      'Seguimiento de tratamiento',
      'Control de presión arterial',
      'Revisión de glucosa',
      'Consulta de seguimiento',
      'Control rutinario',
      'Revisión de signos vitales',
      'Cita de seguimiento programada'
    ];

    // Datos evolutivos de signos vitales (simulando mejoría progresiva)
    const signosEvolutivos = [
      // Hace 4 meses (más altos)
      { peso: 82.0, presionSistolica: 145, presionDiastolica: 95, glucosa: 135, saturacion: 94, frecuencia: 88, temperatura: 36.8 },
      // Hace 3 meses
      { peso: 80.5, presionSistolica: 140, presionDiastolica: 92, glucosa: 130, saturacion: 95, frecuencia: 85, temperatura: 36.7 },
      // Hace 2 meses
      { peso: 79.0, presionSistolica: 135, presionDiastolica: 88, glucosa: 125, saturacion: 96, frecuencia: 82, temperatura: 36.6 },
      // Hace 45 días
      { peso: 77.5, presionSistolica: 130, presionDiastolica: 85, glucosa: 120, saturacion: 96, frecuencia: 80, temperatura: 36.6 },
      // Hace 1 mes
      { peso: 76.5, presionSistolica: 128, presionDiastolica: 83, glucosa: 115, saturacion: 97, frecuencia: 78, temperatura: 36.5 },
      // Hace 15 días
      { peso: 75.5, presionSistolica: 125, presionDiastolica: 80, glucosa: 110, saturacion: 97, frecuencia: 75, temperatura: 36.5 },
      // Hace 7 días
      { peso: 75.0, presionSistolica: 122, presionDiastolica: 78, glucosa: 105, saturacion: 98, frecuencia: 72, temperatura: 36.4 },
      // Actual (futura)
      { peso: 74.5, presionSistolica: 120, presionDiastolica: 75, glucosa: 100, saturacion: 98, frecuencia: 70, temperatura: 36.4 },
    ];

    const diagnosticos = [
      'Hipertensión arterial grado 1. Se inicia tratamiento con dieta y ejercicio.',
      'Mejora en presión arterial. Continuar con tratamiento actual.',
      'Control de presión arterial mejorado. Reducir dosis de medicamento.',
      'Glucosa en ayunas elevada. Iniciar dieta baja en carbohidratos.',
      'Glucosa mejorando. Continuar con dieta y ejercicio.',
      'Peso en descenso progresivo. Excelente adherencia al tratamiento.',
      'Signos vitales dentro de parámetros normales. Mantener hábitos saludables.',
      'Paciente en excelente estado. Continuar con seguimiento mensual.'
    ];

    logger.info('\n2️⃣ Creando citas médicas y historial...');

    const citasCreadas = [];
    const signosCreados = [];
    const diagnosticosCreados = [];

    for (let i = 0; i < fechasCitas.length; i++) {
      const fechaCita = fechasCitas[i];
      const motivo = motivosCitas[i];
      const signos = signosEvolutivos[i];
      
      // Crear cita
      const cita = await Cita.create({
        id_paciente: idPaciente,
        id_doctor: doctor.id_doctor,
        fecha_cita: fechaCita,
        motivo: motivo,
        asistencia: i < 7 ? true : null, // Las pasadas con asistencia, la futura pendiente
        es_primera_consulta: i === 0,
        observaciones: `Cita ${i + 1} de ${fechasCitas.length} - ${motivo}`,
        estado: i < 7 ? 'completada' : 'programada'
      }, { transaction });

      citasCreadas.push(cita);
      logger.info(`   ✅ Cita ${i + 1} creada: ${fechaCita.toLocaleDateString('es-MX')} - ${motivo}`);

      // Crear signos vitales asociados a la cita
      const signoVital = await SignoVital.create({
        id_paciente: idPaciente,
        id_cita: cita.id_cita,
        fecha_medicion: fechaCita,
        peso_kg: signos.peso,
        talla_m: 1.75, // Constante
        imc: (signos.peso / (1.75 * 1.75)).toFixed(2),
        presion_sistolica: signos.presionSistolica,
        presion_diastolica: signos.presionDiastolica,
        glucosa_mg_dl: signos.glucosa,
        saturacion_oxigeno: signos.saturacion,
        frecuencia_cardiaca: signos.frecuencia,
        temperatura: signos.temperatura,
        registrado_por: 'doctor',
        observaciones: `Registro ${i + 1} - Evolución del tratamiento`
      }, { transaction });

      signosCreados.push(signoVital);
      logger.info(`   ✅ Signos vitales creados para cita ${i + 1}`);

      // Crear diagnóstico asociado a la cita
      const diagnostico = await Diagnostico.create({
        id_cita: cita.id_cita,
        descripcion: diagnosticos[i],
        fecha_registro: fechaCita
      }, { transaction });

      diagnosticosCreados.push(diagnostico);
      logger.info(`   ✅ Diagnóstico creado para cita ${i + 1}`);
    }

    // Crear signos vitales adicionales sin cita (registros independientes)
    logger.info('\n3️⃣ Creando signos vitales adicionales sin cita...');
    const signosAdicionales = [
      { dias: 110, peso: 81.0, presionSistolica: 142, presionDiastolica: 93, glucosa: 132, saturacion: 94, frecuencia: 86 },
      { dias: 85, peso: 79.5, presionSistolica: 138, presionDiastolica: 90, glucosa: 128, saturacion: 95, frecuencia: 83 },
      { dias: 50, peso: 78.0, presionSistolica: 132, presionDiastolica: 86, glucosa: 122, saturacion: 96, frecuencia: 79 },
      { dias: 20, peso: 76.0, presionSistolica: 126, presionDiastolica: 81, glucosa: 112, saturacion: 97, frecuencia: 76 },
      { dias: 3, peso: 74.8, presionSistolica: 121, presionDiastolica: 77, glucosa: 103, saturacion: 98, frecuencia: 71 },
    ];

    for (const signo of signosAdicionales) {
      const fechaSigno = new Date(ahora.getTime() - signo.dias * 24 * 60 * 60 * 1000);
      await SignoVital.create({
        id_paciente: idPaciente,
        fecha_medicion: fechaSigno,
        peso_kg: signo.peso,
        talla_m: 1.75,
        imc: (signo.peso / (1.75 * 1.75)).toFixed(2),
        presion_sistolica: signo.presionSistolica,
        presion_diastolica: signo.presionDiastolica,
        glucosa_mg_dl: signo.glucosa,
        saturacion_oxigeno: signo.saturacion,
        frecuencia_cardiaca: signo.frecuencia,
        temperatura: 36.5,
        registrado_por: 'paciente',
        observaciones: `Registro independiente del paciente`
      }, { transaction });
    }

    logger.info(`✅ ${signosAdicionales.length} signos vitales adicionales creados`);

    // Commit de la transacción
    await transaction.commit();

    logger.info('\n' + '='.repeat(80));
    logger.info('✅ HISTORIAL MÉDICO EVOLUTIVO CREADO EXITOSAMENTE');
    logger.info('='.repeat(80));
    logger.info('\n📋 RESUMEN:');
    logger.info(`   👤 Paciente: ${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno}`);
    logger.info(`   🆔 ID Paciente: ${idPaciente}`);
    logger.info(`   👨‍⚕️ Doctor: ${doctor.nombre} ${doctor.apellido_paterno}`);
    logger.info(`   📅 Citas creadas: ${citasCreadas.length}`);
    logger.info(`   💓 Signos Vitales creados: ${signosCreados.length + signosAdicionales.length}`);
    logger.info(`   🩺 Diagnósticos creados: ${diagnosticosCreados.length}`);
    logger.info('\n📊 EVOLUCIÓN DE SIGNOS VITALES:');
    logger.info('   (Mostrando progresión de mejoría)');
    logger.info(`   Hace 4 meses: Peso ${signosEvolutivos[0].peso}kg, Presión ${signosEvolutivos[0].presionSistolica}/${signosEvolutivos[0].presionDiastolica}, Glucosa ${signosEvolutivos[0].glucosa}mg/dL`);
    logger.info(`   Actual: Peso ${signosEvolutivos[6].peso}kg, Presión ${signosEvolutivos[6].presionSistolica}/${signosEvolutivos[6].presionDiastolica}, Glucosa ${signosEvolutivos[6].glucosa}mg/dL`);
    logger.info('\n✅ Los datos están listos para probar las vistas evolutivas en el historial médico!');

  } catch (error) {
    await transaction.rollback();
    logger.error('❌ Error creando historial evolutivo:', error);
    console.error('Error detallado:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` ||
    process.argv[1]?.includes('crear-historial-evolutivo-eduardo')) {
  crearHistorialEvolutivo()
    .then(() => {
      logger.info('\n✅ Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('\n❌ Error fatal:', error);
      console.error('Error detallado:', error);
      process.exit(1);
    });
}

export default crearHistorialEvolutivo;

