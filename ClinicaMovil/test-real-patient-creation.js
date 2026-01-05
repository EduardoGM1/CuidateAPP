const axios = require('axios');

// Configuración de la API
const API_BASE_URL = 'http://localhost:3000';
const ADMIN_CREDENTIALS = {
  email: 'admin@clinica.com',
  password: 'admin123'
};

// Datos de prueba realistas para un paciente
const TEST_PATIENT_DATA = {
  // Paso 1: PIN
  pin: '1234',
  
  // Paso 2: Datos del paciente
  paciente: {
    nombre: 'María',
    apellido_paterno: 'González',
    apellido_materno: 'López',
    fecha_nacimiento: '1985-03-15',
    sexo: 'Mujer',
    telefono: '555-1234',
    email: 'maria.gonzalez@email.com',
    direccion: 'Calle Principal 123, Colonia Centro',
    ocupacion: 'Maestra',
    estado_civil: 'Casada',
    escolaridad: 'Universidad'
  },
  
  // Paso 3: Red de apoyo
  redApoyo: {
    contacto_emergencia: {
      nombre: 'Juan González',
      parentesco: 'Esposo',
      telefono: '555-5678',
      direccion: 'Calle Principal 123, Colonia Centro'
    },
    contacto_medico: {
      nombre: 'Dr. Carlos Mendoza',
      especialidad: 'Medicina General',
      telefono: '555-9999',
      consultorio: 'Hospital Central'
    }
  },
  
  // Paso 4: Primera consulta
  primeraConsulta: {
    fecha: new Date().toISOString().split('T')[0], // Fecha actual
    idDoctor: null, // Se asignará después de obtener doctores
    motivo: 'Consulta de rutina y evaluación general',
    enfermedades_cronicas: ['Diabetes', 'Hipertensión'],
    tratamiento_actual: 'con_medicamento',
    medicamentos: [
      {
        nombre: 'Metformina',
        dosis: '500mg',
        frecuencia: '2 veces al día',
        indicaciones: 'Para control de diabetes'
      },
      {
        nombre: 'Losartán',
        dosis: '50mg',
        frecuencia: '1 vez al día',
        indicaciones: 'Para control de presión arterial'
      }
    ],
    tratamiento_sin_medicamento: '',
    alergias: 'Penicilina',
    antecedentes_familiares: 'Diabetes en madre y abuela',
    habitos: {
      fuma: false,
      bebe_alcohol: false,
      hace_ejercicio: true,
      frecuencia_ejercicio: '3 veces por semana'
    },
    observaciones: 'Paciente colaboradora, cumple con tratamiento médico'
  }
};

let authToken = null;
let doctorId = null;

// Función para hacer login como administrador
async function loginAsAdmin() {
  try {
    console.log('🔐 Iniciando sesión como administrador...');
    console.log(`📡 URL: ${API_BASE_URL}/api/auth/login`);
    console.log(`📧 Email: ${ADMIN_CREDENTIALS.email}`);
    
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, ADMIN_CREDENTIALS, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📄 Response data:`, JSON.stringify(response.data, null, 2));
    
    if (response.data.token && response.data.usuario) {
      authToken = response.data.token;
      console.log('✅ Login exitoso como administrador');
      console.log(`👤 Usuario: ${response.data.usuario.email}`);
      console.log(`🎭 Rol: ${response.data.usuario.rol}`);
      return true;
    } else {
      throw new Error('Respuesta de login inválida');
    }
  } catch (error) {
    console.error('❌ Error en login:');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    return false;
  }
}

// Función para obtener doctores activos
async function getActiveDoctors() {
  try {
    console.log('👨‍⚕️ Obteniendo doctores activos...');
    const response = await axios.get(`${API_BASE_URL}/api/doctores`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📄 Response data:`, JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.data && response.data.data.length > 0) {
      // Filtrar doctores activos (activo: true)
      const activeDoctors = response.data.data.filter(doctor => doctor.activo === true);
      
      if (activeDoctors.length > 0) {
        doctorId = activeDoctors[0].id_doctor;
        console.log(`✅ Doctor encontrado: ${activeDoctors[0].nombre} ${activeDoctors[0].apellido_paterno}`);
        console.log(`🆔 ID Doctor: ${doctorId}`);
        console.log(`🏥 Especialidad: ${activeDoctors[0].modulo_nombre}`);
        return true;
      } else {
        throw new Error('No hay doctores activos disponibles');
      }
    } else {
      throw new Error('No se pudieron obtener los doctores');
    }
  } catch (error) {
    console.error('❌ Error obteniendo doctores:', error.response?.data || error.message);
    return false;
  }
}

