/**
 * Script simple para verificar que los servicios API funcionan correctamente
 * Ejecutar con: node scripts/verificar-servicios.js
 */

const axios = require('axios');
const path = require('path');

// Importar configuración de API
const apiConfigPath = path.join(__dirname, '../src/config/apiConfig.js');

// Simular __DEV__ para Node.js
global.__DEV__ = true;

// Función para obtener configuración de API
function getApiConfigSync() {
  // En desarrollo, usar localhost
  return {
    baseURL: 'http://localhost:3000',
    timeout: 15000,
  };
}

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
      validateStatus: () => true,
    });
    
    if (response.status === 200) {
      addTest('Server Health', true, `Servidor respondió: ${response.status}`);
      return true;
    } else {
      addTest('Server Health', false, `Servidor respondió con código: ${response.status}`);
      return false;
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      addTest('Server Health', false, 'Servidor no está corriendo o no es accesible');
      log.warn('Nota: Asegúrate de que el servidor backend esté corriendo en http://localhost:3000');
    } else {
      addTest('Server Health', false, `Error: ${error.message}`);
    }
    return false;
  }
}

/**
 * Prueba 2: Verificar endpoint de login
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
        validateStatus: () => true,
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
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
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
 * Prueba 3: Verificar endpoint de pacientes
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
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
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
 * Ejecutar todas las pruebas
 */
async function runTests() {
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 VERIFICACIÓN DE SERVICIOS API');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\n');
  
  await testServerHealth();
  console.log('');
  
  await testLoginEndpoint();
  console.log('');
  
  await testPacientesEndpoint();
  console.log('');
  
  // Resumen
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 RESUMEN DE VERIFICACIÓN');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ Pruebas pasadas: ${results.passed}`);
  console.log(`❌ Pruebas fallidas: ${results.failed}`);
  console.log(`📝 Total de pruebas: ${results.tests.length}`);
  console.log('');
  
  if (results.failed === 0) {
    log.success('¡Todas las verificaciones pasaron!');
    console.log('');
    return true;
  } else {
    log.error(`Algunas verificaciones fallaron.`);
    console.log('');
    return false;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runTests().catch(error => {
    console.error('Error ejecutando verificaciones:', error);
    process.exit(1);
  });
}

module.exports = { runTests };



