import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Usar 127.0.0.1 ya que PowerShell puede conectarse a él
const API_URL = process.env.API_URL || 'http://127.0.0.1:3000/api';
const DOCTOR_EMAIL = 'doctor@clinica.com';
const DOCTOR_PASSWORD = 'Doctor123!';

/**
 * Script de pruebas para verificar que los endpoints GET devuelven
 * datos desencriptados, completos y en el formato correcto
 */

let authToken = null;
let pacienteId = null;
let citaId = null;

// Colores para console
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

function logTest(message) {
  log(`\n🧪 ${message}`, 'cyan');
}

// Función para verificar si un valor está encriptado
function isEncrypted(value) {
  if (!value || typeof value !== 'string') return false;
  
  // Verificar formato JSON encriptado
  if (value.startsWith('{') && value.includes('encrypted')) {
    try {
      const parsed = JSON.parse(value);
      return parsed.encrypted && parsed.iv && parsed.authTag;
    } catch {
      return false;
    }
  }
  
  // Verificar formato iv:tag:data
  const parts = value.split(':');
  return parts.length === 3 && parts[0].length > 0 && parts[1].length > 0 && parts[2].length > 0;
}

// Función para verificar si un número es válido
function isValidNumber(value) {
  if (value === null || value === undefined) return false;
  const num = typeof value === 'number' ? value : parseFloat(value);
  return !isNaN(num) && isFinite(num);
}

