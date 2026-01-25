/**
 * Script completo para probar todos los endpoints usando http nativo
 * Usuario de prueba: Doctor@clinica.com
 */

import http from 'http';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'localhost';
const PORT = 3000;
const TEST_USER = {
  email: 'Doctor@clinica.com',
  password: 'Doctor123'
};

let authToken = null;

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Hacer una petición HTTP
 */
function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = responseData ? JSON.parse(responseData) : {};
          resolve({
            status: res.statusCode,
            data: parsed,
            success: res.statusCode >= 200 && res.statusCode < 400
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: responseData,
            success: res.statusCode >= 200 && res.statusCode < 400
          });
        }
      });
    });

    req.on('error', (error) => {
      const errorMsg = error.message || error.toString() || 'Unknown error';
      reject(new Error(`Request failed: ${errorMsg} (code: ${error.code || 'N/A'})`));
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout after 10 seconds'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Iniciar sesión
 */
async function login() {
  try {
    log('\n🔐 Iniciando sesión...', 'cyan');
    log(`   Email: ${TEST_USER.email}`, 'blue');
    
    const result = await makeRequest('POST', '/api/auth/login', {
      email: TEST_USER.email,
      password: TEST_USER.password
    });

    if (result.success && result.data.token) {
      authToken = result.data.token;
      log('✅ Login exitoso', 'green');
      log(`   Token: ${authToken.substring(0, 30)}...`, 'blue');
      return true;
    } else {
      log(`❌ Login falló - Status: ${result.status}`, 'red');
      log(`   Respuesta: ${JSON.stringify(result.data).substring(0, 200)}`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Error en login: ${error.message || error}`, 'red');
    if (error.stack) {
      log(`   Stack: ${error.stack.substring(0, 200)}`, 'yellow');
    }
    return false;
  }
}

/**
 * Probar un endpoint
 */
async function testEndpoint(method, path, name, requiresAuth = true) {
  try {
    log(`\n[${method}] ${name}`, 'blue');
    log(`   Path: ${path}`, 'cyan');
    
    const result = await makeRequest(method, path, null, requiresAuth ? authToken : null);
    
    if (result.success) {
      log(`   ✅ ${result.status} - OK`, 'green');
      if (result.data && typeof result.data === 'object') {
        const keys = Object.keys(result.data);
        if (keys.length > 0 && keys.length < 10) {
          log(`   Datos: ${keys.join(', ')}`, 'blue');
        } else if (keys.length >= 10) {
          log(`   Datos: ${keys.slice(0, 5).join(', ')}... (${keys.length} campos)`, 'blue');
        }
      }
      return { success: true, status: result.status };
    } else {
      log(`   ❌ ${result.status} - ${result.data?.error || result.data?.message || 'Error'}`, 'red');
      if (result.data) {
        const errorMsg = JSON.stringify(result.data).substring(0, 150);
        log(`   Detalles: ${errorMsg}`, 'yellow');
      }
      return { success: false, status: result.status };
    }
  } catch (error) {
    log(`   ❌ ERROR - ${error.message}`, 'red');
    return { success: false, status: 0 };
  }
}

/**
 * Probar todos los endpoints
 */
async function testAllEndpoints() {
  log('\n📋 INICIANDO PRUEBAS DE ENDPOINTS\n', 'cyan');
  log('='.repeat(60), 'cyan');

  // Primero hacer login
  const loginSuccess = await login();
  if (!loginSuccess) {
    log('\n❌ No se pudo iniciar sesión. Abortando pruebas.', 'red');
    return;
  }

  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  // Definir endpoints a probar
  const endpoints = [
    // Health check (sin auth)
    { method: 'GET', path: '/health', name: 'Health Check', requiresAuth: false },
    
    // Auth endpoints
    { method: 'GET', path: '/api/auth/usuarios', name: 'Listar Usuarios', requiresAuth: true },
    
    // Pacientes
    { method: 'GET', path: '/api/pacientes', name: 'Listar Pacientes', requiresAuth: true },
    { method: 'GET', path: '/api/pacientes?limit=10&offset=0', name: 'Listar Pacientes (paginado)', requiresAuth: true },
    
    // Doctores
    { method: 'GET', path: '/api/doctores', name: 'Listar Doctores', requiresAuth: true },
    { method: 'GET', path: '/api/doctores/perfil', name: 'Perfil Doctor', requiresAuth: true },
    
    // Citas
    { method: 'GET', path: '/api/citas', name: 'Listar Citas', requiresAuth: true },
    { method: 'GET', path: '/api/citas?limit=10', name: 'Listar Citas (paginado)', requiresAuth: true },
    
    // Signos Vitales
    { method: 'GET', path: '/api/signos-vitales', name: 'Listar Signos Vitales', requiresAuth: true },
    
    // Comorbilidades
    { method: 'GET', path: '/api/comorbilidades', name: 'Listar Comorbilidades', requiresAuth: true },
    
    // Medicamentos
    { method: 'GET', path: '/api/medicamentos', name: 'Listar Medicamentos', requiresAuth: true },
    
    // Diagnosticos
    { method: 'GET', path: '/api/diagnosticos', name: 'Listar Diagnosticos', requiresAuth: true },
    
    // Dashboard
    { method: 'GET', path: '/api/dashboard/doctor', name: 'Dashboard Doctor', requiresAuth: true },
    { method: 'GET', path: '/api/dashboard/doctor/stats', name: 'Stats Doctor', requiresAuth: true },
    
    // Notificaciones
    { method: 'GET', path: '/api/notificaciones', name: 'Listar Notificaciones', requiresAuth: true },
    
    // Modulos
    { method: 'GET', path: '/api/modulos', name: 'Listar Modulos', requiresAuth: true },
  ];

  log('\n🧪 Probando endpoints...\n', 'cyan');

  for (const endpoint of endpoints) {
    results.total++;
    const result = await testEndpoint(endpoint.method, endpoint.path, endpoint.name, endpoint.requiresAuth);
    
    if (result.success) {
      results.passed++;
    } else {
      results.failed++;
    }
    
    // Pequeña pausa entre requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Resumen
  log('\n' + '='.repeat(60), 'cyan');
  log('\n📊 RESUMEN DE PRUEBAS\n', 'cyan');
  log(`Total: ${results.total}`, 'blue');
  log(`✅ Exitosos: ${results.passed}`, 'green');
  log(`❌ Fallidos: ${results.failed}`, 'red');
  const successRate = ((results.passed / results.total) * 100).toFixed(1);
  log(`Porcentaje de éxito: ${successRate}%`, 
    results.passed === results.total ? 'green' : 'yellow');
  
  if (results.failed > 0) {
    log('\n⚠️  Algunos endpoints fallaron. Revisa los detalles arriba.', 'yellow');
  } else {
    log('\n🎉 ¡Todos los endpoints funcionan correctamente!', 'green');
  }
}

// Ejecutar pruebas
testAllEndpoints().catch(error => {
  log(`\n❌ Error fatal: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
