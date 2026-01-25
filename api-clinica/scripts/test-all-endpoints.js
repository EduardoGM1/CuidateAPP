/**
 * Script para probar todos los endpoints del servidor
 * Usuario de prueba: doctor@clinica.com
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_USER = {
  email: 'Doctor@clinica.com',
  password: 'Doctor123' // Ajustar según la contraseña real
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
    
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    }, {
      timeout: 10000,
      validateStatus: () => true
    });

    if (response.status === 200 && response.data.token) {
      authToken = response.data.token;
      log('✅ Login exitoso', 'green');
      log(`   Token: ${authToken.substring(0, 30)}...`, 'blue');
      return true;
    } else {
      log(`❌ Login falló - Status: ${response.status}`, 'red');
      log(`   Respuesta: ${JSON.stringify(response.data).substring(0, 200)}`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Error en login: ${error.message}`, 'red');
    if (error.response) {
      log(`   Status: ${error.response.status}`, 'yellow');
      log(`   Data: ${JSON.stringify(error.response.data).substring(0, 200)}`, 'yellow');
    } else if (error.request) {
      log('   No se recibió respuesta del servidor', 'yellow');
      log(`   Verifica que el servidor esté corriendo en ${BASE_URL}`, 'yellow');
    }
    return false;
  }
}

/**
 * Probar un endpoint
 */
async function testEndpoint(method, path, data = null, requiresAuth = true) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${path}`,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 segundos de timeout
      validateStatus: () => true // No lanzar error en cualquier status
    };

    if (requiresAuth && authToken) {
      config.headers['Authorization'] = `Bearer ${authToken}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    
    // Considerar éxito si el status es 2xx o 3xx
    const isSuccess = response.status >= 200 && response.status < 400;
    
    return {
      success: isSuccess,
      status: response.status,
      data: response.data,
      message: isSuccess ? 'OK' : `Status ${response.status}`
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 0,
      data: error.response?.data || null,
      message: error.response?.data?.error || error.message || 'Error de conexión'
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
    { method: 'GET', path: '/health', requiresAuth: false },
    { method: 'GET', path: '/api/health', requiresAuth: false },
    
    // Auth endpoints (sin auth para algunos)
    { method: 'GET', path: '/api/auth/usuarios', requiresAuth: true },
    
    // Pacientes
    { method: 'GET', path: '/api/pacientes', requiresAuth: true },
    { method: 'GET', path: '/api/pacientes?limit=10&offset=0', requiresAuth: true },
    
    // Doctores
    { method: 'GET', path: '/api/doctores', requiresAuth: true },
    { method: 'GET', path: '/api/doctores/perfil', requiresAuth: true },
    
    // Citas
    { method: 'GET', path: '/api/citas', requiresAuth: true },
    { method: 'GET', path: '/api/citas?limit=10', requiresAuth: true },
    
    // Signos Vitales
    { method: 'GET', path: '/api/signos-vitales', requiresAuth: true },
    
    // Comorbilidades
    { method: 'GET', path: '/api/comorbilidades', requiresAuth: true },
    
    // Medicamentos
    { method: 'GET', path: '/api/medicamentos', requiresAuth: true },
    
    // Diagnosticos
    { method: 'GET', path: '/api/diagnosticos', requiresAuth: true },
    
    // Dashboard
    { method: 'GET', path: '/api/dashboard/doctor', requiresAuth: true },
    { method: 'GET', path: '/api/dashboard/stats', requiresAuth: true },
    
    // Notificaciones
    { method: 'GET', path: '/api/notificaciones', requiresAuth: true },
    
    // Modulos
    { method: 'GET', path: '/api/modulos', requiresAuth: true },
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
        if (dataKeys.length > 0) {
          log(`   Datos: ${dataKeys.join(', ')}`, 'blue');
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
  process.exit(1);
});
