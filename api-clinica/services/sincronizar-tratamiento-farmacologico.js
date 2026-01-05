import { PlanMedicacion, PacienteComorbilidad } from '../models/associations.js';
import logger from '../utils/logger.js';

/**
 * =====================================================
 * SERVICIO DE SINCRONIZACIÓN: TRATAMIENTO FARMACOLÓGICO
 * =====================================================
 * 
 * Sincroniza el campo recibe_tratamiento_farmacologico
 * en paciente_comorbilidad con la existencia de
 * PlanMedicacion activo para el paciente
 */

/**
 * Sincronizar tratamiento farmacológico para un paciente y comorbilidad
 * @param {number} pacienteId - ID del paciente
 * @param {number} comorbilidadId - ID de la comorbilidad (opcional, si no se proporciona sincroniza todas)
 * @returns {Promise<boolean>} - true si se sincronizó correctamente
 */
export async function sincronizarTratamientoFarmacologico(pacienteId, comorbilidadId = null) {
  try {
    // Verificar si existe PlanMedicacion activo para este paciente
    const planActivo = await PlanMedicacion.findOne({
      where: {
        id_paciente: pacienteId,
        activo: true
      }
    });

    const tieneTratamientoFarmacologico = planActivo !== null;

    // Actualizar recibe_tratamiento_farmacologico
    const whereClause = { id_paciente: pacienteId };
    if (comorbilidadId) {
      whereClause.id_comorbilidad = comorbilidadId;
    }

    const [updatedRows] = await PacienteComorbilidad.update(
      { recibe_tratamiento_farmacologico: tieneTratamientoFarmacologico },
      { where: whereClause }
    );

    logger.info('Tratamiento farmacológico sincronizado', {
      pacienteId,
      comorbilidadId: comorbilidadId || 'todas',
      tieneTratamiento: tieneTratamientoFarmacologico,
      filasActualizadas: updatedRows
    });

    return true;
  } catch (error) {
    logger.error('Error sincronizando tratamiento farmacológico:', error);
    throw error;
  }
}

/**
 * Sincronizar tratamiento farmacológico para todos los pacientes
 * Útil para migraciones o correcciones masivas
 * @returns {Promise<number>} - Número de pacientes sincronizados
 */
export async function sincronizarTodosLosPacientes() {
  try {
    // Obtener todos los pacientes con comorbilidades
    const pacientesComorbilidades = await PacienteComorbilidad.findAll({
      attributes: ['id_paciente'],
      group: ['id_paciente']
    });

    let sincronizados = 0;
    for (const pc of pacientesComorbilidades) {
      try {
        await sincronizarTratamientoFarmacologico(pc.id_paciente);
        sincronizados++;
      } catch (error) {
        logger.error(`Error sincronizando paciente ${pc.id_paciente}:`, error);
      }
    }

    logger.info('Sincronización masiva completada', {
      totalPacientes: pacientesComorbilidades.length,
      sincronizados
    });

    return sincronizados;
  } catch (error) {
    logger.error('Error en sincronización masiva:', error);
    throw error;
  }
}

export default {
  sincronizarTratamientoFarmacologico,
  sincronizarTodosLosPacientes
};

