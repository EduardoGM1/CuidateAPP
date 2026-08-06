/**
 * Cliente HTTP único para ClinicaMovil (Axios + token/refresh + headers móviles).
 * authService, dashboardService, gestionService y servicioApi deben usar este módulo.
 */
import axios from 'axios';
import Logger from '../services/logger';
import { storageService } from '../services/storageService';
import { getApiConfig, getApiConfigWithFallback, testApiConnectivity } from '../config/apiConfig';

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
      Logger.info('HttpClient: API Config inicializada con fallback', { 
        baseURL: API_CONFIG.baseURL,
        timeout: API_CONFIG.timeout 
      });
      
      // Verificar conectividad con timeout más corto
      const connectivityTest = await Promise.race([
        testApiConnectivity(API_CONFIG.baseURL),
        new Promise((resolve) => setTimeout(() => resolve({ success: false, error: 'Timeout' }), 5000))
      ]);
      
      if (!connectivityTest.success) {
        Logger.warn('HttpClient: No se pudo verificar conectividad, intentando IP local...', {
          baseURL: API_CONFIG.baseURL,
          error: connectivityTest.error
        });
        
        // Si la configuración actual es localhost y falla, cambiar a IP local directamente
        if (API_CONFIG.baseURL.includes('localhost') || API_CONFIG.baseURL.includes('127.0.0.1')) {
          const { API_CONFIG: API_CONFIG_MODULE } = await import('../config/apiConfig.js');
          const localNetworkConfig = API_CONFIG_MODULE.localNetwork;
          
          Logger.info('HttpClient: Cambiando a IP de red local', {
            oldBaseURL: API_CONFIG.baseURL,
            newBaseURL: localNetworkConfig.baseURL
          });
          
          API_CONFIG = localNetworkConfig;
          currentBaseURL = localNetworkConfig.baseURL;
        }
      }
    } catch (error) {
      // Si falla el fallback, usar configuración básica
      Logger.warn('HttpClient: Fallback falló, usando configuración básica', { error: error.message });
      API_CONFIG = await getApiConfig();
      currentBaseURL = API_CONFIG.baseURL;
      Logger.info('HttpClient: API Config inicializada (básica)', { 
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
export const getApiClient = async (forceRecreate = false) => {
  // Si se fuerza recreación o no existe cliente, crear uno nuevo
  if (!apiClient || forceRecreate) {
    const config = await initializeApiConfig(forceRecreate);
    // IMPORTANTE: Agregar /api al baseURL para que coincida con las rutas del backend
    const baseURL = `${config.baseURL}/api`;
    
    if (__DEV__) {
      Logger.info('HttpClient: Creando cliente API', { baseURL });
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
    Logger.info('HttpClient: Probando conectividad con IP local', { 
      baseURL: localNetworkConfig.baseURL 
    });
    
    const testResult = await testApiConnectivity(localNetworkConfig.baseURL);
    
    if (testResult.success) {
      Logger.info('HttpClient: Fallback exitoso a red local', { 
        baseURL: localNetworkConfig.baseURL 
      });
      
      // Actualizar API_CONFIG local con la nueva configuración
      API_CONFIG = localNetworkConfig;
      currentBaseURL = localNetworkConfig.baseURL;
      
      // Recrear cliente con nueva configuración
      apiClient = null;
      return await getApiClient(true);
    } else {
      Logger.warn('HttpClient: Fallback a IP local falló', { 
        baseURL: localNetworkConfig.baseURL,
        error: testResult.error
      });
    }
  } catch (error) {
    Logger.warn('HttpClient: Error en fallback a red local', { 
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
            Logger.warn('HttpClient: Token inválido detectado antes del request', {
              url: config.url
            });
          }
        } catch (refreshError) {
          Logger.warn('HttpClient: Error verificando token antes del request', {
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
          Logger.info('HttpClient: Token añadido', { 
            hasToken: true,
            url: config.url
          });
        }
      } else {
        Logger.warn('HttpClient: Sin token', {
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
                Logger.warn('HttpClient: mensaje_texto es un evento de React, usando string vacío');
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
              Logger.warn(`HttpClient: Campo ${key} es un evento de React, convirtiendo a string`);
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
export const ensureApiClient = async () => {
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

/** Reinicia config/cache y recrea el cliente (p. ej. tras adb reverse). */
export const reinitializeApiConfig = async () => {
  const { clearEnvironmentCache } = await import('../config/apiConfig.js');
  clearEnvironmentCache();
  API_CONFIG = null;
  apiClient = null;
  currentBaseURL = null;
  fallbackAttempted = false;
  apiClientInitialized = false;
  return getApiClient(true);
};

