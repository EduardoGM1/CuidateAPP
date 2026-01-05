/**
 * Script para eliminar TODOS los datos médicos del sistema:
 * - Citas
 * - Diagnósticos
 * - Signos Vitales
 * - Planes de Medicación (y sus detalles)
 * - Tomas de Medicamentos
 * - Solicitudes de Reprogramación
 * 
 * IMPORTANTE: Este script elimina TODOS los datos médicos.
 * 
 * USO:
 *   node scripts/eliminar-todos-los-datos-medicos.js
 * 
 * ADVERTENCIA: Esta operación NO se puede deshacer.
 */

import sequelize from '../config/db.js';
import { 
  Cita, 
  Diagnostico, 
  SignoVital, 
  PlanMedicacion, 
  PlanDetalle,
  MedicamentoToma,
  SolicitudReprogramacion
} from '../models/associations.js';
import logger from '../utils/logger.js';

const eliminarTodosLosDatosMedicos = async () => {
  const transaction = await sequelize.transaction();
  
  try {
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🗑️  INICIANDO ELIMINACIÓN DE TODOS LOS DATOS MÉDICOS');
    logger.info('═══════════════════════════════════════════════════════════');
    
    // 1. Contar registros antes de eliminar
    const totalCitas = await Cita.count({ transaction });
    const totalDiagnosticos = await Diagnostico.count({ transaction });
    const totalSignosVitales = await SignoVital.count({ transaction });
    const totalPlanesMedicacion = await PlanMedicacion.count({ transaction });
    const totalPlanDetalles = await PlanDetalle.count({ transaction });
    const totalTomasMedicamento = await MedicamentoToma.count({ transaction });
    const totalSolicitudes = await SolicitudReprogramacion.count({ transaction });
    
    logger.info('📊 Resumen de datos a eliminar:');
    logger.info(`   - Citas: ${totalCitas}`);
    logger.info(`   - Diagnósticos: ${totalDiagnosticos}`);
    logger.info(`   - Signos Vitales: ${totalSignosVitales}`);
    logger.info(`   - Planes de Medicación: ${totalPlanesMedicacion}`);
    logger.info(`   - Detalles de Planes: ${totalPlanDetalles}`);
    logger.info(`   - Tomas de Medicamentos: ${totalTomasMedicamento}`);
    logger.info(`   - Solicitudes de Reprogramación: ${totalSolicitudes}`);
    
    const totalRegistros = totalCitas + totalDiagnosticos + totalSignosVitales + 
                          totalPlanesMedicacion + totalPlanDetalles + totalTomasMedicamento + totalSolicitudes;
    
    if (totalRegistros === 0) {
      logger.info('✅ No hay datos médicos para eliminar');
      await transaction.rollback();
      return;
    }
    
    logger.info(`\n📊 Total de registros a eliminar: ${totalRegistros}\n`);
    
    // 2. Eliminar en el orden correcto (respetando foreign keys)
    
    // 2.1. Eliminar Tomas de Medicamentos primero (depende de PlanDetalle y PlanMedicacion)
    if (totalTomasMedicamento > 0) {
      logger.info('🗑️  Eliminando tomas de medicamentos...');
      const tomasEliminadas = await MedicamentoToma.destroy({
        where: {},
        transaction
      });
      logger.info(`✅ ${tomasEliminadas} tomas de medicamentos eliminadas`);
    }
    
    // 2.2. Eliminar Detalles de Planes (depende de PlanMedicacion)
    if (totalPlanDetalles > 0) {
      logger.info('🗑️  Eliminando detalles de planes de medicación...');
      const detallesEliminados = await PlanDetalle.destroy({
        where: {},
        transaction
      });
      logger.info(`✅ ${detallesEliminados} detalles de planes eliminados`);
    }
    
    // 2.3. Eliminar Planes de Medicación
    if (totalPlanesMedicacion > 0) {
      logger.info('🗑️  Eliminando planes de medicación...');
      const planesEliminados = await PlanMedicacion.destroy({
        where: {},
        transaction
      });
      logger.info(`✅ ${planesEliminados} planes de medicación eliminados`);
    }
    
    // 2.4. Eliminar Solicitudes de Reprogramación (depende de Cita)
    if (totalSolicitudes > 0) {
      logger.info('🗑️  Eliminando solicitudes de reprogramación...');
      const solicitudesEliminadas = await SolicitudReprogramacion.destroy({
        where: {},
        transaction
      });
      logger.info(`✅ ${solicitudesEliminadas} solicitudes de reprogramación eliminadas`);
    }
    
    // 2.5. Eliminar Diagnósticos (puede depender de Cita, pero los desvinculamos)
    if (totalDiagnosticos > 0) {
      logger.info('🗑️  Eliminando diagnósticos...');
      const diagnosticosEliminados = await Diagnostico.destroy({
        where: {},
        transaction
      });
      logger.info(`✅ ${diagnosticosEliminados} diagnósticos eliminados`);
    }
    
    // 2.6. Eliminar Signos Vitales (puede depender de Cita, pero los desvinculamos)
    if (totalSignosVitales > 0) {
      logger.info('🗑️  Eliminando signos vitales...');
      const signosEliminados = await SignoVital.destroy({
        where: {},
        transaction
      });
      logger.info(`✅ ${signosEliminados} signos vitales eliminados`);
    }
    
    // 2.7. Eliminar Citas (último, ya que otros pueden depender de ellas)
    if (totalCitas > 0) {
      logger.info('🗑️  Eliminando citas...');
      const citasEliminadas = await Cita.destroy({
        where: {},
        transaction
      });
      logger.info(`✅ ${citasEliminadas} citas eliminadas`);
    }
    
    // 3. Confirmar transacción
    await transaction.commit();
    
    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('✅ ELIMINACIÓN COMPLETADA EXITOSAMENTE');
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('📊 Resumen final:');
    logger.info(`   - Citas eliminadas: ${totalCitas}`);
    logger.info(`   - Diagnósticos eliminados: ${totalDiagnosticos}`);
    logger.info(`   - Signos Vitales eliminados: ${totalSignosVitales}`);
    logger.info(`   - Planes de Medicación eliminados: ${totalPlanesMedicacion}`);
    logger.info(`   - Detalles de Planes eliminados: ${totalPlanDetalles}`);
    logger.info(`   - Tomas de Medicamentos eliminadas: ${totalTomasMedicamento}`);
    logger.info(`   - Solicitudes de Reprogramación eliminadas: ${totalSolicitudes}`);
    logger.info(`   - TOTAL: ${totalRegistros} registros eliminados`);
    logger.info('═══════════════════════════════════════════════════════════');
    
    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    logger.error('❌ ERROR al eliminar datos médicos:', error);
    logger.error('   Transacción revertida. No se eliminó nada.');
    process.exit(1);
  }
};

// Ejecutar script
eliminarTodosLosDatosMedicos();

