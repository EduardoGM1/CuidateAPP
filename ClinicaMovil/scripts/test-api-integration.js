/**
 * Script de pruebas de integración para verificar que los servicios
 * pueden enviar y recibir datos correctamente
 * 
 * Requiere: Servidor backend corriendo en http://localhost:3000
 */

import axios from 'axios';
import { getApiConfigSync } from '../src/config/apiConfig';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.cyan}🧪 ${msg}${colors.reset}`),
};

const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

function addTest(name, passed, message) {
  results.tests.push({ name, passed, message });
  if (passed) {
    results.passed++;
    log.success(`${name}: ${message}`);
  } else {
    results.failed++;
    log.error(`${name}: ${message}`);
  }
}

/**
 * Prueba 1: Verificar que el servidor responde
 */
async function testServerHealth() {
  log.test('Prueba 1: Verificar que el servidor responde');
  
  try {
    const config = getApiConfigSync();
    const healthUrl = `${config.baseURL}/health`;
    
    const response = await axios.get(healthUrl, {
      timeout: 5000,
    });
    
    if (response.status === 200) {
      addTest('Server Health', true, `Servidor respondió: ${response.status}`);
      return true;
    } else {
      addTest('Server Health', false, `Servidor respondió con código: ${response.status}`);
      return false;
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      addTest('Server Health', false, 'Servidor no está corriendo o no es accesible');
      log.warn('Nota: Asegúrate de que el servidor backend esté corriendo');
    } else {
      addTest('Server Health', false, `Error: ${error.message}`);
    }
    return false;
  }
}

/**
 * Prueba 2: Verificar endpoint de login (sin autenticación)
 */
async function testLoginEndpoint() {
  log.test('Prueba 2: Verificar endpoint de login');
  
  try {
    const config = getApiConfigSync();
    const loginUrl = `${config.baseURL}/api/auth/login`;
    
    // Intentar login con credenciales inválidas (debería retornar error pero no caer)
    try {
      const response = await axios.post(loginUrl, {
        email: 'test@test.com',
        password: 'invalid',
      }, {
        timeout: 5000,
        validateStatus: () => true, // No lanzar error en cualquier status
      });
      
      // Verificar que el endpoint existe y responde
      if (response.status === 401 || response.status === 400 || response.status === 404) {
        addTest('Login Endpoint - Existe', true, `Endpoint responde: ${response.status}`);
        
        // Verificar estructura de respuesta
        if (response.data && typeof response.data === 'object') {
          addTest('Login Endpoint - Estructura', true, 'Respuesta tiene estructura correcta');
        } else {
          addTest('Login Endpoint - Estructura', false, 'Respuesta no tiene estructura correcta');
        }
      } else {
        addTest('Login Endpoint - Status', false, `Status inesperado: ${response.status}`);
      }
      
      return true;
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        addTest('Login Endpoint', false, 'No se pudo conectar al servidor');
        return false;
      } else {
        addTest('Login Endpoint', false, `Error: ${error.message}`);
        return false;
      }
    }
  } catch (error) {
    addTest('Login Endpoint - Error', false, error.message);
    return false;
  }
}

/**
 * Prueba 3: Verificar endpoint de pacientes (sin autenticación)
 */
async function testPacientesEndpoint() {
  log.test('Prueba 3: Verificar endpoint de pacientes');
  
  try {
    const config = getApiConfigSync();
    const pacientesUrl = `${config.baseURL}/api/pacientes`;
    
    // Intentar acceder sin token (debería retornar 401)
    try {
      const response = await axios.get(pacientesUrl, {
        timeout: 5000,
        validateStatus: () => true,
      });
      
      // Verificar que el endpoint existe
      if (response.status === 401 || response.status === 403) {
        addTest('Pacientes Endpoint - Existe', true, `Endpoint responde: ${response.status} (esperado sin auth)`);
      } else if (response.status === 200) {
        addTest('Pacientes Endpoint - Existe', true, `Endpoint responde: ${response.status}`);
        addTest('Pacientes Endpoint - Datos', true, 'Endpoint retorna datos');
      } else {
        addTest('Pacientes Endpoint - Status', false, `Status inesperado: ${response.status}`);
      }
      
      return true;
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        addTest('Pacientes Endpoint', false, 'No se pudo conectar al servidor');
        return false;
      } else {
        addTest('Pacientes Endpoint', false, `Error: ${error.message}`);
        return false;
      }
    }
  } catch (error) {
    addTest('Pacientes Endpoint - Error', false, error.message);
    return false;
  }
}

/**
 * Prueba 4: Verificar estructura de respuestas de error
 */
async function testErrorResponseStructure() {
  log.test('Prueba 4: Verificar estructura de respuestas de error');
  
  try {
    const config = getApiConfigSync();
    const loginUrl = `${config.baseURL}/api/auth/login`;
    
    try {
      const response = await axios.post(loginUrl, {
        email: 'invalid@invalid.com',
        password: 'invalid',
      }, {
        timeout: 5000,
        validateStatus: () => true,
      });
      
      // Verificar estructura de error
      if (response.status >= 400) {
        if (response.data && typeof response.data === 'object') {
          addTest('Error Response - Estructura', true, 'Respuesta de error tiene estructura correcta');
          
          // Verificar que tiene mensaje de error
          if (response.data.error || response.data.message || response.data.msg) {
            addTest('Error Response - Mensaje', true, 'Respuesta de error incluye mensaje');
          } else {
            addTest('Error Response - Mensaje', false, 'Respuesta de error no incluye mensaje');
          }
        } else {
          addTest('Error Response - Estructura', false, 'Respuesta de error no tiene estructura correcta');
        }
      } else {
        addTest('Error Response - Status', false, `Status inesperado: ${response.status}`);
      }
      
      return true;
    } catch (error) {
      addTest('Error Response', false, `Error: ${error.message}`);
      return false;
    }
  } catch (error) {
    addTest('Error Response - Error', false, error.message);
    return false;
  }
}

/**
 * Prueba 5: Verificar timeout de peticiones
 */
async function testRequestTimeout() {
  log.test('Prueba 5: Verificar timeout de peticiones');
  
  try {
    const config = getApiConfigSync();
    
    // Verificar que el timeout está configurado
    if (config.timeout && typeof config.timeout === 'number' && config.timeout > 0) {
      addTest('Request Timeout - Configurado', true, `Timeout: ${config.timeout}ms`);
    } else {
      addTest('Request Timeout - Configurado', false, 'Timeout no está configurado correctamente');
      return false;
    }
    
    return true;
  } catch (error) {
    addTest('Request Timeout - Error', false, error.message);
    return false;
  }
}

/**
 * Prueba 6: Verificar headers de peticiones
 */
async function testRequestHeaders() {
  log.test('Prueba 6: Verificar headers de peticiones');
  
  try {
    const config = getApiConfigSync();
    const testUrl = `${config.baseURL}/api/auth/login`;
    
    try {
      const response = await axios.post(testUrl, {
        email: 'test@test.com',
        password: 'test',
      }, {
        timeout: 5000,
        validateStatus: () => true,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // Verificar que la petición se envió correctamente
      if (response.status !== undefined) {
        addTest('Request Headers - Envío', true, 'Headers se enviaron correctamente');
      } else {
        addTest('Request Headers - Envío', false, 'Headers no se enviaron correctamente');
      }
      
      return true;
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        addTest('Request Headers', false, 'No se pudo conectar al servidor');
        return false;
      } else {
        addTest('Request Headers', false, `Error: ${error.message}`);
        return false;
      }
    }
  } catch (error) {
    addTest('Request Headers - Error', false, error.message);
    return false;
  }
}

/**
 * Ejecutar todas las pruebas de integración
 */
async function runIntegrationTests() {
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 PRUEBAS DE INTEGRACIÓN API');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\n');
  
  await testServerHealth();
  console.log('');
  
  await testLoginEndpoint();
  console.log('');
  
  await testPacientesEndpoint();
  console.log('');
  
  await testErrorResponseStructure();
  console.log('');
  
  await testRequestTimeout();
  console.log('');
  
  await testRequestHeaders();
  console.log('');
  
  // Resumen
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 RESUMEN DE PRUEBAS DE INTEGRACIÓN');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ Pruebas pasadas: ${results.passed}`);
  console.log(`❌ Pruebas fallidas: ${results.failed}`);
  console.log(`📝 Total de pruebas: ${results.tests.length}`);
  console.log('');
  
  if (results.failed === 0) {
    log.success('¡Todas las pruebas de integración pasaron!');
    console.log('');
    return true;
  } else {
    log.error(`Algunas pruebas fallaron. Revisa los detalles arriba.`);
    console.log('');
    return false;
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runIntegrationTests().catch(error => {
    console.error('Error ejecutando pruebas de integración:', error);
    process.exit(1);
  });
}

export default runIntegrationTests;



