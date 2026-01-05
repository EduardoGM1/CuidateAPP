import { useState, useEffect, useCallback, useRef } from 'react';
import { gestionService } from '../api/gestionService';
import Logger from '../services/logger';

// Cache en memoria para los hooks
const cache = {
  doctores: { data: null, timestamp: 0 },
  pacientes: { data: null, timestamp: 0 },
  doctorDetails: {}, // { doctorId: { data: null, timestamp: 0 } }
  pacienteDetails: {}, // { pacienteId: { data: null, timestamp: 0 } }
};

const CACHE_DURATION = 30 * 1000; // 30 segundos (reducido para actualizaciones más rápidas)
const CACHE_DURATION_DETAILS = 60 * 1000; // 1 minuto

// =====================================================
// HOOKS PARA MÓDULOS
// =====================================================

export const useModulos = () => {
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchModulos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      Logger.info('useModulos: Obteniendo lista de módulos');
      
      const result = await gestionService.getModulos();
      
      // gestionService.getModulos() devuelve directamente un array, no un objeto con success
      if (Array.isArray(result)) {
        setModulos(result);
        Logger.info('useModulos: Módulos cargados exitosamente', { count: result.length });
      } else if (result && result.success && Array.isArray(result.data)) {
        // Por si acaso el formato cambia en el futuro
        setModulos(result.data);
        Logger.info('useModulos: Módulos cargados exitosamente', { count: result.data.length });
      } else {
        Logger.error('useModulos: Formato de respuesta inesperado', { result });
        throw new Error('Formato de datos inválido: se esperaba un array de módulos');
      }
    } catch (err) {
      Logger.error('useModulos: Error al cargar módulos', err);
      setError(err.message || 'Error al cargar módulos');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    modulos,
    loading,
    error,
    fetchModulos
  };
};

// =====================================================
// HOOKS PARA DOCTORES
// =====================================================

export const useDoctores = (estado = 'activos', sort = 'recent') => {
  const [doctores, setDoctores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDoctores = useCallback(async () => {
    setLoading(true);
    setError(null); // Limpiar error antes de intentar
    try {
      // Verificar caché (incluir estado y sort en la clave del caché)
      const cacheKey = `doctores_${estado}_${sort}`;
      if (cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp < CACHE_DURATION)) {
        Logger.debug('useDoctores: Sirviendo desde caché', { estado, sort });
        setDoctores(cache[cacheKey].data);
        setLoading(false);
        setError(null); // Limpiar error si hay datos del caché
        return;
      }

      Logger.info('useDoctores: Obteniendo lista de doctores', { estado, sort });
      const response = await gestionService.getAllDoctores(estado, sort);
      const doctoresData = response.data || response;
      
      // DEBUG: Log de estructura de datos
      Logger.info('useDoctores: Estructura de datos recibida', {
        responseType: typeof response,
        hasData: !!response.data,
        dataType: typeof doctoresData,
        isArray: Array.isArray(doctoresData),
        length: Array.isArray(doctoresData) ? doctoresData.length : 'N/A',
        firstItem: Array.isArray(doctoresData) && doctoresData.length > 0 ? doctoresData[0] : 'N/A'
      });
      
      // Validar que sea un array
      if (!Array.isArray(doctoresData)) {
        Logger.error('useDoctores: Datos no son un array', { doctoresData });
        throw new Error('Formato de datos inválido: se esperaba un array');
      }
      
      setDoctores(doctoresData);
      setError(null); // Limpiar error si los datos se cargan correctamente

      // Actualizar caché con clave específica del estado y sort
      if (!cache[cacheKey]) {
        cache[cacheKey] = { data: null, timestamp: 0 };
      }
      cache[cacheKey].data = doctoresData;
      cache[cacheKey].timestamp = Date.now();
      Logger.debug('useDoctores: Datos actualizados y cacheado', { estado, sort });
    } catch (err) {
      Logger.error('useDoctores: Error al obtener doctores', { estado, sort, error: err.message });
      setError(err.message || 'Error al cargar doctores');
    } finally {
      setLoading(false);
    }
  }, [estado, sort]);

  useEffect(() => {
    fetchDoctores();
  }, [fetchDoctores]);

  const refreshDoctores = useCallback(() => {
    Logger.info('useDoctores: Refrescando datos y limpiando caché', { estado, sort });
    
    // Limpiar todos los caches relacionados con doctores
    Object.keys(cache).forEach(key => {
      if (key.startsWith('doctores_')) {
        cache[key] = { data: null, timestamp: 0 };
        Logger.debug('useDoctores: Cache limpiado', { key });
      }
    });
    
    // Limpiar también el cache general de doctores
    cache.doctores = { data: null, timestamp: 0 };
    
    fetchDoctores();
  }, [fetchDoctores, estado, sort]);

  return { doctores, loading, error, refresh: refreshDoctores };
};

