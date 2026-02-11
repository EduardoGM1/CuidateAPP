/**
 * Herramienta de diagnóstico para problemas de conexión con la API
 */

import { Alert, Platform } from 'react-native';
import { getApiConfigSync, testApiConnectivity, getApiConfigWithFallback, clearEnvironmentCache } from '../config/apiConfig';
import api from '../api/servicioApi';

/**
 * Ejecutar diagnóstico completo de conexión API
 */
export const runApiDiagnostics = async () => {
  const results = {
    currentConfig: null,
    connectivityTests: [],
    recommendations: [],
    errors: []
  };

  try {
    // 1. Obtener configuración actual
    const currentConfig = getApiConfigSync();
    results.currentConfig = {
      baseURL: currentConfig.baseURL,
      timeout: currentConfig.timeout,
      description: currentConfig.description,
      environment: currentConfig.environment || 'unknown'
    };

    // 2. Probar conectividad con la configuración actual
    console.log('🔍 Iniciando diagnóstico de API...');
    console.log(`📡 URL actual: ${currentConfig.baseURL}`);
    
    const connectivityTest = await testApiConnectivity();
    results.connectivityTests.push({
      url: connectivityTest.url,
      success: connectivityTest.success,
      status: connectivityTest.status,
      error: connectivityTest.error,
      errorType: connectivityTest.errorType
    });

    // 3. Si falla, probar otras configuraciones
    if (!connectivityTest.success) {
      console.log('❌ Conexión fallida, probando otras configuraciones...');
      
      // Probar VPS (tanto en desarrollo como producción)
      const { PRODUCTION_API_BASE_URL } = await import('../config/apiEndpoints');
      console.log(`🔄 Probando VPS: ${PRODUCTION_API_BASE_URL}`);
      const vpsTest = await testApiConnectivity(PRODUCTION_API_BASE_URL);
      results.connectivityTests.push({
        url: PRODUCTION_API_BASE_URL,
        success: vpsTest.success,
        status: vpsTest.status,
        error: vpsTest.error
      });
      
      // En desarrollo, también probar configuraciones locales
      if (__DEV__) {
        // Probar localhost
        if (Platform.OS === 'android') {
          const localhostTest = await testApiConnectivity('http://localhost:3000');
          results.connectivityTests.push({
            url: 'http://localhost:3000',
            success: localhostTest.success,
            status: localhostTest.status,
            error: localhostTest.error
          });
        }

        // Probar IP de red local
        const localNetworkTest = await testApiConnectivity('http://192.168.1.74:3000');
        results.connectivityTests.push({
          url: 'http://192.168.1.74:3000',
          success: localNetworkTest.success,
          status: localNetworkTest.status,
          error: localNetworkTest.error
        });

        // Probar emulador (solo Android)
        if (Platform.OS === 'android') {
          const emulatorTest = await testApiConnectivity('http://10.0.2.2:3000');
          results.connectivityTests.push({
            url: 'http://10.0.2.2:3000',
            success: emulatorTest.success,
            status: emulatorTest.status,
            error: emulatorTest.error
          });
        }
      }
    }

    // 4. Generar recomendaciones
    const workingConfig = results.connectivityTests.find(test => test.success);
    
    if (workingConfig) {
      results.recommendations.push({
        type: 'success',
        message: `✅ Conexión exitosa con: ${workingConfig.url}`,
        action: 'Usar esta configuración'
      });
    } else {
      results.recommendations.push({
        type: 'error',
        message: '❌ No se pudo conectar con ninguna configuración',
        action: 'Verificar que el servidor esté corriendo en el puerto 3000'
      });

      if (Platform.OS === 'android') {
        results.recommendations.push({
          type: 'info',
          message: '💡 Para dispositivos físicos Android:',
          action: 'Ejecuta: adb reverse tcp:3000 tcp:3000'
        });
        
        results.recommendations.push({
          type: 'info',
          message: '💡 O usa la IP de red local:',
          action: 'Asegúrate de que el dispositivo y la PC estén en la misma red WiFi'
        });
      }
    }

    // 5. Probar endpoint específico de la API
    try {
      const apiTest = await api.get('/mobile/config');
      results.apiEndpointTest = {
        success: true,
        status: apiTest.status,
        message: 'Endpoint /api/mobile/config responde correctamente'
      };
    } catch (error) {
      results.apiEndpointTest = {
        success: false,
        error: error.message,
        message: 'Endpoint /api/mobile/config no responde'
      };
      results.errors.push(error.message);
    }

    return results;
  } catch (error) {
    results.errors.push(error.message);
    return results;
  }
};

/**
 * Mostrar diagnóstico en un Alert
 */
export const showApiDiagnostics = async () => {
  try {
    const results = await runApiDiagnostics();
    
    let message = `🔍 DIAGNÓSTICO DE API\n\n`;
    message += `📡 URL Actual: ${results.currentConfig?.baseURL || 'No configurada'}\n`;
    message += `⏱️ Timeout: ${results.currentConfig?.timeout || 'N/A'}ms\n\n`;
    
    message += `📊 PRUEBAS DE CONECTIVIDAD:\n`;
    results.connectivityTests.forEach((test, index) => {
      message += `${index + 1}. ${test.url}\n`;
      message += `   ${test.success ? '✅ Conectado' : '❌ Falló'}\n`;
      if (test.status) {
        message += `   Status: ${test.status}\n`;
      }
      if (test.error) {
        message += `   Error: ${test.error}\n`;
      }
      message += `\n`;
    });

    if (results.apiEndpointTest) {
      message += `\n🔌 ENDPOINT API:\n`;
      message += `${results.apiEndpointTest.success ? '✅' : '❌'} ${results.apiEndpointTest.message}\n`;
    }

    message += `\n💡 RECOMENDACIONES:\n`;
    results.recommendations.forEach((rec, index) => {
      message += `${index + 1}. ${rec.message}\n`;
      if (rec.action) {
        message += `   → ${rec.action}\n`;
      }
    });

    Alert.alert(
      'Diagnóstico de API',
      message,
      [
        {
          text: 'Reiniciar Configuración',
          onPress: async () => {
            clearEnvironmentCache();
            await getApiConfigWithFallback();
            Alert.alert('Éxito', 'Configuración reiniciada. Intenta conectarte nuevamente.');
          }
        },
        { text: 'Cerrar', style: 'cancel' }
      ]
    );
  } catch (error) {
    Alert.alert(
      'Error en Diagnóstico',
      `No se pudo ejecutar el diagnóstico: ${error.message}`
    );
  }
};

/**
 * Verificar conexión rápida
 */
export const quickApiCheck = async () => {
  try {
    const config = getApiConfigSync();
    const test = await testApiConnectivity();
    
    return {
      success: test.success,
      url: config.baseURL,
      message: test.success 
        ? `✅ Conectado a ${config.baseURL}`
        : `❌ No se pudo conectar a ${config.baseURL}`
    };
  } catch (error) {
    return {
      success: false,
      url: null,
      message: `Error: ${error.message}`
    };
  }
};

export default {
  runApiDiagnostics,
  showApiDiagnostics,
  quickApiCheck
};

