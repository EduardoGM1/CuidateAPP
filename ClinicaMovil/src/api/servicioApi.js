import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Logger from '../services/logger';

// Importar configuración de API centralizada
import { getApiConfigWithFallback, getApiConfigSync } from '../config/apiConfig';

// IMPORTANTE: Para dispositivos físicos, usar getApiConfigWithFallback() que detecta automáticamente
// la mejor configuración (localhost con adb reverse, IP local, o emulador)
let apiConfig = null;
let API_URL = null;

// Inicializar configuración de forma asíncrona para dispositivos físicos
const initializeApiConfig = async () => {
  if (!apiConfig) {
    try {
      // Usar fallback inteligente que prueba diferentes configuraciones
      apiConfig = await getApiConfigWithFallback();
      API_URL = `${apiConfig.baseURL}/api`;
      
      if (__DEV__) {
        console.log(`🌐 API inicializada: ${apiConfig.baseURL}`);
        console.log(`📝 Descripción: ${apiConfig.description}`);
        console.log(`🔗 URL completa: ${API_URL}`);
        
        // Probar conectividad inmediatamente
        const { testApiConnectivity } = await import('../config/apiConfig');
        const connectivityTest = await testApiConnectivity();
        
        if (connectivityTest.success) {
          console.log(`✅ Conexión verificada exitosamente`);
        } else {
          console.warn(`⚠️ ADVERTENCIA: No se pudo verificar la conexión`);
          console.warn(`   Error: ${connectivityTest.error || 'Desconocido'}`);
          console.warn(`   URL probada: ${connectivityTest.url}`);
          
          if (Platform.OS === 'android') {
            console.warn(`💡 SOLUCIÓN: Ejecuta en tu terminal:`);
            console.warn(`   adb reverse tcp:3000 tcp:3000`);
            console.warn(`   O verifica que el dispositivo y PC estén en la misma red WiFi`);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error al inicializar configuración de API:`, error);
      // Usar configuración síncrona como fallback
      const syncConfig = getApiConfigSync();
      apiConfig = syncConfig;
      API_URL = `${syncConfig.baseURL}/api`;
      console.warn(`⚠️ Usando configuración de fallback: ${API_URL}`);
    }
  }
  return apiConfig;
};

// Función para obtener la configuración (síncrona para compatibilidad)
const getApiConfig = () => {
  // Si ya está inicializado, usar esa configuración
  if (apiConfig) {
    return apiConfig;
  }
  // Si no, usar configuración síncrona como fallback
  const syncConfig = getApiConfigSync();
  if (!API_URL) {
    API_URL = `${syncConfig.baseURL}/api`;
  }
  return syncConfig;
};

// Generar device ID único
const getDeviceId = () => {
  // En producción usar react-native-device-info
  return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Crear instancia de axios con configuración dinámica
const createApiInstance = () => {
  const config = getApiConfig();
  const baseURL = API_URL || `${config.baseURL}/api`;
  
  return axios.create({
    baseURL: baseURL,
    timeout: config.timeout || 60000,
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Type': 'app',
      'X-Device-ID': getDeviceId(),
      'X-Platform': Platform.OS,
      'X-App-Version': '1.0.0',
    },
  });
};

// Inicializar instancia de API
let api = createApiInstance();

// Interceptor para inicializar configuración si es necesario
api.interceptors.request.use(async (config) => {
  // Inicializar configuración si no está inicializada
  if (!apiConfig) {
    try {
      await initializeApiConfig();
      // Recrear instancia con la nueva configuración
      const newConfig = getApiConfig();
      const newBaseURL = `${newConfig.baseURL}/api`;
      if (api.defaults.baseURL !== newBaseURL) {
        api.defaults.baseURL = newBaseURL;
        api.defaults.timeout = newConfig.timeout || 15000;
        
        if (__DEV__) {
          console.log(`🔄 API baseURL actualizada a: ${newBaseURL}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error al inicializar API en interceptor:`, error);
      // Continuar con la configuración actual aunque haya error
    }
  }
  
  // Importar storageService para obtener token de forma segura
  const { storageService } = await import('../services/storageService');
  
  // Obtener token del almacenamiento encriptado
  const token = await storageService.getAuthToken();
  
  const deviceInfo = {
    device_id: getDeviceId(),
    platform: Platform.OS,
    app_version: '1.0.0',
    os_version: Platform.Version.toString(),
  };
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Headers específicos para móviles
  config.headers['X-Device-ID'] = deviceInfo.device_id;
  config.headers['X-Platform'] = deviceInfo.platform;
  config.headers['X-App-Version'] = deviceInfo.app_version;
  
  // Verificar que en producción se use HTTPS
  if (!__DEV__ && config.url && !config.url.startsWith('https://')) {
    console.warn('⚠️ ADVERTENCIA: Petición sin HTTPS en producción', { url: config.url });
  }
  
  return config;
});

// Interceptor para manejar errores y renovación de tokens
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Manejar token expirado (401 Unauthorized o 403 Forbidden)
    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Usar sessionService para manejar el refresh de forma centralizada
        const sessionService = (await import('../services/sessionService.js')).default;
        
        Logger.info('🔄 [INTERCEPTOR] Token expirado (401/403), intentando renovar automáticamente...', {
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
          
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          
          // Pequeño delay para asegurar que el token se guardó correctamente
          await new Promise(resolve => setTimeout(resolve, 100));
          
          return api(originalRequest);
        } else {
          // No se pudo renovar, la sesión ha expirada
          Logger.warn('⚠️ [INTERCEPTOR] No se pudo renovar el token, cerrando sesión y redirigiendo al login', {
            url: originalRequest.url
          });
          
          // Asegurar que se cierre la sesión y redirija al login
          await sessionService.handleSessionExpired();
        }
      } catch (refreshError) {
        Logger.error('❌ [INTERCEPTOR] Error en proceso de renovación de token', {
          error: refreshError.message,
          stack: refreshError.stack,
          url: originalRequest.url
        });
        
        // Si hay error en el proceso de renovación, manejar sesión expirada
        try {
          const sessionService = (await import('../services/sessionService.js')).default;
          await sessionService.handleSessionExpired();
        } catch (handleError) {
          Logger.error('❌ [INTERCEPTOR] Error manejando sesión expirada', handleError);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Métodos específicos para móviles
export const mobileApi = {
  // Login móvil
  login: async (email, password) => {
    const response = await api.post('/auth/login', {
      email: String(email).trim().toLowerCase(),
      password,
    });
    const { token, refresh_token, expires_in, usuario, device_info } = response.data;
    
    // Importar storageService para guardar de forma segura
    const { storageService } = await import('../services/storageService');
    
    // Guardar tokens y datos de forma segura (encriptados)
    await storageService.saveAuthToken(token);
    await storageService.saveRefreshToken(refresh_token);
    await storageService.saveUserData(usuario);
    
    return response.data;
  },

  // Registrar dispositivo
  registerDevice: async (deviceToken, deviceInfo) => {
    const response = await api.post('/mobile/device/register', {
      device_token: deviceToken,
      platform: Platform.OS,
      device_info: deviceInfo
    });
    return response.data;
  },

  // Obtener configuración móvil
  getConfig: async () => {
    const response = await api.get('/mobile/config');
    return response.data;
  },

  // Renovar token
  refreshToken: async () => {
    // Importar storageService para acceso seguro
    const { storageService } = await import('../services/storageService');
    
    const refreshToken = await storageService.getRefreshToken();
    const response = await api.post('/mobile/refresh-token', {
      refresh_token: refreshToken
    });
    
    const { token, refresh_token } = response.data;
    // Guardar tokens de forma segura (encriptados)
    await storageService.saveAuthToken(token);
    await storageService.saveRefreshToken(refresh_token);
    
    return response.data;
  },

  // Logout (BORRADO SEGURO)
  logout: async () => {
    // Importar storageService para borrado seguro
    const { storageService } = await import('../services/storageService');
    
    // Limpiar todos los datos de autenticación de forma segura
    await storageService.clearAuthData();
  }
};

// Función para reinicializar la configuración (útil después de configurar adb reverse)
export const reinitializeApiConfig = async () => {
  const { clearEnvironmentCache } = await import('../config/apiConfig');
  clearEnvironmentCache();
  apiConfig = null;
  API_URL = null;
  await initializeApiConfig();
  // Recrear instancia
  api = createApiInstance();
  return api;
};

// Exportar función de inicialización
export { initializeApiConfig, getApiConfig };

export default api;