export const useDoctorDetails = (doctorId) => {
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDoctorDetails = useCallback(async () => {
    if (!doctorId) {
      Logger.debug('useDoctorDetails: No doctorId proporcionado');
      setLoading(false);
      return;
    }

    // Validar que doctorId sea válido
    if (typeof doctorId !== 'number' && typeof doctorId !== 'string') {
      Logger.error('useDoctorDetails: doctorId inválido', { doctorId, type: typeof doctorId });
      setError(new Error('ID de doctor inválido'));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Verificar caché
      if (cache.doctorDetails[doctorId] && (Date.now() - cache.doctorDetails[doctorId].timestamp < CACHE_DURATION_DETAILS)) {
        Logger.debug(`useDoctorDetails (${doctorId}): Sirviendo desde caché`);
        setDoctor(cache.doctorDetails[doctorId].data);
        setLoading(false);
        return;
      }

      Logger.info(`useDoctorDetails (${doctorId}): Obteniendo detalles del doctor`);
      const response = await gestionService.getDoctorById(doctorId);
      const doctorData = response.data || response;
      
      // Validar estructura de datos recibida
      if (!doctorData || !doctorData.id_doctor) {
        Logger.error(`useDoctorDetails (${doctorId}): Datos de doctor inválidos`, { doctorData });
        throw new Error('Datos de doctor inválidos recibidos del servidor');
      }

      setDoctor(doctorData);

      // Actualizar caché
      cache.doctorDetails[doctorId] = { data: doctorData, timestamp: Date.now() };
      Logger.debug(`useDoctorDetails (${doctorId}): Datos actualizados y cacheado`);
    } catch (err) {
      Logger.error(`useDoctorDetails (${doctorId}): Error al obtener detalles`, err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    fetchDoctorDetails();
  }, [fetchDoctorDetails]);

  const refreshDoctorDetails = useCallback(() => {
    if (doctorId) {
      cache.doctorDetails[doctorId] = { data: null, timestamp: 0 };
      fetchDoctorDetails();
    }
  }, [doctorId, fetchDoctorDetails]);

  return { doctor, loading, error, refresh: refreshDoctorDetails };
};

// =====================================================
// HOOKS PARA PACIENTES
// =====================================================

export const usePacientes = (estado = 'activos', sort = 'recent', comorbilidad = 'todas') => {
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPacientes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Verificar caché (incluir estado, sort y comorbilidad en la clave del caché)
      const cacheKey = `pacientes_${estado}_${sort}_${comorbilidad}`;
      if (cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp < CACHE_DURATION)) {
        Logger.debug('usePacientes: Sirviendo desde caché', { estado, sort, comorbilidad });
        setPacientes(cache[cacheKey].data);
        setLoading(false);
        return;
      }

      Logger.info('usePacientes: Obteniendo lista de pacientes', { estado, sort, comorbilidad });
      const response = await gestionService.getAllPacientes(estado, sort, comorbilidad);
      
      // Extraer array de pacientes de la respuesta del backend
      // El backend devuelve: { success: true, data: { pacientes: [...], total, limit, offset } }
      let pacientesData = [];
      if (response && response.data) {
        // Si response.data es un objeto con propiedad pacientes
        if (response.data.pacientes && Array.isArray(response.data.pacientes)) {
          pacientesData = response.data.pacientes;
        } 
        // Si response.data es directamente un array (estructura antigua)
        else if (Array.isArray(response.data)) {
          pacientesData = response.data;
        }
        // Si response.data.data existe y es un array (estructura anidada)
        else if (response.data.data && Array.isArray(response.data.data)) {
          pacientesData = response.data.data;
        }
      } 
      // Fallback: si response es directamente un array
      else if (Array.isArray(response)) {
        pacientesData = response;
      }
      
      // Validar que pacientesData sea un array antes de usar map
      if (!Array.isArray(pacientesData)) {
        Logger.error('usePacientes: pacientesData no es un array', {
          responseType: typeof response,
          responseData: response?.data,
          pacientesDataType: typeof pacientesData,
          pacientesData
        });
        pacientesData = []; // Usar array vacío como fallback
      }
      
      // Procesar datos del doctor si están disponibles
      const pacientesConDoctor = pacientesData.map(paciente => ({
        ...paciente,
        // Usar campos calculados del backend si están disponibles, sino calcular en frontend
        nombreCompleto: paciente.nombre_completo || `${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno || ''}`.trim(),
        doctorNombre: paciente.doctor_nombre || 'Sin doctor asignado',
        edad: paciente.edad || (new Date().getFullYear() - new Date(paciente.fecha_nacimiento).getFullYear())
      }));
      
      setPacientes(pacientesConDoctor);

      // Actualizar caché específico y general
      cache[cacheKey] = { data: pacientesConDoctor, timestamp: Date.now() };
      cache.pacientes.data = pacientesConDoctor;
      cache.pacientes.timestamp = Date.now();
      Logger.debug('usePacientes: Datos actualizados y cacheado', { 
        estado,
        sort,
        comorbilidad,
        total: pacientesConDoctor.length,
        conDoctor: pacientesConDoctor.filter(p => p.doctorNombre !== 'Sin doctor asignado').length
      });
    } catch (err) {
      Logger.error('usePacientes: Error al obtener pacientes', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [estado, sort, comorbilidad]);

  useEffect(() => {
    // Siempre intentar cargar la primera vez
    fetchPacientes();
  }, [fetchPacientes]);

  const refreshPacientes = useCallback(() => {
    Logger.info('usePacientes: Refrescando datos y limpiando caché', { estado, sort, comorbilidad });
    Object.keys(cache).forEach(key => {
      if (key.startsWith('pacientes_')) {
        cache[key] = { data: null, timestamp: 0 };
        Logger.debug('usePacientes: Cache limpiado', { key });
      }
    });
    cache.pacientes = { data: null, timestamp: 0 }; // Clear general cache
    fetchPacientes();
  }, [fetchPacientes, estado, sort, comorbilidad]);

  return { pacientes, loading, error, refresh: refreshPacientes };
};

export const usePacienteDetails = (pacienteId) => {
  const [paciente, setPaciente] = useState(null);
  // SOLUCIÓN: Mantener loading: true si pacienteId no está disponible aún
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const previousPacienteIdRef = useRef(null);

  const fetchPacienteDetails = useCallback(async () => {
    // SOLUCIÓN: Si no hay pacienteId, mantener loading: true (no false)
    // Esto permite que el componente espere a que el ID esté disponible
    if (!pacienteId) {
      // Solo marcar loading: false si ya teníamos un pacienteId antes (significa que se eliminó)
      if (previousPacienteIdRef.current) {
        setLoading(false);
        setPaciente(null);
        setError(new Error('ID de paciente no disponible'));
      }
      // Si nunca tuvimos un pacienteId, mantener loading: true para esperar
      return;
    }

    // Si el pacienteId cambió, resetear estado
    if (previousPacienteIdRef.current !== pacienteId) {
      setLoading(true);
      setError(null);
      previousPacienteIdRef.current = pacienteId;
    }

    setLoading(true);
    setError(null);
    try {
      // Verificar caché
      if (cache.pacienteDetails[pacienteId] && (Date.now() - cache.pacienteDetails[pacienteId].timestamp < CACHE_DURATION_DETAILS)) {
        Logger.debug(`usePacienteDetails (${pacienteId}): Sirviendo desde caché`);
        const cachedData = cache.pacienteDetails[pacienteId].data;
        
        // ✅ Backend ya normaliza, solo validar estructura básica
        if (cachedData && !Array.isArray(cachedData.comorbilidades)) {
          cachedData.comorbilidades = [];
        }
        
        setPaciente(cachedData);
        setLoading(false);
        return;
      }

      Logger.info(`usePacienteDetails (${pacienteId}): Obteniendo detalles del paciente`);
      const response = await gestionService.getPacienteById(pacienteId);
      const pacienteData = response.data || response;
      
      // ✅ Backend ya normaliza los datos (usando pacienteMapper)
      // No es necesario normalizar aquí - confiar en el backend
      
      // Validación básica y logging
      if (pacienteData) {
        Logger.info(`usePacienteDetails (${pacienteId}): Datos recibidos del backend`, {
          hasComorbilidades: !!pacienteData.comorbilidades,
          comorbilidadesLength: pacienteData.comorbilidades?.length || 0,
          comorbilidadesEstructura: pacienteData.comorbilidades?.[0] || null
        });
        
        // Asegurar que comorbilidades sea siempre un array (seguridad defensiva)
        if (!Array.isArray(pacienteData.comorbilidades)) {
          pacienteData.comorbilidades = [];
          Logger.warn(`usePacienteDetails (${pacienteId}): comorbilidades no es array, normalizando a []`);
        }
      }
      
      setPaciente(pacienteData);

      // Actualizar caché
      cache.pacienteDetails[pacienteId] = { data: pacienteData, timestamp: Date.now() };
      Logger.debug(`usePacienteDetails (${pacienteId}): Datos actualizados y cacheado`);
    } catch (err) {
      Logger.error(`usePacienteDetails (${pacienteId}): Error al obtener detalles`, err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [pacienteId]);

  // SOLUCIÓN: Ejecutar fetch cuando pacienteId esté disponible
  useEffect(() => {
    if (pacienteId) {
      fetchPacienteDetails();
    }
    // Si pacienteId cambia de undefined a un valor, también ejecutar
  }, [pacienteId, fetchPacienteDetails]);

  const refreshPacienteDetails = useCallback(() => {
    if (pacienteId) {
      // Limpiar cache para forzar recarga
      cache.pacienteDetails[pacienteId] = { data: null, timestamp: 0 };
      // Forzar recarga incluso si hay datos en cache
      setLoading(true);
      fetchPacienteDetails();
    }
  }, [pacienteId, fetchPacienteDetails]);

  return { paciente, loading, error, refresh: refreshPacienteDetails };
};

// =====================================================
// HOOKS PARA DASHBOARD (REUTILIZAR EXISTENTES)
// =====================================================

export const useAdminSummary = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      Logger.info('useAdminSummary: Obteniendo resumen administrativo');
      const response = await gestionService.getAdminSummary();
      const summaryData = response.data || response;
      setSummary(summaryData);
      Logger.debug('useAdminSummary: Datos actualizados');
    } catch (err) {
      Logger.error('useAdminSummary: Error al obtener resumen', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { summary, loading, error, refresh: fetchSummary };
};

export const useDoctorSummary = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      Logger.info('useDoctorSummary: Obteniendo resumen del doctor');
      const response = await gestionService.getDoctorSummary();
      const summaryData = response.data || response;
      setSummary(summaryData);
      Logger.debug('useDoctorSummary: Datos actualizados');
    } catch (err) {
      Logger.error('useDoctorSummary: Error al obtener resumen', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { summary, loading, error, refresh: fetchSummary };
};

export const useDoctorPatientDataById = (pacienteId) => {
  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPatientData = useCallback(async () => {
    if (!pacienteId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      Logger.info(`useDoctorPatientDataById (${pacienteId}): Obteniendo datos del paciente`);
      const response = await gestionService.getDoctorPatientData(pacienteId);
      const patientData = response.data || response;
      setPatientData(patientData);
      Logger.debug(`useDoctorPatientDataById (${pacienteId}): Datos actualizados`);
    } catch (err) {
      Logger.error(`useDoctorPatientDataById (${pacienteId}): Error al obtener datos`, err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [pacienteId]);

  useEffect(() => {
    fetchPatientData();
  }, [fetchPatientData]);

  return { patientData, loading, error, refresh: fetchPatientData };
};

// =====================================================
// UTILIDADES DE CACHE
// =====================================================

export const clearCache = () => {
  cache.doctores = { data: null, timestamp: 0 };
  cache.pacientes = { data: null, timestamp: 0 };
  cache.doctorDetails = {};
  cache.pacienteDetails = {};
  Logger.info('Cache limpiado');
};

export const clearDoctorCache = (doctorId) => {
  if (doctorId) {
    delete cache.doctorDetails[doctorId];
  } else {
    cache.doctorDetails = {};
  }
  
  // Limpiar también todos los caches de listas de doctores
  Object.keys(cache).forEach(key => {
    if (key.startsWith('doctores_')) {
      cache[key] = { data: null, timestamp: 0 };
    }
  });
  
  Logger.info('Cache de doctores limpiado completamente');
};

export const clearPacienteCache = (pacienteId) => {
  if (pacienteId) {
    delete cache.pacienteDetails[pacienteId];
  } else {
    cache.pacienteDetails = {};
  }
  Logger.info('Cache de pacientes limpiado');
};

// =====================================================
// HOOK PARA DASHBOARD DEL DOCTOR
// =====================================================

export const useDoctorPatientData = (doctorId) => {
  const [data, setData] = useState({
    doctor: null,
    pacientesAsignados: [],
    citasHoy: [],
    citasRecientes: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!doctorId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await gestionService.getDoctorDashboard(doctorId);
      setData(response.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...data,
    loading,
    error,
    refetch: fetchData
  };
};

// Exportación default que incluye todos los hooks
const useGestion = {
  useDoctores,
  usePacientes,
  useModulos,
  useDoctorDetails,
  usePacienteDetails,
  useDoctorPatientData
};

export default useGestion;
