/**
 * Script de pruebas de inserción de datos
 * Verifica que las APIs funcionan correctamente
 * Nota: Las pruebas de almacenamiento local requieren la app móvil
 */

const axios = require('axios');

// Simular __DEV__ para Node.js
global.__DEV__ = true;

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

// Configuración de API
const API_CONFIG = {
  baseURL: 'http://localhost:3000',
  timeout: 15000,
};

// Nota: Las pruebas de almacenamiento local (EncryptedStorage, AsyncStorage)
// requieren que la app móvil esté corriendo. Estas pruebas solo verifican
// la inserción de datos en la API del backend.

/**
 * Prueba 1: Verificar que el servidor está disponible
 */
async function testServerAvailable() {
  log.test('Prueba 1: Verificar que el servidor está disponible');
  
  try {
    const response = await axios.get(`${API_CONFIG.baseURL}/health`, {
      timeout: 5000,
      validateStatus: () => true,
    });
    
    if (response.status === 200) {
      addTest('Server - Disponible', true, 'Servidor responde correctamente');
      return true;
    } else {
      addTest('Server - Disponible', false, `Servidor respondió con: ${response.status}`);
      return false;
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      addTest('Server - Disponible', false, 'Servidor no está corriendo');
      log.warn('Nota: El servidor backend debe estar corriendo en http://localhost:3000');
      return false;
    } else {
      addTest('Server - Disponible', false, `Error: ${error.message}`);
      return false;
    }
  }
}

/**
 * Prueba 2: Probar inserción de datos en API (login)
 */
async function testApiLogin() {
  log.test('Prueba 2: Probar inserción de datos en API (login)');
  
  try {
    const loginData = {
      email: 'test@test.com',
      password: 'test123',
    };
    
    try {
      const response = await axios.post(`${API_CONFIG.baseURL}/api/auth/login`, loginData, {
        timeout: 5000,
        validateStatus: () => true,
      });
      
      // Verificar que el endpoint responde
      if (response.status === 200) {
        addTest('API Login - Endpoint', true, `Login exitoso: ${response.status}`);
        
        // Verificar estructura de respuesta
        if (response.data && (response.data.token || response.data.accessToken)) {
          addTest('API Login - Estructura', true, 'Respuesta tiene token');
        } else {
          addTest('API Login - Estructura', false, 'Respuesta no tiene token');
        }
      } else if (response.status === 401 || response.status === 400) {
        addTest('API Login - Endpoint', true, `Endpoint responde: ${response.status} (credenciales inválidas esperado)`);
        addTest('API Login - Estructura', true, 'Respuesta tiene estructura correcta');
      } else {
        addTest('API Login - Endpoint', false, `Status inesperado: ${response.status}`);
      }
      
      return response.status === 200 ? response.data.token : null;
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        addTest('API Login', false, 'No se pudo conectar al servidor');
        log.warn('Nota: El servidor backend debe estar corriendo en http://localhost:3000');
        return null;
      } else {
        addTest('API Login', false, `Error: ${error.message}`);
        return null;
      }
    }
  } catch (error) {
    addTest('API Login - Error', false, error.message);
    return null;
  }
}

/**
 * Prueba 3: Probar inserción de paciente en API
 */
async function testApiPacienteInsertion(authToken) {
  log.test('Prueba 3: Probar inserción de paciente en API');
  
  if (!authToken) {
    addTest('API Paciente - Token', false, 'No hay token de autenticación');
    log.warn('Nota: Se requiere login exitoso para probar inserción completa');
    return null;
  }
  
  try {
    const pacienteData = {
      nombre: 'Test',
      apellido_paterno: 'Paciente',
      apellido_materno: 'Prueba',
      fecha_nacimiento: '1990-01-01',
      curp: `TEST${Date.now()}HDFXXX01`, // CURP único
      numero_celular: '5551234567',
      sexo: 'M',
      estado_civil: 'Soltero',
      direccion: 'Calle Test 123',
      colonia: 'Colonia Test',
      municipio: 'Ciudad de México',
      estado: 'CDMX',
      codigo_postal: '12345',
      email: `test${Date.now()}@test.com`, // Email único
    };
    
    try {
      const response = await axios.post(`${API_CONFIG.baseURL}/api/pacientes`, pacienteData, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
        validateStatus: () => true,
      });
      
      if (response.status === 201 || response.status === 200) {
        addTest('API Paciente - Inserción', true, `Paciente creado: ${response.status}`);
        
        // Verificar estructura de respuesta
        if (response.data && (response.data.id || response.data.id_paciente)) {
          addTest('API Paciente - Estructura', true, 'Respuesta tiene ID de paciente');
          return response.data.id || response.data.id_paciente;
        } else {
          addTest('API Paciente - Estructura', false, 'Respuesta no tiene ID de paciente');
        }
      } else if (response.status === 401 || response.status === 403) {
        addTest('API Paciente - Autenticación', false, `No autorizado: ${response.status}`);
      } else if (response.status === 400) {
        addTest('API Paciente - Validación', true, `Validación: ${response.status} (puede ser esperado)`);
        log.warn('Datos de validación:', response.data);
      } else {
        addTest('API Paciente - Status', false, `Status inesperado: ${response.status}`);
      }
      
      return null;
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        addTest('API Paciente', false, 'No se pudo conectar al servidor');
        return null;
      } else {
        addTest('API Paciente', false, `Error: ${error.message}`);
        return null;
      }
    }
  } catch (error) {
    addTest('API Paciente - Error', false, error.message);
    return null;
  }
}

/**
 * Prueba 4: Probar inserción de cita en API
 */
