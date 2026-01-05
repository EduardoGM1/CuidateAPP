/**
 * Script para eliminar TODAS las citas del sistema
 * 
 * IMPORTANTE: Este script elimina TODAS las citas de la base de datos.
 * También elimina las solicitudes de reprogramación relacionadas.
 * 
 * USO:
 *   node scripts/eliminar-todas-las-citas.js
 * 
 * ADVERTENCIA: Esta operación NO se puede deshacer.
 */

import sequelize from '../config/db.js';
import { Cita, SolicitudReprogramacion, Diagnostico } from '../models/associations.js';
import logger from '../utils/logger.js';

const eliminarTodasLasCitas = async () => {
  const transaction = await sequelize.transaction();
  
  try {
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🗑️  INICIANDO ELIMINACIÓN DE TODAS LAS CITAS');
    logger.info('═══════════════════════════════════════════════════════════');
    
    // 1. Contar citas antes de eliminar
    const totalCitas = await Cita.count({ transaction });
    logger.info(`📊 Total de citas en el sistema: ${totalCitas}`);
    
    if (totalCitas === 0) {
      logger.info('✅ No hay citas para eliminar');
      await transaction.rollback();
      return;
    }
    
    // 2. Contar solicitudes de reprogramación
    const totalSolicitudes = await SolicitudReprogramacion.count({ transaction });
    logger.info(`📊 Total de solicitudes de reprogramación: ${totalSolicitudes}`);
    
    // 3. Verificar si hay diagnósticos relacionados con citas
    const diagnosticosConCita = await Diagnostico.count({
      where: {
        id_cita: { [sequelize.Sequelize.Op.ne]: null }
      },
      transaction
    });
    logger.info(`📊 Diagnósticos relacionados con citas: ${diagnosticosConCita}`);
    
    if (diagnosticosConCita > 0) {
      logger.warn('⚠️  ADVERTENCIA: Hay diagnósticos relacionados con citas');
      logger.warn('   Los diagnósticos NO se eliminarán, solo se desvincularán (id_cita = null)');
    }
    
    // 4. Desvincular diagnósticos de las citas (poner id_cita = null)
    if (diagnosticosConCita > 0) {
      logger.info('🔗 Desvinculando diagnósticos de citas...');
      await Diagnostico.update(
        { id_cita: null },
        {
          where: {
            id_cita: { [sequelize.Sequelize.Op.ne]: null }
          },
          transaction
        }
      );
      logger.info(`✅ ${diagnosticosConCita} diagnósticos desvinculados`);
    }
    
    // 5. Eliminar solicitudes de reprogramación primero (foreign key constraint)
    if (totalSolicitudes > 0) {
      logger.info('🗑️  Eliminando solicitudes de reprogramación...');
      const solicitudesEliminadas = await SolicitudReprogramacion.destroy({
        where: {},
        transaction
      });
      logger.info(`✅ ${solicitudesEliminadas} solicitudes de reprogramación eliminadas`);
    }
    
    // 6. Eliminar todas las citas
    logger.info('🗑️  Eliminando todas las citas...');
    const citasEliminadas = await Cita.destroy({
      where: {},
      transaction
    });
    
    logger.info(`✅ ${citasEliminadas} citas eliminadas`);
    
    // 7. Confirmar transacción
    await transaction.commit();
    
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('✅ ELIMINACIÓN COMPLETADA EXITOSAMENTE');
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info(`📊 Resumen:`);
    logger.info(`   - Citas eliminadas: ${citasEliminadas}`);
    logger.info(`   - Solicitudes eliminadas: ${totalSolicitudes}`);
    logger.info(`   - Diagnósticos desvinculados: ${diagnosticosConCita}`);
    logger.info('═══════════════════════════════════════════════════════════');
    
    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    logger.error('❌ ERROR al eliminar citas:', error);
    logger.error('   Transacción revertida. No se eliminó nada.');
    process.exit(1);
  }
};

// Ejecutar script
eliminarTodasLasCitas();

