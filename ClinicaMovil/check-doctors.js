const axios = require('axios');

// Configuración de la API
const API_BASE_URL = 'http://localhost:3000';
const ADMIN_CREDENTIALS = {
  email: 'admin@clinica.com',
  password: 'admin123'
};

let authToken = null;

// Función para hacer login como administrador
async function loginAsAdmin() {
  try {
    console.log('🔐 Iniciando sesión como administrador...');
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, ADMIN_CREDENTIALS, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.data.token && response.data.usuario) {
      authToken = response.data.token;
      console.log('✅ Login exitoso como administrador');
      return true;
    } else {
      throw new Error('Respuesta de login inválida');
    }
  } catch (error) {
    console.error('❌ Error en login:', error.message);
    return false;
  }
}

// Función para obtener todos los doctores
async function getAllDoctors() {
  try {
    console.log('👨‍⚕️ Obteniendo todos los doctores...');
    const response = await axios.get(`${API_BASE_URL}/api/doctores`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📄 Response data:`, JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('❌ Error obteniendo doctores:', error.response?.data || error.message);
    return null;
  }
}

// Función para crear un doctor de prueba
async function createTestDoctor() {
  try {
    console.log('👨‍⚕️ Creando doctor de prueba...');
    
    const doctorData = {
      nombre: 'Dr. Carlos',
      apellido_paterno: 'Mendoza',
      apellido_materno: 'García',
      email: 'carlos.mendoza@clinica.com',
      telefono: '555-1234',
      especialidad: 'Medicina General',
      cedula_profesional: 'C12345678',
      universidad: 'Universidad Nacional',
      fecha_graduacion: '2010-06-15',
      experiencia_anos: 14,
      direccion: 'Calle Principal 456, Colonia Centro',
      estado: 'activo'
    };
    
    const response = await axios.post(`${API_BASE_URL}/api/doctores`, doctorData, {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📄 Response data:`, JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log('✅ Doctor creado exitosamente');
      return response.data.doctor;
    } else {
      throw new Error('Respuesta de creación de doctor inválida');
    }
  } catch (error) {
    console.error('❌ Error creando doctor:', error.response?.data || error.message);
    return null;
  }
}

// Función principal
async function checkAndCreateDoctors() {
  console.log('🚀 VERIFICANDO Y CREANDO DOCTORES');
  console.log('=' .repeat(50));
  
  // Paso 1: Login
  const loginSuccess = await loginAsAdmin();
  if (!loginSuccess) {
    console.log('❌ No se pudo hacer login');
    return false;
  }
  
  // Paso 2: Obtener doctores existentes
  const doctors = await getAllDoctors();
  if (doctors && doctors.length > 0) {
    console.log(`✅ Se encontraron ${doctors.length} doctores existentes`);
    
    // Verificar si hay doctores activos
    const activeDoctors = doctors.filter(doctor => doctor.estado === 'activo');
    if (activeDoctors.length > 0) {
      console.log(`✅ Se encontraron ${activeDoctors.length} doctores activos`);
      console.log('👨‍⚕️ Doctores activos:');
      activeDoctors.forEach(doctor => {
        console.log(`   - ${doctor.nombre} ${doctor.apellido_paterno} (${doctor.especialidad})`);
      });
      return true;
    } else {
      console.log('⚠️ No hay doctores activos, creando uno...');
    }
  } else {
    console.log('⚠️ No se encontraron doctores, creando uno...');
  }
  
  // Paso 3: Crear doctor de prueba
  const newDoctor = await createTestDoctor();
  if (newDoctor) {
    console.log('✅ Doctor de prueba creado exitosamente');
    return true;
  } else {
    console.log('❌ No se pudo crear el doctor de prueba');
    return false;
  }
}

// Ejecutar la verificación
checkAndCreateDoctors()
  .then(success => {
    if (success) {
      console.log('🎉 VERIFICACIÓN COMPLETADA EXITOSAMENTE');
      process.exit(0);
    } else {
      console.log('💥 VERIFICACIÓN FALLÓ');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 ERROR FATAL:', error);
    process.exit(1);
  });

