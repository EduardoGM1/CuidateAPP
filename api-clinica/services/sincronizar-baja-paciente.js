import { Paciente } from '../models/associations.js';
import logger from '../utils/logger.js';

/**
 * =====================================================
 * SERVICIO DE SINCRONIZACIÓN: BAJA DE PACIENTE
 * =====================================================
 * 
 * Sincroniza el campo fecha_baja con activo = FALSE
 * según instrucción ⑭ del formato GAM
 */

/**
 * Sincronizar baja de paciente
 * @param {number} pacienteId - ID del paciente
 * @param {Date|string|null} fechaBaja - Fecha de baja (opcional, si no se proporciona usa fecha actual)
 * @param {string|null} motivoBaja - Motivo de la baja (opcional)
 * @returns {Promise<boolean>} - true si se sincronizó correctamente
 */
export async function sincronizarBajaPaciente(pacienteId, fechaBaja = null, motivoBaja = null) {
  try {
    const paciente = await Paciente.findByPk(pacienteId);

    if (!paciente) {
      throw new Error(`Paciente con ID ${pacienteId} no encontrado`);
    }

    const updateData = {};

    // Si se proporciona fecha_baja, establecer activo = false
    if (fechaBaja !== null && fechaBaja !== undefined) {
      const fecha = fechaBaja instanceof Date ? fechaBaja : new Date(fechaBaja);
      
      if (isNaN(fecha.getTime())) {
        throw new Error('Fecha de baja inválida');
      }

      // Validar que fecha_baja >= fecha_registro
      if (paciente.fecha_registro && fecha < new Date(paciente.fecha_registro)) {
        throw new Error('Fecha de baja no puede ser anterior a fecha de registro');
      }

      updateData.fecha_baja = fecha.toISOString().split('T')[0];
      updateData.activo = false;
    } else if (paciente.activo === false && !paciente.fecha_baja) {
      // Si está inactivo pero no tiene fecha_baja, establecer fecha actual
      updateData.fecha_baja = new Date().toISOString().split('T')[0];
    } else if (paciente.activo === true && paciente.fecha_baja) {
      // Si está activo pero tiene fecha_baja, limpiar fecha_baja
      updateData.fecha_baja = null;
      updateData.motivo_baja = null;
    }

    // Si se proporciona motivo_baja
    if (motivoBaja !== null && motivoBaja !== undefined) {
      updateData.motivo_baja = motivoBaja.trim() || null;
    }

    // Solo actualizar si hay cambios
    if (Object.keys(updateData).length > 0) {
      await Paciente.update(updateData, {
        where: { id_paciente: pacienteId }
      });

      logger.info('Baja de paciente sincronizada', {
        pacienteId,
        fecha_baja: updateData.fecha_baja,
        activo: updateData.activo !== undefined ? updateData.activo : paciente.activo,
        motivo_baja: updateData.motivo_baja !== undefined ? updateData.motivo_baja : paciente.motivo_baja
      });
    }

    return true;
  } catch (error) {
    logger.error('Error sincronizando baja de paciente:', error);
    throw error;
  }
}

/**
 * Sincronizar todos los pacientes inactivos sin fecha_baja
 * Útil para migraciones o correcciones masivas
 * @returns {Promise<number>} - Número de pacientes sincronizados
 */
export async function sincronizarTodosLosPacientesInactivos() {
  try {
    const pacientesInactivos = await Paciente.findAll({
      where: {
        activo: false,
        fecha_baja: null
      }
    });

    let sincronizados = 0;
    for (const paciente of pacientesInactivos) {
      try {
        await sincronizarBajaPaciente(paciente.id_paciente);
        sincronizados++;
      } catch (error) {
        logger.error(`Error sincronizando paciente ${paciente.id_paciente}:`, error);
      }
    }

    logger.info('Sincronización masiva de bajas completada', {
      totalPacientes: pacientesInactivos.length,
      sincronizados
    });

    return sincronizados;
  } catch (error) {
    logger.error('Error en sincronización masiva de bajas:', error);
    throw error;
  }
}

export default {
  sincronizarBajaPaciente,
  sincronizarTodosLosPacientesInactivos
};

