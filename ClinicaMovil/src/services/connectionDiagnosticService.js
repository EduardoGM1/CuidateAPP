import axios from 'axios';
import Logger from './logger';

// Servicio de diagnóstico de conexión
export const connectionDiagnosticService = {
  // Probar diferentes URLs de conexión
  async testConnections() {
    const urls = [
      'http://localhost:3000', // Con adb reverse (PRINCIPAL para dispositivos físicos)
      'http://192.168.1.65:3000', // IP real (requiere firewall configurado)
      'http://10.0.2.2:3000', // IP del host desde emulador Android
      'http://127.0.0.1:3000', // Loopback
    ];

    const results = [];

    for (const url of urls) {
      try {
        Logger.info(`Probando conexión a: ${url}`);
        
        const response = await axios.get(`${url}/api/mobile/config`, {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        results.push({
          url,
          status: 'success',
          statusCode: response.status,
          data: response.data,
          error: null,
        });

        Logger.success(`Conexión exitosa a: ${url}`, { status: response.status });
      } catch (error) {
        results.push({
          url,
          status: 'error',
          statusCode: error.response?.status || 'no_response',
          data: null,
          error: {
            message: error.message,
            code: error.code,
            type: error.response ? 'http_error' : 'connection_error',
          },
        });

        Logger.error(`Error de conexión a: ${url}`, { 
          error: error.message, 
          code: error.code,
          status: error.response?.status 
        });
      }
    }

    return results;
  },

  // Probar endpoint específico de login
  async testLoginEndpoint(baseUrl, email, password) {
    try {
      Logger.info(`Probando login en: ${baseUrl}`, { email });
      
      // Mismo endpoint que el login real de la app (/api/mobile/login)
      const response = await axios.post(`${baseUrl}/api/mobile/login`, {
        email,
        password,
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'X-Platform': 'android',
          'X-Client-Type': 'app',
        },
      });

      Logger.success(`Login exitoso en: ${baseUrl}`, { 
        status: response.status,
        hasToken: !!response.data.token 
      });

      return {
        url: baseUrl,
        status: 'success',
        statusCode: response.status,
        data: response.data,
        error: null,
      };
    } catch (error) {
      Logger.error(`Error en login de: ${baseUrl}`, { 
        error: error.message, 
        status: error.response?.status,
        data: error.response?.data 
      });

      return {
        url: baseUrl,
        status: 'error',
        statusCode: error.response?.status || 'no_response',
        data: null,
        error: {
          message: error.message,
          code: error.code,
          type: error.response ? 'http_error' : 'connection_error',
          responseData: error.response?.data,
        },
      };
    }
  },

  // Obtener información del dispositivo
  getDeviceInfo() {
    return {
      platform: 'android',
      userAgent: 'ReactNative',
      timestamp: new Date().toISOString(),
    };
  },

  // Diagnóstico completo
  async runFullDiagnostic(email = 'doctor@clinica.com', password = 'password123') {
    Logger.info('Iniciando diagnóstico completo de conexión');
    
    const deviceInfo = this.getDeviceInfo();
    const connectionTests = await this.testConnections();
    
    // Encontrar la primera conexión exitosa
    const successfulConnection = connectionTests.find(test => test.status === 'success');
    
    let loginTest = null;
    if (successfulConnection) {
      loginTest = await this.testLoginEndpoint(successfulConnection.url, email, password);
    }

    const diagnostic = {
      deviceInfo,
      connectionTests,
      loginTest,
      recommendations: this.generateRecommendations(connectionTests, loginTest),
    };

    Logger.info('Diagnóstico completo finalizado', { 
      successfulConnections: connectionTests.filter(t => t.status === 'success').length,
      loginSuccessful: loginTest?.status === 'success'
    });

    return diagnostic;
  },

  // Generar recomendaciones basadas en los resultados
  generateRecommendations(connectionTests, loginTest) {
    const recommendations = [];
    
    const successfulConnections = connectionTests.filter(test => test.status === 'success');
    
    if (successfulConnections.length === 0) {
      recommendations.push({
        type: 'critical',
        message: 'No se pudo conectar con ningún endpoint. Verifica que el servidor esté funcionando.',
        action: 'Revisar estado del servidor API',
      });
    } else {
      recommendations.push({
        type: 'success',
        message: `Se encontraron ${successfulConnections.length} conexiones exitosas.`,
        action: 'Usar la primera conexión exitosa',
      });
    }

    if (loginTest && loginTest.status === 'error') {
      if (loginTest.error.type === 'connection_error') {
        recommendations.push({
          type: 'warning',
          message: 'Conexión exitosa pero login falló por problemas de red.',
          action: 'Verificar configuración de red',
        });
      } else if (loginTest.statusCode === 401) {
        recommendations.push({
          type: 'info',
          message: 'Login falló por credenciales incorrectas (esto es normal si las credenciales no son válidas).',
          action: 'Verificar credenciales de prueba',
        });
      }
    }

    return recommendations;
  },
};

export default connectionDiagnosticService;
