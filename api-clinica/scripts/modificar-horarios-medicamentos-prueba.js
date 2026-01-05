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
 * Script para modificar los horarios de los medicamentos existentes
 * del paciente Eduardo González González (id_paciente: 7)
 * para que sean próximos y así poder probar las notificaciones
 * 
 * Uso: node api-clinica/scripts/modificar-horarios-medicamentos-prueba.js [id_paciente]
 * 
 * Si no se proporciona id_paciente, usa el paciente Eduardo (id: 7)
 */

async function modificarHorariosMedicamentosPrueba() {
  const transaction = await sequelize.transaction();
  
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida\n');

    // Obtener id_paciente de argumentos o usar default
    const idPaciente = process.argv[2] ? parseInt(process.argv[2]) : 7;

    logger.info(`📝 Buscando paciente con ID: ${idPaciente}...`);
    const paciente = await Paciente.findByPk(idPaciente);

    if (!paciente) {
      throw new Error(`No se encontró el paciente con ID ${idPaciente}`);
    }

    logger.info(`✅ Paciente encontrado: ${paciente.nombre} ${paciente.apellido_paterno}\n`);

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
      logger.info('💡 Sugerencia: Ejecuta primero el script crear-datos-prueba-notificaciones.js para crear datos');
      await transaction.rollback();
      process.exit(0);
    }

    logger.info(`✅ Se encontraron ${planesMedicacion.length} plan(es) de medicación activo(s)\n`);

    const ahora = new Date();
    let totalModificados = 0;

    // Procesar cada plan de medicación
    for (const plan of planesMedicacion) {
      logger.info(`📋 Procesando plan ID: ${plan.id_plan}...`);

      // Obtener detalles del plan (medicamentos)
      const detallesPlan = await PlanDetalle.findAll({
        where: {
          id_plan: plan.id_plan,
          activo: true,
        },
        include: [{
          model: Medicamento,
          attributes: ['id_medicamento', 'nombre_medicamento']
        }],
        transaction
      });

      if (detallesPlan.length === 0) {
        logger.warn(`  ⚠️  El plan ${plan.id_plan} no tiene medicamentos activos`);
        continue;
      }

      logger.info(`  ✅ Se encontraron ${detallesPlan.length} medicamento(s) en este plan\n`);

      // Horarios de prueba (1, 3, 5 minutos desde ahora)
      const horariosPrueba = [
        { minutos: 1, nombre: 'Inmediato (1 min)' },
        { minutos: 3, nombre: 'Próximo (3 min)' },
        { minutos: 5, nombre: 'Cercano (5 min)' },
      ];

      // Modificar cada medicamento
      for (let i = 0; i < detallesPlan.length; i++) {
        const detalle = detallesPlan[i];
        const horario = horariosPrueba[i % horariosPrueba.length]; // Reutilizar horarios si hay más de 3
        
        // Calcular hora del horario (formato HH:MM)
        const fechaHorario = new Date(ahora.getTime() + horario.minutos * 60 * 1000);
        const horaStr = fechaHorario.getHours().toString().padStart(2, '0');
        const minutoStr = fechaHorario.getMinutes().toString().padStart(2, '0');
        const horarioStr = `${horaStr}:${minutoStr}`;

        // Guardar horario anterior para el log
        const horarioAnterior = detalle.horario || 'N/A';

        // Actualizar horario del medicamento
        await PlanDetalle.update(
          {
            horario: horarioStr, // Formato simple HH:MM
          },
          {
            where: {
              id_detalle: detalle.id_detalle,
            },
            transaction
          }
        );

        // Obtener nombre del medicamento (convertir a JSON para acceder a las relaciones)
        const detalleJSON = detalle.toJSON ? detalle.toJSON() : detalle;
        const medicamentoData = detalleJSON.Medicamento || detalleJSON.medicamento;
        const nombreMedicamento = medicamentoData?.nombre_medicamento || 'Medicamento desconocido';
        logger.info(`  ✅ Medicamento "${nombreMedicamento}" actualizado: ${horarioAnterior} → ${horarioStr} (${horario.nombre})`);
        totalModificados++;
      }

      logger.info('');
    }

    await transaction.commit();
    
    logger.info('\n🎉 Horarios de medicamentos modificados exitosamente!\n');
    logger.info('📋 Resumen:');
    logger.info(`  - Planes procesados: ${planesMedicacion.length}`);
    logger.info(`  - Medicamentos modificados: ${totalModificados}`);
    logger.info('\n💡 Los horarios ahora están configurados para los próximos 1-5 minutos');
    logger.info('💡 En modo desarrollo (TEST_MODE=true), las notificaciones se activarán rápidamente');
    logger.info('\n⚠️  IMPORTANTE: Estos horarios son solo para pruebas. Recuerda restaurarlos después.\n');

    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    logger.error('❌ Error modificando horarios de medicamentos:', error);
    process.exit(1);
  }
}

// Ejecutar
modificarHorariosMedicamentosPrueba();

