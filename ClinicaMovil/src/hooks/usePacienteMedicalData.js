import { useState, useEffect, useCallback, useRef } from 'react';
import Logger from '../services/logger';
import { requestWithRetry } from '../utils/requestWithRetry';

/**
 * =====================================================
 * HOOKS PARA DATOS MÉDICOS DE PACIENTES
 * =====================================================
 * 
 * Estos hooks proporcionan acceso específico a datos médicos
 * de pacientes con las siguientes características:
 * 
 * Funcionalidades:
 * - Loading states independientes
 * - Error handling robusto
 * - Cache con TTL
 * - Paginación
 * - Ordenamiento
 * - Refresh manual
 * - Logging detallado
 * 
 * Seguridad:
 * - Validación de parámetros
 * - Manejo de errores de red
 * - Timeout de requests
 * - Retry automático
 */

// Cache global para datos médicos
const medicalDataCache = {
  citas: {},
  signosVitales: {},
  diagnosticos: {},
  medicamentos: {},
  resumen: {},
  redApoyo: {},
  esquemaVacunacion: {},
  comorbilidades: {},
  deteccionesComplicaciones: {},
  sesionesEducativas: {},
  saludBucal: {}, // ✅ Instrucción ⑫
  deteccionesTuberculosis: {} // ✅ Instrucción ⑬
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const REQUEST_TIMEOUT = 10000; // 10 segundos

/**
 * Hook para obtener citas de un paciente
 */
export const usePacienteCitas = (pacienteId, options = {}) => {
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  const {
    limit = 10,
    offset = 0,
    sort = 'DESC',
    autoFetch = true
  } = options;

  // AbortController para cancelar requests pendientes
  const abortControllerRef = useRef(null);

  const fetchCitas = useCallback(async () => {
    if (!pacienteId) {
      Logger.debug(`usePacienteCitas: pacienteId no disponible, saltando fetch`);
      setLoading(false);
      setCitas([]);
      setTotal(0);
      return;
    }

    // Cancelar request anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Crear nuevo AbortController para este request
    abortControllerRef.current = new AbortController();

    // Generar cacheKey dentro de la función para evitar dependencias
    const currentCacheKey = `citas_${pacienteId}_${limit}_${offset}_${sort}`;

    // Verificar cache
    if (medicalDataCache.citas[currentCacheKey] && 
        (Date.now() - medicalDataCache.citas[currentCacheKey].timestamp < CACHE_DURATION)) {
      Logger.debug(`usePacienteCitas (${pacienteId}): Sirviendo desde caché`);
      const cachedData = medicalDataCache.citas[currentCacheKey];
      setCitas(cachedData.data || []);
      setTotal(cachedData.total || 0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      Logger.info(`usePacienteCitas (${pacienteId}): Obteniendo citas del paciente`);
      
      const gestionService = (await import('../api/gestionService.js')).default;
      
      // Usar requestWithRetry para manejo robusto de errores
      const response = await requestWithRetry(
        async (signal) => {
          return await gestionService.getPacienteCitas(pacienteId, {
            limit,
            offset,
            sort
          });
        },
        {
          maxRetries: 5, // Aumentar reintentos
          retryDelay: 2000, // Aumentar delay entre reintentos
          timeout: 20000, // Aumentar timeout a 20 segundos
          abortController: abortControllerRef.current
        }
      );

      // Verificar si el request fue cancelado
      if (abortControllerRef.current?.signal.aborted) {
        Logger.debug(`usePacienteCitas (${pacienteId}): Request cancelado`);
        return;
      }

      Logger.debug('📋 Citas response:', { response, keys: Object.keys(response) });
      
      // Validar y normalizar datos
      const citasData = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.data || []);
      
      // Validar que los datos sean válidos
      if (!Array.isArray(citasData)) {
        throw new Error('Datos de citas inválidos: no es un array');
      }

      setCitas(citasData);
      setTotal(response.total || citasData.length);

      // Guardar en cache usando la clave actual
      medicalDataCache.citas[currentCacheKey] = {
        data: citasData,
        total: response.total || citasData.length,
        timestamp: Date.now()
      };

      Logger.debug(`usePacienteCitas (${pacienteId}): Datos actualizados y cacheado`);
    } catch (err) {
      // No establecer error si el request fue cancelado
      if (err.name === 'AbortError' || err.message === 'Request cancelado') {
        Logger.debug(`usePacienteCitas (${pacienteId}): Request cancelado, no establecer error`);
        return;
      }
      
      Logger.error(`usePacienteCitas (${pacienteId}): Error al obtener citas`, err);
      
      // Crear error más descriptivo
      const errorMessage = err.response?.data?.message || err.message || 'Error al obtener citas';
      const enhancedError = new Error(errorMessage);
      enhancedError.originalError = err;
      enhancedError.status = err.response?.status;
      
      setError(enhancedError);
    } finally {
      setLoading(false);
    }
  }, [pacienteId, limit, offset, sort]);

  const refreshCitas = useCallback(() => {
    if (pacienteId) {
      // Limpiar cache usando la clave actual
      const currentCacheKey = `citas_${pacienteId}_${limit}_${offset}_${sort}`;
      delete medicalDataCache.citas[currentCacheKey];
      fetchCitas();
    }
  }, [pacienteId, limit, offset, sort, fetchCitas]);

  // Limpiar cache cuando cambia el pacienteId para evitar datos incorrectos
  useEffect(() => {
    if (pacienteId) {
      // Limpiar cache de otros pacientes para evitar interferencias
      const currentCacheKey = `citas_${pacienteId}_`;
      Object.keys(medicalDataCache.citas).forEach(key => {
        if (!key.startsWith(currentCacheKey)) {
          delete medicalDataCache.citas[key];
          Logger.debug(`usePacienteCitas: Cache limpiado para clave ${key}`);
        }
      });
    } else {
      // Si no hay pacienteId, limpiar todos los datos
      setCitas([]);
      setTotal(0);
      setLoading(false);
    }
    
    // Cleanup: cancelar requests pendientes cuando cambia pacienteId o se desmonta
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        Logger.debug('usePacienteCitas: Request cancelado en cleanup');
      }
    };
  }, [pacienteId]);

  // Solo ejecutar fetchCitas cuando cambien los parámetros relevantes
  useEffect(() => {
    if (autoFetch && pacienteId) {
      Logger.debug(`usePacienteCitas: Ejecutando fetchCitas`, { pacienteId, limit, offset, sort });
      fetchCitas();
    } else if (!pacienteId) {
      // Limpiar datos si pacienteId no está disponible
      setCitas([]);
      setTotal(0);
      setLoading(false);
    }
  }, [pacienteId, limit, offset, sort, autoFetch, fetchCitas]);

  return {
    citas,
    loading,
    error,
    total,
    refresh: refreshCitas,
    refetch: fetchCitas
  };
};

