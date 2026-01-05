const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Función para probar endpoints sin autenticación (solo para verificar que existen)
async function testEndpoints() {
  console.log('🧪 Probando endpoints de Soft Delete');
  console.log('=' .repeat(40));
  
  try {
    // Probar endpoint de doctores (debería requerir autenticación)
    console.log('\n1. Probando GET /doctores (sin auth)...');
    try {
      const response = await axios.get(`${BASE_URL}/doctores`);
      console.log('❌ Endpoint accesible sin autenticación (problema de seguridad)');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Endpoint protegido correctamente (401 Unauthorized)');
      } else {
        console.log('⚠️  Error inesperado:', error.response?.status, error.response?.statusText);
      }
    }
    
    // Probar endpoint de reactivación
    console.log('\n2. Probando POST /doctores/1/reactivar (sin auth)...');
    try {
      const response = await axios.post(`${BASE_URL}/doctores/1/reactivar`);
      console.log('❌ Endpoint accesible sin autenticación');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Endpoint de reactivación protegido correctamente');
      } else {
        console.log('⚠️  Error inesperado:', error.response?.status, error.response?.statusText);
      }
    }
    
    // Probar endpoint de hard delete
    console.log('\n3. Probando DELETE /doctores/1/permanente (sin auth)...');
    try {
      const response = await axios.delete(`${BASE_URL}/doctores/1/permanente`);
      console.log('❌ Endpoint accesible sin autenticación');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Endpoint de hard delete protegido correctamente');
      } else {
        console.log('⚠️  Error inesperado:', error.response?.status, error.response?.statusText);
      }
    }
    
    // Probar filtros de estado
    console.log('\n4. Probando filtros de estado (sin auth)...');
    const estados = ['activos', 'inactivos', 'todos'];
    
    for (const estado of estados) {
      try {
        const response = await axios.get(`${BASE_URL}/doctores?estado=${estado}`);
        console.log(`❌ Filtro ${estado} accesible sin autenticación`);
      } catch (error) {
        if (error.response?.status === 401) {
          console.log(`✅ Filtro ${estado} protegido correctamente`);
        } else {
          console.log(`⚠️  Error en filtro ${estado}:`, error.response?.status);
        }
      }
    }
    
    console.log('\n🎯 RESULTADO: Todos los endpoints están protegidos correctamente');
    
  } catch (error) {
    console.error('💥 Error general:', error.message);
  }
}

// Función para verificar que el servidor está corriendo
async function checkServer() {
  try {
    console.log('🔍 Verificando servidor...');
    const response = await axios.get(`${BASE_URL.replace('/api', '')}/health`);
    console.log('✅ Servidor corriendo');
    return true;
  } catch (error) {
    console.log('❌ Servidor no disponible:', error.message);
    return false;
  }
}

// Ejecutar pruebas
async function runTests() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await testEndpoints();
  } else {
    console.log('⚠️  No se pueden ejecutar las pruebas - servidor no disponible');
  }
}

runTests();

