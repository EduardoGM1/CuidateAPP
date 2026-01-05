import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import { Op } from 'sequelize';
import { PacienteComorbilidad, DoctorPaciente } from '../models/associations.js';
import logger from '../utils/logger.js';

/**
 * Script para actualizar las fechas de detección de comorbilidades
 * distribuyéndolas en diferentes periodos (trimestres, semestres, años)
 * para poder probar los filtros por periodo
 */
async function actualizarFechasDeteccion() {
  const transaction = await sequelize.transaction();

  try {
    logger.info('🚀 Iniciando actualización de fechas de detección...');

    // Obtener todas las relaciones paciente-comorbilidad
    const relaciones = await PacienteComorbilidad.findAll({
      where: {
        fecha_deteccion: {
          [Op.ne]: null
        }
      },
      transaction
    });

    logger.info(`📋 Encontradas ${relaciones.length} relaciones con fecha_deteccion`);

    // Distribuir fechas en los últimos 2 años (8 trimestres, 4 semestres, 2 años)
    const hoy = new Date();
    const dosAnosAtras = new Date(hoy);
    dosAnosAtras.setFullYear(hoy.getFullYear() - 2);

    let actualizadas = 0;

    for (let i = 0; i < relaciones.length; i++) {
      const relacion = relaciones[i];
      
      // Distribuir uniformemente en los últimos 2 años
      // Esto creará datos en diferentes trimestres, semestres y años
      const diasAtras = Math.floor((i * 730) / relaciones.length); // Distribuir en 730 días (2 años)
      const fechaDeteccion = new Date(hoy);
      fechaDeteccion.setDate(fechaDeteccion.getDate() - diasAtras);

      await relacion.update({
        fecha_deteccion: fechaDeteccion.toISOString().split('T')[0]
      }, { transaction });

      actualizadas++;
    }

    await transaction.commit();
    logger.info(`\n✅ ¡Proceso completado exitosamente!`);
    logger.info(`📊 Resumen:`);
    logger.info(`   - Relaciones actualizadas: ${actualizadas}`);
    logger.info(`   - Fechas distribuidas en los últimos 2 años`);
    logger.info(`\n📅 Distribución de fechas:`);
    logger.info(`   - Año actual (${hoy.getFullYear()}): ~${Math.floor(actualizadas * 0.5)} registros`);
    logger.info(`   - Año anterior (${hoy.getFullYear() - 1}): ~${Math.floor(actualizadas * 0.5)} registros`);

  } catch (error) {
    await transaction.rollback();
    logger.error('❌ Error actualizando fechas de detección:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Ejecutar script
actualizarFechasDeteccion()
  .then(() => {
    logger.info('✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Error en el script:', error);
    process.exit(1);
  });

