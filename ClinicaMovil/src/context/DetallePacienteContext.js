/**
 * @file DetallePacienteContext.js
 * @description Context API para gestión centralizada del estado de Detalle del Paciente
 * @author Senior Developer
 * @date 2025-10-28
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import Logger from '../services/logger';

/**
 * Context para compartir estado y funciones entre componentes de Detalle del Paciente
 * Elimina prop drilling y centraliza la lógica de negocio
 */
const DetallePacienteContext = createContext(null);

/**
 * Hook para acceder al contexto de Detalle del Paciente
 * @returns {Object} Estado y funciones del contexto
 * @throws {Error} Si se usa fuera del Provider
 */
export const useDetallePacienteContext = () => {
  const context = useContext(DetallePacienteContext);
  if (!context) {
    throw new Error('useDetallePacienteContext debe usarse dentro de DetallePacienteProvider');
  }
  return context;
};

/**
 * Provider del contexto de Detalle del Paciente
 * Gestiona el estado global y proporciona funciones para manipularlo
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Componentes hijos
 * @param {number} props.pacienteId - ID del paciente
 */
export const DetallePacienteProvider = ({ children, pacienteId }) => {
  // ========== Estados de datos ==========
  const [citas, setCitas] = useState([]);
  const [signosVitales, setSignosVitales] = useState([]);
  const [diagnosticos, setDiagnosticos] = useState([]);
  const [medicamentos, setMedicamentos] = useState([]);
  const [redApoyo, setRedApoyo] = useState([]);
  const [esquemaVacunacion, setEsquemaVacunacion] = useState([]);

  // ========== Estados de carga ==========
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [lastRefresh, setLastRefresh] = useState(null);

  // ========== Estados de totales ==========
  const [totals, setTotals] = useState({
    citas: 0,
    signosVitales: 0,
    diagnosticos: 0,
    medicamentos: 0,
    redApoyo: 0,
    esquemaVacunacion: 0
  });

  /**
   * Refresca todos los datos del paciente
   * Fetch en paralelo para mejor performance
   */
  const refreshAll = useCallback(async () => {
    if (!pacienteId) {
      Logger.warn('DetallePacienteContext: No se puede refrescar sin pacienteId');
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      Logger.info('DetallePacienteContext: Refrescando todos los datos', { pacienteId });

      // TODO: Implementar fetch real con gestionService
      // Por ahora, mantendremos la estructura para integración futura
      
      setLastRefresh(new Date());
      Logger.success('DetallePacienteContext: Datos refrescados exitosamente');
    } catch (error) {
      Logger.error('DetallePacienteContext: Error refrescando datos', { error });
      setErrors({ general: error.message });
    } finally {
      setLoading(false);
    }
  }, [pacienteId]);

  /**
   * Actualiza los totales basados en los datos actuales
   */
  const updateTotals = useCallback(() => {
    setTotals({
      citas: citas.length,
      signosVitales: signosVitales.length,
      diagnosticos: diagnosticos.length,
      medicamentos: medicamentos.length,
      redApoyo: redApoyo.length,
      esquemaVacunacion: esquemaVacunacion.length
    });
  }, [citas, signosVitales, diagnosticos, medicamentos, redApoyo, esquemaVacunacion]);

  // Actualizar totales cuando cambian los datos
  React.useEffect(() => {
    updateTotals();
  }, [updateTotals]);

  /**
   * Establece los datos de citas
   */
  const setCitasData = useCallback((data) => {
    setCitas(data);
  }, []);

  /**
   * Establece los datos de signos vitales
   */
  const setSignosVitalesData = useCallback((data) => {
    setSignosVitales(data);
  }, []);

  /**
   * Establece los datos de diagnósticos
   */
  const setDiagnosticosData = useCallback((data) => {
    setDiagnosticos(data);
  }, []);

  /**
   * Establece los datos de medicamentos
   */
  const setMedicamentosData = useCallback((data) => {
    setMedicamentos(data);
  }, []);

  /**
   * Establece los datos de red de apoyo
   */
  const setRedApoyoData = useCallback((data) => {
    setRedApoyo(data);
  }, []);

  /**
   * Establece los datos de esquema de vacunación
   */
  const setEsquemaVacunacionData = useCallback((data) => {
    setEsquemaVacunacion(data);
  }, []);

  /**
   * Limpia todos los datos del contexto
   */
  const clearAllData = useCallback(() => {
    setCitas([]);
    setSignosVitales([]);
    setDiagnosticos([]);
    setMedicamentos([]);
    setRedApoyo([]);
    setEsquemaVacunacion([]);
    setErrors({});
    
    Logger.info('DetallePacienteContext: Todos los datos limpiados');
  }, []);

  // Valor del contexto (memoizado para evitar re-renders innecesarios)
  const value = useMemo(() => ({
    // Datos
    citas,
    signosVitales,
    diagnosticos,
    medicamentos,
    redApoyo,
    esquemaVacunacion,

    // Estado
    loading,
    errors,
    totals,
    lastRefresh,

    // Funciones de actualización de datos
    setCitas: setCitasData,
    setSignosVitales: setSignosVitalesData,
    setDiagnosticos: setDiagnosticosData,
    setMedicamentos: setMedicamentosData,
    setRedApoyo: setRedApoyoData,
    setEsquemaVacunacion: setEsquemaVacunacionData,

    // Funciones de control
    refreshAll,
    clearAllData,
    
    // ID del paciente
    pacienteId
  }), [
    citas,
    signosVitales,
    diagnosticos,
    medicamentos,
    redApoyo,
    esquemaVacunacion,
    loading,
    errors,
    totals,
    lastRefresh,
    setCitasData,
    setSignosVitalesData,
    setDiagnosticosData,
    setMedicamentosData,
    setRedApoyoData,
    setEsquemaVacunacionData,
    refreshAll,
    clearAllData,
    pacienteId
  ]);

  return (
    <DetallePacienteContext.Provider value={value}>
      {children}
    </DetallePacienteContext.Provider>
  );
};

export default DetallePacienteContext;












