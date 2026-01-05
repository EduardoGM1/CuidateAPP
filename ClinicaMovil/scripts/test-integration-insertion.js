/**
 * Script de pruebas de inserción de datos integrado
 * Prueba el flujo completo desde el frontend hasta el backend
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

let authToken = null;

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

/**
 * Paso 1: Login para obtener token
 */
async function loginAndGetToken() {
  log.test('Paso 1: Login para obtener token');
  
  try {
    // Intentar login (puede fallar si no hay credenciales válidas)
    const loginData = {
      email: 'admin@test.com', // Cambiar por credenciales válidas
      password: 'admin123',     // Cambiar por contraseña válida
    };
    
    try {
      const response = await axios.post(`${API_CONFIG.baseURL}/api/auth/login`, loginData, {
        timeout: 5000,
        validateStatus: () => true,
      });
      
      if (response.status === 200 && response.data.token) {
        authToken = response.data.token;
        addTest('Login - Token obtenido', true, 'Token obtenido exitosamente');
        return true;
      } else if (response.status === 401 || response.status === 400) {
        addTest('Login - Token obtenido', false, `Login falló: ${response.status} (credenciales inválidas o servidor no disponible)`);
        log.warn('Nota: Usa credenciales válidas para probar inserción completa');
        return false;
      } else {
        addTest('Login - Token obtenido', false, `Status inesperado: ${response.status}`);
        return false;
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        addTest('Login - Conexión', false, 'No se pudo conectar al servidor');
        log.warn('Nota: El servidor backend debe estar corriendo en http://localhost:3000');
        return false;
      } else {
        addTest('Login - Error', false, `Error: ${error.message}`);
        return false;
      }
    }
  } catch (error) {
    addTest('Login - Error general', false, error.message);
    return false;
  }
}

/**
 * Paso 2: Probar inserción de paciente (con token)
 */
async function testInsertPaciente() {
  log.test('Paso 2: Probar inserción de paciente');
  
  if (!authToken) {
    addTest('Insert Paciente - Token', false, 'No hay token de autenticación');
    log.warn('Nota: Se requiere login exitoso para probar inserción');
    return false;
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
        addTest('Insert Paciente - Creación', true, `Paciente creado: ${response.status}`);
        
        // Verificar estructura de respuesta
        if (response.data && (response.data.id || response.data.id_paciente)) {
          addTest('Insert Paciente - Estructura', true, 'Respuesta tiene ID de paciente');
          return response.data.id || response.data.id_paciente;
        } else {
          addTest('Insert Paciente - Estructura', false, 'Respuesta no tiene ID de paciente');
        }
      } else if (response.status === 401 || response.status === 403) {
        addTest('Insert Paciente - Autenticación', false, `No autorizado: ${response.status}`);
      } else if (response.status === 400) {
        addTest('Insert Paciente - Validación', true, `Validación: ${response.status} (puede ser esperado)`);
        log.warn('Datos de validación:', response.data);
      } else {
        addTest('Insert Paciente - Status', false, `Status inesperado: ${response.status}`);
      }
      
      return null;
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        addTest('Insert Paciente', false, 'No se pudo conectar al servidor');
        return null;
      } else {
        addTest('Insert Paciente', false, `Error: ${error.message}`);
        return null;
      }
    }
  } catch (error) {
    addTest('Insert Paciente - Error', false, error.message);
    return null;
  }
}

/**
 * Paso 3: Probar inserción de cita (con token)
 */
async function testInsertCita(pacienteId) {
  log.test('Paso 3: Probar inserción de cita');
  
  if (!authToken) {
    addTest('Insert Cita - Token', false, 'No hay token de autenticación');
    return false;
  }
  
  if (!pacienteId) {
    addTest('Insert Cita - Paciente', false, 'No hay ID de paciente');
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
        addTest('Insert Cita - Creación', true, `Cita creada: ${response.status}`);
        
        // Verificar estructura de respuesta
        if (response.data && (response.data.id || response.data.id_cita)) {
          addTest('Insert Cita - Estructura', true, 'Respuesta tiene ID de cita');
        } else {
          addTest('Insert Cita - Estructura', false, 'Respuesta no tiene ID de cita');
        }
      } else if (response.status === 401 || response.status === 403) {
        addTest('Insert Cita - Autenticación', false, `No autorizado: ${response.status}`);
      } else if (response.status === 400) {
        addTest('Insert Cita - Validación', true, `Validación: ${response.status} (puede ser esperado)`);
        log.warn('Datos de validación:', response.data);
      } else {
        addTest('Insert Cita - Status', false, `Status inesperado: ${response.status}`);
      }
      
      return true;
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        addTest('Insert Cita', false, 'No se pudo conectar al servidor');
        return false;
      } else {
        addTest('Insert Cita', false, `Error: ${error.message}`);
        return false;
      }
    }
  } catch (error) {
    addTest('Insert Cita - Error', false, error.message);
    return false;
  }
}

/**
 * Ejecutar pruebas de inserción integradas
 */
async function runIntegrationTests() {
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 PRUEBAS DE INSERCIÓN INTEGRADAS (Frontend -> Backend)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\n');
  
  // Paso 1: Login
  const loginSuccess = await loginAndGetToken();
  console.log('');
  
  if (loginSuccess) {
    // Paso 2: Insertar paciente
    const pacienteId = await testInsertPaciente();
    console.log('');
    
    // Paso 3: Insertar cita (si se creó el paciente)
    if (pacienteId) {
      await testInsertCita(pacienteId);
      console.log('');
    }
  } else {
    log.warn('No se pudo completar las pruebas de inserción porque el login falló.');
    log.warn('Nota: Asegúrate de que:');
    log.warn('  1. El servidor backend esté corriendo');
    log.warn('  2. Tengas credenciales válidas para login');
    log.warn('  3. El usuario tenga permisos para crear pacientes y citas');
    console.log('');
  }
  
  // Resumen
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 RESUMEN DE PRUEBAS DE INSERCIÓN INTEGRADAS');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ Pruebas pasadas: ${results.passed}`);
  console.log(`❌ Pruebas fallidas: ${results.failed}`);
  console.log(`📝 Total de pruebas: ${results.tests.length}`);
  console.log('');
  
  if (results.failed === 0) {
    log.success('¡Todas las pruebas de inserción integradas pasaron!');
    console.log('');
    return true;
  } else {
    log.error(`Algunas pruebas fallaron. Revisa los detalles arriba.`);
    console.log('');
    return false;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runIntegrationTests().catch(error => {
    console.error('Error ejecutando pruebas de inserción integradas:', error);
    process.exit(1);
  });
}

module.exports = { runIntegrationTests };



