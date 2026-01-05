/**
 * Script de pruebas automatizado para estados de citas y reprogramación
 * Ejecutar: node scripts/test-citas-estados-reprogramacion.js
 */

import dotenv from 'dotenv';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Colores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name) {
  log(`\n${'='.repeat(80)}`, 'cyan');
  log(`🧪 ${name}`, 'cyan');
  log('='.repeat(80), 'cyan');
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

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Estadísticas
let testsPassed = 0;
let testsFailed = 0;
let testCitaId = null;
let testSolicitudId = null;

// Credenciales de prueba (usar las que funcionan en el sistema)
const TEST_CREDENTIALS = {
  doctor: {
    email: process.env.TEST_DOCTOR_EMAIL || 'doctor@clinica.com',
    password: process.env.TEST_DOCTOR_PASSWORD || 'doctor123'
  },
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@clinica.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'admin123'
  },
  paciente: {
    id_paciente: parseInt(process.env.TEST_PACIENTE_ID) || 7,
    pin: process.env.TEST_PACIENTE_PIN || '2020',
    device_id: 'test_device_citas_' + Date.now()
  }
};

/**
 * Verificar que el servidor esté corriendo
 */
async function verificarServidor() {
  // Intentar múltiples endpoints para verificar que el servidor responde
  const endpoints = [
    '/api/health',
    '/api/citas?limit=1',
    '/api/auth-unified/login-paciente'
  ];

  for (const endpoint of endpoints) {
    try {
      await axios.get(`${API_BASE_URL}${endpoint}`, { 
        timeout: 2000,
        validateStatus: () => true // Aceptar cualquier status
      });
      return true; // Si hay respuesta (aunque sea error), el servidor está corriendo
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        continue; // Intentar siguiente endpoint
      }
      // Si hay respuesta HTTP (aunque sea error), el servidor está corriendo
      if (error.response) {
        return true;
      }
    }
  }

  // Si todos fallaron con ECONNREFUSED
  logError('❌ No se pudo conectar al servidor.');
  logWarning('⚠️  Asegúrate de que el servidor esté corriendo:');
  logInfo('   cd api-clinica && npm start');
  logInfo(`   O verifica que el puerto sea correcto (actual: ${API_BASE_URL})`);
  return false;
}

/**
 * Obtener token de autenticación
 */
async function obtenerToken(rol = 'doctor') {
  try {
    if (rol === 'doctor') {
      // Intentar primero con doctor, luego con admin
      let response;
      try {
        response = await axios.post(`${API_BASE_URL}/api/auth-unified/login-doctor-admin`, {
          email: TEST_CREDENTIALS.doctor.email,
          password: TEST_CREDENTIALS.doctor.password
        }, {
          timeout: 5000,
          validateStatus: (status) => status < 500
        });
      } catch (err) {
        // Si falla, intentar con admin
        logWarning('Login como doctor falló, intentando como admin...');
        response = await axios.post(`${API_BASE_URL}/api/auth-unified/login-doctor-admin`, {
          email: TEST_CREDENTIALS.admin.email,
          password: TEST_CREDENTIALS.admin.password
        }, {
          timeout: 5000,
          validateStatus: (status) => status < 500
        });
      }
      
      if (response.data && response.data.token) {
        return response.data.token;
      }
      throw new Error(`Login falló: ${JSON.stringify(response.data)}`);
    } else if (rol === 'paciente') {
      const response = await axios.post(`${API_BASE_URL}/api/auth-unified/login-paciente`, {
        id_paciente: TEST_CREDENTIALS.paciente.id_paciente,
        pin: TEST_CREDENTIALS.paciente.pin,
        device_id: TEST_CREDENTIALS.paciente.device_id
      }, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });
      
      if (response.data && response.data.token) {
        return response.data.token;
      }
      throw new Error(`Login falló: ${JSON.stringify(response.data)}`);
    }
    throw new Error('Rol no válido');
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('No se pudo conectar al servidor. ¿Está corriendo?');
    }
    if (error.response) {
      throw new Error(`Error ${error.response.status}: ${JSON.stringify(error.response.data)}`);
    }
    throw new Error(error.message || 'Error desconocido en autenticación');
  }
}

