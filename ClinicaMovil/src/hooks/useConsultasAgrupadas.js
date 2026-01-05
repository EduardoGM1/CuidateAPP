/**
 * @file useConsultasAgrupadas.js
 * @description Hook para agrupar citas con sus signos vitales y diagnósticos asociados
 * @author Senior Developer
 * @date 2025-11-17
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { usePacienteCitas, usePacienteSignosVitales, usePacienteDiagnosticos } from './usePacienteMedicalData';
import Logger from '../services/logger';

/**
 * Hook para obtener consultas agrupadas (citas con sus datos asociados)
 * 
 * @param {number|string} pacienteId - ID del paciente
 * @param {Object} options - Opciones de configuración
 * @param {number} options.limit - Límite de citas a obtener (default: 50)
 * @param {boolean} options.autoFetch - Si debe obtener datos automáticamente (default: true)
 * @param {string} options.sort - Ordenamiento ('DESC' | 'ASC') (default: 'DESC')
 * 
 * @returns {Object} Objeto con consultas agrupadas, loading, error, refresh
 */
export const useConsultasAgrupadas = (pacienteId, options = {}) => {
  const {
    limit = 50,
    autoFetch = true,
    sort = 'DESC'
  } = options;

  // Obtener datos individuales
  const { citas, loading: loadingCitas, error: errorCitas, refresh: refreshCitas } = usePacienteCitas(pacienteId, {
    limit,
    autoFetch,
    sort
  });

  const { signosVitales, loading: loadingSignos, error: errorSignos, refresh: refreshSignos } = usePacienteSignosVitales(pacienteId, {
    limit: 200, // Obtener más signos vitales para poder asociarlos
    autoFetch,
    sort
  });

  const { diagnosticos, loading: loadingDiagnosticos, error: errorDiagnosticos, refresh: refreshDiagnosticos } = usePacienteDiagnosticos(pacienteId, {
    limit: 200, // Obtener más diagnósticos para poder asociarlos
    autoFetch,
    sort
  });

  // Estados combinados
  const loading = loadingCitas || loadingSignos || loadingDiagnosticos;
  const error = errorCitas || errorSignos || errorDiagnosticos;

  /**
   * Agrupa las citas con sus signos vitales y diagnósticos asociados
   */
  const consultasAgrupadas = useMemo(() => {
    if (!citas || citas.length === 0) {
      return [];
    }

    Logger.debug('Agrupando consultas', {
      totalCitas: citas.length,
      totalSignos: signosVitales?.length || 0,
      totalDiagnosticos: diagnosticos?.length || 0
    });

    return citas.map(cita => {
      // Filtrar signos vitales asociados a esta cita
      const signosAsociados = (signosVitales || []).filter(
        signo => signo.id_cita === cita.id_cita
      );

      // Filtrar diagnósticos asociados a esta cita
      const diagnosticosAsociados = (diagnosticos || []).filter(
        diagnostico => diagnostico.id_cita === cita.id_cita
      );

      // Determinar el estado de completitud
      const tieneSignos = signosAsociados.length > 0;
      const tieneDiagnosticos = diagnosticosAsociados.length > 0;
      const tieneDatosCompletos = tieneSignos && tieneDiagnosticos;
      const tieneDatosParciales = tieneSignos || tieneDiagnosticos;
      const soloCita = !tieneDatosParciales;

      return {
        cita,
        signosVitales: signosAsociados,
        diagnosticos: diagnosticosAsociados,
        tieneDatosCompletos,
        tieneDatosParciales,
        soloCita,
        estado: tieneDatosCompletos ? 'completa' : tieneDatosParciales ? 'parcial' : 'solo_cita'
      };
    });
  }, [citas, signosVitales, diagnosticos]);

  /**
   * Función para refrescar todos los datos
   */
  const refresh = useCallback(() => {
    refreshCitas();
    refreshSignos();
    refreshDiagnosticos();
  }, [refreshCitas, refreshSignos, refreshDiagnosticos]);

  return {
    consultasAgrupadas,
    loading,
    error,
    refresh,
    totalCitas: citas?.length || 0,
    totalSignosVitales: signosVitales?.length || 0,
    totalDiagnosticos: diagnosticos?.length || 0
  };
};

export default useConsultasAgrupadas;

