/**
 * Script para probar endpoints GET y POST con usuario administrador
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_URL = `${API_BASE_URL}/api`;

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60) + '\n');
}

function logTest(name) {
  log(`\n🔍 ${name}`, 'yellow');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Variables globales
let adminToken = null;
let adminRefreshToken = null;
let testData = {
  pacienteId: null,
  doctorId: null,
  citaId: null,
  mensajeId: null,
  moduloId: null
};

// Función para hacer login
async function loginAdmin() {
  try {
    logTest('Login como administrador');
    
    // Intentar con /auth/login primero
    let response;
    try {
      response = await axios.post(`${API_URL}/auth/login`, {
        email: 'admin@clinica.com',
        password: 'Admin123!'
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });
    } catch (error) {
      // Si falla, intentar con /mobile/login
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        logInfo('Servidor no responde en /auth/login, intentando /mobile/login...');
        response = await axios.post(`${API_URL}/mobile/login`, {
          email: 'admin@clinica.com',
          password: 'Admin123!'
        }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        });
      } else {
        throw error;
      }
    }

    if (response.data.token) {
      adminToken = response.data.token;
      adminRefreshToken = response.data.refresh_token || response.data.refreshToken;
      logSuccess(`Login exitoso - Token recibido`);
      logInfo(`Usuario: ${response.data.usuario?.email || 'N/A'}`);
      logInfo(`Rol: ${response.data.usuario?.rol || 'N/A'}`);
      return true;
    } else {
      logError('Login fallido - No se recibió token');
      return false;
    }
  } catch (error) {
    logError(`Login fallido: ${error.response?.data?.error || error.message}`);
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      logError('El servidor no está respondiendo');
      logInfo('Verifica que el servidor esté corriendo: cd api-clinica && npm start');
    } else if (error.response) {
      logInfo(`Status: ${error.response.status}`);
      logInfo(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return false;
  }
}

// Función helper para hacer requests autenticados
async function authenticatedRequest(method, url, data = null, options = {}) {
  try {
    const config = {
      method,
      url: `${API_URL}${url}`,
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: options.timeout || 15000,
      ...options
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

// ============================================
// PRUEBAS DE ENDPOINTS GET
// ============================================

async function testGetEndpoints() {
  logSection('PRUEBAS DE ENDPOINTS GET');

  // 1. Dashboard Admin Summary
  logTest('GET /dashboard/admin/summary');
  let result = await authenticatedRequest('GET', '/dashboard/admin/summary');
  if (result.success) {
    logSuccess(`Status: ${result.status}`);
    if (result.data.data?.metrics) {
      logInfo(`Total pacientes: ${result.data.data.metrics.totalPacientes || 'N/A'}`);
      logInfo(`Total doctores: ${result.data.data.metrics.totalDoctores || 'N/A'}`);
      logInfo(`Citas hoy: ${result.data.data.metrics.citasHoy?.total || 'N/A'}`);
    }
  } else {
    logError(`Error: ${JSON.stringify(result.error)}`);
  }

  // 2. Dashboard Admin Metrics
  logTest('GET /dashboard/admin/metrics');
  result = await authenticatedRequest('GET', '/dashboard/admin/metrics');
  if (result.success) {
    logSuccess(`Status: ${result.status}`);
  } else {
    logError(`Error: ${JSON.stringify(result.error)}`);
  }

  // 3. Listar Pacientes
  logTest('GET /pacientes');
  result = await authenticatedRequest('GET', '/pacientes?limit=10');
  if (result.success) {
    logSuccess(`Status: ${result.status}`);
    const pacientes = result.data.pacientes || result.data.data?.pacientes || result.data;
    if (Array.isArray(pacientes)) {
      logInfo(`Total pacientes obtenidos: ${pacientes.length}`);
      if (pacientes.length > 0) {
        testData.pacienteId = pacientes[0].id_paciente || pacientes[0].id;
        logInfo(`ID del primer paciente: ${testData.pacienteId}`);
      }
    }
  } else {
    logError(`Error: ${JSON.stringify(result.error)}`);
  }

  // 4. Listar Doctores
  logTest('GET /doctores');
  result = await authenticatedRequest('GET', '/doctores?limit=10');
  if (result.success) {
    logSuccess(`Status: ${result.status}`);
    const doctores = result.data.doctores || result.data.data?.doctores || result.data;
    if (Array.isArray(doctores)) {
      logInfo(`Total doctores obtenidos: ${doctores.length}`);
      if (doctores.length > 0) {
        testData.doctorId = doctores[0].id_doctor || doctores[0].id;
        logInfo(`ID del primer doctor: ${testData.doctorId}`);
        logInfo(`Doctor: ${doctores[0].nombre || 'N/A'} ${doctores[0].apellido_paterno || ''}`);
      }
    }
  } else {
    logError(`Error: ${JSON.stringify(result.error)}`);
  }

  // 5. Obtener Paciente por ID
  if (testData.pacienteId) {
    logTest(`GET /pacientes/${testData.pacienteId}`);
    result = await authenticatedRequest('GET', `/pacientes/${testData.pacienteId}`);
    if (result.success) {
      logSuccess(`Status: ${result.status}`);
      const paciente = result.data.paciente || result.data.data || result.data;
      logInfo(`Paciente: ${paciente.nombre || 'N/A'} ${paciente.apellido_paterno || ''}`);
    } else {
      logError(`Error: ${JSON.stringify(result.error)}`);
    }
  }

  // 6. Obtener Doctor por ID
  if (testData.doctorId) {
    logTest(`GET /doctores/${testData.doctorId}`);
    result = await authenticatedRequest('GET', `/doctores/${testData.doctorId}`);
    if (result.success) {
      logSuccess(`Status: ${result.status}`);
      const doctor = result.data.doctor || result.data.data || result.data;
      logInfo(`Doctor: ${doctor.nombre || 'N/A'} ${doctor.apellido_paterno || ''}`);
    } else {
      logError(`Error: ${JSON.stringify(result.error)}`);
    }
  }

  // 7. Listar Citas
  logTest('GET /citas?limit=10');
  result = await authenticatedRequest('GET', '/citas?limit=10');
  if (result.success) {
    logSuccess(`Status: ${result.status}`);
    const citas = result.data.citas || result.data.data?.citas || result.data;
    if (Array.isArray(citas)) {
      logInfo(`Total citas obtenidas: ${citas.length}`);
      if (citas.length > 0) {
        testData.citaId = citas[0].id_cita || citas[0].id;
        logInfo(`ID de la primera cita: ${testData.citaId}`);
      }
    }
  } else {
    logError(`Error: ${JSON.stringify(result.error)}`);
  }

  // 8. Obtener Cita por ID
  if (testData.citaId) {
    logTest(`GET /citas/${testData.citaId}`);
    result = await authenticatedRequest('GET', `/citas/${testData.citaId}`);
    if (result.success) {
      logSuccess(`Status: ${result.status}`);
    } else {
      logError(`Error: ${JSON.stringify(result.error)}`);
    }
  }

  // 9. Listar Módulos
  logTest('GET /modulos');
  result = await authenticatedRequest('GET', '/modulos');
  if (result.success) {
    logSuccess(`Status: ${result.status}`);
    const modulos = result.data.modulos || result.data.data || result.data;
    if (Array.isArray(modulos)) {
      logInfo(`Total módulos: ${modulos.length}`);
      if (modulos.length > 0) {
        testData.moduloId = modulos[0].id_modulo || modulos[0].id;
        logInfo(`ID del primer módulo: ${testData.moduloId}`);
        logInfo(`Nombre: ${modulos[0].nombre_modulo || 'N/A'}`);
      }
    } else if (result.data && result.data.id_modulo) {
      // Si es un solo objeto
      testData.moduloId = result.data.id_modulo;
      logInfo(`ID del módulo: ${testData.moduloId}`);
    }
  } else {
    logError(`Error: ${JSON.stringify(result.error)}`);
    // Usar módulo por defecto si no se puede obtener
    testData.moduloId = 1;
    logInfo(`Usando módulo por defecto: ${testData.moduloId}`);
  }

  // 10. Listar Vacunas (catálogo)
  logTest('GET /vacunas');
  result = await authenticatedRequest('GET', '/vacunas');
  if (result.success) {
    logSuccess(`Status: ${result.status}`);
    const vacunas = result.data.vacunas || result.data.data || result.data;
    if (Array.isArray(vacunas)) {
      logInfo(`Total vacunas en catálogo: ${vacunas.length}`);
    }
  } else {
    logError(`Error: ${JSON.stringify(result.error)}`);
  }

  // 11. Listar Usuarios (solo Admin)
  logTest('GET /auth/usuarios');
  result = await authenticatedRequest('GET', '/auth/usuarios');
  if (result.success) {
    logSuccess(`Status: ${result.status}`);
    const usuarios = result.data.todos_usuarios || result.data.data || result.data;
    if (Array.isArray(usuarios)) {
      logInfo(`Total usuarios: ${usuarios.length}`);
    }
  } else {
    logError(`Error: ${JSON.stringify(result.error)}`);
  }

  // 12. Citas por Paciente
  if (testData.pacienteId) {
    logTest(`GET /citas/paciente/${testData.pacienteId}`);
    result = await authenticatedRequest('GET', `/citas/paciente/${testData.pacienteId}`);
    if (result.success) {
      logSuccess(`Status: ${result.status}`);
      const citas = result.data.citas || result.data.data || result.data;
      if (Array.isArray(citas)) {
        logInfo(`Citas del paciente: ${citas.length}`);
      }
    } else {
      logError(`Error: ${JSON.stringify(result.error)}`);
    }
  }

  // 13. Citas por Doctor
  if (testData.doctorId) {
    logTest(`GET /citas/doctor/${testData.doctorId}`);
    result = await authenticatedRequest('GET', `/citas/doctor/${testData.doctorId}`);
    if (result.success) {
      logSuccess(`Status: ${result.status}`);
      const citas = result.data.citas || result.data.data || result.data;
      if (Array.isArray(citas)) {
        logInfo(`Citas del doctor: ${citas.length}`);
      }
    } else {
      logError(`Error: ${JSON.stringify(result.error)}`);
    }
  }
}

// ============================================
// PRUEBAS DE ENDPOINTS POST
// ============================================

async function testPostEndpoints() {
  logSection('PRUEBAS DE ENDPOINTS POST');

  // 1. Crear Paciente (POST /pacientes/completo)
  if (testData.moduloId) {
    logTest('POST /pacientes/completo');
    const nuevoPaciente = {
      nombre: 'Test',
      apellido_paterno: 'Paciente',
      apellido_materno: 'Prueba',
      fecha_nacimiento: '1990-01-15',
      sexo: 'Hombre',
      curp: `TEST${Date.now().toString().slice(-10)}HDFRPR01`,
      telefono: '5551234567',
      numero_celular: '5559876543',
      email: `test.paciente.${Date.now()}@clinica.com`,
      direccion: 'Calle Test 123',
      estado: 'Ciudad de México',
      localidad: 'Benito Juárez',
      institucion_salud: 'IMSS',
      id_modulo: testData.moduloId,
      pin: '1234',
      password: 'Test123!'
    };

    let result = await authenticatedRequest('POST', '/pacientes/completo', nuevoPaciente);
    if (result.success) {
      logSuccess(`Status: ${result.status}`);
      const paciente = result.data.paciente || result.data.data || result.data;
      if (paciente.id_paciente) {
        logInfo(`Paciente creado con ID: ${paciente.id_paciente}`);
      }
    } else {
      logError(`Error: ${JSON.stringify(result.error)}`);
    }
  } else {
    logInfo('Omitido: Se requiere moduloId para crear paciente');
  }

  // 2. Crear Doctor (POST /doctores)
  // Nota: Los doctores requieren un usuario asociado primero
  // Por ahora solo probamos el endpoint con datos mínimos
  logTest('POST /doctores (con validación)');
  const nuevoDoctor = {
    nombre: 'Test',
    apellido_paterno: 'Doctor',
    apellido_materno: 'Prueba',
    grado_estudio: 'Medicina General',
    institucion_hospitalaria: 'Hospital Test',
    anos_servicio: 5,
    email: `test.doctor.${Date.now()}@clinica.com`,
    telefono: '5551112233',
    password: 'Doctor123!',
    confirmPassword: 'Doctor123!',
    id_modulo: testData.moduloId || 1,
    activo: true
  };

  let result = await authenticatedRequest('POST', '/doctores', nuevoDoctor);
  if (result.success) {
    logSuccess(`Status: ${result.status}`);
    const doctor = result.data.doctor || result.data.data || result.data;
    if (doctor.id_doctor) {
      logInfo(`Doctor creado con ID: ${doctor.id_doctor}`);
      if (!testData.doctorId) {
        testData.doctorId = doctor.id_doctor;
      }
    }
  } else {
    logError(`Error: ${JSON.stringify(result.error)}`);
    logInfo('Nota: Puede requerir un usuario asociado primero o campos adicionales');
  }

  // 3. Crear Cita (POST /citas)
  if (testData.pacienteId) {
    // Intentar obtener un doctor de la lista si no tenemos uno
    if (!testData.doctorId) {
      logInfo('Obteniendo lista de doctores para crear cita...');
      const doctoresResult = await authenticatedRequest('GET', '/doctores?limit=1');
      if (doctoresResult.success) {
        const doctores = doctoresResult.data.doctores || doctoresResult.data.data?.doctores || doctoresResult.data;
        if (Array.isArray(doctores) && doctores.length > 0) {
          testData.doctorId = doctores[0].id_doctor || doctores[0].id;
          logInfo(`Usando doctor ID: ${testData.doctorId}`);
        }
      }
    }

    if (testData.doctorId) {
      logTest('POST /citas');
      const nuevaCita = {
        id_paciente: testData.pacienteId,
        id_doctor: testData.doctorId,
        fecha_cita: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 días desde ahora
        hora_cita: '10:00:00',
        motivo: 'Consulta de prueba desde script',
        tipo_consulta: 'General',
        estado: 'pendiente'
      };

      result = await authenticatedRequest('POST', '/citas', nuevaCita);
      if (result.success) {
        logSuccess(`Status: ${result.status}`);
        const cita = result.data.cita || result.data.data || result.data;
        if (cita.id_cita) {
          logInfo(`Cita creada con ID: ${cita.id_cita}`);
          testData.citaId = cita.id_cita;
        }
      } else {
        logError(`Error: ${JSON.stringify(result.error)}`);
      }
    } else {
      logInfo('Omitido: No se pudo obtener doctorId para crear cita');
    }
  } else {
    logInfo('Omitido: Se requiere pacienteId para crear cita');
  }

  // 4. Enviar Mensaje de Chat (POST /mensajes-chat)
  if (testData.pacienteId) {
    // Intentar obtener un doctor de la lista si no tenemos uno
    if (!testData.doctorId) {
      const doctoresResult = await authenticatedRequest('GET', '/doctores?limit=1');
      if (doctoresResult.success) {
        const doctores = doctoresResult.data.doctores || doctoresResult.data.data?.doctores || doctoresResult.data;
        if (Array.isArray(doctores) && doctores.length > 0) {
          testData.doctorId = doctores[0].id_doctor || doctores[0].id;
        }
      }
    }

    if (testData.doctorId) {
      logTest('POST /mensajes-chat');
      const nuevoMensaje = {
        id_paciente: testData.pacienteId,
        id_doctor: testData.doctorId,
        remitente: 'Doctor',
        mensaje_texto: 'Mensaje de prueba desde script de testing'
      };

      result = await authenticatedRequest('POST', '/mensajes-chat', nuevoMensaje);
      if (result.success) {
        logSuccess(`Status: ${result.status}`);
        const mensaje = result.data.mensaje || result.data.data || result.data;
        if (mensaje.id_mensaje) {
          logInfo(`Mensaje creado con ID: ${mensaje.id_mensaje}`);
          testData.mensajeId = mensaje.id_mensaje;
        }
      } else {
        logError(`Error: ${JSON.stringify(result.error)}`);
      }
    } else {
      logInfo('Omitido: No se pudo obtener doctorId para enviar mensaje');
    }
  } else {
    logInfo('Omitido: Se requiere pacienteId para enviar mensaje');
  }

  // 5. Asignar Doctor a Paciente (POST /pacientes/:id/doctores)
  if (testData.pacienteId && testData.doctorId) {
    logTest(`POST /pacientes/${testData.pacienteId}/doctores`);
    result = await authenticatedRequest('POST', `/pacientes/${testData.pacienteId}/doctores`, {
      id_doctor: testData.doctorId
    });
    if (result.success) {
      logSuccess(`Status: ${result.status}`);
      logInfo('Doctor asignado al paciente');
    } else {
      logError(`Error: ${JSON.stringify(result.error)}`);
      logInfo('Nota: Puede que ya esté asignado');
    }
  }
}

// ============================================
// RESUMEN DE PRUEBAS
// ============================================

async function mostrarResumen() {
  logSection('RESUMEN DE PRUEBAS');
  logInfo('Token de administrador obtenido: ' + (adminToken ? '✅ SÍ' : '❌ NO'));
  logInfo('Datos de prueba obtenidos:');
  logInfo(`  - Paciente ID: ${testData.pacienteId || 'N/A'}`);
  logInfo(`  - Doctor ID: ${testData.doctorId || 'N/A'}`);
  logInfo(`  - Cita ID: ${testData.citaId || 'N/A'}`);
  logInfo(`  - Mensaje ID: ${testData.mensajeId || 'N/A'}`);
}

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================

async function runTests() {
  try {
    logSection('INICIANDO PRUEBAS DE ENDPOINTS CON ADMINISTRADOR');
    logInfo(`API Base URL: ${API_URL}`);
    logInfo(`Email: admin@clinica.com`);
    logInfo(`Password: Admin123!`);

    // 1. Login
    const loginSuccess = await loginAdmin();
    if (!loginSuccess) {
      logError('No se pudo hacer login. Abortando pruebas.');
      process.exit(1);
    }

    // 2. Pruebas GET
    await testGetEndpoints();

    // 3. Pruebas POST
    await testPostEndpoints();

    // 4. Resumen
    await mostrarResumen();

    logSection('PRUEBAS COMPLETADAS');
    logSuccess('Todas las pruebas han sido ejecutadas');

  } catch (error) {
    logError(`Error fatal en pruebas: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar pruebas
runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