/**
 * Obtener una cita existente o crear una de prueba
 */
async function obtenerCitaDePrueba(token) {
  try {
    // Intentar obtener citas existentes
    const response = await axios.get(`${API_BASE_URL}/api/citas?limit=1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data.citas && response.data.citas.length > 0) {
      return response.data.citas[0].id_cita;
    }
    
    // Si no hay citas, crear una de prueba
    logWarning('No se encontraron citas existentes. Creando cita de prueba...');
    
    const nuevaCita = await axios.post(`${API_BASE_URL}/api/citas`, {
      id_paciente: TEST_CREDENTIALS.paciente.id_paciente,
      id_doctor: 1, // Asumir que existe doctor con ID 1
      fecha_cita: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días desde ahora
      motivo: 'Cita de prueba para testing de estados',
      observaciones: 'Cita creada automáticamente por script de pruebas'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    return nuevaCita.data.id_cita || nuevaCita.data.id;
  } catch (error) {
    if (error.response) {
      throw new Error(`Error obteniendo/creando cita: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * Ejecutar prueba
 */
async function ejecutarPrueba(nombre, funcion) {
  try {
    await funcion();
    testsPassed++;
    logSuccess(`${nombre} - PASÓ`);
    return true;
  } catch (error) {
    testsFailed++;
    logError(`${nombre} - FALLÓ: ${error.message}`);
    if (error.response) {
      logError(`   Status: ${error.response.status}`);
      logError(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return false;
  }
}

/**
 * PRUEBAS
 */
async function ejecutarPruebas() {
  log('\n' + '='.repeat(80), 'cyan');
  log('🚀 INICIANDO PRUEBAS DE ESTADOS DE CITAS Y REPROGRAMACIÓN', 'cyan');
  log('='.repeat(80), 'cyan');
  logInfo(`Base URL: ${API_BASE_URL}\n`);

  // Verificar servidor
  logTest('VERIFICACIÓN: Servidor');
  const servidorActivo = await verificarServidor();
  if (!servidorActivo) {
    logError('Servidor no disponible. Abortando pruebas.');
    process.exit(1);
  }
  logSuccess('Servidor está activo');

  let doctorToken = null;
  let pacienteToken = null;

  // 1. Autenticación
  logTest('PRUEBA 1: Autenticación');
  await ejecutarPrueba('Login como Doctor', async () => {
    doctorToken = await obtenerToken('doctor');
    logInfo(`Token doctor obtenido: ${doctorToken.substring(0, 20)}...`);
  });

  await ejecutarPrueba('Login como Paciente', async () => {
    pacienteToken = await obtenerToken('paciente');
    logInfo(`Token paciente obtenido: ${pacienteToken.substring(0, 20)}...`);
  });

  if (!pacienteToken) {
    logError('No se pudo obtener token de paciente. Abortando pruebas.');
    logWarning('💡 Verifica las credenciales del paciente en el archivo .env o en TEST_CREDENTIALS');
    return;
  }

  if (!doctorToken) {
    logWarning('⚠️  No se pudo obtener token de doctor/admin.');
    logWarning('⚠️  Las pruebas de doctor/admin se omitirán.');
    logWarning('💡 Verifica las credenciales de doctor/admin en TEST_CREDENTIALS');
  }

  // 2. Obtener cita de prueba
  logTest('PRUEBA 2: Preparación - Obtener Cita de Prueba');
  const tokenParaCita = doctorToken || pacienteToken; // Usar el que esté disponible
  await ejecutarPrueba('Obtener/Crear cita de prueba', async () => {
    testCitaId = await obtenerCitaDePrueba(tokenParaCita);
    logInfo(`Cita ID para pruebas: ${testCitaId}`);
  });

  if (!testCitaId) {
    logError('No se pudo obtener cita de prueba. Abortando.');
    return;
  }

  // 3. Cambiar estado de cita (Doctor) - Solo si hay token de doctor
  if (doctorToken) {
    logTest('PRUEBA 3: Cambiar Estado de Cita (Doctor)');
    await ejecutarPrueba('Cambiar estado a "atendida"', async () => {
      const response = await axios.put(
        `${API_BASE_URL}/api/citas/${testCitaId}/estado`,
        { estado: 'atendida', observaciones: 'Cita completada exitosamente' },
        { headers: { Authorization: `Bearer ${doctorToken}` } }
      );
      
      if (response.data.success !== true || response.data.cita.estado !== 'atendida') {
        throw new Error('Estado no se actualizó correctamente');
      }
      logInfo(`Estado actualizado: ${response.data.cita.estado}`);
    });

    await ejecutarPrueba('Cambiar estado a "pendiente"', async () => {
      const response = await axios.put(
        `${API_BASE_URL}/api/citas/${testCitaId}/estado`,
        { estado: 'pendiente' },
        { headers: { Authorization: `Bearer ${doctorToken}` } }
      );
      
      if (response.data.success !== true || response.data.cita.estado !== 'pendiente') {
        throw new Error('Estado no se actualizó correctamente');
      }
    });

    // 4. Reprogramar cita (Doctor)
    logTest('PRUEBA 4: Reprogramar Cita (Doctor)');
    await ejecutarPrueba('Reprogramar cita directamente', async () => {
      const nuevaFecha = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const response = await axios.put(
        `${API_BASE_URL}/api/citas/${testCitaId}/reprogramar`,
        {
          fecha_reprogramada: nuevaFecha,
          motivo_reprogramacion: 'Reprogramación de prueba por doctor'
        },
        { headers: { Authorization: `Bearer ${doctorToken}` } }
      );
      
      if (response.data.success !== true || response.data.cita.estado !== 'reprogramada') {
        throw new Error('Cita no se reprogramó correctamente');
      }
      logInfo(`Nueva fecha: ${response.data.cita.fecha_reprogramada}`);
    });
  } else {
    logWarning('⚠️  Omitiendo pruebas de doctor (no hay token)');
  }

  // 5. Solicitar reprogramación (Paciente)
  logTest('PRUEBA 5: Solicitar Reprogramación (Paciente)');
  await ejecutarPrueba('Solicitar reprogramación', async () => {
    // Primero cambiar estado a pendiente para poder solicitar (si hay token de doctor)
    if (doctorToken) {
      try {
        await axios.put(
          `${API_BASE_URL}/api/citas/${testCitaId}/estado`,
          { estado: 'pendiente' },
          { headers: { Authorization: `Bearer ${doctorToken}` } }
        );
      } catch (err) {
        // Si falla, continuar de todas formas
        logWarning('No se pudo cambiar estado a pendiente, continuando...');
      }
    }

    const nuevaFecha = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const response = await axios.post(
      `${API_BASE_URL}/api/citas/${testCitaId}/solicitar-reprogramacion`,
      {
        motivo: 'No podré asistir por trabajo',
        fecha_solicitada: nuevaFecha
      },
      { headers: { Authorization: `Bearer ${pacienteToken}` } }
    );
    
    if (response.data.success !== true || !response.data.solicitud) {
      throw new Error('Solicitud no se creó correctamente');
    }
    
    testSolicitudId = response.data.solicitud.id_solicitud;
    logInfo(`Solicitud creada ID: ${testSolicitudId}`);
    logInfo(`Estado: ${response.data.solicitud.estado}`);
  });

  // 6. Ver solicitudes (Paciente)
  logTest('PRUEBA 6: Ver Solicitudes de Reprogramación (Paciente)');
  await ejecutarPrueba('Obtener solicitudes del paciente', async () => {
    const response = await axios.get(
      `${API_BASE_URL}/api/pacientes/${TEST_CREDENTIALS.paciente.id_paciente}/solicitudes-reprogramacion`,
      { headers: { Authorization: `Bearer ${pacienteToken}` } }
    );
    
    if (response.data.success !== true || !Array.isArray(response.data.solicitudes)) {
      throw new Error('No se obtuvieron solicitudes correctamente');
    }
    logInfo(`Total solicitudes: ${response.data.solicitudes.length}`);
  });

  // 7. Responder solicitud (Doctor) - Solo si hay token de doctor
  if (testSolicitudId && doctorToken) {
    logTest('PRUEBA 7: Responder Solicitud de Reprogramación (Doctor)');
    await ejecutarPrueba('Aprobar solicitud de reprogramación', async () => {
      const nuevaFecha = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const response = await axios.put(
        `${API_BASE_URL}/api/citas/${testCitaId}/solicitud-reprogramacion/${testSolicitudId}`,
        {
          accion: 'aprobar',
          respuesta_doctor: 'Solicitud aprobada. Nueva fecha asignada.',
          fecha_reprogramada: nuevaFecha
        },
        { headers: { Authorization: `Bearer ${doctorToken}` } }
      );
      
      if (response.data.success !== true || response.data.solicitud.estado !== 'aprobada') {
        throw new Error('Solicitud no se aprobó correctamente');
      }
      logInfo(`Solicitud aprobada. Estado: ${response.data.solicitud.estado}`);
    });
  } else if (testSolicitudId && !doctorToken) {
    logWarning('⚠️  Omitiendo prueba de aprobación de solicitud (no hay token de doctor)');
  }

  // 8. Validar filtros de estado - Solo si hay token de doctor
  if (doctorToken) {
    logTest('PRUEBA 8: Filtros por Estado');
    await ejecutarPrueba('Filtrar citas por estado "pendiente"', async () => {
      const response = await axios.get(
        `${API_BASE_URL}/api/citas?estado=pendiente&limit=10`,
        { headers: { Authorization: `Bearer ${doctorToken}` } }
      );
      
      if (response.data.success !== true || !Array.isArray(response.data.citas)) {
        throw new Error('No se filtraron citas correctamente');
      }
      logInfo(`Citas pendientes encontradas: ${response.data.citas.length}`);
    });
  }

  // 9. Validar que paciente no puede cambiar estado
  logTest('PRUEBA 9: Validación de Permisos');
  await ejecutarPrueba('Paciente no puede cambiar estado (debe fallar)', async () => {
    try {
      await axios.put(
        `${API_BASE_URL}/api/citas/${testCitaId}/estado`,
        { estado: 'atendida' },
        { headers: { Authorization: `Bearer ${pacienteToken}` } }
      );
      throw new Error('Paciente no debería poder cambiar estado');
    } catch (error) {
      if (error.response && (error.response.status === 403 || error.response.status === 401)) {
        logSuccess('Permisos validados correctamente (403/401 esperado)');
        return; // Esto es lo esperado
      }
      throw error;
    }
  });

  // Resumen
  log('\n' + '='.repeat(80), 'cyan');
  log('📊 RESUMEN DE PRUEBAS', 'cyan');
  log('='.repeat(80), 'cyan');
  log(`✅ Pruebas pasadas: ${testsPassed}`, 'green');
  log(`❌ Pruebas fallidas: ${testsFailed}`, testsFailed > 0 ? 'red' : 'green');
  log(`📈 Total: ${testsPassed + testsFailed}`, 'cyan');
  
  const porcentaje = ((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1);
  log(`📊 Porcentaje de éxito: ${porcentaje}%`, porcentaje >= 80 ? 'green' : 'yellow');
  
  if (testsFailed === 0) {
    log('\n🎉 ¡TODAS LAS PRUEBAS PASARON!', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  Algunas pruebas fallaron. Revisa los errores arriba.', 'yellow');
    process.exit(1);
  }
}

// Ejecutar pruebas
ejecutarPruebas().catch(error => {
  logError(`Error fatal: ${error.message}`);
  if (error.response) {
    logError(`Status: ${error.response.status}`);
    logError(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
  }
  process.exit(1);
});

