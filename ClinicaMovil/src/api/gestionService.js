import axios from 'axios';
import Logger from '../services/logger';
import { storageService } from '../services/storageService';
import { getApiConfig, getApiConfigWithFallback, testApiConnectivity } from '../config/apiConfig';
import { createCrudMethods } from './crudFactory';

// Configuración dinámica de la API (igual que authService)
let API_CONFIG = null;
let apiClient = null;
let currentBaseURL = null; // Rastrear la URL base actual para detectar cambios

// Función para inicializar la configuración con fallback inteligente
const initializeApiConfig = async (forceReinit = false) => {
  if (!API_CONFIG || forceReinit) {
    // Intentar usar fallback inteligente primero
    try {
      API_CONFIG = await getApiConfigWithFallback();
      currentBaseURL = API_CONFIG.baseURL;
      Logger.info('GestionService: API Config inicializada con fallback', { 
        baseURL: API_CONFIG.baseURL,
        timeout: API_CONFIG.timeout 
      });
      
      // Verificar conectividad con timeout más corto
      const connectivityTest = await Promise.race([
        testApiConnectivity(API_CONFIG.baseURL),
        new Promise((resolve) => setTimeout(() => resolve({ success: false, error: 'Timeout' }), 5000))
      ]);
      
      if (!connectivityTest.success) {
        Logger.warn('GestionService: No se pudo verificar conectividad, intentando IP local...', {
          baseURL: API_CONFIG.baseURL,
          error: connectivityTest.error
        });
        
        // Si la configuración actual es localhost y falla, cambiar a IP local directamente
        if (API_CONFIG.baseURL.includes('localhost') || API_CONFIG.baseURL.includes('127.0.0.1')) {
          const { API_CONFIG: API_CONFIG_MODULE } = await import('../config/apiConfig.js');
          const localNetworkConfig = API_CONFIG_MODULE.localNetwork;
          
          Logger.info('GestionService: Cambiando a IP de red local', {
            oldBaseURL: API_CONFIG.baseURL,
            newBaseURL: localNetworkConfig.baseURL
          });
          
          API_CONFIG = localNetworkConfig;
          currentBaseURL = localNetworkConfig.baseURL;
        }
      }
    } catch (error) {
      // Si falla el fallback, usar configuración básica
      Logger.warn('GestionService: Fallback falló, usando configuración básica', { error: error.message });
      API_CONFIG = await getApiConfig();
      currentBaseURL = API_CONFIG.baseURL;
      Logger.info('GestionService: API Config inicializada (básica)', { 
        baseURL: API_CONFIG.baseURL,
        timeout: API_CONFIG.timeout 
      });
    }
  }
  return API_CONFIG;
};

// Variable para rastrear si ya intentamos fallback
let fallbackAttempted = false;

