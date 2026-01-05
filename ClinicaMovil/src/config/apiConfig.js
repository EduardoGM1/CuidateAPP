/**
 * Configuración inteligente de API para diferentes entornos
 * Detecta automáticamente el entorno y usa la IP correcta
 */

import { Platform } from 'react-native';

// Función para obtener la IP local automáticamente
// IMPORTANTE: Esta función debería detectar la IP real, pero por ahora usa valores comunes
const getLocalIP = () => {
  // IPs comunes para desarrollo local
  // NOTA: Estas IPs deben coincidir con la IP real de tu PC en la red local
  const commonIPs = [
    '192.168.1.74',    // IP actual detectada (2025-01-XX)
    '192.168.1.65',    // IP anterior
    '192.168.1.100',   // IP alternativa común
    '192.168.0.100',    // IP para redes 192.168.0.x
    '192.168.1.1',     // Router común
    '10.0.2.2',        // IP para emulador Android (no usar para dispositivos físicos)
  ];
  
  // Usar la IP actual detectada
  // Para encontrar tu IP: ipconfig (Windows) o ifconfig (Linux/Mac)
  return commonIPs[0]; // 192.168.1.74
};

// Configuración de API por entorno
const API_CONFIG = {
  development: {
    baseURL: 'http://localhost:3000',
    timeout: 10000,
    description: 'Desarrollo local con adb reverse'
  },
  localNetwork: {
    baseURL: `http://${getLocalIP()}:3000`,
    timeout: 15000,
    description: 'Red local sin adb reverse'
  },
  emulator: {
    baseURL: 'http://10.0.2.2:3000',
    timeout: 10000,
    description: 'Emulador Android'
  },
  production: {
    baseURL: 'https://api.tuclinica.com', // HTTPS obligatorio en producción
    timeout: 30000,
    description: 'Servidor de producción',
    // Forzar HTTPS en producción
    forceHttps: true
  }
};

// Cache para almacenar el resultado de la detección de entorno
let cachedEnvironment = null;
let environmentCheckInProgress = false;

// Función para detectar si es emulador Android
const isAndroidEmulator = () => {
  if (Platform.OS !== 'android') return false;
  
  // Detectar emulador usando características del dispositivo
  // Los emuladores típicamente tienen estas características:
  try {
    const { NativeModules } = require('react-native');
    const deviceInfo = NativeModules?.DeviceInfo || NativeModules?.RNDeviceInfo;
    
    // Método 1: Verificar modelo (emuladores suelen tener "sdk" o "google_sdk" en el modelo)
    if (deviceInfo?.getModel) {
      const model = deviceInfo.getModel();
      if (model && (model.toLowerCase().includes('sdk') || model.toLowerCase().includes('emulator'))) {
        return true;
      }
    }
    
    // Método 2: Verificar fingerprint (emuladores tienen "generic" o "unknown")
    if (deviceInfo?.getFingerprint) {
      const fingerprint = deviceInfo.getFingerprint();
      if (fingerprint && (fingerprint.includes('generic') || fingerprint.includes('unknown'))) {
        return true;
      }
    }
  } catch (error) {
    // Si no se puede detectar, asumir que NO es emulador por defecto
  }
  
  // Método alternativo: Verificar si el dispositivo tiene características de emulador
  // Los emuladores suelen tener nombres de modelo específicos
  // Por ahora, si no podemos detectar, usaremos una heurística más simple:
  // Si estamos en desarrollo y es Android, intentar emulador primero
  return false; // Por defecto, no asumir que es emulador
};

// Función para detectar el entorno automáticamente
const detectEnvironment = () => {
  if (__DEV__) {
    // En desarrollo, detectar si es emulador o dispositivo físico
    if (Platform.OS === 'android') {
      // IMPORTANTE: Para dispositivos físicos, usar 'development' (localhost con adb reverse)
      // o 'localNetwork' (IP de red local)
      // NO asumir emulador por defecto - esto causa problemas en dispositivos físicos
      
      // Intentar detectar si es emulador
      const isEmulator = isAndroidEmulator();
      
      if (isEmulator) {
        return 'emulator'; // Emulador usa 10.0.2.2:3000
      } else {
        // Dispositivo físico: intentar localhost primero (requiere adb reverse)
        // Si adb reverse no está configurado, getApiConfigWithFallback() probará IP local
        return 'development'; // localhost:3000 (requiere adb reverse tcp:3000 tcp:3000)
      }
    } else if (Platform.OS === 'ios') {
      return 'development'; // iOS usa localhost normalmente
    }
    return 'development';
  } else {
    // En producción, forzar HTTPS
    const productionConfig = API_CONFIG.production;
    if (productionConfig.forceHttps && !productionConfig.baseURL.startsWith('https://')) {
      console.warn('⚠️ ADVERTENCIA: Producción debe usar HTTPS');
    }
    return 'production';
  }
};

