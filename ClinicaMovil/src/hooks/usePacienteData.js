/**
 * Hook para obtener datos del paciente autenticado
 * 
 * Facilita el acceso a datos del paciente en las pantallas
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import gestionService from '../api/gestionService';
import { usePacienteMedicalData } from './usePacienteMedicalData';
import Logger from '../services/logger';

/**
 * Hook para datos del paciente
 * @param {Object} options - Opciones de configuración
 * @param {boolean} options.autoFetch - Cargar datos automáticamente
 */
const usePacienteData = (options = {}) => {
  const { autoFetch = true } = options;
  const { userData, userRole } = useAuth();
  
  // Inicializar con userData si está disponible (viene del login)
  const initializeFromUserData = useCallback(() => {
    const normalizedRole = userRole?.toLowerCase();
    if (userData && (normalizedRole === 'paciente' || normalizedRole === 'patient')) {
      // Normalizar userData a formato de paciente
      const pacienteFromUserData = {
        id: userData.id || userData.id_paciente,
        id_paciente: userData.id_paciente || userData.id,
        nombre: userData.nombre,
        apellido_paterno: userData.apellido_paterno,
        apellido_materno: userData.apellido_materno,
        nombre_completo: userData.nombre_completo || `${userData.nombre} ${userData.apellido_paterno || ''}`.trim(),
        fecha_nacimiento: userData.fecha_nacimiento,
        sexo: userData.sexo,
        curp: userData.curp,
        direccion: userData.direccion,
        localidad: userData.localidad,
        numero_celular: userData.numero_celular,
        institucion_salud: userData.institucion_salud,
        activo: userData.activo,
        ...userData
      };
      return pacienteFromUserData;
    }
    return null;
  }, [userData, userRole]);

  const pacienteInicial = initializeFromUserData();
  const [paciente, setPaciente] = useState(pacienteInicial);
  // Si hay paciente inicial, no mostrar loading (ya tenemos datos básicos)
  const [loading, setLoading] = useState(!pacienteInicial);
  const [error, setError] = useState(null);
  // Flag para saber si ya se ejecutó fetchPacienteData al menos una vez
  const [hasFetched, setHasFetched] = useState(false);

  // Obtener datos básicos del paciente
  const fetchPacienteData = useCallback(async () => {
    // Normalizar userRole para comparación
    const normalizedRole = userRole?.toLowerCase();
    if (!userData || (normalizedRole !== 'paciente' && normalizedRole !== 'patient')) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Obtener paciente por ID - soportar múltiples formatos
      const pacienteId = userData.id_paciente || userData.id || userData.pacienteId;
      
      if (!pacienteId) {
        Logger.warn('usePacienteData: No se encontró ID de paciente', { 
          userDataKeys: Object.keys(userData || {}),
          userRole 
        });
        setLoading(false);
        return;
      }

      Logger.debug('Obteniendo datos del paciente desde backend', { pacienteId, userRole });
      const pacienteData = await gestionService.getPacienteById(pacienteId);
      
      // Normalizar respuesta - puede venir como objeto directo o dentro de data
      const pacienteNormalizado = pacienteData.data || pacienteData;
      
      // Solo actualizar si tenemos datos válidos y son diferentes al actual
      if (pacienteNormalizado && pacienteNormalizado.id_paciente) {
        setPaciente(prevPaciente => {
          // Evitar actualización si los datos son los mismos (comparar por ID)
          if (prevPaciente && prevPaciente.id_paciente === pacienteNormalizado.id_paciente) {
            return prevPaciente;
          }
          Logger.debug('Datos del paciente cargados exitosamente desde backend', { 
            pacienteId,
            nombre: pacienteNormalizado?.nombre 
          });
          return pacienteNormalizado;
        });
      } else {
        Logger.warn('usePacienteData: Respuesta del backend no válida, usando datos de userData');
        // Si no hay datos válidos, usar userData como fallback
        const pacienteFallback = initializeFromUserData();
        if (pacienteFallback) {
          setPaciente(prevPaciente => {
            if (prevPaciente && prevPaciente.id_paciente === pacienteFallback.id_paciente) {
              return prevPaciente;
            }
            return pacienteFallback;
          });
        }
      }
    } catch (err) {
      Logger.error('Error cargando datos del paciente desde backend:', err);
      setError(err);
      // Si hay error pero tenemos datos en userData, mantenerlos
      const pacienteFallback = initializeFromUserData();
      if (pacienteFallback) {
        setPaciente(prevPaciente => {
          if (prevPaciente && prevPaciente.id_paciente === pacienteFallback.id_paciente) {
            return prevPaciente;
          }
          Logger.info('usePacienteData: Manteniendo datos de userData después de error', {
            pacienteId: pacienteFallback.id_paciente,
            error: err.message
          });
          return pacienteFallback;
        });
      }
    } finally {
      setLoading(false);
    }
  }, [userData, userRole, initializeFromUserData]);

  // Sincronizar paciente cuando cambia userData (solo si realmente cambió el ID)
  useEffect(() => {
    if (userData && userRole) {
      const normalizedRole = userRole?.toLowerCase();
      if (normalizedRole === 'paciente' || normalizedRole === 'patient') {
        const pacienteFromUserData = initializeFromUserData();
        const userDataId = pacienteFromUserData?.id_paciente;
        const currentId = paciente?.id_paciente;
        
        // Solo actualizar si el ID cambió realmente
        if (pacienteFromUserData && userDataId && userDataId !== currentId) {
          setPaciente(pacienteFromUserData);
          Logger.debug('usePacienteData: Paciente sincronizado desde userData', {
            pacienteId: pacienteFromUserData.id_paciente
          });
        }
      }
    }
  }, [userData?.id_paciente, userData?.id, userRole, paciente?.id_paciente, initializeFromUserData]);

  // Cargar datos automáticamente al montar o cuando cambia el ID
  useEffect(() => {
    if (autoFetch && userData) {
      const pacienteId = userData.id_paciente || userData.id;
      const currentId = paciente?.id_paciente;
      
      // Si no hay paciente inicial, cargar desde backend
      // Si hay paciente pero el ID no coincide con userData, también cargar
      // Si nunca se ha ejecutado fetchPacienteData, ejecutarlo al menos una vez
      if (!currentId || (pacienteId && pacienteId !== currentId) || !hasFetched) {
        Logger.debug('usePacienteData: Ejecutando fetchPacienteData', {
          hasCurrentId: !!currentId,
          pacienteId,
          currentId,
          hasFetched
        });
        const fetchData = async () => {
          await fetchPacienteData();
          setHasFetched(true);
        };
        fetchData();
      } else {
        // Si ya hay paciente con el mismo ID y ya se ejecutó, solo asegurar que loading sea false
        setLoading(false);
      }
    } else if (!userData) {
      // Si no hay userData, no mostrar loading
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, userData?.id_paciente, userData?.id, hasFetched]);

  // Obtener datos médicos usando el hook existente
  // Priorizar id_paciente, luego id, luego obtener desde userData
  const pacienteId = paciente?.id_paciente || paciente?.id || userData?.id_paciente || userData?.id;
  
  // Log para debugging
  useEffect(() => {
    if (pacienteId) {
      Logger.debug('usePacienteData: pacienteId disponible para datos médicos', {
        pacienteId,
        tienePaciente: !!paciente,
        tieneUserData: !!userData,
        pacienteIdPaciente: paciente?.id_paciente,
        pacienteId: paciente?.id,
        userDataIdPaciente: userData?.id_paciente,
        userDataId: userData?.id
      });
    } else {
      Logger.warn('usePacienteData: No se encontró pacienteId para datos médicos', {
        tienePaciente: !!paciente,
        tieneUserData: !!userData,
        pacienteKeys: paciente ? Object.keys(paciente) : [],
        userDataKeys: userData ? Object.keys(userData) : []
      });
    }
  }, [pacienteId, paciente, userData]);
  
  const medicalData = usePacienteMedicalData(pacienteId, {
    limit: 10,
    autoFetch: !!pacienteId,
  });

  // Refresh todos los datos
  const refresh = useCallback(async () => {
    await fetchPacienteData();
    if (medicalData.refreshAll) {
      await medicalData.refreshAll();
    }
  }, [fetchPacienteData, medicalData]);

  return {
    paciente,
    loading,
    error,
    refresh,
    // Datos médicos
    citas: medicalData.citas,
    signosVitales: medicalData.signosVitales,
    diagnosticos: medicalData.diagnosticos,
    medicamentos: medicalData.medicamentos,
    resumen: medicalData.resumen,
    // Estados de carga médica
    medicalLoading: medicalData.loading,
    medicalError: medicalData.error,
    // Totales
    totalCitas: medicalData.totalCitas,
    totalSignosVitales: medicalData.totalSignosVitales,
    totalDiagnosticos: medicalData.totalDiagnosticos,
    totalMedicamentos: medicalData.totalMedicamentos,
  };
};

export default usePacienteData;

