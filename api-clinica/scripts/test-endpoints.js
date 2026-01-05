/**
 * Script de prueba para todos los endpoints de la API
 * Prueba con usuarios Admin y Doctor
 */

import axios from 'axios';

// Colores simples para la consola (sin dependencia externa)
const colors = {
  green: (str) => `\x1b[32m${str}\x1b[0m`,
  red: (str) => `\x1b[31m${str}\x1b[0m`,
  yellow: (str) => `\x1b[33m${str}\x1b[0m`,
  cyan: (str) => `\x1b[36m${str}\x1b[0m`,
  gray: (str) => `\x1b[90m${str}\x1b[0m`,
  bold: (str) => `\x1b[1m${str}\x1b[0m`
};

// Configuración
const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// Credenciales de prueba
const USERS = {
  admin: {
    email: 'admin@clinica.com',
    password: 'Admin123!',
    role: 'Admin'
  },
  doctor: {
    email: 'doctor@clinica.com',
    password: 'Doctor123!',
    role: 'Doctor'
  }
};

// Resultados de las pruebas
const results = {
  admin: { passed: 0, failed: 0, errors: [] },
  doctor: { passed: 0, failed: 0, errors: [] }
};

// Función para hacer login
async function login(user) {
  try {
    console.log(colors.cyan(`\n${'='.repeat(60)}`));
    console.log(colors.cyan(`🔐 Iniciando sesión como ${user.role}`));
    console.log(colors.gray(`📧 Email: ${user.email}`));
    
    const response = await axios.post(`${API_BASE}/mobile/login`, {
      email: user.email,
      password: user.password
    });
    
    if (response.data && response.data.token) {
      console.log(colors.green(`✅ Login exitoso`));
      return response.data.token;
    } else {
      throw new Error('No se recibió token en la respuesta');
    }
  } catch (error) {
    if (error.response) {
      console.error(colors.red(`❌ Error en login:`));
      console.error(colors.red(`   Status: ${error.response.status}`));
      console.error(colors.red(`   Data: ${JSON.stringify(error.response.data, null, 2)}`));
    } else if (error.request) {
      console.error(colors.red(`❌ Error de conexión:`));
      console.error(colors.red(`   No se recibió respuesta del servidor`));
      console.error(colors.red(`   URL: ${API_BASE}/mobile/login`));
      console.error(colors.yellow(`   💡 Verifica que el servidor esté corriendo en ${BASE_URL}`));
    } else {
      console.error(colors.red(`❌ Error: ${error.message}`));
      console.error(colors.red(`   Stack: ${error.stack}`));
    }
    throw error;
  }
}