// Función principal para obtener configuración (síncrona)
// Con fallback automático si adb reverse no está disponible
export const getApiConfigSync = () => {
  const environment = detectEnvironment();
  const config = API_CONFIG[environment];
  
  if (__DEV__) {
    console.log(`🌐 API Config: ${environment} - ${config.baseURL}`);
    console.log(`📝 Descripción: ${config.description}`);
    
    // Si es Android y estamos usando development (localhost), sugerir adb reverse
    if (Platform.OS === 'android' && environment === 'development') {
      console.log(`💡 Sugerencia: Si la conexión falla, ejecuta: adb reverse tcp:3000 tcp:3000`);
      console.log(`   O usa la IP de red local: ${API_CONFIG.localNetwork.baseURL}`);
    }
  }
  
  return config;
};

// Función asíncrona para compatibilidad (retorna Promise)
export const getApiConfig = async () => {
  return getApiConfigSync();
};

// Función para obtener solo la URL base
export const getApiBaseUrl = () => {
  return getApiConfigSync().baseURL;
};

// Función para obtener timeout
export const getApiTimeout = () => {
  return getApiConfigSync().timeout;
};

// Función para cambiar manualmente el entorno (útil para testing)
export const setApiEnvironment = (environment) => {
  if (API_CONFIG[environment]) {
    if (__DEV__) {
      console.log(`🔄 Cambiando entorno API a: ${environment}`);
    }
    return API_CONFIG[environment];
  } else {
    if (__DEV__) {
      console.warn(`⚠️ Entorno no válido: ${environment}`);
    }
    return getApiConfigSync();
  }
};

// Función para probar conectividad con una URL específica
export const testApiConnectivity = async (urlToTest = null) => {
  const config = urlToTest ? { baseURL: urlToTest, timeout: 5000 } : getApiConfigSync();
  
  // Probar primero con el endpoint raíz (más simple)
  const endpointsToTest = [
    `${config.baseURL}/`,  // Endpoint raíz
    `${config.baseURL}/api/mobile/config`,  // Endpoint móvil
    `${config.baseURL}/health`,  // Health check
  ];
  
  for (const testUrl of endpointsToTest) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout || 5000);
      
      if (__DEV__) {
        console.log(`🔄 Probando conectividad: ${testUrl}`);
      }
      
      const response = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      // Cualquier respuesta (incluso 404, 401) significa que el servidor está respondiendo
      if (response.status >= 200 && response.status < 600) {
        if (__DEV__) {
          console.log(`✅ API conectada: ${config.baseURL} (endpoint: ${testUrl}, status: ${response.status})`);
        }
        return { success: true, url: config.baseURL, endpoint: testUrl, status: response.status };
      }
    } catch (error) {
      // Si es el último endpoint y falla, retornar error
      if (testUrl === endpointsToTest[endpointsToTest.length - 1]) {
        if (__DEV__ && error.name !== 'AbortError') {
          console.log(`❌ Error de conexión: ${config.baseURL} - ${error.message}`);
          console.log(`   Tipo de error: ${error.name}`);
          if (error.message) {
            console.log(`   Mensaje: ${error.message}`);
          }
        }
        return { 
          success: false, 
          url: config.baseURL, 
          error: error.message || error.name || 'Error desconocido',
          errorType: error.name
        };
      }
      // Continuar con el siguiente endpoint
      continue;
    }
  }
  
  // Si todos los endpoints fallaron
  if (__DEV__) {
    console.log(`❌ No se pudo conectar con ningún endpoint en: ${config.baseURL}`);
  }
  return { success: false, url: config.baseURL, error: 'Todos los endpoints fallaron' };
};

