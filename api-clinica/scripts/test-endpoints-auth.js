/**
 * Script para probar endpoints HTTP de autenticación de pacientes
 * 
 * Prueba los endpoints reales usando fetch/axios
 * Útil para verificar que el servidor responde correctamente
 */

import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const API_PREFIX = '/api';

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

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    testsPassed++;
    log.success(message);
    return true;
  } else {
    testsFailed++;
    log.error(message);
    return false;
  }
}

async function testEndpoints() {
  try {
    console.log('\n' + '='.repeat(80));
    log.info('INICIANDO PRUEBAS DE ENDPOINTS HTTP');
    console.log('='.repeat(80));
    log.info(`Base URL: ${API_BASE_URL}\n`);

    // Configurar paciente de prueba (ajustar según tu BD)
    const testPacienteId = 1; // Cambiar por ID real de paciente en tu BD
    const testPIN = '5678'; // Cambiar por PIN configurado
    const testDeviceId = `test_endpoint_${Date.now()}`;
    let authId = null;
    let pinId = null;

    console.log('-'.repeat(80));
    log.test('PRUEBA 1: Setup PIN');
    console.log('-'.repeat(80));

    try {
      const setupResponse = await axios.post(
        `${API_BASE_URL}${API_PREFIX}/paciente-auth/setup-pin`,
        {
          id_paciente: testPacienteId,
          pin: testPIN,
          device_id: testDeviceId
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000
        }
      );

      assert(setupResponse.status === 200 || setupResponse.status === 201, 'Setup PIN retornó status 200/201');
      assert(setupResponse.data.success === true, 'Response tiene success: true');
      assert(setupResponse.data.data !== undefined, 'Response incluye campo data');
      assert(setupResponse.data.data.auth_id !== undefined, 'Response incluye auth_id');
      assert(setupResponse.data.data.pin_id !== undefined, 'Response incluye pin_id');
      
      authId = setupResponse.data.data.auth_id;
      pinId = setupResponse.data.data.pin_id;
      
      log.info(`Auth ID creado: ${authId}, PIN ID: ${pinId}`);
    } catch (error) {
      if (error.response) {
        log.warn(`Setup PIN falló: ${error.response.status} - ${error.response.data.error || error.response.data.message}`);
        log.info('Esto es normal si el PIN ya estaba configurado. Continuando con login...');
      } else {
        assert(false, `Error de conexión en Setup PIN: ${error.message}`);
      }
    }

    console.log('\n' + '-'.repeat(80));
    log.test('PRUEBA 2: Login con PIN Correcto');
    console.log('-'.repeat(80));

    try {
      const loginResponse = await axios.post(
        `${API_BASE_URL}${API_PREFIX}/paciente-auth/login-pin`,
        {
          id_paciente: testPacienteId,
          pin: testPIN,
          device_id: testDeviceId
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000
        }
      );

      assert(loginResponse.status === 200, 'Login retornó status 200');
      assert(loginResponse.data.success === true || loginResponse.data.token !== undefined, 'Response tiene token o success');
      assert(loginResponse.data.token !== undefined, 'Response incluye token JWT');
      assert(loginResponse.data.paciente !== undefined, 'Response incluye datos del paciente');
      assert(loginResponse.data.paciente.id_paciente === testPacienteId, 'ID de paciente en response es correcto');
      assert(loginResponse.data.paciente.nombre !== undefined, 'Response incluye nombre del paciente');
      
      log.info(`Token recibido: ${loginResponse.data.token.substring(0, 20)}...`);
      log.info(`Paciente: ${loginResponse.data.paciente.nombre} ${loginResponse.data.paciente.apellido_paterno || ''}`);
    } catch (error) {
      if (error.response) {
        assert(false, `Login falló: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else {
        assert(false, `Error de conexión en Login: ${error.message}`);
      }
    }

    console.log('\n' + '-'.repeat(80));
    log.test('PRUEBA 3: Login con PIN Incorrecto');
    console.log('-'.repeat(80));

    try {
      await axios.post(
        `${API_BASE_URL}${API_PREFIX}/paciente-auth/login-pin`,
        {
          id_paciente: testPacienteId,
          pin: '9999',
          device_id: testDeviceId
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000
        }
      );

      assert(false, 'Login con PIN incorrecto NO debería ser exitoso');
    } catch (error) {
      if (error.response) {
        assert(error.response.status === 401, `Login rechazado con status 401 (recibido: ${error.response.status})`);
        assert(error.response.data.error !== undefined || error.response.data.success === false, 'Response incluye error');
        assert(
          error.response.data.error.includes('incorrecto') || 
          error.response.data.attempts_remaining !== undefined,
          'Response incluye información sobre intentos'
        );
        log.info(`Mensaje de error: ${error.response.data.error}`);
      } else {
        assert(false, `Error de conexión: ${error.message}`);
      }
    }

    console.log('\n' + '-'.repeat(80));
    log.test('PRUEBA 4: Validaciones de Setup PIN');
    console.log('-'.repeat(80));

    // Test 4.1: PIN con formato inválido
    try {
      await axios.post(
        `${API_BASE_URL}${API_PREFIX}/paciente-auth/setup-pin`,
        {
          id_paciente: testPacienteId,
          pin: '123',
          device_id: testDeviceId
        }
      );
      assert(false, 'Setup PIN con formato inválido NO debería ser exitoso');
    } catch (error) {
      if (error.response) {
        assert(error.response.status === 400, `Validación rechazada con status 400 (recibido: ${error.response.status})`);
        log.info(`✅ PIN inválido rechazado: ${error.response.data.error}`);
      }
    }

    // Test 4.2: PIN débil
    try {
      await axios.post(
        `${API_BASE_URL}${API_PREFIX}/paciente-auth/setup-pin`,
        {
          id_paciente: testPacienteId,
          pin: '1234',
          device_id: testDeviceId
        }
      );
      assert(false, 'Setup PIN con PIN débil NO debería ser exitoso');
    } catch (error) {
      if (error.response) {
        assert(error.response.status === 400, `PIN débil rechazado con status 400`);
        log.info(`✅ PIN débil rechazado: ${error.response.data.error}`);
      }
    }

    // Test 4.3: Campos faltantes
    try {
      await axios.post(
        `${API_BASE_URL}${API_PREFIX}/paciente-auth/setup-pin`,
        {
          id_paciente: testPacienteId
          // Faltan pin y device_id
        }
      );
      assert(false, 'Setup PIN sin campos requeridos NO debería ser exitoso');
    } catch (error) {
      if (error.response) {
        assert(error.response.status === 400, `Campos faltantes rechazados con status 400`);
        log.info(`✅ Campos faltantes rechazados: ${error.response.data.error}`);
      }
    }

    console.log('\n' + '-'.repeat(80));
    log.test('PRUEBA 5: Verificar Bloqueo de Cuenta');
    console.log('-'.repeat(80));

    // Hacer 3 intentos fallidos
    for (let i = 1; i <= 3; i++) {
      try {
        await axios.post(
          `${API_BASE_URL}${API_PREFIX}/paciente-auth/login-pin`,
          {
            id_paciente: testPacienteId,
            pin: '9999',
            device_id: testDeviceId
          }
        );
      } catch (error) {
        if (error.response) {
          log.info(`Intento ${i}: ${error.response.data.error} (Intentos restantes: ${error.response.data.attempts_remaining || 'N/A'})`);
        }
      }
    }

    // 4to intento debería estar bloqueado
    try {
      await axios.post(
        `${API_BASE_URL}${API_PREFIX}/paciente-auth/login-pin`,
        {
          id_paciente: testPacienteId,
          pin: '9999',
          device_id: testDeviceId
        }
      );
      assert(false, 'Cuenta bloqueada NO debería permitir login');
    } catch (error) {
      if (error.response) {
        const isBlocked = error.response.status === 423 || 
                         (error.response.data.error && error.response.data.error.includes('bloqueada'));
        assert(isBlocked, `Cuenta bloqueada correctamente (status: ${error.response.status})`);
        log.info(`✅ Bloqueo confirmado: ${error.response.data.error}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    log.info('RESUMEN DE PRUEBAS HTTP');
    console.log('='.repeat(80));
    console.log(`${colors.green}✅ Pruebas pasadas: ${testsPassed}${colors.reset}`);
    console.log(`${colors.red}❌ Pruebas fallidas: ${testsFailed}${colors.reset}`);
    console.log(`${colors.blue}📊 Total: ${testsPassed + testsFailed}${colors.reset}`);
    
    if (testsFailed === 0) {
      log.success('¡Todas las pruebas HTTP pasaron exitosamente!');
    } else {
      log.error('Algunas pruebas HTTP fallaron. Revisa los errores arriba.');
    }

    console.log('\n');
    log.info('NOTA: Asegúrate de que el servidor esté corriendo en ' + API_BASE_URL);
    log.info('NOTA: Ajusta testPacienteId y testPIN según tus datos de prueba');

    process.exit(testsFailed === 0 ? 0 : 1);
  } catch (error) {
    log.error(`Error en pruebas HTTP: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

testEndpoints();