/**
 * Hook para obtener signos vitales de un paciente
 */
export const usePacienteSignosVitales = (pacienteId, options = {}) => {
  const [signosVitales, setSignosVitales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  
  // AbortController para cancelar requests pendientes
  const abortControllerRef = useRef(null);

  const {
    limit = 10,
    offset = 0,
    sort = 'DESC',
    autoFetch = true,
    getAll = false // Si es true, obtiene TODOS los signos vitales (monitoreo continuo + consultas)
  } = options;

  const fetchSignosVitales = useCallback(async () => {
    if (!pacienteId) {
      Logger.debug(`usePacienteSignosVitales: pacienteId no disponible, saltando fetch`);
      setLoading(false);
      setSignosVitales([]);
      setTotal(0);
      return;
    }

    // Cancelar request anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Crear nuevo AbortController para este request
    abortControllerRef.current = new AbortController();

    // Generar cacheKey dentro de la función para evitar dependencias
    const currentCacheKey = getAll 
      ? `signos_all_${pacienteId}_${sort}`
      : `signos_${pacienteId}_${limit}_${offset}_${sort}`;

    // Verificar cache (solo si el cache es muy reciente < 10 segundos)
    // Para cache más antiguo, siempre recargar para asegurar datos frescos
    const cacheEntry = medicalDataCache.signosVitales[currentCacheKey];
    const cacheAge = cacheEntry ? (Date.now() - cacheEntry.timestamp) : Infinity;
    const isCacheVeryRecent = cacheEntry && cacheAge < 10 * 1000; // Solo 10 segundos
    
    if (isCacheVeryRecent) {
      Logger.debug(`usePacienteSignosVitales (${pacienteId}): Sirviendo desde caché (muy reciente: ${Math.round(cacheAge/1000)}s)`);
      const cachedData = cacheEntry.data;
      setSignosVitales(cachedData.data || cachedData);
      setTotal(cachedData.total || (Array.isArray(cachedData) ? cachedData.length : 0));
      setLoading(false);
      return;
    } else if (cacheEntry) {
      // Cache existe pero es antiguo, mostrar datos del cache mientras se carga
      Logger.debug(`usePacienteSignosVitales (${pacienteId}): Cache antiguo (${Math.round(cacheAge/1000)}s), recargando...`);
      const cachedData = cacheEntry.data;
      setSignosVitales(cachedData.data || cachedData);
      setTotal(cachedData.total || (Array.isArray(cachedData) ? cachedData.length : 0));
      // Continuar con la carga para actualizar
    }

    setLoading(true);
    setError(null);

    try {
      const gestionService = (await import('../api/gestionService.js')).default;
      
      // Usar requestWithRetry para manejo robusto de errores
      let response;
      if (getAll) {
        // Obtener TODOS los signos vitales (monitoreo continuo + consultas) para evolución completa
        Logger.info(`usePacienteSignosVitales (${pacienteId}): Obteniendo TODOS los signos vitales (evolución completa)`);
        response = await requestWithRetry(
          async (signal) => {
            return await gestionService.getAllPacienteSignosVitales(pacienteId, { sort });
          },
          {
            maxRetries: 3,
            retryDelay: 1000,
            timeout: 15000, // Timeout más largo para getAll
            abortController: abortControllerRef.current
          }
        );
      } else {
        Logger.info(`usePacienteSignosVitales (${pacienteId}): Obteniendo signos vitales del paciente`);
        response = await requestWithRetry(
          async (signal) => {
            return await gestionService.getPacienteSignosVitales(pacienteId, {
              limit,
              offset,
              sort
            });
          },
          {
            maxRetries: 5, // Aumentar reintentos
            retryDelay: 2000, // Aumentar delay entre reintentos
            timeout: 20000, // Aumentar timeout a 20 segundos
            abortController: abortControllerRef.current
          }
        );
      }

      // Verificar si el request fue cancelado
      if (abortControllerRef.current?.signal.aborted) {
        Logger.debug(`usePacienteSignosVitales (${pacienteId}): Request cancelado`);
        return;
      }

      Logger.debug('💓 Signos response:', { response, keys: Object.keys(response) });
      
      // Validar y normalizar datos
      const signosData = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.data || []);
      
      // Validar que los datos sean válidos
      if (!Array.isArray(signosData)) {
        throw new Error('Datos de signos vitales inválidos: no es un array');
      }

      setSignosVitales(signosData);
      setTotal(response.total || signosData.length);

      // Guardar en cache usando la clave actual
      medicalDataCache.signosVitales[currentCacheKey] = {
        data: signosData,
        total: response.total || signosData.length,
        timestamp: Date.now()
      };

      Logger.debug(`usePacienteSignosVitales (${pacienteId}): Datos actualizados y cacheado (${signosData.length} registros)`);
    } catch (err) {
      // No establecer error si el request fue cancelado
      if (err.name === 'AbortError' || err.message === 'Request cancelado') {
        Logger.debug(`usePacienteSignosVitales (${pacienteId}): Request cancelado, no establecer error`);
        return;
      }
      
      Logger.error(`usePacienteSignosVitales (${pacienteId}): Error al obtener signos vitales`, err);
      
      // Crear error más descriptivo
      const errorMessage = err.response?.data?.message || err.message || 'Error al obtener signos vitales';
      const enhancedError = new Error(errorMessage);
      enhancedError.originalError = err;
      enhancedError.status = err.response?.status;
      
      setError(enhancedError);
    } finally {
      setLoading(false);
    }
  }, [pacienteId, limit, offset, sort, getAll]);

  const refreshSignosVitales = useCallback(() => {
    if (pacienteId) {
      // Limpiar cache usando la clave actual
      const currentCacheKey = `signos_${pacienteId}_${limit}_${offset}_${sort}`;
      delete medicalDataCache.signosVitales[currentCacheKey];
      // Forzar recarga
      setLoading(true);
      fetchSignosVitales();
    }
  }, [pacienteId, limit, offset, sort, fetchSignosVitales]);

  useEffect(() => {
    if (autoFetch && pacienteId) {
      Logger.debug(`usePacienteSignosVitales: Ejecutando fetchSignosVitales`, { pacienteId, limit, offset, sort });
      fetchSignosVitales();
    } else if (!pacienteId) {
      // Limpiar datos si pacienteId no está disponible
      setSignosVitales([]);
      setTotal(0);
      setLoading(false);
    }
  }, [pacienteId, limit, offset, sort, autoFetch, fetchSignosVitales]);

  return {
    signosVitales,
    loading,
    error,
    total,
    refresh: refreshSignosVitales,
    refetch: fetchSignosVitales
  };
};