// Función para probar un endpoint
async function testEndpoint(name, method, url, token, role, data = null) {
  try {
    const config = {
      method,
      url: `${API_BASE}${url}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Client-Type': 'mobile',
        'X-Platform': 'android'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const startTime = Date.now();
    const response = await axios(config);
    const duration = Date.now() - startTime;
    
    const status = response.status >= 200 && response.status < 300;
    
    if (status) {
      console.log(colors.green(`  ✅ ${name}`), colors.gray(`(${duration}ms)`));
      results[role.toLowerCase()].passed++;
      return { success: true, data: response.data, duration };
    } else {
      console.log(colors.yellow(`  ⚠️  ${name}`), colors.gray(`Status: ${response.status}`));
      results[role.toLowerCase()].passed++;
      return { success: true, data: response.data, duration };
    }
  } catch (error) {
    const status = error.response?.status || 'N/A';
    const message = error.response?.data?.message || error.message;
    
    console.log(colors.red(`  ❌ ${name}`));
    console.log(colors.red(`     Error: ${message}`));
    console.log(colors.gray(`     Status: ${status}`));
    
    results[role.toLowerCase()].failed++;
    results[role.toLowerCase()].errors.push({
      endpoint: name,
      url,
      status,
      message
    });
    
    return { success: false, error: message, status };
  }
}

// Endpoints a probar para Admin
const adminEndpoints = [
  { name: 'Dashboard Admin - Summary', method: 'GET', url: '/dashboard/admin/summary' },
  { name: 'Dashboard Admin - Metrics', method: 'GET', url: '/dashboard/admin/metrics' },
  { name: 'Dashboard Admin - Charts (citas)', method: 'GET', url: '/dashboard/admin/charts/citas' },
  { name: 'Dashboard Admin - Charts (pacientes)', method: 'GET', url: '/dashboard/admin/charts/pacientes' },
  { name: 'Dashboard Admin - Alerts', method: 'GET', url: '/dashboard/admin/alerts' },
  { name: 'Dashboard Admin - Analytics', method: 'GET', url: '/dashboard/admin/analytics' },
  { name: 'Dashboard Health', method: 'GET', url: '/dashboard/health' },
  { name: 'Mobile Config', method: 'GET', url: '/mobile/config' },
];

// Endpoints a probar para Doctor
const doctorEndpoints = [
  { name: 'Dashboard Doctor - Summary', method: 'GET', url: '/dashboard/doctor/summary' },
  { name: 'Dashboard Doctor - Patients', method: 'GET', url: '/dashboard/doctor/patients' },
  { name: 'Dashboard Doctor - Appointments', method: 'GET', url: '/dashboard/doctor/appointments' },
  { name: 'Dashboard Doctor - Messages', method: 'GET', url: '/dashboard/doctor/messages' },
  { name: 'Dashboard Health', method: 'GET', url: '/dashboard/health' },
  { name: 'Mobile Config', method: 'GET', url: '/mobile/config' },
];

// Función principal para probar un usuario
async function testUser(user, endpoints) {
  console.log(colors.cyan(`\n${'='.repeat(60)}`));
  console.log(colors.cyan(colors.bold(`🧪 PRUEBAS PARA ${user.role.toUpperCase()}`)));
  console.log(colors.cyan(`${'='.repeat(60)}`));
  
  let token;
  try {
    token = await login(user);
  } catch (error) {
    console.error(colors.red(`\n❌ No se pudo hacer login. Saltando pruebas para ${user.role}`));
    return;
  }
  
  console.log(colors.cyan(`\n📋 Probando ${endpoints.length} endpoints...\n`));
  
  for (const endpoint of endpoints) {
    await testEndpoint(
      endpoint.name,
      endpoint.method,
      endpoint.url,
      token,
      user.role
    );
    // Pequeña pausa para no sobrecargar el servidor
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Función para mostrar resumen
function showSummary() {
  console.log(colors.cyan(`\n${'='.repeat(60)}`));
  console.log(colors.cyan(colors.bold(`📊 RESUMEN DE PRUEBAS`)));
  console.log(colors.cyan(`${'='.repeat(60)}`));
  
  // Resumen Admin
  console.log(colors.cyan(colors.bold(`\n👤 ADMIN:`)));
  console.log(colors.green(`   ✅ Exitosas: ${results.admin.passed}`));
  console.log(colors.red(`   ❌ Fallidas: ${results.admin.failed}`));
  
  if (results.admin.errors.length > 0) {
    console.log(colors.yellow(`\n   Errores:`));
    results.admin.errors.forEach(err => {
      console.log(colors.red(`   - ${err.endpoint}: ${err.message} (${err.status})`));
    });
  }
  
  // Resumen Doctor
  console.log(colors.cyan(colors.bold(`\n👤 DOCTOR:`)));
  console.log(colors.green(`   ✅ Exitosas: ${results.doctor.passed}`));
  console.log(colors.red(`   ❌ Fallidas: ${results.doctor.failed}`));
  
  if (results.doctor.errors.length > 0) {
    console.log(colors.yellow(`\n   Errores:`));
    results.doctor.errors.forEach(err => {
      console.log(colors.red(`   - ${err.endpoint}: ${err.message} (${err.status})`));
    });
  }
  
  // Total
  const totalPassed = results.admin.passed + results.doctor.passed;
  const totalFailed = results.admin.failed + results.doctor.failed;
  const total = totalPassed + totalFailed;
  
  console.log(colors.cyan(`\n${'='.repeat(60)}`));
  console.log(colors.cyan(colors.bold(`📈 TOTAL:`)));
  console.log(colors.green(`   ✅ Exitosas: ${totalPassed}/${total} (${Math.round(totalPassed/total*100)}%)`));
  console.log(colors.red(`   ❌ Fallidas: ${totalFailed}/${total} (${Math.round(totalFailed/total*100)}%)`));
  console.log(colors.cyan(`${'='.repeat(60)}`));
}

// Función principal
async function main() {
  console.log(colors.cyan(colors.bold(`\n${'='.repeat(60)}`)));
  console.log(colors.cyan(colors.bold(`🚀 INICIANDO PRUEBAS DE ENDPOINTS`)));
  console.log(colors.cyan(colors.bold(`${'='.repeat(60)}`)));
  console.log(colors.gray(`🌐 Base URL: ${BASE_URL}`));
  console.log(colors.gray(`🔗 API Base: ${API_BASE}`));
  
  try {
    // Probar Admin
    await testUser(USERS.admin, adminEndpoints);
    
    // Probar Doctor
    await testUser(USERS.doctor, doctorEndpoints);
    
    // Mostrar resumen
    showSummary();
    
    // Exit code basado en resultados
    const totalFailed = results.admin.failed + results.doctor.failed;
    process.exit(totalFailed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error(colors.red(`\n❌ Error fatal:`), error.message);
    process.exit(1);
  }
}

// Ejecutar
main();

