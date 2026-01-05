import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import logger from '../utils/logger.js';
import { 
  Paciente,
  PlanMedicacion,
  PlanDetalle,
  Medicamento,
} from '../models/associations.js';

/**
 * Script para modificar los horarios de los medicamentos del paciente
 * Eduardo González González (id_paciente: 7, id_usuario: 9)
 * 
 * Horarios específicos:
 * - Primer medicamento: 18:05 (6:05 PM)
 * - Segundo medicamento: 18:10 (6:10 PM)
 * 
 * Uso: node api-clinica/scripts/modificar-horarios-eduardo-especificos.js
 */

async function modificarHorariosEduardoEspecificos() {
  const transaction = await sequelize.transaction();
  
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida\n');

    const idPaciente = 7;
    const idUsuario = 9;

    logger.info(`📝 Buscando paciente Eduardo González González...`);
    logger.info(`   ID Paciente: ${idPaciente}`);
    logger.info(`   ID Usuario: ${idUsuario}\n`);

    const paciente = await Paciente.findByPk(idPaciente, {
      include: [{
        model: sequelize.models.Usuario,
        attributes: ['id_usuario', 'email', 'rol'],
        where: { id_usuario: idUsuario }
      }]
    });

    if (!paciente) {
      throw new Error(`No se encontró el paciente con ID ${idPaciente} y usuario ${idUsuario}`);
    }

    logger.info(`✅ Paciente encontrado: ${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno}\n`);

    // Buscar planes de medicación activos del paciente
    logger.info('💊 Buscando planes de medicación activos...\n');
    
    const planesMedicacion = await PlanMedicacion.findAll({
      where: {
        id_paciente: idPaciente,
        activo: true,
      },
      transaction
    });

    if (planesMedicacion.length === 0) {
      logger.warn('⚠️  No se encontraron planes de medicación activos para este paciente');
      logger.info('💡 Creando un nuevo plan de medicación...\n');
      
      // Buscar un doctor asignado al paciente
      const { DoctorPaciente } = await import('../models/associations.js');
      const doctorPaciente = await DoctorPaciente.findOne({
        where: { id_paciente: idPaciente },
        transaction
      });

      if (!doctorPaciente) {
        throw new Error('No se encontró un doctor asignado al paciente. Asigna un doctor primero.');
      }

      const doctor = await sequelize.models.Doctor.findByPk(doctorPaciente.id_doctor, { transaction });
      if (!doctor) {
        throw new Error(`No se encontró el doctor con ID ${doctorPaciente.id_doctor}`);
      }

      // Crear nuevo plan de medicación
      const nuevoPlan = await PlanMedicacion.create({
        id_paciente: idPaciente,
        id_doctor: doctor.id_doctor,
        fecha_inicio: new Date(),
        fecha_fin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
        observaciones: 'Plan de medicación creado para pruebas',
        activo: true,
        fecha_creacion: new Date(),
      }, { transaction });

      logger.info(`✅ Nuevo plan de medicación creado (ID: ${nuevoPlan.id_plan})\n`);

      // Obtener medicamentos disponibles
      const medicamentosDisponibles = await Medicamento.findAll({
        limit: 2,
        transaction
      });

      if (medicamentosDisponibles.length === 0) {
        throw new Error('No hay medicamentos disponibles en la base de datos');
      }

      // Crear detalles del plan con los horarios especificados
      const horarios = ['18:05', '18:10'];
      
      for (let i = 0; i < Math.min(medicamentosDisponibles.length, horarios.length); i++) {
        const medicamento = medicamentosDisponibles[i];
        const horario = horarios[i];
        
        await PlanDetalle.create({
          id_plan: nuevoPlan.id_plan,
          id_medicamento: medicamento.id_medicamento,
          dosis: '1 tableta',
          frecuencia: 'Una vez al día',
          horario: horario,
          duracion_dias: 30,
          fecha_creacion: new Date(),
        }, { transaction });

        logger.info(`  ✅ Medicamento "${medicamento.nombre_medicamento}" creado con horario ${horario}`);
      }

      await transaction.commit();
      logger.info('\n🎉 Plan de medicación creado con horarios específicos!\n');
      process.exit(0);
    }

    logger.info(`✅ Se encontraron ${planesMedicacion.length} plan(es) de medicación activo(s)\n`);

    // Horarios específicos solicitados
    const horarios = ['18:05', '18:10']; // 6:05 PM y 6:10 PM
    let totalModificados = 0;

    // Procesar cada plan de medicación
    for (const plan of planesMedicacion) {
      logger.info(`📋 Procesando plan ID: ${plan.id_plan}...`);

      // Obtener detalles del plan (medicamentos) ordenados por id_detalle
      const detallesPlan = await PlanDetalle.findAll({
        where: {
          id_plan: plan.id_plan,
        },
        include: [{
          model: Medicamento,
          attributes: ['id_medicamento', 'nombre_medicamento']
        }],
        order: [['id_detalle', 'ASC']], // Ordenar para asegurar consistencia
        transaction
      });

      if (detallesPlan.length === 0) {
        logger.warn(`  ⚠️  El plan ${plan.id_plan} no tiene medicamentos activos`);
        continue;
      }

      logger.info(`  ✅ Se encontraron ${detallesPlan.length} medicamento(s) en este plan\n`);

      // Modificar los primeros 2 medicamentos con los horarios especificados
      const medicamentosAModificar = Math.min(detallesPlan.length, horarios.length);

      for (let i = 0; i < medicamentosAModificar; i++) {
        const detalle = detallesPlan[i];
        const horario = horarios[i];
        
        // Guardar horario anterior para el log
        const horarioAnterior = detalle.horario || 'N/A';

        // Actualizar horario del medicamento
        await PlanDetalle.update(
          {
            horario: horario, // 18:05 o 18:10
          },
          {
            where: {
              id_detalle: detalle.id_detalle,
            },
            transaction
          }
        );

        // Obtener nombre del medicamento
        const detalleJSON = detalle.toJSON ? detalle.toJSON() : detalle;
        const medicamentoData = detalleJSON.Medicamento || detalleJSON.medicamento;
        const nombreMedicamento = medicamentoData?.nombre_medicamento || 'Medicamento desconocido';
        
        logger.info(`  ✅ Medicamento "${nombreMedicamento}" actualizado:`);
        logger.info(`     Horario anterior: ${horarioAnterior}`);
        logger.info(`     Horario nuevo: ${horario} (${horario === '18:05' ? '6:05 PM' : '6:10 PM'})`);
        totalModificados++;
      }

      // Si hay más medicamentos, informar que no se modificaron
      if (detallesPlan.length > horarios.length) {
        logger.info(`  ℹ️  ${detallesPlan.length - horarios.length} medicamento(s) adicional(es) no fueron modificados`);
      }

      logger.info('');
    }

    await transaction.commit();
    
    logger.info('\n🎉 Horarios de medicamentos modificados exitosamente!\n');
    logger.info('📋 Resumen:');
    logger.info(`  - Planes procesados: ${planesMedicacion.length}`);
    logger.info(`  - Medicamentos modificados: ${totalModificados}`);
    logger.info('\n⏰ Horarios configurados:');
    logger.info('   - Medicamento 1: 18:05 (6:05 PM)');
    logger.info('   - Medicamento 2: 18:10 (6:10 PM)');
    logger.info('\n💡 Los recordatorios se activarán según la configuración del sistema\n');

    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    logger.error('❌ Error modificando horarios de medicamentos:', error);
    logger.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Ejecutar
modificarHorariosEduardoEspecificos();