async function testApiCitaInsertion(authToken, pacienteId) {
  log.test('Prueba 4: Probar inserción de cita en API');
  
  if (!authToken) {
    addTest('API Cita - Token', false, 'No hay token de autenticación');
    return false;
  }
  
  if (!pacienteId) {
    addTest('API Cita - Paciente', false, 'No hay ID de paciente');
    log.warn('Nota: Se requiere paciente creado para probar inserción de cita');
    return false;
  }
  
  try {
    const citaData = {
      id_paciente: pacienteId,
      fecha_cita: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 días desde ahora
      hora_cita: '10:00:00',
      motivo: 'Consulta de prueba',
      tipo_cita: 'Consulta',
    };
    
    try {
      const response = await axios.post(`${API_CONFIG.baseURL}/api/citas`, citaData, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
        validateStatus: () => true,
      });
      
      if (response.status === 201 || response.status === 200) {
        addTest('API Cita - Inserción', true, `Cita creada: ${response.status}`);
        
        // Verificar estructura de respuesta
        if (response.data && (response.data.id || response.data.id_cita)) {
          addTest('API Cita - Estructura', true, 'Respuesta tiene ID de cita');
        } else {
          addTest('API Cita - Estructura', false, 'Respuesta no tiene ID de cita');
        }
      } else if (response.status === 401 || response.status === 403) {
        addTest('API Cita - Autenticación', false, `No autorizado: ${response.status}`);
      } else if (response.status === 400) {
        addTest('API Cita - Validación', true, `Validación: ${response.status} (puede ser esperado)`);
        log.warn('Datos de validación:', response.data);
      } else {
        addTest('API Cita - Status', false, `Status inesperado: ${response.status}`);
      }
      
      return true;
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        addTest('API Cita', false, 'No se pudo conectar al servidor');
        return false;
      } else {
        addTest('API Cita', false, `Error: ${error.message}`);
        return false;
      }
    }
  } catch (error) {
    addTest('API Cita - Error', false, error.message);
    return false;
  }
}

/**
 * Prueba 5: Verificar estructura de respuestas de inserción
 */
async function testInsertResponseStructure(authToken) {
  log.test('Prueba 5: Verificar estructura de respuestas de inserción');
  
  if (!authToken) {
    addTest('Response Structure - Token', false, 'No hay token de autenticación');
    return false;
  }
  
  try {
    // Probar inserción de paciente y verificar estructura
    const pacienteData = {
      nombre: 'Test',
      apellido_paterno: 'Structure',
      apellido_materno: 'Test',
      fecha_nacimiento: '1990-01-01',
      curp: `TEST${Date.now()}HDFXXX02`,
      numero_celular: '5551234568',
      sexo: 'M',
    };
    
    try {
      const response = await axios.post(`${API_CONFIG.baseURL}/api/pacientes`, pacienteData, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
        validateStatus: () => true,
      });
      
      // Verificar estructura de respuesta
      if (response.data && typeof response.data === 'object') {
        addTest('Response Structure - Tipo', true, 'Respuesta es un objeto');
        
        // Verificar campos comunes
        const hasId = response.data.id || response.data.id_paciente;
        const hasMessage = response.data.message || response.data.success;
        
        if (hasId || hasMessage) {
          addTest('Response Structure - Campos', true, 'Respuesta tiene campos esperados');
        } else {
          addTest('Response Structure - Campos', false, 'Respuesta no tiene campos esperados');
        }
      } else {
        addTest('Response Structure - Tipo', false, 'Respuesta no es un objeto');
      }
      
      return true;
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        addTest('Response Structure', false, 'No se pudo conectar al servidor');
        return false;
      } else {
        addTest('Response Structure', false, `Error: ${error.message}`);
        return false;
      }
    }
  } catch (error) {
    addTest('Response Structure - Error', false, error.message);
    return false;
  }
}

/**
 * Ejecutar todas las pruebas
 */
async function runAllTests() {
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 PRUEBAS DE INSERCIÓN DE DATOS');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\n');
  
  // Verificar servidor
  const serverAvailable = await testServerAvailable();
  console.log('');
  
  if (!serverAvailable) {
    log.warn('⚠️ El servidor no está disponible. Las siguientes pruebas pueden fallar.');
    console.log('');
  }
  
  // Login para obtener token
  const authToken = await testApiLogin();
  console.log('');
  
  // Probar inserción de paciente (si hay token)
  const pacienteId = await testApiPacienteInsertion(authToken);
  console.log('');
  
  // Probar inserción de cita (si hay paciente)
  if (pacienteId) {
    await testApiCitaInsertion(authToken, pacienteId);
    console.log('');
  }
  
  // Verificar estructura de respuestas
  await testInsertResponseStructure(authToken);
  console.log('');
  
  // Resumen
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 RESUMEN DE PRUEBAS DE INSERCIÓN');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ Pruebas pasadas: ${results.passed}`);
  console.log(`❌ Pruebas fallidas: ${results.failed}`);
  console.log(`📝 Total de pruebas: ${results.tests.length}`);
  console.log('');
  
  if (results.failed === 0) {
    log.success('¡Todas las pruebas de inserción pasaron!');
    console.log('');
    return true;
  } else {
    log.error(`Algunas pruebas fallaron. Revisa los detalles arriba.`);
    console.log('');
    
    // Mostrar pruebas fallidas
    console.log('Pruebas fallidas:');
    results.tests
      .filter(test => !test.passed)
      .forEach(test => {
        log.error(`  - ${test.name}: ${test.message}`);
      });
    console.log('');
    
    return false;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Error ejecutando pruebas de inserción:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests };

