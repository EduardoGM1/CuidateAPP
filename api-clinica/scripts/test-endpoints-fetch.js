/**
 * Script para probar todos los endpoints usando fetch nativo
 * Usuario de prueba: Doctor@clinica.com
 */

import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
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
 * Iniciar sesión y obtener token
 */
async function login() {
  try {
    log('\n🔐 Iniciando sesión...', 'cyan');
    log(`   Email: ${TEST_USER.email}`, 'blue');
    
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password
      })
    });

    const data = await response.json();

    if (response.ok && data.token) {
      authToken = data.token;
      log('✅ Login exitoso', 'green');
      log(`   Token: ${authToken.substring(0, 30)}...`, 'blue');
      return true;
    } else {
      log(`❌ Login falló - Status: ${response.status}`, 'red');
      log(`   Respuesta: ${JSON.stringify(data).substring(0, 200)}`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Error en login: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Probar un endpoint
 */
async function testEndpoint(method, path, data = null, requiresAuth = true) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (requiresAuth && authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${BASE_URL}${path}`, options);
    const responseData = await response.json();
    
    const isSuccess = response.status >= 200 && response.status < 400;
    
    return {
      success: isSuccess,
      status: response.status,
      data: responseData,
      message: isSuccess ? 'OK' : `Status ${response.status}`
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      data: null,
      message: error.message || 'Error de conexión'
    };
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
    { method: 'GET', path: '/health', requiresAuth: false, name: 'Health Check' },
    
    // Auth endpoints
    { method: 'GET', path: '/api/auth/usuarios', requiresAuth: true, name: 'Listar Usuarios' },
    
    // Pacientes
    { method: 'GET', path: '/api/pacientes', requiresAuth: true, name: 'Listar Pacientes' },
    { method: 'GET', path: '/api/pacientes?limit=10&offset=0', requiresAuth: true, name: 'Listar Pacientes (paginado)' },
    
    // Doctores
    { method: 'GET', path: '/api/doctores', requiresAuth: true, name: 'Listar Doctores' },
    { method: 'GET', path: '/api/doctores/perfil', requiresAuth: true, name: 'Perfil Doctor' },
    
    // Citas
    { method: 'GET', path: '/api/citas', requiresAuth: true, name: 'Listar Citas' },
    { method: 'GET', path: '/api/citas?limit=10', requiresAuth: true, name: 'Listar Citas (paginado)' },
    
    // Signos Vitales
    { method: 'GET', path: '/api/signos-vitales', requiresAuth: true, name: 'Listar Signos Vitales' },
    
    // Comorbilidades
    { method: 'GET', path: '/api/comorbilidades', requiresAuth: true, name: 'Listar Comorbilidades' },
    
    // Medicamentos
    { method: 'GET', path: '/api/medicamentos', requiresAuth: true, name: 'Listar Medicamentos' },
    
    // Diagnosticos
    { method: 'GET', path: '/api/diagnosticos', requiresAuth: true, name: 'Listar Diagnosticos' },
    
    // Dashboard
    { method: 'GET', path: '/api/dashboard/doctor', requiresAuth: true, name: 'Dashboard Doctor' },
    { method: 'GET', path: '/api/dashboard/doctor/stats', requiresAuth: true, name: 'Stats Doctor' },
    
    // Notificaciones
    { method: 'GET', path: '/api/notificaciones', requiresAuth: true, name: 'Listar Notificaciones' },
    
    // Modulos
    { method: 'GET', path: '/api/modulos', requiresAuth: true, name: 'Listar Modulos' },
  ];

  log('\n🧪 Probando endpoints...\n', 'cyan');

  for (const endpoint of endpoints) {
    results.total++;
    const { method, path, requiresAuth, name } = endpoint;
    
    log(`\n[${method}] ${name || path}`, 'blue');
    log(`   Path: ${path}`, 'cyan');
    
    const result = await testEndpoint(method, path, null, requiresAuth);
    
    if (result.success) {
      log(`   ✅ ${result.status} - ${result.message}`, 'green');
      if (result.data && typeof result.data === 'object') {
        const dataKeys = Object.keys(result.data);
        if (dataKeys.length > 0 && dataKeys.length < 10) {
          log(`   Datos: ${dataKeys.join(', ')}`, 'blue');
        } else if (dataKeys.length >= 10) {
          log(`   Datos: ${dataKeys.slice(0, 5).join(', ')}... (${dataKeys.length} campos)`, 'blue');
        }
      }
      results.passed++;
    } else {
      log(`   ❌ ${result.status || 'ERROR'} - ${result.message}`, 'red');
      if (result.data) {
        const errorMsg = typeof result.data === 'object' 
          ? JSON.stringify(result.data).substring(0, 150)
          : result.data.toString().substring(0, 150);
        log(`   Detalles: ${errorMsg}`, 'yellow');
      }
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
  log(`Porcentaje de éxito: ${((results.passed / results.total) * 100).toFixed(1)}%`, 
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