// 1. Login del doctor
async function loginDoctor() {
  logTest('1. Login del doctor');
  const endpoints = [
    `${API_URL}/auth/login`,
    `${API_URL}/auth-unified/login-doctor-admin`
  ];
  
  for (const endpoint of endpoints) {
    try {
      logInfo(`Intentando login en: ${endpoint}`);
      const response = await axios.post(endpoint, {
        email: DOCTOR_EMAIL,
        password: DOCTOR_PASSWORD
      }, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      logInfo(`Respuesta recibida. Status: ${response.status}`);
      logInfo(`Estructura de respuesta: ${JSON.stringify(Object.keys(response.data || {}), null, 2)}`);

      if (response.data && (response.data.token || (response.data.success && response.data.token))) {
        authToken = response.data.token || response.data.data?.token;
        if (authToken) {
          logSuccess('Login exitoso');
          return true;
        }
      } else {
        logWarning(`No se encontró token en la respuesta de ${endpoint}`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        logError(`Conexión rechazada en ${endpoint}. ¿El servidor está corriendo?`);
      } else if (error.code === 'ETIMEDOUT') {
        logError(`Timeout en ${endpoint}`);
      } else {
        logWarning(`Fallo en ${endpoint}: ${error.response?.status || error.code || error.message}`);
        if (error.response?.data) {
          logInfo(`Detalles del error: ${JSON.stringify(error.response.data, null, 2).substring(0, 300)}`);
        }
      }
      continue;
    }
  }
  
  logError('Login falló en todos los endpoints');
  return false;
}

// 2. Obtener pacientes del doctor
async function getPacientes() {
  logTest('2. GET /api/pacientes - Obtener pacientes del doctor');
  try {
    const response = await axios.get(`${API_URL}/pacientes?estado=activos&sort=recent`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    // Verificar diferentes formatos de respuesta
    let pacientes = null;
    if (response.data.success && response.data.data && Array.isArray(response.data.data.pacientes)) {
      // Estructura: { success: true, data: { pacientes: [...] } }
      pacientes = response.data.data.pacientes;
    } else if (response.data.success && Array.isArray(response.data.pacientes)) {
      // Estructura: { success: true, pacientes: [...] }
      pacientes = response.data.pacientes;
    } else if (response.data.success && Array.isArray(response.data.data)) {
      // Estructura: { success: true, data: [...] }
      pacientes = response.data.data;
    } else if (Array.isArray(response.data)) {
      // Estructura: [...] (array directo)
      pacientes = response.data;
    } else if (response.data && response.data.pacientes) {
      // Estructura: { pacientes: [...] }
      pacientes = Array.isArray(response.data.pacientes) ? response.data.pacientes : [];
    }

    if (pacientes && Array.isArray(pacientes)) {
      logSuccess(`Se encontraron ${pacientes.length} paciente(s)`);

      if (pacientes.length > 0) {
        pacienteId = pacientes[0].id_paciente;
        logInfo(`Paciente ID seleccionado: ${pacienteId}`);

        // Verificar que los datos sensibles estén desencriptados
        const paciente = pacientes[0];
        const camposSensibles = ['curp', 'direccion', 'fecha_nacimiento', 'numero_celular', 'nombre', 'apellido_paterno'];
        let todosDesencriptados = true;

        camposSensibles.forEach(campo => {
          if (paciente[campo] !== null && paciente[campo] !== undefined) {
            if (isEncrypted(paciente[campo])) {
              logError(`Campo ${campo} está encriptado: ${String(paciente[campo]).substring(0, 50)}...`);
              todosDesencriptados = false;
            } else {
              logSuccess(`Campo ${campo} está desencriptado: ${paciente[campo]}`);
            }
          } else {
            logWarning(`Campo ${campo} es null/undefined (puede ser esperado)`);
          }
        });

        if (todosDesencriptados) {
          logSuccess('✅ Todos los campos sensibles están desencriptados');
        } else {
          logError('❌ Algunos campos sensibles están encriptados');
        }

        return true;
      } else {
        logWarning('No se encontraron pacientes');
        return false;
      }
    } else {
      logError('Respuesta inválida del endpoint');
      logInfo(`Estructura de respuesta recibida: ${JSON.stringify(Object.keys(response.data || {}), null, 2)}`);
      if (response.data) {
        logInfo(`Datos recibidos (primeros 500 chars): ${JSON.stringify(response.data, null, 2).substring(0, 500)}`);
      }
      return false;
    }
  } catch (error) {
    logError(`Error: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// 3. Obtener cita por ID
async function getCitaById() {
  if (!citaId) {
    logWarning('No hay citaId disponible, obteniendo citas primero...');
    await getCitas();
  }

  if (!citaId) {
    logError('No se pudo obtener citaId');
    return false;
  }

  logTest(`3. GET /api/citas/${citaId} - Obtener cita con SignosVitales y Diagnósticos`);
  try {
    const response = await axios.get(`${API_URL}/citas/${citaId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const cita = response.data;
    logSuccess('Cita obtenida exitosamente');

    // Verificar motivo y observaciones desencriptados
    if (cita.motivo) {
      if (isEncrypted(cita.motivo)) {
        logError(`Motivo está encriptado: ${cita.motivo.substring(0, 50)}...`);
      } else {
        logSuccess(`Motivo desencriptado: ${cita.motivo}`);
      }
    }

    if (cita.observaciones) {
      if (isEncrypted(cita.observaciones)) {
        logError(`Observaciones está encriptado: ${cita.observaciones.substring(0, 50)}...`);
      } else {
        logSuccess(`Observaciones desencriptado: ${cita.observaciones}`);
      }
    }

    // Verificar SignosVitales
    if (cita.SignosVitales && Array.isArray(cita.SignosVitales) && cita.SignosVitales.length > 0) {
      logSuccess(`SignosVitales encontrados: ${cita.SignosVitales.length}`);
      const signo = cita.SignosVitales[0];

      const camposNumericos = [
        'presion_sistolica',
        'presion_diastolica',
        'glucosa_mg_dl',
        'colesterol_mg_dl',
        'colesterol_ldl',
        'colesterol_hdl',
        'trigliceridos_mg_dl',
        'hba1c_porcentaje'
      ];

      let todosCorrectos = true;
      camposNumericos.forEach(campo => {
        const valor = signo[campo];
        if (valor !== null && valor !== undefined) {
          if (isEncrypted(String(valor))) {
            logError(`Campo ${campo} está encriptado: ${String(valor).substring(0, 50)}...`);
            todosCorrectos = false;
          } else if (!isValidNumber(valor)) {
            logError(`Campo ${campo} no es un número válido: ${valor} (tipo: ${typeof valor})`);
            todosCorrectos = false;
          } else {
            logSuccess(`Campo ${campo} desencriptado y válido: ${valor}`);
          }
        }
      });

      // Verificar observaciones de signos vitales
      if (signo.observaciones) {
        if (isEncrypted(signo.observaciones)) {
          logError(`Observaciones de signos vitales está encriptado: ${signo.observaciones.substring(0, 50)}...`);
          todosCorrectos = false;
        } else {
          logSuccess(`Observaciones de signos vitales desencriptado: ${signo.observaciones.substring(0, 50)}...`);
        }
      }

      if (todosCorrectos) {
        logSuccess('✅ Todos los campos de SignosVitales están desencriptados y en formato correcto');
      } else {
        logError('❌ Algunos campos de SignosVitales tienen problemas');
      }
    } else {
      logWarning('No se encontraron SignosVitales en la cita');
    }

    // Verificar Diagnósticos
    if (cita.Diagnosticos && Array.isArray(cita.Diagnosticos) && cita.Diagnosticos.length > 0) {
      logSuccess(`Diagnósticos encontrados: ${cita.Diagnosticos.length}`);
      const diagnostico = cita.Diagnosticos[0];

      if (diagnostico.descripcion) {
        if (isEncrypted(diagnostico.descripcion)) {
          logError(`Descripción del diagnóstico está encriptado: ${diagnostico.descripcion.substring(0, 50)}...`);
        } else {
          logSuccess(`Descripción del diagnóstico desencriptado: ${diagnostico.descripcion.substring(0, 50)}...`);
        }
      }
    } else {
      logWarning('No se encontraron Diagnósticos en la cita');
    }

    return true;
  } catch (error) {
    logError(`Error: ${error.response?.data?.error || error.message}`);
    if (error.response?.data) {
      console.log('Respuesta del servidor:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

// 4. Obtener citas del paciente
async function getCitas() {
  if (!pacienteId) {
    logError('No hay pacienteId disponible');
    return false;
  }

  logTest(`4. GET /api/pacientes/${pacienteId}/citas - Obtener citas del paciente`);
  try {
    const response = await axios.get(`${API_URL}/pacientes/${pacienteId}/citas`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success && Array.isArray(response.data.data)) {
      const citas = response.data.data;
      logSuccess(`Se encontraron ${citas.length} cita(s)`);

      if (citas.length > 0) {
        citaId = citas[0].id_cita;
        logInfo(`Cita ID seleccionado: ${citaId}`);

        // Verificar que motivo y observaciones estén desencriptados
        citas.forEach((cita, index) => {
          if (cita.motivo && isEncrypted(cita.motivo)) {
            logError(`Cita ${index + 1}: Motivo está encriptado`);
          }
          if (cita.observaciones && isEncrypted(cita.observaciones)) {
            logError(`Cita ${index + 1}: Observaciones está encriptado`);
          }
        });

        return true;
      } else {
        logWarning('No se encontraron citas');
        return false;
      }
    } else {
      logError('Respuesta inválida del endpoint');
      return false;
    }
  } catch (error) {
    logError(`Error: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// 5. Obtener signos vitales del paciente
async function getSignosVitales() {
  if (!pacienteId) {
    logError('No hay pacienteId disponible');
    return false;
  }

  logTest(`5. GET /api/pacientes/${pacienteId}/signos-vitales - Obtener signos vitales`);
  try {
    const response = await axios.get(`${API_URL}/pacientes/${pacienteId}/signos-vitales`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success && Array.isArray(response.data.data)) {
      const signos = response.data.data;
      logSuccess(`Se encontraron ${signos.length} registro(s) de signos vitales`);

      if (signos.length > 0) {
        const signo = signos[0];
        let todosCorrectos = true;

        const camposNumericos = [
          'presion_sistolica',
          'presion_diastolica',
          'glucosa_mg_dl',
          'colesterol_mg_dl',
          'colesterol_ldl',
          'colesterol_hdl',
          'trigliceridos_mg_dl',
          'hba1c_porcentaje'
        ];

        camposNumericos.forEach(campo => {
          const valor = signo[campo];
          if (valor !== null && valor !== undefined) {
            if (isEncrypted(String(valor))) {
              logError(`Campo ${campo} está encriptado: ${String(valor).substring(0, 50)}...`);
              todosCorrectos = false;
            } else if (!isValidNumber(valor)) {
              logError(`Campo ${campo} no es un número válido: ${valor} (tipo: ${typeof valor})`);
              todosCorrectos = false;
            } else {
              logSuccess(`Campo ${campo} desencriptado y válido: ${valor}`);
            }
          }
        });

        if (signo.observaciones) {
          if (isEncrypted(signo.observaciones)) {
            logError(`Observaciones está encriptado: ${signo.observaciones.substring(0, 50)}...`);
            todosCorrectos = false;
          } else {
            logSuccess(`Observaciones desencriptado: ${signo.observaciones.substring(0, 50)}...`);
          }
        }

        if (todosCorrectos) {
          logSuccess('✅ Todos los campos de signos vitales están desencriptados y en formato correcto');
        } else {
          logError('❌ Algunos campos de signos vitales tienen problemas');
        }

        return todosCorrectos;
      } else {
        logWarning('No se encontraron signos vitales');
        return false;
      }
    } else {
      logError('Respuesta inválida del endpoint');
      return false;
    }
  } catch (error) {
    logError(`Error: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// 6. Obtener diagnósticos del paciente
async function getDiagnosticos() {
  if (!pacienteId) {
    logError('No hay pacienteId disponible');
    return false;
  }

  logTest(`6. GET /api/pacientes/${pacienteId}/diagnosticos - Obtener diagnósticos`);
  try {
    const response = await axios.get(`${API_URL}/pacientes/${pacienteId}/diagnosticos`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success && Array.isArray(response.data.data)) {
      const diagnosticos = response.data.data;
      logSuccess(`Se encontraron ${diagnosticos.length} diagnóstico(s)`);

      if (diagnosticos.length > 0) {
        let todosCorrectos = true;
        diagnosticos.forEach((diag, index) => {
          if (diag.descripcion) {
            if (isEncrypted(diag.descripcion)) {
              logError(`Diagnóstico ${index + 1}: Descripción está encriptado: ${diag.descripcion.substring(0, 50)}...`);
              todosCorrectos = false;
            } else {
              logSuccess(`Diagnóstico ${index + 1}: Descripción desencriptado: ${diag.descripcion.substring(0, 50)}...`);
            }
          }
        });

        if (todosCorrectos) {
          logSuccess('✅ Todos los diagnósticos están desencriptados');
        } else {
          logError('❌ Algunos diagnósticos están encriptados');
        }

        return todosCorrectos;
      } else {
        logWarning('No se encontraron diagnósticos');
        return false;
      }
    } else {
      logError('Respuesta inválida del endpoint');
      return false;
    }
  } catch (error) {
    logError(`Error: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// Función principal
async function runTests() {
  log('\n🚀 INICIANDO PRUEBAS DE ENDPOINTS GET\n', 'cyan');
  log('=' .repeat(60), 'cyan');

  const results = {
    login: false,
    getPacientes: false,
    getCitas: false,
    getCitaById: false,
    getSignosVitales: false,
    getDiagnosticos: false
  };

  // Ejecutar pruebas en orden
  results.login = await loginDoctor();
  if (!results.login) {
    logError('\n❌ No se pudo autenticar. Abortando pruebas.');
    return;
  }

  results.getPacientes = await getPacientes();
  if (!results.getPacientes) {
    logError('\n❌ No se pudieron obtener pacientes. Abortando pruebas.');
    return;
  }

  results.getCitas = await getCitas();
  results.getCitaById = await getCitaById();
  results.getSignosVitales = await getSignosVitales();
  results.getDiagnosticos = await getDiagnosticos();

  // Resumen
  log('\n' + '='.repeat(60), 'cyan');
  log('\n📊 RESUMEN DE PRUEBAS\n', 'cyan');
  
  Object.entries(results).forEach(([test, passed]) => {
    if (passed) {
      logSuccess(`${test}: PASÓ`);
    } else {
      logError(`${test}: FALLÓ`);
    }
  });

  const allPassed = Object.values(results).every(r => r);
  if (allPassed) {
    log('\n✅ ✅ ✅ TODAS LAS PRUEBAS PASARON ✅ ✅ ✅\n', 'green');
  } else {
    log('\n❌ ❌ ❌ ALGUNAS PRUEBAS FALLARON ❌ ❌ ❌\n', 'red');
  }
}

// Ejecutar
runTests()
  .then(() => process.exit(0))
  .catch((error) => {
    logError(`\nError fatal: ${error.message}`);
    console.error(error);
    process.exit(1);
  });