// Función para obtener o crear el cliente API
const getApiClient = async (forceRecreate = false) => {
  // Si se fuerza recreación o no existe cliente, crear uno nuevo
  if (!apiClient || forceRecreate) {
    const config = await initializeApiConfig(forceRecreate);
    // IMPORTANTE: Agregar /api al baseURL para que coincida con las rutas del backend
    const baseURL = `${config.baseURL}/api`;
    
    if (__DEV__) {
      Logger.info('GestionService: Creando cliente API', { baseURL });
    }
    
    apiClient = axios.create({
      baseURL: baseURL,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Configurar interceptores
    setupInterceptors(apiClient);
    currentBaseURL = config.baseURL;
  }
  return apiClient;
};

// Función para intentar fallback a IP local cuando localhost falla
const tryLocalNetworkFallback = async () => {
  if (fallbackAttempted) {
    return null; // Ya intentamos fallback, no reintentar
  }
  
  try {
    const { API_CONFIG: API_CONFIG_MODULE, clearEnvironmentCache, testApiConnectivity } = await import('../config/apiConfig.js');
    
    // Limpiar cache para forzar nueva detección
    clearEnvironmentCache();
    fallbackAttempted = true;
    
    // Intentar con IP de red local
    const localNetworkConfig = API_CONFIG_MODULE.localNetwork;
    Logger.info('GestionService: Probando conectividad con IP local', { 
      baseURL: localNetworkConfig.baseURL 
    });
    
    const testResult = await testApiConnectivity(localNetworkConfig.baseURL);
    
    if (testResult.success) {
      Logger.info('GestionService: Fallback exitoso a red local', { 
        baseURL: localNetworkConfig.baseURL 
      });
      
      // Actualizar API_CONFIG local con la nueva configuración
      API_CONFIG = localNetworkConfig;
      currentBaseURL = localNetworkConfig.baseURL;
      
      // Recrear cliente con nueva configuración
      apiClient = null;
      return await getApiClient(true);
    } else {
      Logger.warn('GestionService: Fallback a IP local falló', { 
        baseURL: localNetworkConfig.baseURL,
        error: testResult.error
      });
    }
  } catch (error) {
    Logger.warn('GestionService: Error en fallback a red local', { 
      error: error.message 
    });
  }
  
  return null;
};

// Función para configurar interceptores
const setupInterceptors = (client) => {
  // Interceptor para añadir el token de autenticación
  client.interceptors.request.use(
  async (config) => {
    try {
      // ✅ VERIFICACIÓN PROACTIVA: Renovar token si está próximo a expirar ANTES del request
      // Esto evita recibir 401 y tener que hacer renovación reactiva
      // Solo verificar si no es un request de refresh token (evitar loops)
      if (!config.url?.includes('/refresh-token') && !config.url?.includes('/login')) {
        try {
          const sessionService = (await import('../services/sessionService.js')).default;
          // Usar cache (no forzar verificación) para evitar múltiples verificaciones
          const tokenValid = await sessionService.checkAndRefreshTokenIfNeeded(false);
          if (!tokenValid) {
            Logger.warn('GestionService: Token inválido detectado antes del request', {
              url: config.url
            });
          }
        } catch (refreshError) {
          Logger.warn('GestionService: Error verificando token antes del request', {
            error: refreshError.message,
            url: config.url
          });
          // Continuar con el request, el interceptor de respuesta manejará el 401 si ocurre
        }
      }

      const token = await storageService.getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        // Log esencial: Solo para requests PUT
        if (config.method === 'put') {
          Logger.info('GestionService: Token añadido', { 
            hasToken: true,
            url: config.url
          });
        }
      } else {
        Logger.warn('GestionService: Sin token', {
          url: config.url,
          method: config.method
        });
      }
      
      // Headers móviles requeridos
      config.headers['X-Device-ID'] = await storageService.getOrCreateDeviceId();
      config.headers['X-Platform'] = 'android';
      config.headers['X-App-Version'] = '1.0.0';
      config.headers['X-Client-Type'] = 'mobile';
      
      // Validar y limpiar datos antes de enviar (especialmente mensaje_texto)
      if (config.data && typeof config.data === 'object') {
        const cleanedData = { ...config.data };
        
        // Validar mensaje_texto específicamente
        if (cleanedData.mensaje_texto !== undefined) {
          if (typeof cleanedData.mensaje_texto !== 'string') {
            // Si es un objeto (evento), convertirlo a string vacío o intentar extraer texto
            if (typeof cleanedData.mensaje_texto === 'object' && cleanedData.mensaje_texto !== null) {
              // Detectar si es un evento de React
              if (cleanedData.mensaje_texto.nativeEvent || cleanedData.mensaje_texto._targetInst) {
                Logger.warn('GestionService: mensaje_texto es un evento de React, usando string vacío');
                cleanedData.mensaje_texto = '';
              } else {
                // Intentar convertir a string
                cleanedData.mensaje_texto = String(cleanedData.mensaje_texto || '');
              }
            } else {
              cleanedData.mensaje_texto = String(cleanedData.mensaje_texto || '');
            }
          }
        }
        
        // Limpiar otros campos que puedan ser objetos (eventos)
        Object.keys(cleanedData).forEach(key => {
          const value = cleanedData[key];
          if (value && typeof value === 'object' && value !== null) {
            // Detectar eventos de React
            if (value.nativeEvent || value._targetInst || value.dispatchConfig) {
              Logger.warn(`GestionService: Campo ${key} es un evento de React, convirtiendo a string`);
              cleanedData[key] = '[React Native Event]';
            }
          }
        });
        
        config.data = cleanedData;
      }
      
      // Sanitizar datos antes de loggear (evitar eventos de React)
      const sanitizedData = config.data && typeof config.data === 'object' 
        ? Object.keys(config.data).reduce((acc, key) => {
            const value = config.data[key];
            // Detectar eventos de React
            if (value && typeof value === 'object' && (value.nativeEvent || value._targetInst || value.dispatchConfig)) {
              acc[key] = '[React Native Event]';
            } else {
              acc[key] = value;
            }
            return acc;
          }, {})
        : config.data;
      Logger.apiCall(config.method.toUpperCase(), config.url, sanitizedData);
      return config;
    } catch (error) {
      Logger.error('Error configurando request', { error: error.message, url: config.url });
      return config;
    }
  },
  (error) => {
    Logger.error('Error en interceptor de request', error);
    return Promise.reject(error);
  }
);

  // Interceptor para manejar respuestas
  client.interceptors.response.use(
    (response) => {
      Logger.apiResponse(response.config.url, response.status, 'Respuesta exitosa');
      return response;
    },
    async (error) => {
      const originalRequest = error.config;
      const errorDetails = {
        url: error.config?.url,
        status: error.response?.status,
        message: error.message,
        responseData: error.response?.data,
        responseStatusText: error.response?.statusText
      };
      Logger.error('Error en respuesta de API', errorDetails);
      
      // Log detallado del error en desarrollo
      if (process.env.NODE_ENV === 'development' && error.response?.data) {
        Logger.debug('Detalles del error del servidor', {
          error: error.response.data.error,
          details: error.response.data.details
        });
      }

      // Manejar errores de red - hacer fallback automático a IP local
      const isNetworkError = error.code === 'ERR_NETWORK' || 
                            error.message === 'Network Error' || 
                            error.message?.includes('Network Error') ||
                            error.message?.includes('ERR_NETWORK') ||
                            (!error.response && error.request);
      
      const isLocalhost = error.config?.baseURL?.includes('localhost') || 
                         error.config?.baseURL?.includes('127.0.0.1') ||
                         currentBaseURL?.includes('localhost') ||
                         currentBaseURL?.includes('127.0.0.1');
      
      if (isNetworkError && !originalRequest._fallbackAttempted && isLocalhost) {
        originalRequest._fallbackAttempted = true;
        
        try {
          Logger.warn('⚠️ Error de red detectado, intentando fallback a IP local...', {
            url: originalRequest.url,
            baseURL: error.config?.baseURL || currentBaseURL,
            currentBaseURL: currentBaseURL,
            errorCode: error.code,
            errorMessage: error.message
          });
          
          // Forzar reinicialización de la configuración para usar IP local
          const { clearEnvironmentCache, API_CONFIG: API_CONFIG_MODULE } = await import('../config/apiConfig.js');
          clearEnvironmentCache();
          
          // Usar directamente la configuración de red local
          const localNetworkConfig = API_CONFIG_MODULE.localNetwork;
          const newBaseURL = `${localNetworkConfig.baseURL}/api`;
          
          Logger.info('🔄 Cambiando a IP de red local', {
            oldBaseURL: error.config?.baseURL || currentBaseURL,
            newBaseURL: newBaseURL,
            url: originalRequest.url
          });
          
          // Crear nuevo cliente con IP local
          const newClient = axios.create({
            baseURL: newBaseURL,
            timeout: localNetworkConfig.timeout,
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          // Copiar headers del request original (incluyendo autorización)
          if (originalRequest.headers) {
            Object.keys(originalRequest.headers).forEach(key => {
              if (originalRequest.headers[key]) {
                newClient.defaults.headers.common[key] = originalRequest.headers[key];
              }
            });
          }
          
          // Configurar interceptores en el nuevo cliente
          setupInterceptors(newClient);
          
          // Actualizar el cliente global
          apiClient = newClient;
          currentBaseURL = localNetworkConfig.baseURL;
          
          Logger.info('✅ Cliente API actualizado, reintentando request', {
            url: originalRequest.url,
            newBaseURL: newClient.defaults.baseURL,
            method: originalRequest.method
          });
          
          // Reintentar el request con el nuevo cliente usando la misma configuración
          // axios automáticamente usará el nuevo baseURL del cliente
          const retryConfig = {
            method: originalRequest.method,
            url: originalRequest.url, // URL relativa, el cliente agregará el baseURL
            params: originalRequest.params,
            data: originalRequest.data,
            headers: {
              ...originalRequest.headers,
            },
            timeout: localNetworkConfig.timeout,
          };
          
          // Reintentar el request con el nuevo cliente
          return newClient.request(retryConfig);
        } catch (fallbackError) {
          Logger.error('❌ Error en fallback a IP local', {
            error: fallbackError.message,
            stack: fallbackError.stack,
            url: originalRequest.url
          });
          // Continuar con el error original
        }
      }

      // Manejar token expirado (401 Unauthorized o 403 Forbidden)
      // El backend puede devolver 403 cuando el token es inválido/expirado
      if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
        originalRequest._retry = true;
        
        try {
          // Importar sessionService dinámicamente para evitar dependencias circulares
          const sessionService = (await import('../services/sessionService.js')).default;
          
          // Intentar renovar el token automáticamente
          Logger.info(`🔄 [INTERCEPTOR] Token expirado (${error.response?.status}), intentando renovar automáticamente...`, {
            url: originalRequest.url,
            method: originalRequest.method,
            status: error.response?.status
          });
          
          const newToken = await sessionService.refreshToken();
          
          if (newToken) {
            // Token renovado exitosamente, reintentar request original
            Logger.success('✅ [INTERCEPTOR] Token renovado exitosamente, reintentando request original', {
              url: originalRequest.url,
              method: originalRequest.method
            });
            
            // Actualizar el token en el header
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            
            // Reintentar el request con el nuevo token
            // Usar un pequeño delay para asegurar que el token se guardó correctamente
            await new Promise(resolve => setTimeout(resolve, 100));
            
            return client(originalRequest);
          } else {
            // No se pudo renovar, la sesión ha expirada
            Logger.warn('⚠️ [INTERCEPTOR] No se pudo renovar el token, cerrando sesión y redirigiendo al login', {
              url: originalRequest.url
            });
            
            // Asegurar que se cierre la sesión y redirija al login
            // handleSessionExpired() puede haber sido llamado en refreshToken() si fue error definitivo,
            // pero si fue null por otra razón (sin refresh token, etc.), lo llamamos aquí
            try {
              const sessionService = (await import('../services/sessionService.js')).default;
              await sessionService.handleSessionExpired();
            } catch (handleError) {
              Logger.error('❌ [INTERCEPTOR] Error manejando sesión expirada', handleError);
            }
            
            return Promise.reject(error);
          }
        } catch (refreshError) {
          Logger.error('Error en proceso de renovación de token', {
            error: refreshError.message,
            stack: refreshError.stack,
            url: originalRequest.url
          });
          
          // Si hay error en el proceso de renovación, manejar sesión expirada
          try {
            const sessionService = (await import('../services/sessionService.js')).default;
            await sessionService.handleSessionExpired();
          } catch (handleError) {
            Logger.error('Error manejando sesión expirada', handleError);
          }
          
          return Promise.reject(error);
        }
      }

      return Promise.reject(error);
    }
  );
};

// Inicializar cliente API al cargar el módulo
let apiClientInitialized = false;
const ensureApiClient = async () => {
  // Siempre obtener el cliente, no solo la primera vez
  // Esto asegura que siempre tengamos un cliente válido
  const client = await getApiClient();
  if (!client) {
    throw new Error('No se pudo inicializar el cliente API');
  }
  if (!apiClientInitialized) {
    apiClientInitialized = true;
  }
  return client;
};

// Servicio de Gestión Administrativa
export const gestionService = {
  
  // =====================================================
  // SERVICIOS PARA DOCTORES
  // =====================================================

  /**
   * Obtener lista completa de doctores
   * @param {string} estado - 'activos', 'inactivos', 'todos'
   * @param {string} sort - 'recent', 'oldest'
   * @param {Object} pagination - Opciones de paginación { limit, offset }
   */
  async getAllDoctores(estado = 'activos', sort = 'recent', pagination = {}, modulo = null) {
    try {
      const { limit = null, offset = null } = pagination;
      Logger.info('Obteniendo lista de doctores', { estado, sort, modulo, limit, offset });
      
      // Construir URL con parámetros
      let url = '/doctores';
      const params = new URLSearchParams();
      
      // Siempre enviar el parámetro estado, incluyendo 'todos'
      if (estado) {
        params.append('estado', estado);
      }
      if (sort) {
        params.append('sort', sort);
      }
      if (modulo != null && modulo !== '' && String(modulo).toLowerCase() !== 'todos') {
        params.append('modulo', modulo);
      }
      // Parámetros de paginación
      if (limit !== null) {
        params.append('limit', limit);
      }
      if (offset !== null) {
        params.append('offset', offset);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.get(url);
      Logger.success('Lista de doctores obtenida exitosamente', { estado, sort, limit, offset });
      
      // 🔍 CONSOLE LOG PARA DEBUG - DATOS DE GESTIÓN
      console.log('=== DATOS DE GESTIÓN (getAllDoctores) ===');
      console.log('Estado solicitado:', estado);
      console.log('Sort solicitado:', sort);
      console.log('URL:', url);
      console.log('Status:', response.status);
      console.log('Data completa:', JSON.stringify(response.data, null, 2));
      console.log('==========================================');
      
      // Log específico para debug del filtro "todos"
      if (estado === 'todos') {
        console.log('🔍 FILTRO TODOS DEBUG:');
        console.log('- Estado enviado:', estado);
        console.log('- URL final:', url);
        console.log('- Parámetros:', params.toString());
        console.log('- Cantidad de doctores recibidos:', Array.isArray(response.data) ? response.data.length : 'No es array');
        if (Array.isArray(response.data) && response.data.length > 0) {
          const activos = response.data.filter(d => d.activo === true).length;
          const inactivos = response.data.filter(d => d.activo === false).length;
          console.log('- Doctores activos:', activos);
          console.log('- Doctores inactivos:', inactivos);
        }
        console.log('==========================================');
      }
      
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo lista de doctores', error);
      throw this.handleError(error);
    }
  },

  /**
   * Obtener detalles de un doctor específico
   */
  async getDoctorById(doctorId) {
    try {
      Logger.info('Obteniendo detalles del doctor', { doctorId });
      const apiClient = await ensureApiClient();
      const response = await apiClient.get(`/doctores/${doctorId}`);
      Logger.success('Detalles del doctor obtenidos exitosamente');
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo detalles del doctor', { doctorId, error: error.message });
      throw this.handleError(error);
    }
  },

  /**
   * Crear nuevo doctor
   */
  async createDoctor(doctorData) {
    try {
      Logger.info('GestionService: Creando nuevo doctor', { 
        id_usuario: doctorData.id_usuario,
        nombre: doctorData.nombre,
        id_modulo: doctorData.id_modulo 
      });
      
      Logger.info('GestionService: Datos completos enviados', doctorData);
      
      // En desarrollo, usar endpoint público
      const endpoint = process.env.NODE_ENV === 'development' ? '/doctores/public' : '/doctores';
      Logger.info('GestionService: Usando endpoint', { endpoint });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.post(endpoint, doctorData);
      
      Logger.success('GestionService: Doctor creado exitosamente', { 
        status: response.status,
        data: response.data 
      });
      
      return response.data;
    } catch (error) {
      Logger.error('GestionService: Error creando doctor', { 
        error: error.message,
        status: error.response?.status,
        data: error.response?.data 
      });
      throw this.handleError(error);
    }
  },

  /**
   * Actualizar doctor existente
   */
  async updateDoctor(doctorId, doctorData) {
    try {
      Logger.info('Actualizando doctor', { doctorId, nombre: doctorData.nombre });
      
      // Verificar token antes de hacer la petición
      const token = await storageService.getAuthToken();
      // Log esencial: Token y request
      Logger.info('GestionService: PUT request', { 
        doctorId, 
        hasToken: !!token,
        url: `/doctores/${doctorId}`
      });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.put(`/doctores/${doctorId}`, doctorData);
      
      // Log esencial: Respuesta
      Logger.info('GestionService: Respuesta', { 
        status: response.status, 
        success: response.data?.success 
      });
      
      // Devolver estructura consistente
      return {
        success: true,
        data: response.data,
        message: 'Doctor actualizado exitosamente'
      };
    } catch (error) {
      Logger.error('Error actualizando doctor', { doctorId, error: error.message });
      throw this.handleError(error);
    }
  },

  /**
   * Eliminar doctor
   */
  async deleteDoctor(doctorId) {
    try {
      Logger.info('Eliminando doctor', { doctorId });
      const apiClient = await ensureApiClient();
      const response = await apiClient.delete(`/doctores/${doctorId}`);
      Logger.success('Doctor eliminado exitosamente');
      return response.data;
    } catch (error) {
      Logger.error('Error eliminando doctor', { doctorId, error: error.message });
      throw this.handleError(error);
    }
  },

  // =====================================================
  // SERVICIOS PARA PACIENTES
  // =====================================================

  /**
   * Obtener lista completa de pacientes
   * @param {string} estado - 'activos', 'inactivos', 'todos'
   * @param {string} sort - 'recent', 'oldest'
   * @param {string} comorbilidad - Filtro por comorbilidad
   * @param {Object} pagination - Opciones de paginación { limit, offset }
   */
  async getAllPacientes(estado = 'activos', sort = 'recent', comorbilidad = 'todas', pagination = {}, modulo = null) {
    try {
      const { limit = null, offset = null } = pagination;
      Logger.info('Obteniendo lista de pacientes', { estado, sort, comorbilidad, modulo, limit, offset });
      
      // Construir URL con parámetros
      let url = '/pacientes';
      const params = new URLSearchParams();
      
      // Siempre enviar el parámetro estado, incluyendo 'todos'
      if (estado) {
        params.append('estado', estado);
      }
      if (sort) {
        params.append('sort', sort);
      }
      if (comorbilidad && comorbilidad !== 'todas') {
        params.append('comorbilidad', comorbilidad);
      }
      if (modulo != null && modulo !== '' && String(modulo).toLowerCase() !== 'todos') {
        params.append('modulo', modulo);
      }
      // Parámetros de paginación
      if (limit !== null) {
        params.append('limit', limit);
      }
      if (offset !== null) {
        params.append('offset', offset);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.get(url);
      Logger.success('Lista de pacientes obtenida exitosamente', { estado, sort, limit, offset });
      
      // 🔍 CONSOLE LOG PARA DEBUG - DATOS DE GESTIÓN
      console.log('=== DATOS DE GESTIÓN (getAllPacientes) ===');
      console.log('Estado solicitado:', estado);
      console.log('Sort solicitado:', sort);
      console.log('Comorbilidad solicitada:', comorbilidad);
      console.log('URL:', url);
      console.log('Status:', response.status);
      console.log('Data completa:', JSON.stringify(response.data, null, 2));
      console.log('==========================================');
      
      // Log específico para debug del filtro "todos"
      if (estado === 'todos') {
        console.log('🔍 FILTRO PACIENTES TODOS DEBUG:');
        console.log('- Estado enviado:', estado);
        console.log('- URL final:', url);
        console.log('- Parámetros:', params.toString());
        console.log('- Cantidad de pacientes recibidos:', Array.isArray(response.data?.data) ? response.data.data.length : 'No es array');
        if (Array.isArray(response.data?.data) && response.data.data.length > 0) {
          const activos = response.data.data.filter(p => p.activo === true).length;
          const inactivos = response.data.data.filter(p => p.activo === false).length;
          console.log('- Pacientes activos:', activos);
          console.log('- Pacientes inactivos:', inactivos);
        }
        console.log('==========================================');
      }
      
      // Log específico para debug del filtro de comorbilidades
      if (comorbilidad && comorbilidad !== 'todas') {
        console.log('🔍 FILTRO PACIENTES COMORBILIDAD DEBUG:');
        console.log('- Comorbilidad enviada:', comorbilidad);
        console.log('- URL final:', url);
        console.log('- Parámetros:', params.toString());
        console.log('- Cantidad de pacientes recibidos:', Array.isArray(response.data?.data) ? response.data.data.length : 'No es array');
        if (Array.isArray(response.data?.data) && response.data.data.length > 0) {
          console.log('- Primeros 3 pacientes con comorbilidades:');
          response.data.data.slice(0, 3).forEach((paciente, index) => {
            const comorbilidadesNombres = paciente.comorbilidades?.map(c => c.nombre).join(', ') || 'Ninguna';
            console.log(`  ${index + 1}. ${paciente.nombre_completo} - Comorbilidades: ${comorbilidadesNombres}`);
          });
        }
        console.log('==========================================');
      }
      
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo lista de pacientes', error);
      throw this.handleError(error);
    }
  },

  /**
   * Obtener detalles de un paciente específico
   */
  async getPacienteById(pacienteId) {
    try {
      Logger.info('Obteniendo detalles del paciente', { pacienteId });
      const apiClient = await ensureApiClient();
      const response = await apiClient.get(`/pacientes/${pacienteId}`);
      Logger.info('Detalles del paciente obtenidos exitosamente', {
        pacienteId,
        hasComorbilidades: !!response.data?.comorbilidades,
        comorbilidadesCount: response.data?.comorbilidades?.length || 0
      });
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo detalles del paciente', { pacienteId, error: error.message });
      throw this.handleError(error);
    }
  },

  /**
   * Crear nuevo paciente
   */
  async createPaciente(pacienteData) {
    try {
      Logger.info('GestionService: Creando nuevo paciente', { 
        id_usuario: pacienteData.id_usuario,
        nombre: pacienteData.nombre,
        id_modulo: pacienteData.id_modulo 
      });
      
      Logger.info('GestionService: Datos recibidos', pacienteData);
      
      // En desarrollo, usar endpoint público
      const endpoint = process.env.NODE_ENV === 'development' ? '/pacientes/public' : '/pacientes';
      Logger.info('GestionService: Usando endpoint', { endpoint });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.post(endpoint, pacienteData);
      
      Logger.info('GestionService: Paciente creado exitosamente', { 
        pacienteId: response.data.data?.id_paciente,
        userId: pacienteData.id_usuario 
      });
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Paciente creado exitosamente'
      };
    } catch (error) {
      Logger.error('GestionService: Error creando paciente', error);
      return {
        success: false,
        error: error.message || 'Error al crear paciente'
      };
    }
  },

  /**
   * Actualizar paciente existente
   */
  async updatePaciente(pacienteId, pacienteData) {
    try {
      Logger.info('Actualizando paciente', { pacienteId, email: pacienteData.email });
      const apiClient = await ensureApiClient();
      const response = await apiClient.put(`/pacientes/${pacienteId}`, pacienteData);
      Logger.info('Paciente actualizado exitosamente', { pacienteId, response: response.data });
      return response.data;
    } catch (error) {
      Logger.error('Error actualizando paciente', { pacienteId, error: error.message });
      throw this.handleError(error);
    }
  },

  /**
   * Eliminar paciente
   */
  async deletePaciente(pacienteId) {
    try {
      Logger.info('Eliminando paciente', { pacienteId });
      const apiClient = await ensureApiClient();
      const response = await apiClient.delete(`/pacientes/${pacienteId}`);
      Logger.info('Paciente eliminado exitosamente', { pacienteId, response: response.data });
      return response.data;
    } catch (error) {
      Logger.error('Error eliminando paciente', { pacienteId, error: error.message });
      throw this.handleError(error);
    }
  },

  // =====================================================
  // SERVICIOS PARA DASHBOARD (REUTILIZAR EXISTENTES)
  // =====================================================

  /**
   * Obtener resumen administrativo
   */
  async getAdminSummary() {
    try {
      Logger.info('Obteniendo resumen administrativo');
      const apiClient = await ensureApiClient();
      const response = await apiClient.get('/dashboard/admin/summary');
      Logger.success('Resumen administrativo obtenido exitosamente');
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo resumen administrativo', error);
      throw this.handleError(error);
    }
  },

  /**
   * Obtener resumen del doctor
   */
  async getDoctorSummary() {
    try {
      Logger.info('Obteniendo resumen del doctor');
      const apiClient = await ensureApiClient();
      const response = await apiClient.get('/dashboard/doctor/summary');
      Logger.success('Resumen del doctor obtenido exitosamente');
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo resumen del doctor', error);
      throw this.handleError(error);
    }
  },

  /**
   * Obtener datos del paciente para doctor
   */
  async getDoctorPatientData(pacienteId) {
    try {
      Logger.info('Obteniendo datos del paciente para doctor', { pacienteId });
      const apiClient = await ensureApiClient();
      const response = await apiClient.get(`/dashboard/doctor/patient/${pacienteId}`);
      Logger.success('Datos del paciente obtenidos exitosamente');
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo datos del paciente', { pacienteId, error: error.message });
      throw this.handleError(error);
    }
  },

  // =====================================================
  // MANEJO DE ERRORES CENTRALIZADO
  // =====================================================

  handleError(error) {
    if (error.response) {
      // El servidor respondió con un estado fuera del rango 2xx
      Logger.error('Error de respuesta de API', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url
      });
      
      // El backend puede devolver 'message' o 'error' en la respuesta
      const errorMessage = error.response.data.message || error.response.data.error || 'Error del servidor';
      
      return {
        type: 'api_error',
        status: error.response.status,
        message: errorMessage,
        details: error.response.data,
      };
    } else if (error.request) {
      // La solicitud fue hecha pero no se recibió respuesta
      const baseURL = error.config?.baseURL || 'desconocida';
      const url = error.config?.url || 'desconocida';
      const fullUrl = `${baseURL}${url}`;
      
      Logger.error('Error de conexión de red', { 
        url: fullUrl,
        baseURL: baseURL,
        timeout: error.code === 'ECONNABORTED',
        code: error.code,
        message: error.message
      });
      
      // Mensaje más descriptivo
      let errorMessage = 'No se pudo conectar con el servidor.';
      if (error.code === 'ECONNABORTED') {
        errorMessage += ' La solicitud expiró.';
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage += ' Error de red.';
      } else if (baseURL.includes('localhost') || baseURL.includes('127.0.0.1')) {
        errorMessage += ' Verifica que el servidor esté corriendo y que adb reverse esté configurado.';
      } else {
        errorMessage += ' Verifica tu conexión a internet y que el servidor esté accesible.';
      }
      
      return {
        type: 'connection_error',
        message: errorMessage,
        baseURL: baseURL,
        url: fullUrl
      };
    } else {
      // Algo pasó al configurar la solicitud que provocó un error
      Logger.error('Error de configuración de solicitud', { 
        message: error.message,
        url: error.config?.url
      });
      
      return {
        type: 'request_error',
        message: error.message,
      };
    }
  },

  // Nuevo método para obtener dashboard completo del doctor
  async getDoctorDashboard(doctorId) {
    try {
      const apiClient = await ensureApiClient();
      const response = await apiClient.get(`/doctores/${doctorId}/dashboard`);
      
      // 🔍 CONSOLE LOG PARA DEBUG - DASHBOARD DEL DOCTOR
      console.log('=== DASHBOARD DEL DOCTOR ===');
      console.log('Doctor ID:', doctorId);
      console.log('Status:', response.status);
      console.log('Data completa:', JSON.stringify(response.data, null, 2));
      console.log('============================');
      
      return response.data;
    } catch (error) {
      Logger.error('Error al obtener dashboard del doctor', error);
      throw error;
    }
  },

  // ✅ Refactorizado: Métodos CRUD de módulos (ver inicialización al final del archivo)

  // =====================================================
  // MÉTODOS PARA COMORBILIDADES
  // =====================================================

  // ✅ Refactorizado: Métodos CRUD de comorbilidades (ver inicialización al final del archivo)

  // =====================================================
  // MÉTODOS PARA VACUNAS (CATÁLOGO)
  // =====================================================

  // ✅ Refactorizado: Métodos CRUD de vacunas (ver inicialización al final del archivo)

  // =====================================================
  // MÉTODOS PARA GESTIÓN DE USUARIOS
  // =====================================================

  // Método para obtener todos los usuarios
  async getUsuarios(filters = {}) {
    try {
      Logger.info('GestionService: Obteniendo usuarios', { filters });
      
      const queryParams = new URLSearchParams();
      if (filters.includeInactive) queryParams.append('includeInactive', filters.includeInactive);
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.get(`/auth/usuarios?${queryParams.toString()}`);
      
      // El backend devuelve: { todos_usuarios: [...], ... }
      let usuariosArray = [];
      if (response.data?.todos_usuarios) {
        usuariosArray = response.data.todos_usuarios;
      } else if (Array.isArray(response.data)) {
        usuariosArray = response.data;
      }
      
      Logger.success('GestionService: Usuarios obtenidos exitosamente', { 
        count: usuariosArray.length 
      });
      
      return usuariosArray;
    } catch (error) {
      Logger.error('GestionService: Error obteniendo usuarios', error);
      throw this.handleError(error);
    }
  },

  // Método para obtener un usuario por ID
  async getUsuarioById(usuarioId) {
    try {
      Logger.info('GestionService: Obteniendo usuario por ID', { usuarioId });
      const apiClient = await ensureApiClient();
      const response = await apiClient.get(`/auth/usuarios/${usuarioId}`);
      Logger.success('GestionService: Usuario obtenido exitosamente');
      return response.data.usuario || response.data;
    } catch (error) {
      Logger.error('GestionService: Error obteniendo usuario por ID', error);
      throw this.handleError(error);
    }
  },

  // Método para crear usuario
  async createUsuario(usuarioData) {
    try {
      Logger.info('GestionService: Creando usuario', { email: usuarioData.email });
      const apiClient = await ensureApiClient();
      const response = await apiClient.post('/auth/usuarios', usuarioData);
      Logger.success('GestionService: Usuario creado exitosamente');
      return response.data;
    } catch (error) {
      Logger.error('GestionService: Error creando usuario', error);
      throw this.handleError(error);
    }
  },

  // Método para actualizar usuario
  async updateUsuario(usuarioId, usuarioData) {
    try {
      Logger.info('GestionService: Actualizando usuario', { usuarioId });
      const apiClient = await ensureApiClient();
      const response = await apiClient.put(`/auth/usuarios/${usuarioId}`, usuarioData);
      Logger.success('GestionService: Usuario actualizado exitosamente');
      return response.data;
    } catch (error) {
      Logger.error('GestionService: Error actualizando usuario', error);
      throw this.handleError(error);
    }
  },

  // Método para eliminar/desactivar usuario
  async deleteUsuario(usuarioId) {
    try {
      Logger.info('GestionService: Eliminando usuario', { usuarioId });
      const apiClient = await ensureApiClient();
      const response = await apiClient.delete(`/auth/usuarios/${usuarioId}`);
      Logger.success('GestionService: Usuario eliminado/desactivado exitosamente');
      return response.data;
    } catch (error) {
      Logger.error('GestionService: Error eliminando usuario', error);
      throw this.handleError(error);
    }
  },

  // Método para reactivar doctor
  async reactivateDoctor(doctorId) {
    try {
      Logger.info('GestionService: Reactivando doctor', { doctorId });
      const apiClient = await ensureApiClient();
      const response = await apiClient.post(`/doctores/${doctorId}/reactivar`);
      
      Logger.success('GestionService: Doctor reactivado exitosamente', { 
        doctorId,
        message: response.data.message 
      });
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Doctor reactivado exitosamente'
      };
    } catch (error) {
      Logger.error('GestionService: Error reactivando doctor', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Error al reactivar doctor'
      };
    }
  },

  // Método para eliminar doctor permanentemente
  async hardDeleteDoctor(doctorId) {
    try {
      Logger.info('GestionService: Eliminando doctor permanentemente', { doctorId });
      const apiClient = await ensureApiClient();
      const response = await apiClient.delete(`/doctores/${doctorId}/permanente`);
      
      Logger.success('GestionService: Doctor eliminado permanentemente', { 
        doctorId,
        message: response.data.message 
      });
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Doctor eliminado permanentemente'
      };
    } catch (error) {
      Logger.error('GestionService: Error eliminando doctor permanentemente', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Error al eliminar doctor permanentemente'
      };
    }
  },

  // Método para crear cita
  async createCita(citaData) {
    try {
      // Asegurar que los tipos de datos sean correctos antes de enviar
      const sanitizedData = {
        ...citaData,
        id_paciente: Number(citaData.id_paciente),
        id_doctor: citaData.id_doctor ? Number(citaData.id_doctor) : null,
        es_primera_consulta: Boolean(citaData.es_primera_consulta)
      };

      Logger.info('GestionService: Creando cita médica', {
        pacienteId: sanitizedData.id_paciente,
        doctorId: sanitizedData.id_doctor,
        tipos: {
          id_paciente: typeof sanitizedData.id_paciente,
          id_doctor: typeof sanitizedData.id_doctor
        }
      });

      const apiClient = await ensureApiClient();
      const response = await apiClient.post('/citas', sanitizedData);

      Logger.success('GestionService: Cita creada exitosamente', {
        citaId: response.data?.id_cita
      });

      return {
        success: true,
        data: response.data,
        message: 'Cita creada exitosamente'
      };
    } catch (error) {
      Logger.error('GestionService: Error creando cita', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        requestData: sanitizedData
      });
      
      // Extraer mensaje de error del backend si está disponible
      let errorMessage = 'Error al crear cita';
      if (error.response?.data) {
        if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: errorMessage,
        details: error.response?.data?.details || null
      };
    }
  },

  // Obtener detalle de una cita por ID (incluye SignosVitales del backend)
  async getCitaById(citaId) {
    try {
      Logger.info('Obteniendo detalle de cita', { citaId });
      const apiClient = await ensureApiClient();
      const response = await apiClient.get(`/citas/${citaId}`);
      Logger.success('Detalle de cita obtenido');
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo detalle de cita', { citaId, error: error.message });
      throw this.handleError(error);
    }
  },

  // ✅ NUEVO: Crear consulta completa (cita nueva + datos médicos) o completar cita existente
  async createConsultaCompleta(pacienteId, consultaData) {
    try {
      Logger.info('Creando consulta completa', { 
        pacienteId, 
        modo: consultaData.cita?.id_cita ? 'completar_existente' : 'crear_nueva'
      });

      const apiClient = await ensureApiClient();
      const response = await apiClient.post('/citas/consulta-completa', {
        ...consultaData,
        cita: {
          ...consultaData.cita,
          id_paciente: pacienteId
        }
      });

      Logger.success('Consulta completa creada exitosamente', {
        id_cita: response.data?.id_cita,
        modo: response.data?.modo
      });

      return {
        success: true,
        data: response.data,
        message: response.data?.message || 'Consulta completa creada exitosamente'
      };
    } catch (error) {
      Logger.error('Error creando consulta completa', error);
      throw this.handleError(error);
    }
  },

  // ✅ NUEVO: Completar cita usando wizard paso a paso (guardado progresivo)
  async completarCitaWizard(citaId, wizardData) {
    try {
      Logger.info('Completando cita con wizard', { 
        citaId, 
        paso: wizardData.paso
      });

      const apiClient = await ensureApiClient();
      const response = await apiClient.post(`/citas/${citaId}/completar-wizard`, wizardData);

      Logger.success('Paso del wizard guardado exitosamente', {
        paso: wizardData.paso,
        id_cita: response.data?.data?.id_cita
      });

      return {
        success: true,
        data: response.data?.data || response.data,
        message: response.data?.message || `Paso "${wizardData.paso}" guardado correctamente`
      };
    } catch (error) {
      Logger.error('Error completando cita con wizard', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Error al completar el paso del wizard'
      };
    }
  },


  // Método para crear primera consulta completa
  async createPrimeraConsulta(primeraConsultaData) {
    try {
      Logger.info('GestionService: Creando primera consulta completa', {
        pacienteId: primeraConsultaData.id_paciente,
        doctorId: primeraConsultaData.id_doctor
      });

      const apiClient = await ensureApiClient();
      const response = await apiClient.post('/citas/primera-consulta', primeraConsultaData);

      Logger.success('GestionService: Primera consulta creada exitosamente', {
        citaId: response.data?.id_cita
      });

      return {
        success: true,
        data: { id_cita: response.data.id_cita },
        message: response.data.message || 'Primera consulta creada exitosamente'
      };
    } catch (error) {
      Logger.error('GestionService: Error creando primera consulta', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Error al crear primera consulta'
      };
    }
  },

  // =====================================================
  // MÉTODOS PARA GESTIÓN DE ESTADOS Y REPROGRAMACIÓN
  // =====================================================

  // Actualizar estado de una cita (Doctor/Admin)
  async updateEstadoCita(citaId, estado) {
    try {
      Logger.info('GestionService: Actualizando estado de cita', { citaId, estado });
      const apiClient = await ensureApiClient();
      const response = await apiClient.put(`/citas/${citaId}/estado`, { estado });
      Logger.success('GestionService: Estado de cita actualizado exitosamente');
      return {
        success: true,
        data: response.data?.data,
        message: response.data?.message || 'Estado actualizado exitosamente'
      };
    } catch (error) {
      Logger.error('GestionService: Error actualizando estado de cita', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Error al actualizar estado'
      };
    }
  },

  // Reprogramar cita directamente (Doctor/Admin)
  async reprogramarCita(citaId, fechaReprogramada, motivoReprogramacion = '') {
    try {
      Logger.info('GestionService: Reprogramando cita', { citaId, fechaReprogramada });
      const apiClient = await ensureApiClient();
      const response = await apiClient.put(`/citas/${citaId}/reprogramar`, {
        fecha_reprogramada: fechaReprogramada,
        motivo_reprogramacion: motivoReprogramacion
      });
      Logger.success('GestionService: Cita reprogramada exitosamente');
      return {
        success: true,
        data: response.data?.data,
        message: response.data?.message || 'Cita reprogramada exitosamente'
      };
    } catch (error) {
      Logger.error('GestionService: Error reprogramando cita', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Error al reprogramar cita'
      };
    }
  },

  // Solicitar reprogramación (Paciente)
  // Los pacientes NO pueden elegir fecha, solo enviar solicitud
  // El doctor/admin decidirá la nueva fecha al aprobar
  async solicitarReprogramacion(citaId, motivo, fechaSolicitada = null) {
    try {
      Logger.info('GestionService: Solicitando reprogramación', { citaId, motivo });
      const apiClient = await ensureApiClient();
      const response = await apiClient.post(`/citas/${citaId}/solicitar-reprogramacion`, {
        motivo
        // fecha_solicitada no se envía - los pacientes no pueden elegir fecha
      });
      Logger.success('GestionService: Solicitud de reprogramación enviada exitosamente');
      return {
        success: true,
        data: response.data?.data,
        message: response.data?.message || 'Solicitud enviada exitosamente'
      };
    } catch (error) {
      Logger.error('GestionService: Error solicitando reprogramación', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Error al enviar solicitud'
      };
    }
  },

  // Obtener solicitudes de reprogramación de un paciente
  async getSolicitudesReprogramacion(pacienteId) {
    try {
      Logger.info('GestionService: Obteniendo solicitudes de reprogramación', { pacienteId });
      const apiClient = await ensureApiClient();
      const response = await apiClient.get(`/pacientes/${pacienteId}/solicitudes-reprogramacion`);
      Logger.success('GestionService: Solicitudes obtenidas exitosamente');
      
      // El backend devuelve: { success: true, data: { solicitudes: [...] } }
      // Necesitamos extraer el array de solicitudes
      let solicitudes = [];
      if (response.data?.data?.solicitudes) {
        solicitudes = Array.isArray(response.data.data.solicitudes) ? response.data.data.solicitudes : [];
      } else if (response.data?.solicitudes) {
        solicitudes = Array.isArray(response.data.solicitudes) ? response.data.solicitudes : [];
      } else if (Array.isArray(response.data?.data)) {
        solicitudes = response.data.data;
      } else if (Array.isArray(response.data)) {
        solicitudes = response.data;
      }
      
      return {
        success: true,
        data: solicitudes,
        total: solicitudes.length
      };
    } catch (error) {
      Logger.error('GestionService: Error obteniendo solicitudes', error);
      return {
        success: false,
        data: [],
        error: error.response?.data?.error || error.message || 'Error al obtener solicitudes'
      };
    }
  },

  // Obtener todas las solicitudes de reprogramación (Admin/Doctor)
  async getAllSolicitudesReprogramacion(estado = null, paciente = null, doctor = null) {
    try {
      Logger.info('GestionService: Obteniendo todas las solicitudes de reprogramación', { estado, paciente, doctor });
      const apiClient = await ensureApiClient();
      const params = new URLSearchParams();
      if (estado) params.append('estado', estado);
      if (paciente) params.append('paciente', paciente);
      if (doctor) params.append('doctor', doctor);
      
      const queryString = params.toString();
      const url = `/citas/solicitudes-reprogramacion${queryString ? `?${queryString}` : ''}`;
      const response = await apiClient.get(url);
      Logger.success('GestionService: Todas las solicitudes obtenidas exitosamente');
      return {
        success: true,
        data: response.data?.data?.solicitudes || response.data?.solicitudes || [],
        total: response.data?.data?.total || response.data?.total || 0
      };
    } catch (error) {
      Logger.error('GestionService: Error obteniendo todas las solicitudes', error);
      return {
        success: false,
        data: [],
        total: 0,
        error: error.response?.data?.error || error.message || 'Error al obtener solicitudes'
      };
    }
  },

  // Responder solicitud de reprogramación (Doctor/Admin)
  async responderSolicitudReprogramacion(citaId, solicitudId, accion, respuestaDoctor = null, fechaReprogramada = null) {
    try {
      Logger.info('GestionService: Respondiendo solicitud de reprogramación', { 
        citaId, 
        solicitudId, 
        accion 
      });
      const apiClient = await ensureApiClient();
      const body = {
        accion, // 'aprobar' o 'rechazar'
        respuesta_doctor: respuestaDoctor,
        fecha_reprogramada: fechaReprogramada
      };
      const response = await apiClient.put(
        `/citas/${citaId}/solicitud-reprogramacion/${solicitudId}`,
        body
      );
      Logger.success('GestionService: Respuesta enviada exitosamente');
      return {
        success: true,
        data: response.data?.data,
        message: response.data?.message || 'Respuesta enviada exitosamente'
      };
    } catch (error) {
      Logger.error('GestionService: Error respondiendo solicitud', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Error al responder solicitud'
      };
    }
  },

  // Cancelar solicitud de reprogramación (Paciente)
  async cancelarSolicitudReprogramacion(citaId, solicitudId) {
    try {
      Logger.info('GestionService: Cancelando solicitud de reprogramación', { citaId, solicitudId });
      const apiClient = await ensureApiClient();
      const response = await apiClient.delete(
        `/citas/${citaId}/solicitud-reprogramacion/${solicitudId}`
      );
      Logger.success('GestionService: Solicitud cancelada exitosamente');
      return {
        success: true,
        data: response.data?.data,
        message: response.data?.message || 'Solicitud cancelada exitosamente'
      };
    } catch (error) {
      Logger.error('GestionService: Error cancelando solicitud', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Error al cancelar solicitud'
      };
    }
  },

  // Método para crear paciente completo
  async createPacienteCompleto(pacienteData) {
    try {
      Logger.info('GestionService: Creando paciente completo', {
        nombre: pacienteData.nombre,
        pin: pacienteData.pin ? '***' : 'no PIN'
      });

      const apiClient = await ensureApiClient();
      const response = await apiClient.post('/pacientes/completo', pacienteData);

      Logger.success('GestionService: Paciente completo creado exitosamente', {
        pacienteId: response.data?.data?.id_paciente
      });

      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Paciente creado exitosamente'
      };
    } catch (error) {
      Logger.error('GestionService: Error creando paciente completo', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Error al crear paciente'
      };
    }
  },

  // Método para cambiar contraseña de doctor (solo Admin)
  async changeDoctorPassword(email, newPassword) {
    try {
      Logger.info('Cambiando contraseña del doctor (admin)', { email });
      
      const apiClient = await ensureApiClient();
      // Usar el nuevo endpoint para admin (sin requerir contraseña actual)
      const response = await apiClient.put('/auth/admin/change-password', {
        email: email,
        newPassword: newPassword
      });
      
      Logger.success('Contraseña del doctor cambiada exitosamente', { email });
      return response.data;
    } catch (error) {
      Logger.error('Error cambiando contraseña del doctor', error);
      throw this.handleError(error);
    }
  },

  // =====================================================
  // MÉTODOS DE ASIGNACIÓN DE PACIENTES A DOCTORES
  // =====================================================

  // Asignar paciente a doctor
  async assignPatientToDoctor(doctorId, patientId, observaciones = '') {
    try {
      Logger.info('Asignando paciente a doctor', { 
        doctorId, 
        patientId, 
        observaciones: observaciones ? 'con observaciones' : 'sin observaciones'
      });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.post(`/doctores/${doctorId}/assign-patient`, {
        id_paciente: patientId,
        observaciones: observaciones
      });
      
      Logger.success('Paciente asignado exitosamente', { 
        doctorId, 
        patientId,
        fechaAsignacion: response.data?.data?.fecha_asignacion
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error asignando paciente a doctor', error);
      throw this.handleError(error);
    }
  },

  // Desasignar paciente de doctor
  async unassignPatientFromDoctor(doctorId, patientId) {
    try {
      Logger.info('Desasignando paciente de doctor', { doctorId, patientId });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.delete(`/doctores/${doctorId}/assign-patient/${patientId}`);
      
      Logger.success('Paciente desasignado exitosamente', { doctorId, patientId });
      return response.data;
    } catch (error) {
      Logger.error('Error desasignando paciente de doctor', error);
      throw this.handleError(error);
    }
  },

  // =====================================================
  // MÉTODOS DE GESTIÓN DE DOCTORES DESDE PERSPECTIVA PACIENTE
  // =====================================================

  /**
   * Obtener todos los doctores asignados a un paciente
   * GET /pacientes/:id/doctores
   */
  async getPacienteDoctores(pacienteId) {
    try {
      Logger.info('Obteniendo doctores del paciente', { pacienteId });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.get(`/pacientes/${pacienteId}/doctores`);
      
      Logger.success('Doctores del paciente obtenidos exitosamente', { 
        pacienteId,
        total: response.data?.total || 0
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo doctores del paciente', error);
      throw this.handleError(error);
    }
  },

  /**
   * Asignar un doctor a un paciente
   * POST /pacientes/:id/doctores
   */
  async assignDoctorToPaciente(pacienteId, doctorId, observaciones = '') {
    try {
      Logger.info('Asignando doctor al paciente', { 
        pacienteId, 
        doctorId, 
        observaciones: observaciones ? 'con observaciones' : 'sin observaciones'
      });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.post(`/pacientes/${pacienteId}/doctores`, {
        id_doctor: doctorId,
        observaciones: observaciones
      });
      
      Logger.success('Doctor asignado al paciente exitosamente', { 
        pacienteId, 
        doctorId,
        fechaAsignacion: response.data?.data?.fecha_asignacion
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error asignando doctor al paciente', error);
      throw this.handleError(error);
    }
  },

  /**
   * Desasignar un doctor de un paciente
   * DELETE /pacientes/:id/doctores/:doctorId
   */
  async unassignDoctorFromPaciente(pacienteId, doctorId) {
    try {
      Logger.info('Desasignando doctor del paciente', { pacienteId, doctorId });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.delete(`/pacientes/${pacienteId}/doctores/${doctorId}`);
      
      Logger.success('Doctor desasignado del paciente exitosamente', { pacienteId, doctorId });
      return response.data;
    } catch (error) {
      Logger.error('Error desasignando doctor del paciente', error);
      throw this.handleError(error);
    }
  },

  /**
   * Reemplazar un doctor por otro en un paciente
   * PUT /pacientes/:id/doctores/:doctorIdAntiguo
   */
  async replacePacienteDoctor(pacienteId, doctorIdAntiguo, doctorIdNuevo, observaciones = '') {
    try {
      Logger.info('Reemplazando doctor del paciente', { 
        pacienteId, 
        doctorIdAntiguo, 
        doctorIdNuevo,
        observaciones: observaciones ? 'con observaciones' : 'sin observaciones'
      });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.put(
        `/pacientes/${pacienteId}/doctores/${doctorIdAntiguo}`,
        {
          id_doctor_nuevo: doctorIdNuevo,
          observaciones: observaciones
        }
      );
      
      Logger.success('Doctor reemplazado exitosamente', { 
        pacienteId, 
        doctorIdAntiguo, 
        doctorIdNuevo,
        fechaAsignacion: response.data?.data?.fecha_asignacion
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error reemplazando doctor del paciente', error);
      throw this.handleError(error);
    }
  },

  // =====================================================
  // MÉTODOS PARA DATOS MÉDICOS DE PACIENTES
  // =====================================================

  // Obtener citas de un paciente específico
  async getPacienteCitas(pacienteId, options = {}) {
    try {
      const { limit = 10, offset = 0, sort = 'DESC' } = options;
      
      Logger.info('Obteniendo citas del paciente', { 
        pacienteId, 
        limit, 
        offset, 
        sort 
      });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.get(`/pacientes/${pacienteId}/citas`, {
        params: { limit, offset, sort }
      });
      
      Logger.success('Citas del paciente obtenidas', { 
        pacienteId, 
        total: response.data?.total || 0,
        returned: response.data?.data?.length || 0
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo citas del paciente', error);
      throw this.handleError(error);
    }
  },

  // Obtener signos vitales de un paciente específico
  async getPacienteSignosVitales(pacienteId, options = {}) {
    try {
      const { limit = 10, offset = 0, sort = 'DESC', fechaInicio, fechaFin } = options;
      
      Logger.info('Obteniendo signos vitales del paciente', { 
        pacienteId, 
        limit, 
        offset, 
        sort,
        fechaInicio: fechaInicio || null,
        fechaFin: fechaFin || null
      });
      
      const apiClient = await ensureApiClient();
      const params = { limit, offset, sort };
      if (fechaInicio) params.fechaInicio = fechaInicio;
      if (fechaFin) params.fechaFin = fechaFin;
      const response = await apiClient.get(`/pacientes/${pacienteId}/signos-vitales`, {
        params
      });
      
      Logger.success('Signos vitales del paciente obtenidos', { 
        pacienteId, 
        total: response.data?.total || 0,
        returned: response.data?.data?.length || 0
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo signos vitales del paciente', error);
      throw this.handleError(error);
    }
  },

  /**
   * Obtiene TODOS los signos vitales de un paciente (monitoreo continuo + consultas)
   * con paginación automática para asegurar evolución completa
   * @param {number} pacienteId - ID del paciente
   * @param {object} options - Opciones de consulta
   * @param {string} options.sort - Ordenamiento ('ASC' para evolución cronológica, 'DESC' para más recientes primero)
   * @param {number} options.batchSize - Tamaño de lote para paginación (default: 500)
   * @returns {Promise<Array>} Array con todos los signos vitales ordenados
   */
  async getAllPacienteSignosVitales(pacienteId, options = {}) {
    try {
      const { sort = 'ASC', batchSize = 500 } = options;
      
      Logger.info('Obteniendo TODOS los signos vitales del paciente (evolución completa)', { 
        pacienteId, 
        sort,
        batchSize
      });
      
      const apiClient = await ensureApiClient();
      let allSignosVitales = [];
      let offset = 0;
      let hasMore = true;
      let totalRecords = 0;

      // Paginación automática para obtener todos los registros
      while (hasMore) {
        const response = await apiClient.get(`/pacientes/${pacienteId}/signos-vitales`, {
          params: { 
            limit: batchSize, 
            offset, 
            sort 
          }
        });

        const responseData = response.data;
        const signosData = Array.isArray(responseData.data) 
          ? responseData.data 
          : (responseData.data?.data || []);
        
        allSignosVitales = allSignosVitales.concat(signosData);
        totalRecords = responseData.total || 0;
        
        // Verificar si hay más registros
        hasMore = allSignosVitales.length < totalRecords;
        offset += batchSize;

        Logger.debug(`Obtenidos ${allSignosVitales.length} de ${totalRecords} signos vitales`, {
          pacienteId,
          batch: Math.floor(offset / batchSize)
        });
      }

      Logger.success('Todos los signos vitales obtenidos exitosamente', { 
        pacienteId, 
        total: allSignosVitales.length,
        sort
      });
      
      return {
        data: allSignosVitales,
        total: allSignosVitales.length
      };
    } catch (error) {
      Logger.error('Error obteniendo todos los signos vitales del paciente', error);
      throw this.handleError(error);
    }
  },

  // Crear signos vitales para un paciente específico
  async createPacienteSignosVitales(pacienteId, signosVitalesData) {
    try {
      Logger.info('Creando signos vitales para el paciente', { 
        pacienteId, 
        datos: Object.keys(signosVitalesData)
      });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.post(
        `/pacientes/${pacienteId}/signos-vitales`, 
        signosVitalesData
      );
      
      Logger.success('Signos vitales creados exitosamente', { 
        pacienteId, 
        id_signo: response.data?.data?.id_signo
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error creando signos vitales del paciente', error);
      throw this.handleError(error);
    }
  },

  // Obtener diagnósticos de un paciente específico
  async getPacienteDiagnosticos(pacienteId, options = {}) {
    try {
      const { limit = 10, offset = 0, sort = 'DESC' } = options;
      
      Logger.info('Obteniendo diagnósticos del paciente', { 
        pacienteId, 
        limit, 
        offset, 
        sort 
      });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.get(`/pacientes/${pacienteId}/diagnosticos`, {
        params: { limit, offset, sort }
      });
      
      Logger.success('Diagnósticos del paciente obtenidos', { 
        pacienteId, 
        total: response.data?.total || 0,
        returned: response.data?.data?.length || 0
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo diagnósticos del paciente', error);
      throw this.handleError(error);
    }
  },

  // Registrar toma de medicamento
  async registrarTomaMedicamento(idPlanMedicacion, idPlanDetalle = null, horaToma = null, observaciones = null) {
    try {
      await ensureApiClient();
      const apiClient = await getApiClient();
      
      Logger.info('Registrando toma de medicamento', { 
        id_plan_medicacion: idPlanMedicacion,
        id_plan_detalle: idPlanDetalle 
      });
      
      const response = await apiClient.post('/medicamentos-toma', {
        id_plan_medicacion: idPlanMedicacion,
        id_plan_detalle: idPlanDetalle,
        hora_toma: horaToma,
        observaciones: observaciones,
      });
      
      return response.data?.data;
    } catch (error) {
      Logger.error('Error registrando toma de medicamento:', error);
      throw handleError(error);
    }
  },

  // Obtener tomas de medicamento de un paciente
  async getTomasMedicamento(pacienteId, options = {}) {
    try {
      await ensureApiClient();
      const apiClient = await getApiClient();
      
      const queryParams = new URLSearchParams();
      if (options.fechaInicio) queryParams.append('fechaInicio', options.fechaInicio);
      if (options.fechaFin) queryParams.append('fechaFin', options.fechaFin);
      if (options.idPlan) queryParams.append('idPlan', options.idPlan);
      
      const url = `/medicamentos-toma/paciente/${pacienteId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get(url);
      
      return response.data?.data || [];
    } catch (error) {
      Logger.error('Error obteniendo tomas de medicamento:', error);
      throw handleError(error);
    }
  },

  // Obtener medicamentos de un paciente específico
  async getPacienteMedicamentos(pacienteId, options = {}) {
    try {
      const { limit = 10, offset = 0, sort = 'DESC' } = options;
      
      Logger.info('Obteniendo medicamentos del paciente', { 
        pacienteId, 
        limit, 
        offset, 
        sort 
      });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.get(`/pacientes/${pacienteId}/medicamentos`, {
        params: { limit, offset, sort }
      });
      
      Logger.success('Medicamentos del paciente obtenidos', { 
        pacienteId, 
        total: response.data?.total || 0,
        returned: response.data?.data?.length || 0
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo medicamentos del paciente', error);
      throw this.handleError(error);
    }
  },

  // Obtener resumen médico completo de un paciente
  async getPacienteResumenMedico(pacienteId) {
    try {
      Logger.info('Obteniendo resumen médico del paciente', { pacienteId });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.get(`/pacientes/${pacienteId}/resumen-medico`);
      
      Logger.success('Resumen médico del paciente obtenido', { 
        pacienteId,
        citas: response.data?.data?.resumen?.total_citas || 0,
        signosVitales: response.data?.data?.resumen?.total_signos_vitales || 0,
        diagnosticos: response.data?.data?.resumen?.total_diagnosticos || 0,
        medicamentos: response.data?.data?.resumen?.total_medicamentos || 0
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo resumen médico del paciente', error);
      throw this.handleError(error);
    }
  },

  // Obtener pacientes disponibles para asignar a un doctor
  async getAvailablePatients(doctorId) {
    try {
      Logger.info('Obteniendo pacientes disponibles', { doctorId });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.get(`/doctores/${doctorId}/available-patients`);
      
      Logger.success('Pacientes disponibles obtenidos', { 
        doctorId,
        total: response.data?.data?.length || 0
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo pacientes disponibles', error);
      throw this.handleError(error);
    }
  },

  // Crear diagnóstico para un paciente específico
  async createPacienteDiagnostico(pacienteId, diagnosticoData) {
    try {
      Logger.info('Creando diagnóstico para el paciente', { 
        pacienteId, 
        datos: Object.keys(diagnosticoData)
      });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.post(
        `/pacientes/${pacienteId}/diagnosticos`, 
        diagnosticoData
      );
      
      Logger.success('Diagnóstico creado exitosamente', { 
        pacienteId, 
        id_diagnostico: response.data?.data?.id_diagnostico
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error creando diagnóstico del paciente', error);
      throw this.handleError(error);
    }
  },

  // Obtener lista de medicamentos disponibles
  async getMedicamentos() {
    try {
      Logger.info('Obteniendo lista de medicamentos');
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.get('/medicamentos');
      
      // Debug: Ver estructura de la respuesta
      Logger.debug('Respuesta completa de medicamentos:', { 
        keys: Object.keys(response.data),
        hasData: !!response.data.data,
        isArray: Array.isArray(response.data),
        structure: response.data
      });
      
      let medicamentosArray = [];
      
      // Manejar ambos formatos: nuevo (estructurado) y antiguo (array simple)
      if (response.data?.data?.medicamentos && Array.isArray(response.data.data.medicamentos)) {
        // Nuevo formato: { success, data: { medicamentos: [...], total, limit, offset } }
        medicamentosArray = response.data.data.medicamentos;
      } else if (Array.isArray(response.data)) {
        // Formato antiguo: array directo
        medicamentosArray = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        // Alternativo: { success, data: [...] }
        medicamentosArray = response.data.data;
      } else {
        // Formato desconocido, retornar array vacío
        Logger.warn('Formato de respuesta de medicamentos no reconocido', { 
          data: response.data,
          type: typeof response.data
        });
        medicamentosArray = [];
      }
      
      Logger.info('Medicamentos extraídos exitosamente', { 
        total: medicamentosArray.length 
      });
      
      // Asegurar que siempre retornamos un array
      return Array.isArray(medicamentosArray) ? medicamentosArray : [];
    } catch (error) {
      Logger.error('Error obteniendo medicamentos', error);
      // En caso de error, retornar array vacío para evitar crashes
      return [];
    }
  },

  // Crear plan de medicación para un paciente específico
  async createPacientePlanMedicacion(pacienteId, planMedicacionData) {
    try {
      Logger.info('Creando plan de medicación para el paciente', { 
        pacienteId, 
        totalMedicamentos: planMedicacionData.medicamentos?.length || 0
      });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.post(
        `/pacientes/${pacienteId}/planes-medicacion`, 
        planMedicacionData
      );
      
      Logger.success('Plan de medicación creado exitosamente', { 
        pacienteId, 
        id_plan: response.data?.data?.id_plan
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error creando plan de medicación del paciente', error);
      throw this.handleError(error);
    }
  },

  // Red de Apoyo
  async getPacienteRedApoyo(pacienteId) {
    try {
      Logger.info('Obteniendo red de apoyo del paciente', { pacienteId });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.get(`/pacientes/${pacienteId}/red-apoyo`);
      
      Logger.info('Red de apoyo obtenida', { 
        pacienteId, 
        total: response.data?.data?.length || 0
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo red de apoyo del paciente', error);
      throw this.handleError(error);
    }
  },

  async createPacienteRedApoyo(pacienteId, redApoyoData) {
    try {
      Logger.info('Creando contacto de red de apoyo', { 
        pacienteId, 
        nombre_contacto: redApoyoData.nombre_contacto
      });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.post(
        `/pacientes/${pacienteId}/red-apoyo`, 
        redApoyoData
      );
      
      Logger.info('Contacto de red de apoyo creado exitosamente', { 
        pacienteId, 
        id_red_apoyo: response.data?.data?.id_red_apoyo
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error creando contacto de red de apoyo', error);
      throw this.handleError(error);
    }
  },

  // Esquema de Vacunación
  async getPacienteEsquemaVacunacion(pacienteId) {
    try {
      Logger.info('Obteniendo esquema de vacunación del paciente', { pacienteId });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.get(`/pacientes/${pacienteId}/esquema-vacunacion`);
      
      Logger.info('Esquema de vacunación obtenido', { 
        pacienteId, 
        total: response.data?.data?.length || 0
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo esquema de vacunación del paciente', error);
      throw this.handleError(error);
    }
  },

  async createPacienteEsquemaVacunacion(pacienteId, vacunacionData) {
    try {
      Logger.info('Creando registro de vacunación', { 
        pacienteId, 
        vacuna: vacunacionData.vacuna
      });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.post(
        `/pacientes/${pacienteId}/esquema-vacunacion`, 
        vacunacionData
      );
      
      Logger.info('Registro de vacunación creado exitosamente', { 
        pacienteId, 
        id_esquema: response.data?.data?.id_esquema
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error creando registro de vacunación', error);
      throw this.handleError(error);
    }
  },

  // =====================================================
  // SERVICIOS PARA SESIONES EDUCATIVAS
  // =====================================================

  /**
   * Obtener sesiones educativas de un paciente
   */
  async getPacienteSesionesEducativas(pacienteId, options = {}) {
    try {
      const { limit = 10, offset = 0, sort = 'DESC' } = options;
      Logger.info('Obteniendo sesiones educativas del paciente', { pacienteId, limit, offset, sort });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.get(`/pacientes/${pacienteId}/sesiones-educativas`, {
        params: { limit, offset, sort }
      });
      
      Logger.success('Sesiones educativas obtenidas', { 
        pacienteId,
        count: response.data?.data?.length || 0
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo sesiones educativas del paciente', error);
      throw this.handleError(error);
    }
  },

  /**
   * Crear sesión educativa para un paciente
   */
  async createPacienteSesionEducativa(pacienteId, sesionData) {
    try {
      Logger.info('Creando sesión educativa', { 
        pacienteId, 
        tipo_sesion: sesionData.tipo_sesion
      });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.post(
        `/pacientes/${pacienteId}/sesiones-educativas`, 
        sesionData
      );
      
      Logger.success('Sesión educativa creada exitosamente', { 
        pacienteId, 
        id_sesion: response.data?.data?.id_sesion
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error creando sesión educativa', error);
      throw this.handleError(error);
    }
  },

  /**
   * Actualizar sesión educativa
   */
  async updatePacienteSesionEducativa(pacienteId, sesionId, sesionData) {
    try {
      Logger.info('Actualizando sesión educativa', { 
        pacienteId, 
        sesionId
      });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.put(
        `/pacientes/${pacienteId}/sesiones-educativas/${sesionId}`, 
        sesionData
      );
      
      Logger.success('Sesión educativa actualizada exitosamente', { 
        pacienteId, 
        sesionId
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error actualizando sesión educativa', error);
      throw this.handleError(error);
    }
  },

  /**
   * Eliminar sesión educativa
   */
  async deletePacienteSesionEducativa(pacienteId, sesionId) {
    try {
      Logger.info('Eliminando sesión educativa', { 
        pacienteId, 
        sesionId
      });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.delete(
        `/pacientes/${pacienteId}/sesiones-educativas/${sesionId}`
      );
      
      Logger.success('Sesión educativa eliminada exitosamente', { 
        pacienteId, 
        sesionId
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error eliminando sesión educativa', error);
      throw this.handleError(error);
    }
  },

  // =====================================================
  // SERVICIOS PARA COMORBILIDADES DE PACIENTES
  // =====================================================

  /**
   * Obtener comorbilidades de un paciente
   */
  async getPacienteComorbilidades(pacienteId) {
    try {
      Logger.info('Obteniendo comorbilidades del paciente', { pacienteId });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.get(
        `/pacientes/${pacienteId}/comorbilidades`
      );
      
      Logger.success('Comorbilidades del paciente obtenidas exitosamente', { 
        pacienteId,
        count: response.data?.data?.length || 0
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo comorbilidades del paciente', error);
      throw this.handleError(error);
    }
  },

  /**
   * Obtener detecciones de complicaciones de un paciente
   */
  async getPacienteDeteccionesComplicaciones(pacienteId, { limit = 10, offset = 0, sort = 'DESC' } = {}) {
    try {
      Logger.info('Obteniendo detecciones de complicaciones del paciente', { pacienteId, limit, offset, sort });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.get(
        `/pacientes/${pacienteId}/detecciones-complicaciones`,
        { params: { limit, offset, sort } }
      );
      
      Logger.success('Detecciones de complicaciones obtenidas', { 
        pacienteId,
        count: response.data?.data?.length || 0
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo detecciones de complicaciones', error);
      throw this.handleError(error);
    }
  },

  /**
   * Crear detección de complicación
   */
  async addPacienteDeteccionComplicacion(pacienteId, data) {
    try {
      Logger.info('Creando detección de complicación', { pacienteId });
      const apiClient = await ensureApiClient();
      const response = await apiClient.post(`/pacientes/${pacienteId}/detecciones-complicaciones`, data);
      Logger.success('Detección creada', { id: response.data?.data?.id_deteccion });
      return response.data;
    } catch (error) {
      Logger.error('Error creando detección de complicación', error);
      throw this.handleError(error);
    }
  },

  /**
   * Actualizar detección de complicación
   */
  async updatePacienteDeteccionComplicacion(pacienteId, deteccionId, data) {
    try {
      Logger.info('Actualizando detección de complicación', { pacienteId, deteccionId });
      const apiClient = await ensureApiClient();
      const response = await apiClient.put(`/pacientes/${pacienteId}/detecciones-complicaciones/${deteccionId}`, data);
      Logger.success('Detección actualizada', { id: deteccionId });
      return response.data;
    } catch (error) {
      Logger.error('Error actualizando detección de complicación', error);
      throw this.handleError(error);
    }
  },

  /**
   * Eliminar detección de complicación
   */
  async deletePacienteDeteccionComplicacion(pacienteId, deteccionId) {
    try {
      Logger.info('Eliminando detección de complicación', { pacienteId, deteccionId });
      const apiClient = await ensureApiClient();
      const response = await apiClient.delete(`/pacientes/${pacienteId}/detecciones-complicaciones/${deteccionId}`);
      Logger.success('Detección eliminada', { id: deteccionId });
      return response.data;
    } catch (error) {
      Logger.error('Error eliminando detección de complicación', error);
      throw this.handleError(error);
    }
  },

  /**
   * =====================================================
   * SALUD BUCAL (Instrucción ⑫)
   * =====================================================
   */

  /**
   * Obtener registros de salud bucal de un paciente
   */
  async getPacienteSaludBucal(pacienteId, { limit = 100, offset = 0, sort = 'DESC' } = {}) {
    try {
      Logger.info('Obteniendo registros de salud bucal', { pacienteId, limit, offset, sort });
      const apiClient = await ensureApiClient();
      const response = await apiClient.get(`/pacientes/${pacienteId}/salud-bucal`, {
        params: { limit, offset, sort }
      });
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo registros de salud bucal', error);
      throw this.handleError(error);
    }
  },

  /**
   * Crear registro de salud bucal
   */
  async createPacienteSaludBucal(pacienteId, data) {
    try {
      Logger.info('Creando registro de salud bucal', { pacienteId });
      const apiClient = await ensureApiClient();
      const response = await apiClient.post(`/pacientes/${pacienteId}/salud-bucal`, data);
      Logger.success('Registro de salud bucal creado', { id: response.data?.data?.id_salud_bucal });
      return response.data;
    } catch (error) {
      Logger.error('Error creando registro de salud bucal', error);
      throw this.handleError(error);
    }
  },

  /**
   * Actualizar registro de salud bucal
   */
  async updatePacienteSaludBucal(pacienteId, registroId, data) {
    try {
      Logger.info('Actualizando registro de salud bucal', { pacienteId, registroId });
      const apiClient = await ensureApiClient();
      const response = await apiClient.put(`/pacientes/${pacienteId}/salud-bucal/${registroId}`, data);
      Logger.success('Registro de salud bucal actualizado', { id: registroId });
      return response.data;
    } catch (error) {
      Logger.error('Error actualizando registro de salud bucal', error);
      throw this.handleError(error);
    }
  },

  /**
   * Eliminar registro de salud bucal
   */
  async deletePacienteSaludBucal(pacienteId, registroId) {
    try {
      Logger.info('Eliminando registro de salud bucal', { pacienteId, registroId });
      const apiClient = await ensureApiClient();
      const response = await apiClient.delete(`/pacientes/${pacienteId}/salud-bucal/${registroId}`);
      Logger.success('Registro de salud bucal eliminado', { id: registroId });
      return response.data;
    } catch (error) {
      Logger.error('Error eliminando registro de salud bucal', error);
      throw this.handleError(error);
    }
  },

  /**
   * =====================================================
   * DETECCIÓN DE TUBERCULOSIS (Instrucción ⑬)
   * =====================================================
   */

  /**
   * Obtener detecciones de tuberculosis de un paciente
   */
  async getPacienteDeteccionesTuberculosis(pacienteId, { limit = 100, offset = 0, sort = 'DESC' } = {}) {
    try {
      Logger.info('Obteniendo detecciones de tuberculosis', { pacienteId, limit, offset, sort });
      const apiClient = await ensureApiClient();
      const response = await apiClient.get(`/pacientes/${pacienteId}/detecciones-tuberculosis`, {
        params: { limit, offset, sort }
      });
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo detecciones de tuberculosis', error);
      throw this.handleError(error);
    }
  },

  /**
   * Crear detección de tuberculosis
   */
  async createPacienteDeteccionTuberculosis(pacienteId, data) {
    try {
      Logger.info('Creando detección de tuberculosis', { pacienteId });
      const apiClient = await ensureApiClient();
      const response = await apiClient.post(`/pacientes/${pacienteId}/detecciones-tuberculosis`, data);
      Logger.success('Detección de tuberculosis creada', { id: response.data?.data?.id_deteccion_tb });
      return response.data;
    } catch (error) {
      Logger.error('Error creando detección de tuberculosis', error);
      throw this.handleError(error);
    }
  },

  /**
   * Actualizar detección de tuberculosis
   */
  async updatePacienteDeteccionTuberculosis(pacienteId, deteccionId, data) {
    try {
      Logger.info('Actualizando detección de tuberculosis', { pacienteId, deteccionId });
      const apiClient = await ensureApiClient();
      const response = await apiClient.put(`/pacientes/${pacienteId}/detecciones-tuberculosis/${deteccionId}`, data);
      Logger.success('Detección de tuberculosis actualizada', { id: deteccionId });
      return response.data;
    } catch (error) {
      Logger.error('Error actualizando detección de tuberculosis', error);
      throw this.handleError(error);
    }
  },

  /**
   * Eliminar detección de tuberculosis
   */
  async deletePacienteDeteccionTuberculosis(pacienteId, deteccionId) {
    try {
      Logger.info('Eliminando detección de tuberculosis', { pacienteId, deteccionId });
      const apiClient = await ensureApiClient();
      const response = await apiClient.delete(`/pacientes/${pacienteId}/detecciones-tuberculosis/${deteccionId}`);
      Logger.success('Detección de tuberculosis eliminada', { id: deteccionId });
      return response.data;
    } catch (error) {
      Logger.error('Error eliminando detección de tuberculosis', error);
      throw this.handleError(error);
    }
  },

  /**
   * Agregar comorbilidad a un paciente
   */
  async addPacienteComorbilidad(pacienteId, comorbilidadData) {
    try {
      Logger.info('Agregando comorbilidad al paciente', { 
        pacienteId, 
        id_comorbilidad: comorbilidadData.id_comorbilidad
      });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.post(
        `/pacientes/${pacienteId}/comorbilidades`, 
        comorbilidadData
      );
      
      Logger.info('Comorbilidad agregada exitosamente', { 
        pacienteId, 
        id_comorbilidad: response.data?.data?.id_comorbilidad
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error agregando comorbilidad al paciente', error);
      throw this.handleError(error);
    }
  },

  /**
   * Actualizar comorbilidad de un paciente
   */
  async updatePacienteComorbilidad(pacienteId, comorbilidadId, comorbilidadData) {
    try {
      Logger.info('Actualizando comorbilidad del paciente', { 
        pacienteId, 
        comorbilidadId
      });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.put(
        `/pacientes/${pacienteId}/comorbilidades/${comorbilidadId}`, 
        comorbilidadData
      );
      
      Logger.info('Comorbilidad actualizada exitosamente', { 
        pacienteId, 
        comorbilidadId
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error actualizando comorbilidad del paciente', error);
      throw this.handleError(error);
    }
  },

  /**
   * Eliminar comorbilidad de un paciente
   */
  async deletePacienteComorbilidad(pacienteId, comorbilidadId) {
    try {
      Logger.info('Eliminando comorbilidad del paciente', { 
        pacienteId, 
        comorbilidadId
      });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.delete(
        `/pacientes/${pacienteId}/comorbilidades/${comorbilidadId}`
      );
      
      Logger.info('Comorbilidad eliminada exitosamente', { 
        pacienteId, 
        comorbilidadId
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error eliminando comorbilidad del paciente', error);
      throw this.handleError(error);
    }
  },

  // =====================================================
  // MÉTODOS UPDATE/DELETE PARA SIGNOS VITALES
  // =====================================================

  /**
   * Actualizar signos vitales de un paciente
   */
  async updatePacienteSignosVitales(pacienteId, signoId, signosVitalesData) {
    try {
      Logger.info('Actualizando signos vitales del paciente', { 
        pacienteId, 
        signoId
      });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.put(
        `/pacientes/${pacienteId}/signos-vitales/${signoId}`, 
        signosVitalesData
      );
      
      Logger.success('Signos vitales actualizados exitosamente', { 
        pacienteId, 
        signoId
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error actualizando signos vitales del paciente', error);
      throw this.handleError(error);
    }
  },

  /**
   * Eliminar signos vitales de un paciente
   */
  async deletePacienteSignosVitales(pacienteId, signoId) {
    try {
      Logger.info('Eliminando signos vitales del paciente', { 
        pacienteId, 
        signoId
      });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.delete(
        `/pacientes/${pacienteId}/signos-vitales/${signoId}`
      );
      
      Logger.success('Signos vitales eliminados exitosamente', { 
        pacienteId, 
        signoId
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error eliminando signos vitales del paciente', error);
      throw this.handleError(error);
    }
  },

  // =====================================================
  // MÉTODOS UPDATE/DELETE PARA DIAGNÓSTICOS
  // =====================================================

  /**
   * Actualizar diagnóstico de un paciente
   */
  async updatePacienteDiagnostico(pacienteId, diagnosticoId, diagnosticoData) {
    try {
      Logger.info('Actualizando diagnóstico del paciente', { 
        pacienteId, 
        diagnosticoId
      });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.put(
        `/pacientes/${pacienteId}/diagnosticos/${diagnosticoId}`, 
        diagnosticoData
      );
      
      Logger.success('Diagnóstico actualizado exitosamente', { 
        pacienteId, 
        diagnosticoId
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error actualizando diagnóstico del paciente', error);
      throw this.handleError(error);
    }
  },

  /**
   * Eliminar diagnóstico de un paciente
   */
  async deletePacienteDiagnostico(pacienteId, diagnosticoId) {
    try {
      Logger.info('Eliminando diagnóstico del paciente', { 
        pacienteId, 
        diagnosticoId
      });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.delete(
        `/pacientes/${pacienteId}/diagnosticos/${diagnosticoId}`
      );
      
      Logger.success('Diagnóstico eliminado exitosamente', { 
        pacienteId, 
        diagnosticoId
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error eliminando diagnóstico del paciente', error);
      throw this.handleError(error);
    }
  },

  // =====================================================
  // MÉTODOS UPDATE/DELETE PARA PLANES DE MEDICACIÓN
  // =====================================================

  /**
   * Actualizar plan de medicación de un paciente
   */
  async updatePacientePlanMedicacion(pacienteId, planId, planData) {
    try {
      Logger.info('Actualizando plan de medicación del paciente', { 
        pacienteId, 
        planId
      });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.put(
        `/pacientes/${pacienteId}/planes-medicacion/${planId}`, 
        planData
      );
      
      Logger.success('Plan de medicación actualizado exitosamente', { 
        pacienteId, 
        planId
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error actualizando plan de medicación del paciente', error);
      throw this.handleError(error);
    }
  },

  /**
   * Eliminar plan de medicación de un paciente
   */
  async deletePacientePlanMedicacion(pacienteId, planId) {
    try {
      Logger.info('Eliminando plan de medicación del paciente', { 
        pacienteId, 
        planId
      });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.delete(
        `/pacientes/${pacienteId}/planes-medicacion/${planId}`
      );
      
      Logger.success('Plan de medicación eliminado exitosamente', { 
        pacienteId, 
        planId
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error eliminando plan de medicación del paciente', error);
      throw this.handleError(error);
    }
  },

  // =====================================================
  // MÉTODOS UPDATE/DELETE PARA RED DE APOYO
  // =====================================================

  /**
   * Actualizar contacto de red de apoyo de un paciente
   */
  async updatePacienteRedApoyo(pacienteId, contactoId, contactoData) {
    try {
      Logger.info('Actualizando contacto de red de apoyo del paciente', { 
        pacienteId, 
        contactoId
      });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.put(
        `/pacientes/${pacienteId}/red-apoyo/${contactoId}`, 
        contactoData
      );
      
      Logger.success('Contacto de red de apoyo actualizado exitosamente', { 
        pacienteId, 
        contactoId
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error actualizando contacto de red de apoyo del paciente', error);
      throw this.handleError(error);
    }
  },

  /**
   * Eliminar contacto de red de apoyo de un paciente
   */
  async deletePacienteRedApoyo(pacienteId, contactoId) {
    try {
      Logger.info('Eliminando contacto de red de apoyo del paciente', { 
        pacienteId, 
        contactoId
      });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.delete(
        `/pacientes/${pacienteId}/red-apoyo/${contactoId}`
      );
      
      Logger.success('Contacto de red de apoyo eliminado exitosamente', { 
        pacienteId, 
        contactoId
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error eliminando contacto de red de apoyo del paciente', error);
      throw this.handleError(error);
    }
  },

  // =====================================================
  // MÉTODOS UPDATE/DELETE PARA ESQUEMA DE VACUNACIÓN
  // =====================================================

  /**
   * Actualizar registro de vacunación de un paciente
   */
  async updatePacienteEsquemaVacunacion(pacienteId, esquemaId, vacunacionData) {
    try {
      Logger.info('Actualizando registro de vacunación del paciente', { 
        pacienteId, 
        esquemaId
      });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.put(
        `/pacientes/${pacienteId}/esquema-vacunacion/${esquemaId}`, 
        vacunacionData
      );
      
      Logger.success('Registro de vacunación actualizado exitosamente', { 
        pacienteId, 
        esquemaId
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error actualizando registro de vacunación del paciente', error);
      throw this.handleError(error);
    }
  },

  /**
   * Eliminar registro de vacunación de un paciente
   */
  async deletePacienteEsquemaVacunacion(pacienteId, esquemaId) {
    try {
      Logger.info('Eliminando registro de vacunación del paciente', { 
        pacienteId, 
        esquemaId
      });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.delete(
        `/pacientes/${pacienteId}/esquema-vacunacion/${esquemaId}`
      );
      
      Logger.success('Registro de vacunación eliminado exitosamente', { 
        pacienteId, 
        esquemaId
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error eliminando registro de vacunación del paciente', error);
      throw this.handleError(error);
    }
  },

  // =====================================================
  // MÉTODOS UPDATE/DELETE PARA CITAS
  // =====================================================

  /**
   * Actualizar cita
   */
  async updateCita(citaId, citaData) {
    try {
      Logger.info('Actualizando cita', { citaId });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.put(
        `/citas/${citaId}`, 
        citaData
      );
      
      Logger.success('Cita actualizada exitosamente', { citaId });
      
      return response.data;
    } catch (error) {
      Logger.error('Error actualizando cita', error);
      throw this.handleError(error);
    }
  },

  /**
   * Cancelar cita (cambiar estado a cancelada)
   */
  async cancelarCita(citaId, motivoCancelacion = null) {
    try {
      Logger.info('Cancelando cita', { citaId });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.put(
        `/citas/${citaId}/estado`, 
        { 
          estado: 'cancelada',
          observaciones: motivoCancelacion || 'Cita cancelada por el administrador'
        }
      );
      
      Logger.success('Cita cancelada exitosamente', { citaId });
      
      return response.data;
    } catch (error) {
      Logger.error('Error cancelando cita', error);
      throw this.handleError(error);
    }
  },

  /**
   * Eliminar cita (solo Admin)
   */
  async deleteCita(citaId) {
    try {
      Logger.info('Eliminando cita', { citaId });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.delete(`/citas/${citaId}`);
      
      Logger.success('Cita eliminada exitosamente', { citaId });
      
      return response.data;
    } catch (error) {
      Logger.error('Error eliminando cita', error);
      throw this.handleError(error);
    }
  },

  // =====================================================
  // SERVICIOS PARA TODAS LAS CITAS DEL SISTEMA
  // =====================================================

  /**
   * Obtener todas las citas del sistema con filtros
   */
  async getAllCitas(filters = {}) {
    try {
      Logger.info('Obteniendo todas las citas del sistema', { filters });
      
      const queryParams = new URLSearchParams();
      
      if (filters.limit) queryParams.append('limit', filters.limit);
      if (filters.offset) queryParams.append('offset', filters.offset);
      if (filters.doctor) queryParams.append('doctor', filters.doctor);
      if (filters.paciente) queryParams.append('paciente', filters.paciente);
      if (filters.fecha_desde) queryParams.append('fecha_desde', filters.fecha_desde);
      if (filters.fecha_hasta) queryParams.append('fecha_hasta', filters.fecha_hasta);
      if (filters.search) queryParams.append('search', filters.search);
      
      const apiClient = await ensureApiClient();
      
      // Aumentar timeout para peticiones grandes (limit > 200)
      const timeout = (filters.limit && filters.limit > 200) ? 30000 : 15000; // 30s para grandes, 15s para normales
      
      const response = await apiClient.get(`/citas?${queryParams.toString()}`, {
        timeout: timeout
      });
      
      Logger.success('Todas las citas obtenidas', { 
        total: response.data?.total || 0,
        count: response.data?.citas?.length || 0
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo todas las citas', error);
      
      // Si es un error de timeout o red, intentar con límite más pequeño
      if ((error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || error.message?.includes('timeout')) && filters.limit && filters.limit > 200) {
        Logger.info('Timeout detectado, intentando con límite reducido', { originalLimit: filters.limit });
        try {
          const reducedFilters = { ...filters, limit: 200 };
          return await this.getAllCitas(reducedFilters);
        } catch (retryError) {
          Logger.error('Error en reintento con límite reducido', retryError);
        }
      }
      
      throw this.handleError(error);
    }
  },

  // =====================================================
  // SERVICIOS PARA GESTIÓN DE MEDICAMENTOS (CATÁLOGO)
  // =====================================================

  /**
   * Obtener todos los medicamentos del catálogo
   */
  async getAllMedicamentos(filters = {}) {
    try {
      Logger.info('Obteniendo catálogo de medicamentos', { filters });
      
      const queryParams = new URLSearchParams();
      
      if (filters.limit) queryParams.append('limit', filters.limit);
      if (filters.offset) queryParams.append('offset', filters.offset);
      if (filters.search) queryParams.append('search', filters.search);
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.get(`/medicamentos?${queryParams.toString()}`);
      
      // El backend devuelve: { success: true, data: { medicamentos: [...], total, limit, offset } }
      let medicamentosArray = [];
      
      if (response.data?.success && response.data?.data?.medicamentos) {
        medicamentosArray = response.data.data.medicamentos;
      } else if (response.data?.data?.medicamentos) {
        medicamentosArray = response.data.data.medicamentos;
      } else if (Array.isArray(response.data?.medicamentos)) {
        medicamentosArray = response.data.medicamentos;
      } else if (Array.isArray(response.data?.data)) {
        medicamentosArray = response.data.data;
      } else if (Array.isArray(response.data)) {
        medicamentosArray = response.data;
      }
      
      Logger.success('Catálogo de medicamentos obtenido', { 
        total: medicamentosArray.length,
        formato: 'array extraído'
      });
      
      return medicamentosArray;
    } catch (error) {
      Logger.error('Error obteniendo catálogo de medicamentos', error);
      throw this.handleError(error);
    }
  },

  /**
   * Obtener un medicamento específico
   */
  async getMedicamento(id) {
    try {
      Logger.info('Obteniendo medicamento', { id });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.get(`/medicamentos/${id}`);
      
      Logger.success('Medicamento obtenido');
      
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo medicamento', error);
      throw this.handleError(error);
    }
  },

  /**
   * Crear nuevo medicamento en el catálogo
   */
  async createMedicamento(medicamentoData) {
    try {
      Logger.info('Creando medicamento en el catálogo', { 
        nombre: medicamentoData.nombre_medicamento
      });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.post('/medicamentos', medicamentoData);
      
      Logger.success('Medicamento creado exitosamente', { 
        id: response.data?.data?.medicamento?.id_medicamento
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error creando medicamento', error);
      throw this.handleError(error);
    }
  },

  /**
   * Actualizar medicamento del catálogo
   */
  async updateMedicamento(id, medicamentoData) {
    try {
      Logger.info('Actualizando medicamento', { id });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.put(`/medicamentos/${id}`, medicamentoData);
      
      Logger.success('Medicamento actualizado exitosamente');
      
      return response.data;
    } catch (error) {
      Logger.error('Error actualizando medicamento', error);
      throw this.handleError(error);
    }
  },

  /**
   * Eliminar medicamento del catálogo
   */
  async deleteMedicamento(id) {
    try {
      Logger.info('Eliminando medicamento', { id });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.delete(`/medicamentos/${id}`);
      
      Logger.success('Medicamento eliminado exitosamente');
      
      return response.data;
    } catch (error) {
      Logger.error('Error eliminando medicamento', error);
      throw this.handleError(error);
    }
  },

  // =====================================================
  // SERVICIOS PARA AUDITORÍA DEL SISTEMA (ADMIN)
  // =====================================================

  /**
   * Obtener historial de auditoría con filtros
   */
  async getAuditoria(filters = {}) {
    try {
      Logger.info('Obteniendo historial de auditoría', { filters });
      
      const queryParams = new URLSearchParams();
      
      if (filters.limit) queryParams.append('limit', filters.limit);
      if (filters.offset) queryParams.append('offset', filters.offset);
      if (filters.tipo_accion) queryParams.append('tipo_accion', filters.tipo_accion);
      if (filters.entidad_afectada) queryParams.append('entidad_afectada', filters.entidad_afectada);
      if (filters.id_usuario) queryParams.append('id_usuario', filters.id_usuario);
      if (filters.fecha_desde) queryParams.append('fecha_desde', filters.fecha_desde);
      if (filters.fecha_hasta) queryParams.append('fecha_hasta', filters.fecha_hasta);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.severidad) queryParams.append('severidad', filters.severidad);
      if (filters.ip_address) queryParams.append('ip_address', filters.ip_address);
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.get(`/admin/auditoria?${queryParams.toString()}`);
      
      Logger.success('Historial de auditoría obtenido', { 
        total: response.data?.total || 0,
        count: response.data?.auditoria?.length || 0
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo historial de auditoría', error);
      throw this.handleError(error);
    }
  },

  /**
   * Obtener detalle de un registro de auditoría
   */
  async getAuditoriaById(id) {
    try {
      Logger.info('Obteniendo detalle de auditoría', { id });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.get(`/admin/auditoria/${id}`);
      
      Logger.success('Detalle de auditoría obtenido');
      
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo detalle de auditoría', error);
      throw this.handleError(error);
    }
  },

  /**
   * Obtener lista de usuarios para filtro de auditoría
   */
  async getUsuariosAuditoria() {
    try {
      Logger.info('Obteniendo usuarios para auditoría');
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.get('/admin/auditoria/usuarios');
      
      Logger.success('Usuarios obtenidos', { 
        count: response.data?.usuarios?.length || 0
      });
      
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo usuarios para auditoría', error);
      throw this.handleError(error);
    }
  },

  /**
   * Obtener estadísticas de auditoría
   */
  async getEstadisticasAuditoria(filters = {}) {
    try {
      Logger.info('Obteniendo estadísticas de auditoría', { filters });
      
      const queryParams = new URLSearchParams();
      if (filters.fecha_desde) queryParams.append('fecha_desde', filters.fecha_desde);
      if (filters.fecha_hasta) queryParams.append('fecha_hasta', filters.fecha_hasta);
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.get(`/admin/auditoria/estadisticas?${queryParams.toString()}`);
      
      Logger.success('Estadísticas de auditoría obtenidas');
      
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo estadísticas de auditoría', error);
      throw this.handleError(error);
    }
  },

  /**
   * Exportar auditoría a CSV o Excel
   * Nota: En React Native, esto devuelve los datos para que el componente maneje la descarga
   */
  async exportarAuditoria(formato = 'csv', filters = {}) {
    try {
      Logger.info('Exportando auditoría', { formato, filters });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.post('/admin/auditoria/exportar', {
        formato,
        ...filters
      }, {
        responseType: 'text' // En React Native usamos 'text' en lugar de 'blob'
      });
      
      Logger.success('Auditoría exportada exitosamente');
      
      // Retornar los datos y el nombre del archivo para que el componente maneje la descarga
      const nombreArchivo = `auditoria_${new Date().toISOString().slice(0, 10)}.${formato === 'excel' ? 'xls' : 'csv'}`;
      
      return { 
        success: true, 
        data: response.data,
        filename: nombreArchivo,
        contentType: formato === 'excel' ? 'application/vnd.ms-excel' : 'text/csv'
      };
    } catch (error) {
      Logger.error('Error exportando auditoría', error);
      throw this.handleError(error);
    }
  },

  // =====================================================
  // SERVICIOS PARA NOTIFICACIONES DE DOCTORES
  // =====================================================

  /**
   * Obtener notificaciones de un doctor con filtros
   */
  async getNotificacionesDoctor(doctorId, filters = {}) {
    try {
      Logger.info('Obteniendo notificaciones del doctor', { doctorId, filters });
      
      const queryParams = new URLSearchParams();
      
      if (filters.limit) queryParams.append('limit', filters.limit);
      if (filters.offset) queryParams.append('offset', filters.offset);
      if (filters.tipo) queryParams.append('tipo', filters.tipo);
      if (filters.estado) queryParams.append('estado', filters.estado);
      if (filters.fecha_desde) queryParams.append('fecha_desde', filters.fecha_desde);
      if (filters.fecha_hasta) queryParams.append('fecha_hasta', filters.fecha_hasta);
      if (filters.search) queryParams.append('search', filters.search);
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.get(`/doctores/${doctorId}/notificaciones?${queryParams.toString()}`);
      
      // El backend devuelve { success: true, data: { notificaciones, total, hasMore, ... } }
      const responseData = response.data?.data || response.data;
      
      Logger.success('Notificaciones del doctor obtenidas', { 
        total: responseData?.total || 0,
        count: responseData?.notificaciones?.length || 0
      });
      
      return {
        success: response.data?.success !== false, // true si no está definido o es true
        data: responseData,
        error: response.data?.error || null
      };
    } catch (error) {
      Logger.error('Error obteniendo notificaciones del doctor', error);
      throw this.handleError(error);
    }
  },

  // =====================================================
  // SERVICIOS PARA EXPORTACIÓN DE REPORTES
  // =====================================================

  /**
   * Exportar signos vitales a CSV
   * @param {number} pacienteId - ID del paciente
   * @param {string} fechaInicio - Fecha de inicio (opcional)
   * @param {string} fechaFin - Fecha de fin (opcional)
   * @returns {string} URL de descarga
   */
  async exportarSignosVitalesCSV(pacienteId, fechaInicio = null, fechaFin = null) {
    try {
      Logger.info('Exportando signos vitales a CSV', { pacienteId, fechaInicio, fechaFin });
      
      const apiClient = await ensureApiClient();
      const queryParams = new URLSearchParams();
      if (fechaInicio) queryParams.append('fechaInicio', fechaInicio);
      if (fechaFin) queryParams.append('fechaFin', fechaFin);
      
      const url = `/reportes/signos-vitales/${pacienteId}/csv${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const baseURL = apiClient.defaults.baseURL || '';
      const fullUrl = `${baseURL}${url}`;
      
      Logger.success('URL de exportación generada', { url: fullUrl });
      return fullUrl;
    } catch (error) {
      Logger.error('Error generando URL de exportación de signos vitales', error);
      throw this.handleError(error);
    }
  },

  /**
   * Exportar citas a CSV
   * @param {number} pacienteId - ID del paciente
   * @param {string} fechaInicio - Fecha de inicio (opcional)
   * @param {string} fechaFin - Fecha de fin (opcional)
   * @returns {string} URL de descarga
   */
  async exportarCitasCSV(pacienteId, fechaInicio = null, fechaFin = null) {
    try {
      Logger.info('Exportando citas a CSV', { pacienteId, fechaInicio, fechaFin });
      
      const apiClient = await ensureApiClient();
      const queryParams = new URLSearchParams();
      if (fechaInicio) queryParams.append('fechaInicio', fechaInicio);
      if (fechaFin) queryParams.append('fechaFin', fechaFin);
      
      const url = `/reportes/citas/${pacienteId}/csv${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const baseURL = apiClient.defaults.baseURL || '';
      const fullUrl = `${baseURL}${url}`;
      
      Logger.success('URL de exportación generada', { url: fullUrl });
      return fullUrl;
    } catch (error) {
      Logger.error('Error generando URL de exportación de citas', error);
      throw this.handleError(error);
    }
  },

  /**
   * Exportar diagnósticos a CSV
   * @param {number} pacienteId - ID del paciente
   * @param {string} fechaInicio - Fecha de inicio (opcional)
   * @param {string} fechaFin - Fecha de fin (opcional)
   * @returns {string} URL de descarga
   */
  async exportarDiagnosticosCSV(pacienteId, fechaInicio = null, fechaFin = null) {
    try {
      Logger.info('Exportando diagnósticos a CSV', { pacienteId, fechaInicio, fechaFin });
      
      const apiClient = await ensureApiClient();
      const queryParams = new URLSearchParams();
      if (fechaInicio) queryParams.append('fechaInicio', fechaInicio);
      if (fechaFin) queryParams.append('fechaFin', fechaFin);
      
      const url = `/reportes/diagnosticos/${pacienteId}/csv${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const baseURL = apiClient.defaults.baseURL || '';
      const fullUrl = `${baseURL}${url}`;
      
      Logger.success('URL de exportación generada', { url: fullUrl });
      return fullUrl;
    } catch (error) {
      Logger.error('Error generando URL de exportación de diagnósticos', error);
      throw this.handleError(error);
    }
  },

  /**
   * Exportar reporte PDF
   * @param {string} tipo - Tipo de reporte (signos-vitales, citas, diagnosticos)
   * @param {number} pacienteId - ID del paciente
   * @param {string} fechaInicio - Fecha de inicio (opcional)
   * @param {string} fechaFin - Fecha de fin (opcional)
   * @returns {string} URL de descarga
   */
  async exportarPDF(tipo, pacienteId, fechaInicio = null, fechaFin = null) {
    try {
      Logger.info('Exportando reporte PDF', { tipo, pacienteId, fechaInicio, fechaFin });
      
      const apiClient = await ensureApiClient();
      const queryParams = new URLSearchParams();
      if (fechaInicio) queryParams.append('fechaInicio', fechaInicio);
      if (fechaFin) queryParams.append('fechaFin', fechaFin);
      
      const url = `/reportes/${tipo}/${pacienteId}/pdf${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const baseURL = apiClient.defaults.baseURL || '';
      const fullUrl = `${baseURL}${url}`;
      
      Logger.success('URL de exportación generada', { url: fullUrl });
      return fullUrl;
    } catch (error) {
      Logger.error('Error generando URL de exportación PDF', error);
      throw this.handleError(error);
    }
  },

  /**
   * Exportar expediente médico completo en PDF
   * Descarga el archivo directamente usando fetch() autenticado
   * 
   * @param {number|string} pacienteId - ID del paciente
   * @param {string} fechaInicio - Fecha inicio para filtrar (opcional)
   * @param {string} fechaFin - Fecha fin para filtrar (opcional)
   * @returns {Promise<{success: boolean, data: Blob, filename: string}>}
   */
  /**
   * Exportar Expediente Médico Completo en HTML
   * @param {number} pacienteId - ID del paciente
   * @param {string} fechaInicio - Fecha de inicio (opcional)
   * @param {string} fechaFin - Fecha de fin (opcional)
   * @returns {string} HTML del expediente médico
   */
  async exportarExpedienteCompleto(pacienteId, fechaInicio = null, fechaFin = null) {
    try {
      Logger.info('Exportando expediente completo HTML', { pacienteId, fechaInicio, fechaFin });
      
      const apiClient = await ensureApiClient();
      const queryParams = new URLSearchParams();
      if (fechaInicio) queryParams.append('fechaInicio', fechaInicio);
      if (fechaFin) queryParams.append('fechaFin', fechaFin);
      
      const url = `/reportes/expediente/${pacienteId}/html${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const baseURL = apiClient.defaults.baseURL || '';
      const fullUrl = `${baseURL}${url}`;

      Logger.success('URL de exportación de expediente completo generada', { url: fullUrl });
      return fullUrl;
    } catch (error) {
      Logger.error('Error generando URL de exportación de expediente completo', error);
      throw this.handleError(error);
    }
  },

  /**
   * Obtener HTML del reporte de estadísticas (Admin/Doctor)
   * GET /api/reportes/estadisticas/html
   * @returns {Promise<string>} HTML del reporte
   */
  async getReporteEstadisticasHTML() {
    try {
      Logger.info('Obteniendo reporte de estadísticas HTML');
      const apiClient = await ensureApiClient();
      const response = await apiClient.get('/reportes/estadisticas/html', {
        responseType: 'text',
        timeout: 60000, // 60s: generación del reporte en servidor puede tardar
      });
      const html = typeof response.data === 'string' ? response.data : String(response.data);
      Logger.success('Reporte de estadísticas HTML obtenido', { length: html.length });
      return html;
    } catch (error) {
      Logger.error('Error obteniendo reporte de estadísticas HTML', error);
      throw this.handleError(error);
    }
  },

  // =====================================================
  // SERVICIOS PARA NOTIFICACIONES DE DOCTORES
  // =====================================================

  /**
   * Marcar notificación como leída
   */
  async marcarNotificacionLeida(doctorId, notificacionId) {
    try {
      Logger.info('Marcando notificación como leída', { doctorId, notificacionId });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.put(`/doctores/${doctorId}/notificaciones/${notificacionId}/leida`);
      
      Logger.success('Notificación marcada como leída');
      
      return response.data;
    } catch (error) {
      Logger.error('Error marcando notificación como leída', error);
      throw this.handleError(error);
    }
  },

  /**
   * Marcar notificación de mensaje como leída por pacienteId
   */
  async marcarNotificacionMensajeLeida(doctorId, pacienteId) {
    try {
      Logger.info('Marcando notificación de mensaje como leída', { doctorId, pacienteId });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.put(`/doctores/${doctorId}/notificaciones/mensaje/${pacienteId}/leida`);
      
      Logger.success('Notificación de mensaje marcada como leída');
      
      return response.data;
    } catch (error) {
      Logger.error('Error marcando notificación de mensaje como leída', error);
      throw this.handleError(error);
    }
  },

  /**
   * Archivar notificación
   */
  async archivarNotificacion(doctorId, notificacionId) {
    try {
      Logger.info('Archivando notificación', { doctorId, notificacionId });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.put(`/doctores/${doctorId}/notificaciones/${notificacionId}/archivar`);
      
      Logger.success('Notificación archivada');
      
      return response.data;
    } catch (error) {
      Logger.error('Error archivando notificación', error);
      throw this.handleError(error);
    }
  },

  /**
   * Obtener contador de notificaciones no leídas
   */
  async getContadorNotificaciones(doctorId) {
    try {
      Logger.info('Obteniendo contador de notificaciones', { doctorId });
      
      const apiClient = await ensureApiClient();
      const response = await apiClient.get(`/doctores/${doctorId}/notificaciones/contador`);
      
      // El backend devuelve { success: true, data: { no_leidas, total } }
      const responseData = response.data?.data || response.data;
      
      Logger.success('Contador de notificaciones obtenido', { 
        noLeidas: responseData?.no_leidas || 0
      });
      
      return {
        success: response.data?.success !== false,
        data: responseData,
        error: response.data?.error || null
      };
    } catch (error) {
      Logger.error('Error obteniendo contador de notificaciones', error);
      throw this.handleError(error);
    }
  }
};

// ✅ Refactorización: Inicializar métodos CRUD usando Factory Pattern
// Esto se hace después de definir gestionService para evitar referencias circulares

// Métodos CRUD para módulos
const modulosCrud = createCrudMethods({
  resourceName: 'modulos',
  resourcePath: '/modulos',
  getApiClient: ensureApiClient,
  handleError: (error) => gestionService.handleError(error)
});
gestionService.getModulos = async () => {
  const modulos = await modulosCrud.getAll();
  return Array.isArray(modulos) ? modulos : (modulos?.modulos || []);
};

/**
 * Obtener catálogo de módulos para uso en filtros/selectores (dropdown).
 * @returns {Promise<Array<{ id_modulo: number, nombre_modulo: string }>>}
 */
gestionService.getModulosCatalogForFilter = async () => {
  try {
    const apiClient = await ensureApiClient();
    const response = await apiClient.get('/modulos');
    const raw = response?.data?.data?.modulos ?? response?.data?.modulos ?? [];
    const list = Array.isArray(raw) ? raw : [];
    return list.map((m) => ({
      id_modulo: m.id_modulo ?? m.id,
      nombre_modulo: m.nombre_modulo ?? m.nombre ?? ''
    })).filter((m) => m.id_modulo != null && m.nombre_modulo !== '');
  } catch (error) {
    Logger.error('Error obteniendo catálogo de módulos para filtro', error);
    throw gestionService.handleError(error);
  }
};

gestionService.getModuloById = modulosCrud.getById;
gestionService.createModulo = modulosCrud.create;
gestionService.updateModulo = modulosCrud.update;
gestionService.deleteModulo = modulosCrud.delete;

// Métodos CRUD para comorbilidades (catálogo)
const comorbilidadesCrud = createCrudMethods({
  resourceName: 'comorbilidades',
  resourcePath: '/comorbilidades',
  getApiClient: ensureApiClient,
  handleError: (error) => gestionService.handleError(error)
});
gestionService.getComorbilidades = comorbilidadesCrud.getAll;
gestionService.getComorbilidadById = comorbilidadesCrud.getById;
gestionService.createComorbilidad = comorbilidadesCrud.create;
gestionService.updateComorbilidad = comorbilidadesCrud.update;
gestionService.deleteComorbilidad = comorbilidadesCrud.delete;

/**
 * Obtener catálogo de comorbilidades para uso en filtros/selectores (dropdown).
 * Devuelve lista desde la BD con formato normalizado { id_comorbilidad, nombre_comorbilidad }.
 * @returns {Promise<Array<{ id_comorbilidad: number, nombre_comorbilidad: string }>>}
 */
gestionService.getComorbilidadesCatalogForFilter = async () => {
  try {
    const apiClient = await ensureApiClient();
    const response = await apiClient.get('/comorbilidades', {
      params: { limit: 200, offset: 0 }
    });
    const raw = response?.data?.data?.comorbilidades ?? response?.data?.comorbilidades ?? [];
    const list = Array.isArray(raw) ? raw : [];
    return list.map((c) => ({
      id_comorbilidad: c.id_comorbilidad ?? c.id,
      nombre_comorbilidad: c.nombre_comorbilidad ?? c.nombre ?? ''
    })).filter((c) => c.id_comorbilidad != null && c.nombre_comorbilidad !== '');
  } catch (error) {
    Logger.error('Error obteniendo catálogo de comorbilidades para filtro', error);
    throw gestionService.handleError(error);
  }
};

// Métodos CRUD para vacunas (catálogo)
const vacunasCrud = createCrudMethods({
  resourceName: 'vacunas',
  resourcePath: '/vacunas',
  getApiClient: ensureApiClient,
  handleError: (error) => gestionService.handleError(error)
});
gestionService.getVacunas = vacunasCrud.getAll;
gestionService.getVacunaById = vacunasCrud.getById;
gestionService.createVacuna = vacunasCrud.create;
gestionService.updateVacuna = vacunasCrud.update;
gestionService.deleteVacuna = vacunasCrud.delete;

// Exportar ensureApiClient para uso en otros servicios
export { ensureApiClient };

export default gestionService;