// Función para obtener configuración con fallback inteligente
export const getApiConfigWithFallback = async () => {
  // Si ya tenemos un entorno cacheado y funcionando, usarlo
  if (cachedEnvironment && !environmentCheckInProgress) {
    return API_CONFIG[cachedEnvironment];
  }
  
  environmentCheckInProgress = true;
  
  try {
    // Para Android, detectar si es emulador y probar configuraciones en orden
    if (Platform.OS === 'android' && __DEV__) {
      if (__DEV__) {
        console.log('🔍 Detectando mejor configuración para Android...');
      }
      
      // ESTRATEGIA MEJORADA: Detectar si es emulador y ajustar orden de pruebas
      // Para emuladores: Probar 10.0.2.2 primero (más confiable que localhost)
      // Para dispositivos físicos: Probar localhost primero (con adb reverse)
      
      const isEmulator = isAndroidEmulator();
      
      // Si es emulador, probar 10.0.2.2 primero (más confiable para emuladores)
      if (isEmulator) {
        if (__DEV__) {
          console.log('🔍 Emulador detectado - probando configuración de emulador primero');
        }
        
        // PRIMERO: Probar 10.0.2.2 (IP especial del emulador)
        if (__DEV__) {
          console.log(`🔄 Probando emulador (10.0.2.2): ${API_CONFIG.emulator.baseURL}`);
        }
        
        const emulatorTest = await testApiConnectivity(API_CONFIG.emulator.baseURL);
        
        if (emulatorTest.success) {
          cachedEnvironment = 'emulator';
          if (__DEV__) {
            console.log('✅ Emulador - usando 10.0.2.2:3000');
          }
          return API_CONFIG.emulator;
        }
        
        // SEGUNDO: Si 10.0.2.2 falla, probar localhost (con adb reverse)
        if (__DEV__) {
          console.log(`🔄 Probando localhost (adb reverse): ${API_CONFIG.development.baseURL}`);
        }
        
        const localhostTest = await testApiConnectivity(API_CONFIG.development.baseURL);
        
        if (localhostTest.success) {
          cachedEnvironment = 'development';
          if (__DEV__) {
            console.log('✅ Emulador - ADB reverse funcionando, usando localhost');
          }
          return API_CONFIG.development;
        }
      } else {
        // Para dispositivos físicos: Probar localhost primero (con adb reverse)
        if (__DEV__) {
          console.log('🔍 Dispositivo físico detectado - probando localhost primero');
        }
        
        // PRIMERO: Probar localhost (adb reverse) - más rápido y confiable para dispositivos físicos
        const localhostConfig = API_CONFIG.development;
        if (__DEV__) {
          console.log(`🔄 Probando localhost (adb reverse): ${localhostConfig.baseURL}`);
        }
        
        const localhostTest = await testApiConnectivity(localhostConfig.baseURL);
        
        if (localhostTest.success) {
          cachedEnvironment = 'development';
          if (__DEV__) {
            console.log('✅ ADB reverse detectado y funcionando - usando localhost');
          }
          return localhostConfig;
        }
        
        // SEGUNDO: Si localhost falla, probar con IP de red local
        if (__DEV__) {
          console.log(`🔄 Probando red local: ${API_CONFIG.localNetwork.baseURL}`);
        }
        
        const localNetworkTest = await testApiConnectivity(API_CONFIG.localNetwork.baseURL);
        
        if (localNetworkTest.success) {
          cachedEnvironment = 'localNetwork';
          if (__DEV__) {
            console.log('✅ Red local funcionando - usando IP de red');
          }
          return API_CONFIG.localNetwork;
        }
      }
      
      // ÚLTIMO RECURSO: Si todas las pruebas anteriores fallaron, probar la otra opción
      if (isEmulator) {
        // Si es emulador y fallaron 10.0.2.2 y localhost, probar IP local
        if (__DEV__) {
          console.log(`🔄 Probando red local como último recurso: ${API_CONFIG.localNetwork.baseURL}`);
        }
        
        const localNetworkTest = await testApiConnectivity(API_CONFIG.localNetwork.baseURL);
        
        if (localNetworkTest.success) {
          cachedEnvironment = 'localNetwork';
          if (__DEV__) {
            console.log('✅ Red local funcionando - usando IP de red');
          }
          return API_CONFIG.localNetwork;
        }
      } else {
        // Si es dispositivo físico y fallaron localhost e IP local, probar 10.0.2.2 (por si acaso)
        if (__DEV__) {
          console.log(`🔄 Probando emulador como último recurso: ${API_CONFIG.emulator.baseURL}`);
        }
        
        const emulatorTest = await testApiConnectivity(API_CONFIG.emulator.baseURL);
        
        if (emulatorTest.success) {
          cachedEnvironment = 'emulator';
          if (__DEV__) {
            console.log('✅ Emulador detectado - usando 10.0.2.2:3000');
          }
          return API_CONFIG.emulator;
        }
      }
      
      // Si todos fallan, usar localhost como fallback (requiere adb reverse)
      if (__DEV__) {
        console.warn('⚠️ No se pudo conectar con ninguna configuración');
        console.warn('   Usando localhost como fallback (requiere adb reverse)');
        console.warn('   Ejecuta: adb reverse tcp:3000 tcp:3000');
      }
      
      cachedEnvironment = 'development';
      return localhostConfig;
    }
    
    // Para otros entornos, usar detección normal
    const primaryConfig = getApiConfigSync();
    const connectivityTest = await testApiConnectivity();
    
    if (connectivityTest.success) {
      cachedEnvironment = detectEnvironment();
      return primaryConfig;
    }
    
    // Si falla, devolver configuración primaria
    if (__DEV__) {
      console.warn('⚠️ No se pudo verificar conectividad, usando configuración predeterminada');
    }
    cachedEnvironment = detectEnvironment();
    return primaryConfig;
  } finally {
    environmentCheckInProgress = false;
  }
};

// Función para forzar recache de entorno (útil después de configurar adb reverse)
export const clearEnvironmentCache = () => {
  cachedEnvironment = null;
  if (__DEV__) {
    console.log('🔄 Cache de entorno limpiado - se detectará automáticamente en la próxima conexión');
  }
};

// Las funciones ya están exportadas individualmente con export const
// Solo exportar API_CONFIG como named export adicional
export { API_CONFIG };

// También exportar como default para compatibilidad
export default {
  getApiConfig,
  getApiConfigSync,
  getApiBaseUrl,
  getApiTimeout,
  setApiEnvironment,
  testApiConnectivity,
  getApiConfigWithFallback,
  clearEnvironmentCache,
  API_CONFIG
};
