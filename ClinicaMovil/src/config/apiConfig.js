/**
 * Configuración inteligente de API para diferentes entornos
 * Detecta automáticamente el entorno y usa la IP correcta
 */

import { Platform } from 'react-native';
import { API_BASE_URL_OVERRIDE } from './apiUrlOverride';

// Función para obtener la IP local (actualizado con ipconfig - Wi-Fi 2 y Wi-Fi 3).
const getLocalIP = () => {
  const commonIPs = [
    '192.168.1.69',    // Wi-Fi 3 (ipconfig actual)
    '192.168.1.68',    // Wi-Fi 2
    '192.168.1.79',
    '192.168.1.74',
    '192.168.1.65',
    '192.168.1.100',
    '192.168.0.100',
    '10.0.2.2',        // Solo emulador Android
  ];
  return commonIPs[0];
};

// Configuración de API por entorno
const API_CONFIG = {
  development: {
    baseURL: 'http://localhost:3000',
    timeout: 60000, // 60s para respuestas grandes (ej. listados, reportes)
    description: 'Desarrollo local con adb reverse'
  },
  localNetwork: {
    baseURL: API_BASE_URL_OVERRIDE || `http://${getLocalIP()}:3000`,
    timeout: 60000, // 60s para respuestas grandes
    description: API_BASE_URL_OVERRIDE ? 'URL de API configurada manualmente' : 'Red local sin adb reverse'
  },
  emulator: {
    baseURL: 'http://10.0.2.2:3000',
    timeout: 30000,
    description: 'Emulador Android'
  },
  production: {
    // API en Railway (usada al compilar en release: npx react-native run-android --mode=release)
    baseURL: 'https://cuidateappbackend-production.up.railway.app',
    timeout: 60000,
    description: 'Servidor de producción (Railway)',
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
  // Si hay override (ej. API_BASE_URL_OVERRIDE en apiUrlOverride.js), usarlo para WebSocket y cualquier llamada síncrona
  if (API_BASE_URL_OVERRIDE) {
    const config = { ...API_CONFIG.localNetwork, baseURL: API_BASE_URL_OVERRIDE };
    if (__DEV__) {
      console.log(`🌐 API Config (override): ${config.baseURL}`);
    }
    return config;
  }
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
  const config = urlToTest ? { baseURL: urlToTest, timeout: 8000 } : getApiConfigSync();
  
  // Probar primero con el endpoint raíz (más simple)
  const endpointsToTest = [
    `${config.baseURL}/Health`,   // Railway usa /Health
    `${config.baseURL}/health`,
    `${config.baseURL}/`,
    `${config.baseURL}/api/mobile/config`,
  ];
  
  for (const testUrl of endpointsToTest) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout || 8000);
      
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
        // DISPOSITIVO FÍSICO: en el teléfono "localhost" es el propio dispositivo, no la PC.
        // Probar primero red local (IP de la PC) y opcionalmente override; localhost solo si usas adb reverse.
        if (__DEV__) {
          console.log('🔍 Dispositivo físico detectado - probando IP de red local primero');
        }
        
        // PRIMERO: Si el usuario configuró API_BASE_URL_OVERRIDE, probarla
        if (API_BASE_URL_OVERRIDE) {
          if (__DEV__) {
            console.log(`🔄 Probando URL configurada: ${API_BASE_URL_OVERRIDE}`);
          }
          const overrideTest = await testApiConnectivity(API_BASE_URL_OVERRIDE);
          if (overrideTest.success) {
            cachedEnvironment = 'localNetwork';
            if (__DEV__) {
              console.log('✅ Usando URL de API configurada');
            }
            return API_CONFIG.localNetwork;
          }
        }
        
        // SEGUNDO: Probar IP de red local (PC en el mismo WiFi) — lo más habitual en teléfono físico
        const localNetworkURL = API_CONFIG.localNetwork.baseURL;
        if (__DEV__) {
          console.log(`🔄 Probando red local (mismo WiFi): ${localNetworkURL}`);
        }
        const localNetworkTest = await testApiConnectivity(localNetworkURL);
        if (localNetworkTest.success) {
          cachedEnvironment = 'localNetwork';
          if (__DEV__) {
            console.log('✅ Red local funcionando - usando IP de la PC');
          }
          return API_CONFIG.localNetwork;
        }
        
        // TERCERO: Probar localhost (solo funciona con: adb reverse tcp:3000 tcp:3000)
        const localhostConfig = API_CONFIG.development;
        if (__DEV__) {
          console.log(`🔄 Probando localhost (adb reverse): ${localhostConfig.baseURL}`);
        }
        const localhostTest = await Promise.race([
          testApiConnectivity(localhostConfig.baseURL),
          new Promise((resolve) => setTimeout(() => resolve({ success: false, error: 'Timeout' }), 3000))
        ]);
        if (localhostTest.success) {
          cachedEnvironment = 'development';
          if (__DEV__) {
            console.log('✅ ADB reverse detectado - usando localhost');
          }
          return localhostConfig;
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
      
      // Si todos fallan: en dispositivo físico usar IP de red como fallback (más útil que localhost)
      if (__DEV__) {
        console.warn('⚠️ No se pudo conectar con ninguna configuración');
        if (!isEmulator) {
          console.warn('   Teléfono físico: revisa que la PC y el teléfono estén en el mismo WiFi');
          console.warn('   Pon la IP de tu PC en apiUrlOverride.js (ipconfig → Dirección IPv4)');
          console.warn('   Y que el firewall de Windows permita conexiones entrantes en el puerto 3000');
          cachedEnvironment = 'localNetwork';
          return API_CONFIG.localNetwork;
        }
        console.warn('   Emulador: ejecuta adb reverse tcp:3000 tcp:3000');
      }
      cachedEnvironment = isEmulator ? 'development' : 'localNetwork';
      return isEmulator ? API_CONFIG.development : API_CONFIG.localNetwork;
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
