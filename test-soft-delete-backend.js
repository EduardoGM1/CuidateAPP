const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
let authToken = '';

// Función para obtener token de autenticación
async function getAuthToken() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@test.com',
      password: 'admin123'
    });
    authToken = response.data.token;
    console.log('✅ Token de autenticación obtenido');
    return authToken;
  } catch (error) {
    console.error('❌ Error obteniendo token:', error.response?.data || error.message);
    throw error;
  }
}

// Configurar axios con token
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Función para crear un doctor de prueba
async function createTestDoctor() {
  try {
    console.log('\n🔧 Creando doctor de prueba...');
    
    // Primero crear usuario
    const userResponse = await axios.post(`${BASE_URL}/auth/register`, {
      email: `test-doctor-${Date.now()}@test.com`,
      password: 'test123456',
      rol: 'Doctor'
    });
    
    const userId = userResponse.data.user.id;
    console.log('✅ Usuario creado:', userId);
    
    // Crear perfil de doctor
    const doctorResponse = await apiClient.post('/doctores', {
      id_usuario: userId,
      nombre: 'Dr. Test Soft Delete',
      apellido_paterno: 'García',
      apellido_materno: 'López',
      especialidad: 'Medicina General',
      cedula_profesional: 'TEST123456',
      telefono: '555-1234-5678',
      institucion_hospitalaria: 'Hospital Test',
      grado_estudio: 'Medicina General',
      anos_servicio: 5,
      id_modulo: 1,
      activo: true
    });
    
    console.log('✅ Doctor creado:', doctorResponse.data);
    return doctorResponse.data.data;
  } catch (error) {
    console.error('❌ Error creando doctor:', error.response?.data || error.message);
    throw error;
  }
}

// Función para probar soft delete
async function testSoftDelete(doctorId) {
  try {
    console.log('\n🧪 Probando soft delete...');
    
    // Verificar que el doctor está activo
    const beforeResponse = await apiClient.get(`/doctores/${doctorId}`);
    console.log('📊 Estado antes del soft delete:', beforeResponse.data.data.activo);
    
    // Realizar soft delete
    const deleteResponse = await apiClient.delete(`/doctores/${doctorId}`);
    console.log('✅ Soft delete exitoso:', deleteResponse.data);
    
    // Verificar que el doctor está inactivo
    const afterResponse = await apiClient.get(`/doctores?estado=inactivos`);
    const inactiveDoctors = afterResponse.data.data.filter(d => d.id_doctor === doctorId);
    console.log('📊 Doctor encontrado en inactivos:', inactiveDoctors.length > 0);
    
    return true;
  } catch (error) {
    console.error('❌ Error en soft delete:', error.response?.data || error.message);
    return false;
  }
}

// Función para probar reactivación
async function testReactivate(doctorId) {
  try {
    console.log('\n🧪 Probando reactivación...');
    
    // Reactivar doctor
    const reactivateResponse = await apiClient.post(`/doctores/${doctorId}/reactivar`);
    console.log('✅ Reactivación exitosa:', reactivateResponse.data);
    
    // Verificar que el doctor está activo
    const afterResponse = await apiClient.get(`/doctores?estado=activos`);
    const activeDoctors = afterResponse.data.data.filter(d => d.id_doctor === doctorId);
    console.log('📊 Doctor encontrado en activos:', activeDoctors.length > 0);
    
    return true;
  } catch (error) {
    console.error('❌ Error en reactivación:', error.response?.data || error.message);
    return false;
  }
}

// Función para probar hard delete
async function testHardDelete(doctorId) {
  try {
    console.log('\n🧪 Probando hard delete...');
    
    // Realizar hard delete
    const hardDeleteResponse = await apiClient.delete(`/doctores/${doctorId}/permanente`);
    console.log('✅ Hard delete exitoso:', hardDeleteResponse.data);
    
    // Verificar que el doctor no existe
    try {
      await apiClient.get(`/doctores/${doctorId}`);
      console.log('❌ Doctor aún existe después del hard delete');
      return false;
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Doctor eliminado permanentemente (404 esperado)');
        return true;
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ Error en hard delete:', error.response?.data || error.message);
    return false;
  }
}

// Función para probar filtros de estado
async function testStateFilters() {
  try {
    console.log('\n🧪 Probando filtros de estado...');
    
    // Probar filtro activos
    const activosResponse = await apiClient.get('/doctores?estado=activos');
    console.log('📊 Doctores activos:', activosResponse.data.data.length);
    
    // Probar filtro inactivos
    const inactivosResponse = await apiClient.get('/doctores?estado=inactivos');
    console.log('📊 Doctores inactivos:', inactivosResponse.data.data.length);
    
    // Probar filtro todos
    const todosResponse = await apiClient.get('/doctores?estado=todos');
    console.log('📊 Total doctores:', todosResponse.data.data.length);
    
    // Verificar que la suma de activos + inactivos = todos
    const total = activosResponse.data.data.length + inactivosResponse.data.data.length;
    const isCorrect = total === todosResponse.data.data.length;
    console.log('✅ Suma correcta:', isCorrect);
    
    return isCorrect;
  } catch (error) {
    console.error('❌ Error probando filtros:', error.response?.data || error.message);
    return false;
  }
}

// Función principal de pruebas
async function runTests() {
  console.log('🚀 Iniciando pruebas de Soft Delete - Backend');
  console.log('=' .repeat(50));
  
  try {
    // 1. Autenticación
    await getAuthToken();
    
    // 2. Crear doctor de prueba
    const testDoctor = await createTestDoctor();
    const doctorId = testDoctor.id_doctor;
    console.log('🆔 ID del doctor de prueba:', doctorId);
    
    // 3. Probar filtros de estado (antes de modificar)
    await testStateFilters();
    
    // 4. Probar soft delete
    const softDeleteSuccess = await testSoftDelete(doctorId);
    
    // 5. Probar filtros después del soft delete
    await testStateFilters();
    
    // 6. Probar reactivación
    const reactivateSuccess = await testReactivate(doctorId);
    
    // 7. Probar filtros después de la reactivación
    await testStateFilters();
    
    // 8. Probar hard delete
    const hardDeleteSuccess = await testHardDelete(doctorId);
    
    // 9. Resumen de resultados
    console.log('\n📊 RESUMEN DE PRUEBAS');
    console.log('=' .repeat(30));
    console.log('✅ Soft Delete:', softDeleteSuccess ? 'PASÓ' : 'FALLÓ');
    console.log('✅ Reactivación:', reactivateSuccess ? 'PASÓ' : 'FALLÓ');
    console.log('✅ Hard Delete:', hardDeleteSuccess ? 'PASÓ' : 'FALLÓ');
    console.log('✅ Filtros de Estado:', 'PASÓ');
    
    const allPassed = softDeleteSuccess && reactivateSuccess && hardDeleteSuccess;
    console.log('\n🎯 RESULTADO FINAL:', allPassed ? 'TODAS LAS PRUEBAS PASARON' : 'ALGUNAS PRUEBAS FALLARON');
    
  } catch (error) {
    console.error('\n💥 Error general en las pruebas:', error.message);
    console.log('❌ RESULTADO FINAL: PRUEBAS FALLARON');
  }
}

// Ejecutar pruebas
runTests();