// Función para crear el paciente
async function createPatient() {
  try {
    console.log('👤 Creando paciente...');
    const response = await axios.post(`${API_BASE_URL}/api/pacientes`, {
      ...TEST_PATIENT_DATA.paciente,
      pin: TEST_PATIENT_DATA.pin
    }, {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📄 Response data:`, JSON.stringify(response.data, null, 2));
    
    if (response.data.message && response.data.data && response.data.data.id_paciente) {
      console.log('✅ Paciente creado exitosamente');
      console.log(`🆔 ID Paciente: ${response.data.data.id_paciente}`);
      return response.data.data.id_paciente;
    } else {
      throw new Error('Respuesta de creación de paciente inválida');
    }
  } catch (error) {
    console.error('❌ Error creando paciente:');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    return null;
  }
}

// Función para agregar red de apoyo
async function addSupportNetwork(patientId) {
  try {
    console.log('🤝 Agregando red de apoyo...');
    const response = await axios.post(`${API_BASE_URL}/api/pacientes/${patientId}/red-apoyo`, 
      TEST_PATIENT_DATA.redApoyo, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ Red de apoyo agregada exitosamente');
      return true;
    } else {
      throw new Error('Respuesta de red de apoyo inválida');
    }
  } catch (error) {
    console.error('❌ Error agregando red de apoyo:', error.response?.data || error.message);
    return false;
  }
}

// Función para crear primera consulta
async function createFirstConsultation(patientId) {
  try {
    console.log('🏥 Creando primera consulta...');
    
    const consultationData = {
      id_paciente: patientId,
      id_doctor: doctorId,
      fecha_cita: TEST_PATIENT_DATA.primeraConsulta.fecha,
      motivo: TEST_PATIENT_DATA.primeraConsulta.motivo,
      observaciones: TEST_PATIENT_DATA.primeraConsulta.observaciones,
      asistencia: true,
      diagnostico: {
        descripcion: `Enfermedades crónicas: ${TEST_PATIENT_DATA.primeraConsulta.enfermedades_cronicas.join(', ')}. ${TEST_PATIENT_DATA.primeraConsulta.observaciones}`
      },
      plan_medicacion: {
        observaciones: TEST_PATIENT_DATA.primeraConsulta.observaciones,
        fecha_inicio: TEST_PATIENT_DATA.primeraConsulta.fecha
      },
      signos_vitales: {
        peso_kg: '65.5',
        talla_m: '1.65',
        imc: '24.1',
        medida_cintura_cm: '85',
        presion_sistolica: '120',
        presion_diastolica: '80',
        glucosa_mg_dl: '95',
        colesterol_mg_dl: '180',
        trigliceridos_mg_dl: '120',
        observaciones: 'Signos vitales dentro de parámetros normales'
      },
      vacunas: []
    };
    
    const response = await axios.post(`${API_BASE_URL}/api/citas/primera-consulta`, 
      consultationData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ Primera consulta creada exitosamente');
      console.log(`🆔 ID Cita: ${response.data.id_cita}`);
      return true;
    } else {
      throw new Error('Respuesta de primera consulta inválida');
    }
  } catch (error) {
    console.error('❌ Error creando primera consulta:', error.response?.data || error.message);
    return false;
  }
}

// Función principal que ejecuta todo el flujo
async function runCompletePatientCreationTest() {
  console.log('🚀 INICIANDO PRUEBA COMPLETA DE CREACIÓN DE PACIENTE');
  console.log('=' .repeat(60));
  
  // Paso 1: Login como administrador
  const loginSuccess = await loginAsAdmin();
  if (!loginSuccess) {
    console.log('❌ PRUEBA FALLIDA: No se pudo hacer login');
    return false;
  }
  
  // Paso 2: Obtener doctores activos
  const doctorsSuccess = await getActiveDoctors();
  if (!doctorsSuccess) {
    console.log('❌ PRUEBA FALLIDA: No se pudieron obtener doctores');
    return false;
  }
  
  // Paso 3: Crear paciente
  const patientId = await createPatient();
  if (!patientId) {
    console.log('❌ PRUEBA FALLIDA: No se pudo crear el paciente');
    return false;
  }
  
  // Paso 4: Agregar red de apoyo
  const supportSuccess = await addSupportNetwork(patientId);
  if (!supportSuccess) {
    console.log('⚠️ ADVERTENCIA: No se pudo agregar red de apoyo');
  }
  
  // Paso 5: Crear primera consulta
  const consultationSuccess = await createFirstConsultation(patientId);
  if (!consultationSuccess) {
    console.log('❌ PRUEBA FALLIDA: No se pudo crear la primera consulta');
    return false;
  }
  
  console.log('=' .repeat(60));
  console.log('✅ PRUEBA COMPLETA EXITOSA');
  console.log(`👤 Paciente creado con ID: ${patientId}`);
  console.log(`👨‍⚕️ Doctor asignado con ID: ${doctorId}`);
  console.log(`📅 Fecha de consulta: ${TEST_PATIENT_DATA.primeraConsulta.fecha}`);
  console.log('=' .repeat(60));
  
  return true;
}

// Ejecutar la prueba
runCompletePatientCreationTest()
  .then(success => {
    if (success) {
      console.log('🎉 TODAS LAS PRUEBAS PASARON CORRECTAMENTE');
      process.exit(0);
    } else {
      console.log('💥 ALGUNAS PRUEBAS FALLARON');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 ERROR FATAL EN LAS PRUEBAS:', error);
    process.exit(1);
  });