/**
 * Hook para obtener diagnósticos de un paciente
 */
export const usePacienteDiagnosticos = (pacienteId, options = {}) => {
  const [diagnosticos, setDiagnosticos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const abortControllerRef = useRef(null);

  const {
    limit = 10,
    offset = 0,
    sort = 'DESC',
    autoFetch = true
  } = options;

  const fetchDiagnosticos = useCallback(async () => {
    if (!pacienteId) {
      Logger.debug(`usePacienteDiagnosticos: pacienteId no disponible, saltando fetch`);
      setLoading(false);
      setDiagnosticos([]);
      setTotal(0);
      return;
    }

    // Generar cacheKey dentro de la función para evitar dependencias
    const currentCacheKey = `diagnosticos_${pacienteId}_${limit}_${offset}_${sort}`;

    // Verificar cache
    if (medicalDataCache.diagnosticos[currentCacheKey] && 
        (Date.now() - medicalDataCache.diagnosticos[currentCacheKey].timestamp < CACHE_DURATION)) {
      Logger.debug(`usePacienteDiagnosticos (${pacienteId}): Sirviendo desde caché`);
      const cachedData = medicalDataCache.diagnosticos[currentCacheKey].data;
      setDiagnosticos(cachedData.data);
      setTotal(cachedData.total);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      Logger.info(`usePacienteDiagnosticos (${pacienteId}): Obteniendo diagnósticos del paciente`);
      
      const gestionService = (await import('../api/gestionService.js')).default;
      const requestWithRetry = (await import('../utils/requestWithRetry.js')).requestWithRetry;
      
      // Usar requestWithRetry para manejo robusto de errores
      const response = await requestWithRetry(
        async (signal) => {
          return await gestionService.getPacienteDiagnosticos(pacienteId, {
            limit,
            offset,
            sort
          });
        },
        {
          maxRetries: 5, // Aumentar reintentos
          retryDelay: 2000, // Aumentar delay entre reintentos
          timeout: 20000, // Aumentar timeout a 20 segundos
          abortController: abortControllerRef.current
        }
      );
      
      // Verificar si el request fue cancelado
      if (abortControllerRef.current?.signal.aborted) {
        Logger.debug(`usePacienteDiagnosticos (${pacienteId}): Request cancelado`);
        return;
      }

      Logger.debug('🩺 Diagnósticos response:', { response, keys: Object.keys(response) });
      
      const diagnosticosData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setDiagnosticos(diagnosticosData);
      setTotal(response.total || 0);

      // Guardar en cache usando la clave actual
      medicalDataCache.diagnosticos[currentCacheKey] = {
        data: diagnosticosData,
        timestamp: Date.now()
      };

      Logger.debug(`usePacienteDiagnosticos (${pacienteId}): Datos actualizados y cacheado`);
    } catch (err) {
      // No establecer error si el request fue cancelado
      if (err.name === 'AbortError' || err.message === 'Request cancelado' || abortControllerRef.current?.signal.aborted) {
        Logger.debug(`usePacienteDiagnosticos (${pacienteId}): Request cancelado, no establecer error`);
        return;
      }
      
      Logger.error(`usePacienteDiagnosticos (${pacienteId}): Error al obtener diagnósticos`, err);
      
      // Crear error más descriptivo
      const errorMessage = err.response?.data?.message || err.message || 'Error al obtener diagnósticos';
      const enhancedError = new Error(errorMessage);
      enhancedError.originalError = err;
      enhancedError.status = err.response?.status;
      
      setError(enhancedError);
    } finally {
      setLoading(false);
    }
  }, [pacienteId, limit, offset, sort]);

  const refreshDiagnosticos = useCallback(() => {
    if (pacienteId) {
      // Limpiar cache usando la clave actual
      const currentCacheKey = `diagnosticos_${pacienteId}_${limit}_${offset}_${sort}`;
      delete medicalDataCache.diagnosticos[currentCacheKey];
      fetchDiagnosticos();
    }
  }, [pacienteId, limit, offset, sort, fetchDiagnosticos]);

  useEffect(() => {
    // Crear nuevo AbortController para cada request
    abortControllerRef.current = new AbortController();
    
    if (autoFetch && pacienteId) {
      Logger.debug(`usePacienteDiagnosticos: Ejecutando fetchDiagnosticos`, { pacienteId, limit, offset, sort });
      fetchDiagnosticos();
    } else if (!pacienteId) {
      // Limpiar datos si pacienteId no está disponible
      setDiagnosticos([]);
      setTotal(0);
      setLoading(false);
    }
    
    return () => {
      // Cleanup: cancelar request pendiente si el componente se desmonta o cambia pacienteId
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [pacienteId, limit, offset, sort, autoFetch, fetchDiagnosticos]);

  return {
    diagnosticos,
    loading,
    error,
    total,
    refresh: refreshDiagnosticos,
    refetch: fetchDiagnosticos
  };
};

/**
 * Hook para obtener medicamentos de un paciente
 */
export const usePacienteMedicamentos = (pacienteId, options = {}) => {
  const [medicamentos, setMedicamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  const {
    limit = 10,
    offset = 0,
    sort = 'DESC',
    autoFetch = true
  } = options;

  const fetchMedicamentos = useCallback(async () => {
    if (!pacienteId) {
      Logger.debug(`usePacienteMedicamentos: pacienteId no disponible, saltando fetch`);
      setLoading(false);
      setMedicamentos([]);
      setTotal(0);
      return;
    }

    // Generar cacheKey dentro de la función para evitar dependencias
    const currentCacheKey = `medicamentos_${pacienteId}_${limit}_${offset}_${sort}`;

    // Verificar cache
    if (medicalDataCache.medicamentos[currentCacheKey] && 
        (Date.now() - medicalDataCache.medicamentos[currentCacheKey].timestamp < CACHE_DURATION)) {
      Logger.debug(`usePacienteMedicamentos (${pacienteId}): Sirviendo desde caché`);
      const cachedData = medicalDataCache.medicamentos[currentCacheKey].data;
      setMedicamentos(cachedData.data);
      setTotal(cachedData.total);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      Logger.info(`usePacienteMedicamentos (${pacienteId}): Obteniendo medicamentos del paciente`);
      
      const gestionService = (await import('../api/gestionService.js')).default;
      const response = await gestionService.getPacienteMedicamentos(pacienteId, {
        limit,
        offset,
        sort
      });

      Logger.debug('💊 Medicamentos response:', { response, keys: Object.keys(response) });
      
      const medicamentosData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setMedicamentos(medicamentosData);
      setTotal(response.total || 0);

      // Guardar en cache usando la clave actual
      medicalDataCache.medicamentos[currentCacheKey] = {
        data: medicamentosData,
        timestamp: Date.now()
      };

      Logger.debug(`usePacienteMedicamentos (${pacienteId}): Datos actualizados y cacheado`);
    } catch (err) {
      Logger.error(`usePacienteMedicamentos (${pacienteId}): Error al obtener medicamentos`, err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [pacienteId, limit, offset, sort]);

  const refreshMedicamentos = useCallback(() => {
    if (pacienteId) {
      // Limpiar cache usando la clave actual
      const currentCacheKey = `medicamentos_${pacienteId}_${limit}_${offset}_${sort}`;
      delete medicalDataCache.medicamentos[currentCacheKey];
      fetchMedicamentos();
    }
  }, [pacienteId, limit, offset, sort, fetchMedicamentos]);

  useEffect(() => {
    if (autoFetch && pacienteId) {
      Logger.debug(`usePacienteMedicamentos: Ejecutando fetchMedicamentos`, { pacienteId, limit, offset, sort });
      fetchMedicamentos();
    } else if (!pacienteId) {
      // Limpiar datos si pacienteId no está disponible
      setMedicamentos([]);
      setTotal(0);
      setLoading(false);
    }
  }, [pacienteId, limit, offset, sort, autoFetch, fetchMedicamentos]);

  return {
    medicamentos,
    loading,
    error,
    total,
    refresh: refreshMedicamentos,
    refetch: fetchMedicamentos
  };
};

/**
 * Hook para obtener resumen médico completo de un paciente
 */
export const usePacienteResumenMedico = (pacienteId, options = {}) => {
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const {
    autoFetch = true
  } = options;

  const fetchResumen = useCallback(async () => {
    if (!pacienteId) {
      Logger.debug(`usePacienteResumenMedico: pacienteId no disponible, saltando fetch`);
      setLoading(false);
      setResumen(null);
      return;
    }

    // Generar cacheKey dentro de la función para evitar dependencias
    const currentCacheKey = `resumen_${pacienteId}`;

    // Verificar cache
    if (medicalDataCache.resumen[currentCacheKey] && 
        (Date.now() - medicalDataCache.resumen[currentCacheKey].timestamp < CACHE_DURATION)) {
      Logger.debug(`usePacienteResumenMedico (${pacienteId}): Sirviendo desde caché`);
      const cachedData = medicalDataCache.resumen[currentCacheKey].data;
      setResumen(cachedData);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      Logger.info(`usePacienteResumenMedico (${pacienteId}): Obteniendo resumen médico del paciente`);
      
      const gestionService = (await import('../api/gestionService.js')).default;
      const response = await gestionService.getPacienteResumenMedico(pacienteId);

      const resumenData = response.data || response;
      setResumen(resumenData);

      // Guardar en cache usando la clave actual
      medicalDataCache.resumen[currentCacheKey] = {
        data: resumenData,
        timestamp: Date.now()
      };

      Logger.debug(`usePacienteResumenMedico (${pacienteId}): Datos actualizados y cacheado`);
    } catch (err) {
      Logger.error(`usePacienteResumenMedico (${pacienteId}): Error al obtener resumen médico`, err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [pacienteId]);

  const refreshResumen = useCallback(() => {
    if (pacienteId) {
      // Limpiar cache usando la clave actual
      const currentCacheKey = `resumen_${pacienteId}`;
      delete medicalDataCache.resumen[currentCacheKey];
      fetchResumen();
    }
  }, [pacienteId, fetchResumen]);

  useEffect(() => {
    if (autoFetch && pacienteId) {
      Logger.debug(`usePacienteResumenMedico: Ejecutando fetchResumen`, { pacienteId });
      fetchResumen();
    } else if (!pacienteId) {
      // Limpiar datos si pacienteId no está disponible
      setResumen(null);
      setLoading(false);
    }
  }, [pacienteId, autoFetch, fetchResumen]);

  return {
    resumen,
    loading,
    error,
    refresh: refreshResumen,
    refetch: fetchResumen
  };
};

/**
 * Hook combinado para obtener todos los datos médicos de un paciente
 */
export const usePacienteMedicalData = (pacienteId, options = {}) => {
  const {
    limit = 5,
    autoFetch = true
  } = options;

  // Hooks individuales
  const citas = usePacienteCitas(pacienteId, { limit, autoFetch });
  const signosVitales = usePacienteSignosVitales(pacienteId, { limit, autoFetch });
  const diagnosticos = usePacienteDiagnosticos(pacienteId, { limit, autoFetch });
  const medicamentos = usePacienteMedicamentos(pacienteId, { limit, autoFetch });
  const resumen = usePacienteResumenMedico(pacienteId, { autoFetch });

  // Estados combinados
  const loading = citas.loading || signosVitales.loading || diagnosticos.loading || medicamentos.loading || resumen.loading;
  const error = citas.error || signosVitales.error || diagnosticos.error || medicamentos.error || resumen.error;

  // Función para refrescar todos los datos
  const refreshAll = useCallback(() => {
    citas.refresh();
    signosVitales.refresh();
    diagnosticos.refresh();
    medicamentos.refresh();
    resumen.refresh();
  }, [citas.refresh, signosVitales.refresh, diagnosticos.refresh, medicamentos.refresh, resumen.refresh]);

  return {
    // Datos individuales
    citas: citas.citas,
    signosVitales: signosVitales.signosVitales,
    diagnosticos: diagnosticos.diagnosticos,
    medicamentos: medicamentos.medicamentos,
    resumen: resumen.resumen,
    
    // Estados combinados
    loading,
    error,
    
    // Totales
    totalCitas: citas.total,
    totalSignosVitales: signosVitales.total,
    totalDiagnosticos: diagnosticos.total,
    totalMedicamentos: medicamentos.total,
    
    // Funciones de refresh
    refreshAll,
    refreshCitas: citas.refresh,
    refreshSignosVitales: signosVitales.refresh,
    refreshDiagnosticos: diagnosticos.refresh,
    refreshMedicamentos: medicamentos.refresh,
    refreshResumen: resumen.refresh
  };
};

/**
 * Hook para obtener red de apoyo de un paciente
 */
export const usePacienteRedApoyo = (pacienteId, options = {}) => {
  const [redApoyo, setRedApoyo] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { autoFetch = true } = options;

  const fetchRedApoyo = useCallback(async () => {
    if (!pacienteId) {
      Logger.debug(`usePacienteRedApoyo: pacienteId no disponible, saltando fetch`);
      setLoading(false);
      setRedApoyo([]);
      return;
    }

    // Generar cacheKey dentro de la función para evitar dependencias
    const currentCacheKey = `redApoyo_${pacienteId}`;

    // Verificar cache
    if (medicalDataCache.redApoyo[currentCacheKey] && 
        (Date.now() - medicalDataCache.redApoyo[currentCacheKey].timestamp < CACHE_DURATION)) {
      Logger.debug(`usePacienteRedApoyo (${pacienteId}): Sirviendo desde caché`);
      const cachedData = medicalDataCache.redApoyo[currentCacheKey].data;
      setRedApoyo(cachedData);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      Logger.info(`usePacienteRedApoyo (${pacienteId}): Obteniendo red de apoyo`);
      
      const gestionService = (await import('../api/gestionService.js')).default;
      const response = await gestionService.getPacienteRedApoyo(pacienteId);

      // El backend devuelve { success: true, data: [...] }
      // gestionService devuelve response.data que es { success: true, data: [...] }
      // Necesitamos extraer el array de data
      let redesData = [];
      
      if (response && response.success && Array.isArray(response.data)) {
        redesData = response.data;
      } else if (Array.isArray(response?.data)) {
        redesData = response.data;
      } else if (Array.isArray(response)) {
        redesData = response;
      }
      
      setRedApoyo(redesData);

      // Guardar en cache usando la clave actual
      medicalDataCache.redApoyo[currentCacheKey] = {
        data: redesData,
        timestamp: Date.now()
      };

      Logger.info(`Red de apoyo obtenida (${redesData.length} contactos)`);
    } catch (err) {
      Logger.error(`Error obteniendo red de apoyo:`, err);
      setError(err.message || 'Error al obtener red de apoyo');
    } finally {
      setLoading(false);
    }
  }, [pacienteId]);

  // Función refresh que limpia el cache antes de refrescar
  const refreshRedApoyo = useCallback(() => {
    if (pacienteId) {
      Logger.info(`usePacienteRedApoyo (${pacienteId}): Forzando refresh, limpiando cache`);
      // Limpiar cache usando la clave actual
      const currentCacheKey = `redApoyo_${pacienteId}`;
      if (medicalDataCache.redApoyo[currentCacheKey]) {
        delete medicalDataCache.redApoyo[currentCacheKey];
      }
      fetchRedApoyo();
    }
  }, [pacienteId, fetchRedApoyo]);

  useEffect(() => {
    if (autoFetch && pacienteId) {
      Logger.debug(`usePacienteRedApoyo: Ejecutando fetchRedApoyo`, { pacienteId });
      fetchRedApoyo();
    } else if (!pacienteId) {
      // Limpiar datos si pacienteId no está disponible
      setRedApoyo([]);
      setLoading(false);
    }
  }, [pacienteId, autoFetch, fetchRedApoyo]);

  return {
    redApoyo,
    loading,
    error,
    refresh: refreshRedApoyo
  };
};

/**
 * Hook para obtener esquema de vacunación de un paciente
 */
export const usePacienteEsquemaVacunacion = (pacienteId, options = {}) => {
  const [esquemaVacunacion, setEsquemaVacunacion] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { autoFetch = true } = options;

  const fetchEsquemaVacunacion = useCallback(async () => {
    if (!pacienteId) {
      Logger.debug(`usePacienteEsquemaVacunacion: pacienteId no disponible, saltando fetch`);
      setLoading(false);
      setEsquemaVacunacion([]);
      return;
    }

    // Generar cacheKey dentro de la función para evitar dependencias
    const currentCacheKey = `esquemaVacunacion_${pacienteId}`;

    // Verificar cache
    if (medicalDataCache.esquemaVacunacion[currentCacheKey] && 
        (Date.now() - medicalDataCache.esquemaVacunacion[currentCacheKey].timestamp < CACHE_DURATION)) {
      Logger.debug(`usePacienteEsquemaVacunacion (${pacienteId}): Sirviendo desde caché`);
      const cachedData = medicalDataCache.esquemaVacunacion[currentCacheKey].data;
      setEsquemaVacunacion(cachedData);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      Logger.info(`usePacienteEsquemaVacunacion (${pacienteId}): Obteniendo esquema de vacunación`);
      
      const gestionService = (await import('../api/gestionService.js')).default;
      const response = await gestionService.getPacienteEsquemaVacunacion(pacienteId);

      // El backend devuelve { success: true, data: [...] }
      // gestionService devuelve response.data que es { success: true, data: [...] }
      // Necesitamos extraer el array de data
      let vacunasData = [];
      
      if (response && response.success && Array.isArray(response.data)) {
        vacunasData = response.data;
      } else if (Array.isArray(response?.data)) {
        vacunasData = response.data;
      } else if (Array.isArray(response)) {
        vacunasData = response;
      }
      
      setEsquemaVacunacion(vacunasData);

      // Guardar en cache usando la clave actual
      medicalDataCache.esquemaVacunacion[currentCacheKey] = {
        data: vacunasData,
        timestamp: Date.now()
      };

      Logger.info(`Esquema de vacunación obtenido (${vacunasData.length} vacunas)`);
    } catch (err) {
      Logger.error(`Error obteniendo esquema de vacunación:`, err);
      setError(err.message || 'Error al obtener esquema de vacunación');
    } finally {
      setLoading(false);
    }
  }, [pacienteId]);

  useEffect(() => {
    if (autoFetch && pacienteId) {
      Logger.debug(`usePacienteEsquemaVacunacion: Ejecutando fetchEsquemaVacunacion`, { pacienteId });
      fetchEsquemaVacunacion();
    } else if (!pacienteId) {
      // Limpiar datos si pacienteId no está disponible
      setEsquemaVacunacion([]);
      setLoading(false);
    }
  }, [pacienteId, autoFetch, fetchEsquemaVacunacion]);

  // Función refresh que limpia el cache antes de refrescar
  const refreshEsquemaVacunacion = useCallback(() => {
    if (pacienteId) {
      Logger.info(`usePacienteEsquemaVacunacion (${pacienteId}): Forzando refresh, limpiando cache`);
      // Limpiar cache usando la clave actual
      const currentCacheKey = `esquemaVacunacion_${pacienteId}`;
      if (medicalDataCache.esquemaVacunacion[currentCacheKey]) {
        delete medicalDataCache.esquemaVacunacion[currentCacheKey];
      }
      fetchEsquemaVacunacion();
    }
  }, [pacienteId, fetchEsquemaVacunacion]);

  return {
    esquemaVacunacion,
    loading,
    error,
    refresh: refreshEsquemaVacunacion
  };
};

/**
 * Hook para obtener comorbilidades de un paciente
 */
export const usePacienteComorbilidades = (pacienteId, options = {}) => {
  const [comorbilidades, setComorbilidades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { autoFetch = true } = options;

  const fetchComorbilidades = useCallback(async () => {
    if (!pacienteId) {
      Logger.debug(`usePacienteComorbilidades: pacienteId no disponible, saltando fetch`);
      setLoading(false);
      setComorbilidades([]);
      return;
    }

    // Generar cacheKey dentro de la función para evitar dependencias
    const currentCacheKey = `comorbilidades_${pacienteId}`;

    // Verificar cache
    if (medicalDataCache.comorbilidades[currentCacheKey] && 
        (Date.now() - medicalDataCache.comorbilidades[currentCacheKey].timestamp < CACHE_DURATION)) {
      Logger.debug(`usePacienteComorbilidades (${pacienteId}): Sirviendo desde caché`);
      const cachedData = medicalDataCache.comorbilidades[currentCacheKey].data;
      setComorbilidades(cachedData);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      Logger.info(`usePacienteComorbilidades (${pacienteId}): Obteniendo comorbilidades`);
      
      const gestionService = (await import('../api/gestionService.js')).default;
      const response = await gestionService.getPacienteComorbilidades(pacienteId);

      // El backend devuelve { success: true, data: [...] }
      // gestionService devuelve response.data que es { success: true, data: [...] }
      // Necesitamos extraer el array de data
      let comorbilidadesData = [];
      
      if (response && response.success && Array.isArray(response.data)) {
        comorbilidadesData = response.data;
      } else if (Array.isArray(response?.data)) {
        comorbilidadesData = response.data;
      } else if (Array.isArray(response)) {
        comorbilidadesData = response;
      }
      
      setComorbilidades(comorbilidadesData);

      // Guardar en cache usando la clave actual
      medicalDataCache.comorbilidades[currentCacheKey] = {
        data: comorbilidadesData,
        timestamp: Date.now()
      };

      Logger.info(`Comorbilidades obtenidas (${comorbilidadesData.length} comorbilidades)`);
    } catch (err) {
      Logger.error(`Error obteniendo comorbilidades:`, err);
      setError(err.message || 'Error al obtener comorbilidades');
    } finally {
      setLoading(false);
    }
  }, [pacienteId]);

  useEffect(() => {
    if (autoFetch && pacienteId) {
      Logger.debug(`usePacienteComorbilidades: Ejecutando fetchComorbilidades`, { pacienteId });
      fetchComorbilidades();
    } else if (!pacienteId) {
      // Limpiar datos si pacienteId no está disponible
      setComorbilidades([]);
      setLoading(false);
    }
  }, [pacienteId, autoFetch, fetchComorbilidades]);

  // Función refresh que limpia el cache antes de refrescar
  const refreshComorbilidades = useCallback(() => {
    if (pacienteId) {
      Logger.info(`usePacienteComorbilidades (${pacienteId}): Forzando refresh, limpiando cache`);
      // Limpiar cache usando la clave actual
      const currentCacheKey = `comorbilidades_${pacienteId}`;
      if (medicalDataCache.comorbilidades[currentCacheKey]) {
        delete medicalDataCache.comorbilidades[currentCacheKey];
      }
      fetchComorbilidades();
    }
  }, [pacienteId, fetchComorbilidades]);

  return {
    comorbilidades,
    loading,
    error,
    refresh: refreshComorbilidades
  };
};

/**
 * Hook para obtener detecciones de complicaciones de un paciente
 */
export const usePacienteDeteccionesComplicaciones = (pacienteId, options = {}) => {
  const [detecciones, setDetecciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const {
    autoFetch = true,
    limit = 5,
    offset = 0,
    sort = 'DESC'
  } = options;

  const fetchDetecciones = useCallback(async () => {
    if (!pacienteId) {
      Logger.debug(`usePacienteDeteccionesComplicaciones: pacienteId no disponible, saltando fetch`);
      setLoading(false);
      setDetecciones([]);
      return;
    }

    const currentCacheKey = `deteccionesComplicaciones_${pacienteId}_${limit}_${offset}_${sort}`;

    // Verificar cache
    if (medicalDataCache.deteccionesComplicaciones[currentCacheKey] &&
        (Date.now() - medicalDataCache.deteccionesComplicaciones[currentCacheKey].timestamp < CACHE_DURATION)) {
      Logger.debug(`usePacienteDeteccionesComplicaciones (${pacienteId}): Sirviendo desde caché`);
      const cachedData = medicalDataCache.deteccionesComplicaciones[currentCacheKey].data;
      setDetecciones(cachedData);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      Logger.info(`usePacienteDeteccionesComplicaciones (${pacienteId}): Obteniendo detecciones`, { limit, offset, sort });
      
      const gestionService = (await import('../api/gestionService.js')).default;
      const response = await gestionService.getPacienteDeteccionesComplicaciones(pacienteId, { limit, offset, sort });

      let deteccionesData = [];
      if (response && response.success && Array.isArray(response.data)) {
        deteccionesData = response.data;
      } else if (Array.isArray(response?.data)) {
        deteccionesData = response.data;
      } else if (Array.isArray(response)) {
        deteccionesData = response;
      }

      setDetecciones(deteccionesData);

      medicalDataCache.deteccionesComplicaciones[currentCacheKey] = {
        data: deteccionesData,
        timestamp: Date.now()
      };
    } catch (err) {
      Logger.error(`usePacienteDeteccionesComplicaciones (${pacienteId}): Error al obtener detecciones`, err);
      setError(err.message || 'Error al obtener detecciones de complicaciones');
    } finally {
      setLoading(false);
    }
  }, [pacienteId, limit, offset, sort]);

  useEffect(() => {
    if (autoFetch && pacienteId) {
      Logger.debug(`usePacienteDeteccionesComplicaciones: Ejecutando fetchDetecciones`, { pacienteId, limit, offset, sort });
      fetchDetecciones();
    } else if (!pacienteId) {
      setDetecciones([]);
      setLoading(false);
    }
  }, [pacienteId, autoFetch, fetchDetecciones, limit, offset, sort]);

  const refreshDetecciones = useCallback(() => {
    if (pacienteId) {
      Logger.info(`usePacienteDeteccionesComplicaciones (${pacienteId}): Forzando refresh, limpiando cache`);
      const currentCacheKey = `deteccionesComplicaciones_${pacienteId}_${limit}_${offset}_${sort}`;
      if (medicalDataCache.deteccionesComplicaciones[currentCacheKey]) {
        delete medicalDataCache.deteccionesComplicaciones[currentCacheKey];
      }
      fetchDetecciones();
    }
  }, [pacienteId, limit, offset, sort, fetchDetecciones]);

  return {
    detecciones,
    loading,
    error,
    refresh: refreshDetecciones
  };
};

/**
 * Hook para obtener sesiones educativas de un paciente
 * Reutiliza el patrón de usePacienteEsquemaVacunacion
 */
export const usePacienteSesionesEducativas = (pacienteId, options = {}) => {
  const [sesionesEducativas, setSesionesEducativas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { autoFetch = true, limit = 10, offset = 0, sort = 'DESC' } = options;

  const fetchSesionesEducativas = useCallback(async () => {
    if (!pacienteId) {
      Logger.debug(`usePacienteSesionesEducativas: pacienteId no disponible, saltando fetch`);
      setLoading(false);
      setSesionesEducativas([]);
      return;
    }

    const currentCacheKey = `sesionesEducativas_${pacienteId}_${limit}_${offset}_${sort}`;

    // Verificar cache
    if (medicalDataCache.sesionesEducativas[currentCacheKey] && 
        (Date.now() - medicalDataCache.sesionesEducativas[currentCacheKey].timestamp < CACHE_DURATION)) {
      Logger.debug(`usePacienteSesionesEducativas (${pacienteId}): Sirviendo desde caché`);
      const cachedData = medicalDataCache.sesionesEducativas[currentCacheKey].data;
      setSesionesEducativas(cachedData);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      Logger.info(`usePacienteSesionesEducativas (${pacienteId}): Obteniendo sesiones educativas`);
      
      const gestionService = (await import('../api/gestionService.js')).default;
      const response = await gestionService.getPacienteSesionesEducativas(pacienteId, { limit, offset, sort });

      let sesionesData = [];
      if (response && response.success && Array.isArray(response.data)) {
        sesionesData = response.data;
      } else if (Array.isArray(response?.data)) {
        sesionesData = response.data;
      } else if (Array.isArray(response)) {
        sesionesData = response;
      }

      setSesionesEducativas(sesionesData);

      // Guardar en cache
      medicalDataCache.sesionesEducativas[currentCacheKey] = {
        data: sesionesData,
        timestamp: Date.now()
      };

      Logger.info(`Sesiones educativas obtenidas (${sesionesData.length} sesiones)`);
    } catch (err) {
      Logger.error(`Error obteniendo sesiones educativas:`, err);
      setError(err.message || 'Error al obtener sesiones educativas');
    } finally {
      setLoading(false);
    }
  }, [pacienteId, limit, offset, sort]);

  useEffect(() => {
    if (autoFetch && pacienteId) {
      Logger.debug(`usePacienteSesionesEducativas: Ejecutando fetchSesionesEducativas`, { pacienteId });
      fetchSesionesEducativas();
    } else if (!pacienteId) {
      setSesionesEducativas([]);
      setLoading(false);
    }
  }, [pacienteId, autoFetch, fetchSesionesEducativas]);

  const refreshSesionesEducativas = useCallback(() => {
    if (pacienteId) {
      Logger.info(`usePacienteSesionesEducativas (${pacienteId}): Forzando refresh, limpiando cache`);
      const currentCacheKey = `sesionesEducativas_${pacienteId}_${limit}_${offset}_${sort}`;
      if (medicalDataCache.sesionesEducativas[currentCacheKey]) {
        delete medicalDataCache.sesionesEducativas[currentCacheKey];
      }
      fetchSesionesEducativas();
    }
  }, [pacienteId, limit, offset, sort, fetchSesionesEducativas]);

  return {
    sesionesEducativas,
    loading,
    error,
    refresh: refreshSesionesEducativas
  };
};

/**
 * Hook para obtener registros de salud bucal de un paciente
 * ✅ Instrucción ⑫ - FORMA_2022_OFICIAL
 */
export const usePacienteSaludBucal = (pacienteId, options = {}) => {
  const [saludBucal, setSaludBucal] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  const {
    limit = 10,
    offset = 0,
    sort = 'DESC',
    autoFetch = true
  } = options;

  const fetchSaludBucal = useCallback(async () => {
    if (!pacienteId) {
      Logger.debug(`usePacienteSaludBucal: pacienteId no disponible, saltando fetch`);
      setLoading(false);
      setSaludBucal([]);
      setTotal(0);
      return;
    }

    const currentCacheKey = `saludBucal_${pacienteId}_${limit}_${offset}_${sort}`;

    if (medicalDataCache.saludBucal[currentCacheKey] &&
        (Date.now() - medicalDataCache.saludBucal[currentCacheKey].timestamp < CACHE_DURATION)) {
      Logger.debug(`usePacienteSaludBucal (${pacienteId}): Sirviendo desde caché`);
      const cachedData = medicalDataCache.saludBucal[currentCacheKey];
      setSaludBucal(cachedData.data || []);
      setTotal(cachedData.total || 0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      Logger.info(`usePacienteSaludBucal (${pacienteId}): Obteniendo registros de salud bucal`);

      const gestionService = (await import('../api/gestionService.js')).default;
      const response = await gestionService.getPacienteSaludBucal(pacienteId, {
        limit,
        offset,
        sort
      });

      const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setSaludBucal(data);
      setTotal(response.total || data.length);

      medicalDataCache.saludBucal[currentCacheKey] = {
        data: data,
        total: response.total || data.length,
        timestamp: Date.now()
      };

      Logger.info(`Registros de salud bucal obtenidos (${data.length} registros)`);
    } catch (err) {
      Logger.error(`Error obteniendo registros de salud bucal:`, err);
      setError(err.message || 'Error al obtener registros de salud bucal');
    } finally {
      setLoading(false);
    }
  }, [pacienteId, limit, offset, sort]);

  useEffect(() => {
    if (autoFetch && pacienteId) {
      Logger.debug(`usePacienteSaludBucal: Ejecutando fetchSaludBucal`, { pacienteId });
      fetchSaludBucal();
    } else if (!pacienteId) {
      setSaludBucal([]);
      setLoading(false);
    }
  }, [pacienteId, autoFetch, fetchSaludBucal]);

  const refreshSaludBucal = useCallback(() => {
    if (pacienteId) {
      Logger.info(`usePacienteSaludBucal (${pacienteId}): Forzando refresh, limpiando cache`);
      const currentCacheKey = `saludBucal_${pacienteId}_${limit}_${offset}_${sort}`;
      if (medicalDataCache.saludBucal[currentCacheKey]) {
        delete medicalDataCache.saludBucal[currentCacheKey];
      }
      fetchSaludBucal();
    }
  }, [pacienteId, limit, offset, sort, fetchSaludBucal]);

  return {
    saludBucal,
    loading,
    error,
    total,
    refresh: refreshSaludBucal
  };
};

/**
 * Hook para obtener detecciones de tuberculosis de un paciente
 * ✅ Instrucción ⑬ - FORMA_2022_OFICIAL
 */
export const usePacienteDeteccionTuberculosis = (pacienteId, options = {}) => {
  const [deteccionesTuberculosis, setDeteccionesTuberculosis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  const {
    limit = 10,
    offset = 0,
    sort = 'DESC',
    autoFetch = true
  } = options;

  const fetchDeteccionesTuberculosis = useCallback(async () => {
    if (!pacienteId) {
      Logger.debug(`usePacienteDeteccionTuberculosis: pacienteId no disponible, saltando fetch`);
      setLoading(false);
      setDeteccionesTuberculosis([]);
      setTotal(0);
      return;
    }

    const currentCacheKey = `deteccionesTuberculosis_${pacienteId}_${limit}_${offset}_${sort}`;

    if (medicalDataCache.deteccionesTuberculosis[currentCacheKey] &&
        (Date.now() - medicalDataCache.deteccionesTuberculosis[currentCacheKey].timestamp < CACHE_DURATION)) {
      Logger.debug(`usePacienteDeteccionTuberculosis (${pacienteId}): Sirviendo desde caché`);
      const cachedData = medicalDataCache.deteccionesTuberculosis[currentCacheKey];
      setDeteccionesTuberculosis(cachedData.data || []);
      setTotal(cachedData.total || 0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      Logger.info(`usePacienteDeteccionTuberculosis (${pacienteId}): Obteniendo detecciones de tuberculosis`);

      const gestionService = (await import('../api/gestionService.js')).default;
      const response = await gestionService.getPacienteDeteccionesTuberculosis(pacienteId, {
        limit,
        offset,
        sort
      });

      const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setDeteccionesTuberculosis(data);
      setTotal(response.total || data.length);

      medicalDataCache.deteccionesTuberculosis[currentCacheKey] = {
        data: data,
        total: response.total || data.length,
        timestamp: Date.now()
      };

      Logger.info(`Detecciones de tuberculosis obtenidas (${data.length} registros)`);
    } catch (err) {
      Logger.error(`Error obteniendo detecciones de tuberculosis:`, err);
      setError(err.message || 'Error al obtener detecciones de tuberculosis');
    } finally {
      setLoading(false);
    }
  }, [pacienteId, limit, offset, sort]);

  useEffect(() => {
    if (autoFetch && pacienteId) {
      Logger.debug(`usePacienteDeteccionTuberculosis: Ejecutando fetchDeteccionesTuberculosis`, { pacienteId });
      fetchDeteccionesTuberculosis();
    } else if (!pacienteId) {
      setDeteccionesTuberculosis([]);
      setLoading(false);
    }
  }, [pacienteId, autoFetch, fetchDeteccionesTuberculosis]);

  const refreshDeteccionesTuberculosis = useCallback(() => {
    if (pacienteId) {
      Logger.info(`usePacienteDeteccionTuberculosis (${pacienteId}): Forzando refresh, limpiando cache`);
      const currentCacheKey = `deteccionesTuberculosis_${pacienteId}_${limit}_${offset}_${sort}`;
      if (medicalDataCache.deteccionesTuberculosis[currentCacheKey]) {
        delete medicalDataCache.deteccionesTuberculosis[currentCacheKey];
      }
      fetchDeteccionesTuberculosis();
    }
  }, [pacienteId, limit, offset, sort, fetchDeteccionesTuberculosis]);

  return {
    deteccionesTuberculosis,
    loading,
    error,
    total,
    refresh: refreshDeteccionesTuberculosis
  };
};

/**
 * Función para limpiar el cache de datos médicos
 */
export const clearMedicalDataCache = (pacienteId = null) => {
  if (pacienteId) {
    // Limpiar cache específico del paciente
    Object.keys(medicalDataCache).forEach(type => {
      Object.keys(medicalDataCache[type]).forEach(key => {
        if (key.includes(pacienteId)) {
          delete medicalDataCache[type][key];
        }
      });
    });
    Logger.info(`Cache de datos médicos limpiado para paciente ${pacienteId}`);
  } else {
    // Limpiar todo el cache
    Object.keys(medicalDataCache).forEach(type => {
      medicalDataCache[type] = {};
    });
    Logger.info('Cache de datos médicos completamente limpiado');
  }
};
