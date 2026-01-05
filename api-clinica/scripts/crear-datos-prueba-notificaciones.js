import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import logger from '../utils/logger.js';
import { 
  Usuario, 
  Paciente, 
  Doctor, 
  Cita,
  PlanMedicacion,
  PlanDetalle,
  Medicamento,
  DoctorPaciente,
} from '../models/associations.js';

/**
 * Script para crear datos de prueba con fechas próximas para probar notificaciones
 * 
 * Crea:
 * - Medicamentos con horarios próximos (en 1-5 minutos)
 * - Citas próximas (en 5-30 minutos)
 * 
 * Uso: node api-clinica/scripts/crear-datos-prueba-notificaciones.js [id_paciente]
 * 
 * Si no se proporciona id_paciente, usa el paciente Eduardo (id: 7)
 */

async function crearDatosPruebaNotificaciones() {
  const transaction = await sequelize.transaction();
  
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida\n');

    // Obtener id_paciente de argumentos o usar default
    const idPaciente = process.argv[2] ? parseInt(process.argv[2]) : 7;

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

    logger.info(`✅ Paciente encontrado: ${paciente.nombre} ${paciente.apellido_paterno}\n`);

    // Buscar doctor asignado
    const doctorPaciente = await DoctorPaciente.findOne({
      where: { id_paciente: paciente.id_paciente },
      transaction
    });

    if (!doctorPaciente) {
      throw new Error(`No se encontró doctor asignado para el paciente ${idPaciente}`);
    }

    const doctor = await sequelize.models.Doctor.findByPk(doctorPaciente.id_doctor, { transaction });
    if (!doctor) {
      throw new Error(`No se encontró el doctor con ID ${doctorPaciente.id_doctor}`);
    }

    logger.info(`✅ Doctor encontrado: ${doctor.nombre} ${doctor.apellido_paterno}\n`);

    // Obtener medicamentos disponibles
    const medicamentosDisponibles = await Medicamento.findAll({
      limit: 3,
      transaction
    });

    if (medicamentosDisponibles.length === 0) {
      throw new Error('No hay medicamentos disponibles en la base de datos');
    }

    logger.info(`✅ Medicamentos disponibles: ${medicamentosDisponibles.length}\n`);

    // 1. CREAR PLAN DE MEDICACIÓN CON HORARIOS PRÓXIMOS
    logger.info('💊 Creando plan de medicación con horarios próximos...\n');

    const ahora = new Date();
    
    // Crear plan de medicación activo
    const planMedicacion = await PlanMedicacion.create({
      id_paciente: paciente.id_paciente,
      id_doctor: doctor.id_doctor,
      fecha_inicio: ahora,
      fecha_fin: new Date(ahora.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 días
      observaciones: 'Plan de medicación para pruebas de notificaciones',
      activo: true,
      fecha_creacion: ahora,
    }, { transaction });

    logger.info(`✅ Plan de medicación creado (ID: ${planMedicacion.id_plan})\n`);

    // Crear detalles del plan con horarios próximos
    // En modo prueba, los tiempos están reducidos (30 seg = 30 min reales)
    const horariosPrueba = [
      { minutos: 1, nombre: 'Inmediato (1 min)' },
      { minutos: 3, nombre: 'Próximo (3 min)' },
      { minutos: 5, nombre: 'Cercano (5 min)' },
    ];

    for (let i = 0; i < Math.min(medicamentosDisponibles.length, horariosPrueba.length); i++) {
      const medicamento = medicamentosDisponibles[i];
      const horario = horariosPrueba[i];
      
      // Calcular hora del horario (formato HH:MM)
      const fechaHorario = new Date(ahora.getTime() + horario.minutos * 60 * 1000);
      const horaStr = fechaHorario.getHours().toString().padStart(2, '0');
      const minutoStr = fechaHorario.getMinutes().toString().padStart(2, '0');
      const horarioStr = `${horaStr}:${minutoStr}`;

      await PlanDetalle.create({
        id_plan: planMedicacion.id_plan,
        id_medicamento: medicamento.id_medicamento,
        dosis: '1 tableta',
        frecuencia: 'Una vez al día',
        horario: horarioStr, // Formato simple HH:MM (no múltiples horarios)
        duracion_dias: 30,
        activo: true,
        fecha_creacion: ahora,
      }, { transaction });

      logger.info(`  ✅ Medicamento "${medicamento.nombre_medicamento}" programado para ${horarioStr} (${horario.nombre})`);
    }

    logger.info(`\n✅ ${Math.min(medicamentosDisponibles.length, horariosPrueba.length)} medicamentos agregados al plan\n`);

    // 2. CREAR CITAS PRÓXIMAS
    logger.info('📅 Creando citas próximas para pruebas...\n');

    const citasPrueba = [
      { minutos: 5, motivo: 'Cita de prueba (5 minutos)' },
      { minutos: 30, motivo: 'Cita de prueba (30 minutos)' },
      { minutos: 60, motivo: 'Cita de prueba (1 hora)' },
    ];

    for (const citaPrueba of citasPrueba) {
      const fechaCita = new Date(ahora.getTime() + citaPrueba.minutos * 60 * 1000);
      
      const cita = await Cita.create({
        id_paciente: paciente.id_paciente,
        id_doctor: doctor.id_doctor,
        fecha_cita: fechaCita,
        motivo: citaPrueba.motivo,
        asistencia: null,
        es_primera_consulta: false,
        observaciones: 'Cita creada para pruebas de notificaciones',
        fecha_creacion: ahora,
      }, { transaction });

      logger.info(`  ✅ Cita creada para ${fechaCita.toLocaleString('es-MX')} (${citaPrueba.motivo})`);
    }

    logger.info(`\n✅ ${citasPrueba.length} citas creadas\n`);

    await transaction.commit();
    
    logger.info('\n🎉 Datos de prueba creados exitosamente!\n');
    logger.info('📋 Resumen:');
    logger.info(`  - Plan de medicación: ${planMedicacion.id_plan}`);
    logger.info(`  - Medicamentos con horarios próximos: ${Math.min(medicamentosDisponibles.length, horariosPrueba.length)}`);
    logger.info(`  - Citas próximas: ${citasPrueba.length}`);
    logger.info('\n💡 Las notificaciones se activarán en los próximos minutos');
    logger.info('💡 En modo desarrollo (TEST_MODE=true), los tiempos están reducidos para pruebas rápidas\n');

    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    logger.error('❌ Error creando datos de prueba:', error);
    process.exit(1);
  }
}

// Ejecutar
crearDatosPruebaNotificaciones();

