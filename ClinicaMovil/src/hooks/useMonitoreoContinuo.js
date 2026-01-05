/**
 * @file useMonitoreoContinuo.js
 * @description Hook para obtener signos vitales no asociados a citas (monitoreo continuo)
 * @author Senior Developer
 * @date 2025-11-17
 */

import { useMemo } from 'react';
import { usePacienteSignosVitales } from './usePacienteMedicalData';
import Logger from '../services/logger';

/**
 * Hook para obtener signos vitales de monitoreo continuo (sin cita asociada)
 * 
 * @param {number|string} pacienteId - ID del paciente
 * @param {Object} options - Opciones de configuración
 * @param {number} options.limit - Límite de signos vitales (default: 50)
 * @param {boolean} options.autoFetch - Si debe obtener datos automáticamente (default: true)
 * @param {string} options.sort - Ordenamiento ('DESC' | 'ASC') (default: 'DESC')
 * 
 * @returns {Object} Objeto con signos vitales de monitoreo, loading, error, refresh
 */
export const useMonitoreoContinuo = (pacienteId, options = {}) => {
  const {
    limit = 50,
    autoFetch = true,
    sort = 'DESC'
  } = options;

  // Obtener todos los signos vitales
  const { 
    signosVitales, 
    loading, 
    error, 
    refresh,
    total 
  } = usePacienteSignosVitales(pacienteId, {
    limit: 200, // Obtener más para filtrar
    autoFetch,
    sort
  });

  /**
   * Filtrar signos vitales sin cita asociada
   */
  const monitoreoContinuo = useMemo(() => {
    if (!signosVitales || signosVitales.length === 0) {
      Logger.debug('useMonitoreoContinuo: No hay signos vitales disponibles', {
        pacienteId,
        signosVitalesLength: signosVitales?.length || 0
      });
      return [];
    }

    // Filtrar signos vitales sin cita asociada
    const signosSinCita = signosVitales.filter(
      signo => {
        const idCita = signo.id_cita;
        
        // Considerar sin cita si:
        // - id_cita es null o undefined
        // - id_cita es 0 (cero)
        // - id_cita es string vacío
        // - id_cita no es un número válido mayor que 0
        let sinCita = false;
        
        if (idCita === null || idCita === undefined) {
          sinCita = true;
        } else if (idCita === 0 || idCita === '0') {
          sinCita = true;
        } else if (idCita === '') {
          sinCita = true;
        } else {
          // Intentar convertir a número
          const idCitaNum = Number(idCita);
          // Si no es un número válido o es 0, considerar sin cita
          sinCita = isNaN(idCitaNum) || idCitaNum === 0;
        }
        
        if (!sinCita) {
          Logger.debug('useMonitoreoContinuo: Signo vital con cita excluido', {
            id_signo: signo.id_signo || signo.id,
            id_cita: signo.id_cita,
            id_cita_type: typeof signo.id_cita
          });
        } else {
          Logger.debug('useMonitoreoContinuo: Signo vital sin cita incluido', {
            id_signo: signo.id_signo || signo.id,
            id_cita: signo.id_cita,
            id_cita_type: typeof signo.id_cita
          });
        }
        
        return sinCita;
      }
    );

    // Ordenar por fecha más reciente primero (si no viene ordenado)
    const signosOrdenados = [...signosSinCita].sort((a, b) => {
      const fechaA = new Date(a.fecha_medicion || a.fecha_creacion || 0);
      const fechaB = new Date(b.fecha_medicion || b.fecha_creacion || 0);
      return fechaB - fechaA; // DESC: más reciente primero
    });

    const resultado = signosOrdenados.slice(0, limit);

    Logger.info('useMonitoreoContinuo: Filtrado completado', {
      pacienteId,
      totalSignos: signosVitales.length,
      signosSinCita: signosSinCita.length,
      limit,
      resultadoCount: resultado.length,
      primerSigno: resultado[0] ? {
        id: resultado[0].id_signo || resultado[0].id,
        fecha: resultado[0].fecha_medicion || resultado[0].fecha_creacion,
        id_cita: resultado[0].id_cita
      } : null
    });

    return resultado;
  }, [signosVitales, limit, pacienteId]);

  return {
    monitoreoContinuo,
    loading,
    error,
    refresh,
    total: monitoreoContinuo.length
  };
};

export default useMonitoreoContinuo;

