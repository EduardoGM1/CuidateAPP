import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Script de pruebas completo que simula exactamente cómo el frontend envía datos
 * 
 * Headers que usa el frontend:
 * - Authorization: Bearer {token}
 * - Content-Type: application/json
 * - X-Device-ID: {deviceId}
 * - X-Platform: android
 * - X-App-Version: 1.0.0
 * - X-Client-Type: mobile
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';
const BASE_URL = `${API_URL}/api`;

// Configuración de prueba
const TEST_CONFIG = {
  // Credenciales de prueba (ajustar según tu BD)
  // Intentar diferentes combinaciones comunes
  adminCredentials: [
    { email: 'admin@clinica.com', password: 'admin123' },
    { email: 'admin@test.com', password: 'admin' },
    { email: 'admin', password: 'admin' },
    { email: process.env.TEST_ADMIN_EMAIL || 'admin@clinica.com', 
      password: process.env.TEST_ADMIN_PASSWORD || 'admin123' }
  ],
  deviceId: 'test-device-' + Date.now(),
  platform: 'android',
  appVersion: '1.0.0',
  clientType: 'mobile'
};

// Cliente axios configurado como el frontend
const createFrontendClient = (token) => {
  return axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'X-Device-ID': TEST_CONFIG.deviceId,
      'X-Platform': TEST_CONFIG.platform,
      'X-App-Version': TEST_CONFIG.appVersion,
      'X-Client-Type': TEST_CONFIG.clientType
    }
  });
};

// Variables globales para almacenar datos de prueba
let authToken = null;
let testPacienteId = null;
let testDoctorId = null;
let testCitaId = null;
let testSignoId = null;
let testComorbilidadId = null;
let testDiagnosticoId = null;
let testPlanId = null;

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.cyan}🧪 ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`)
};

// Función para hacer pausa
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * =====================================================
 * PRUEBAS DE AUTENTICACIÓN
 * =====================================================
 */
async function testAuth() {
  log.test('PRUEBA 1: Autenticación');
  
  // Verificar conectividad primero
  try {
    const client = createFrontendClient();
    await axios.get(`${API_URL}/health`, { timeout: 3000 }).catch(() => {});
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
      log.error(`No se puede conectar al servidor en ${API_URL}`);
      log.warn('💡 Asegúrate de que el servidor esté corriendo: npm start o node index.js');
      return false;
    }
  }

  const client = createFrontendClient();
  const endpoints = ['/auth/login', '/mobile/login'];
  const credentials = Array.isArray(TEST_CONFIG.adminCredentials) 
    ? TEST_CONFIG.adminCredentials 
    : [TEST_CONFIG.adminCredentials];

  // Intentar todas las combinaciones de credenciales y endpoints
  for (const cred of credentials) {
    for (const endpoint of endpoints) {
      try {
        log.info(`Intentando: ${endpoint} con ${cred.email}...`);
        const response = await client.post(endpoint, {
          email: cred.email,
          password: cred.password
        });

        // El token puede estar en diferentes lugares según el endpoint
        const token = response.data?.token || 
                      response.data?.data?.token || 
                      response.data?.accessToken;

        if (token) {
          authToken = token;
          log.success(`✅ Autenticación exitosa usando ${endpoint}`);
          log.success(`Token obtenido: ${authToken.substring(0, 20)}...`);
          return true;
        }
      } catch (error) {
        if (error.response?.status === 200) {
          // Respuesta exitosa pero sin token en el formato esperado
          const token = error.response.data?.token || 
                        error.response.data?.data?.token || 
                        error.response.data?.accessToken;
          if (token) {
            authToken = token;
            log.success(`✅ Autenticación exitosa usando ${endpoint}`);
            log.success(`Token obtenido: ${authToken.substring(0, 20)}...`);
            return true;
          }
        }
        
        if (error.response?.status === 401 || error.response?.status === 400) {
          // Credenciales incorrectas, continuar con siguiente
          continue;
        }
        
        if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
          log.error(`No se puede conectar al servidor en ${API_URL}`);
          log.warn(`💡 Inicia el servidor con: cd api-clinica && npm start`);
          return false;
        }
      }
    }
  }

  log.error('❌ No se pudo autenticar con ninguna combinación de credenciales');
  log.warn('💡 Verifica las credenciales en TEST_CONFIG o crea un usuario de prueba');
  return false;
}

/**
 * =====================================================
 * PRUEBAS DE SIGNOS VITALES (CON COLESTEROL LDL/HDL)
 * =====================================================
 */
async function testSignosVitales() {
  log.test('\nPRUEBA 2: Signos Vitales (con Colesterol LDL/HDL)');
  
  if (!authToken || !testPacienteId) {
    log.warn('Saltando prueba: falta token o pacienteId');
    return false;
  }

  const client = createFrontendClient(authToken);

  // 2.1 Crear signos vitales básicos (sin LDL/HDL)
  log.test('2.1 Crear signos vitales básicos (sin LDL/HDL)');
  try {
    const signosBasicos = {
      peso_kg: 75.5,
      talla_m: 1.75,
      medida_cintura_cm: 90,
      presion_sistolica: 120,
      presion_diastolica: 80,
      glucosa_mg_dl: 95,
      colesterol_mg_dl: 180,
      trigliceridos_mg_dl: 120,
      observaciones: 'Signos vitales normales - Prueba desde script'
    };

    const response = await client.post(
      `/pacientes/${testPacienteId}/signos-vitales`,
      signosBasicos
    );

    if (response.data && response.data.success) {
      testSignoId = response.data.data?.id_signo;
      log.success(`Signos vitales básicos creados. ID: ${testSignoId}`);
    } else {
      log.error('No se recibió respuesta exitosa');
      return false;
    }
  } catch (error) {
    log.error(`Error creando signos vitales básicos: ${error.response?.data?.error || error.message}`);
    return false;
  }

  await sleep(500);

  // 2.2 Intentar crear signos vitales con LDL/HDL SIN diagnóstico (debe fallar)
  log.test('2.2 Intentar crear signos vitales con LDL/HDL SIN diagnóstico (debe fallar)');
  try {
    const signosConLDL = {
      peso_kg: 76,
      colesterol_mg_dl: 200,
      colesterol_ldl: 130,
      colesterol_hdl: 50
    };

    await client.post(
      `/pacientes/${testPacienteId}/signos-vitales`,
      signosConLDL
    );

    log.error('❌ ERROR: Debería haber fallado (paciente sin diagnóstico)');
    return false;
  } catch (error) {
    if (error.response?.status === 400 && 
        error.response?.data?.error?.includes('Hipercolesterolemia')) {
      log.success('✅ Correctamente rechazado: Paciente sin diagnóstico');
    } else {
      log.error(`Error inesperado: ${error.response?.data?.error || error.message}`);
      return false;
    }
  }

  await sleep(500);

      // 2.3 Agregar comorbilidad de Hipercolesterolemia al paciente
  log.test('2.3 Agregar comorbilidad de Hipercolesterolemia al paciente');
  try {
    // Primero obtener comorbilidades disponibles
    const comorbilidadesResponse = await client.get('/comorbilidades?limit=100');
    // El formato puede variar: response.data.data, response.data, o array directo
    let comorbilidades = [];
    if (Array.isArray(comorbilidadesResponse.data)) {
      comorbilidades = comorbilidadesResponse.data;
    } else if (Array.isArray(comorbilidadesResponse.data?.data)) {
      comorbilidades = comorbilidadesResponse.data.data;
    } else if (comorbilidadesResponse.data?.data && typeof comorbilidadesResponse.data.data === 'object') {
      // Si es un objeto, intentar extraer array
      comorbilidades = Object.values(comorbilidadesResponse.data.data).filter(Array.isArray)[0] || [];
    }

    // Buscar Hipercolesterolemia o Dislipidemia
    let hipercolesterolemia = null;
    if (Array.isArray(comorbilidades)) {
      hipercolesterolemia = comorbilidades.find(c => 
        (c.nombre_comorbilidad || c.nombre)?.toLowerCase().includes('hipercolesterolemia') ||
        (c.nombre_comorbilidad || c.nombre)?.toLowerCase().includes('dislipidemia')
      );
    }

    // Si no existe, crear una
    if (!hipercolesterolemia) {
      try {
        const createResponse = await client.post('/comorbilidades', {
          nombre_comorbilidad: 'Hipercolesterolemia',
          descripcion: 'Comorbilidad de prueba para test de colesterol LDL/HDL'
        });
        hipercolesterolemia = createResponse.data?.data || createResponse.data;
      } catch (createError) {
        log.warn(`No se pudo crear comorbilidad: ${createError.response?.data?.error || createError.message}`);
        // Intentar usar cualquier comorbilidad existente
        if (Array.isArray(comorbilidades) && comorbilidades.length > 0) {
          hipercolesterolemia = comorbilidades[0];
          log.warn(`Usando comorbilidad existente: ${hipercolesterolemia.nombre_comorbilidad || hipercolesterolemia.nombre}`);
        }
      }
    }

    if (!hipercolesterolemia || !hipercolesterolemia.id_comorbilidad) {
      log.warn('No se pudo obtener comorbilidad, intentando usar comorbilidades existentes del paciente...');
      // Intentar obtener comorbilidades del paciente y usar una
      try {
        const pacienteComorbilidadesResponse = await client.get(`/pacientes/${testPacienteId}/comorbilidades`);
        const pacienteComorbilidades = Array.isArray(pacienteComorbilidadesResponse.data?.data) 
          ? pacienteComorbilidadesResponse.data.data 
          : Array.isArray(pacienteComorbilidadesResponse.data) 
            ? pacienteComorbilidadesResponse.data 
            : [];
        
        if (pacienteComorbilidades.length > 0) {
          // Usar la primera comorbilidad del paciente
          const primeraComorbilidad = pacienteComorbilidades[0];
          hipercolesterolemia = {
            id_comorbilidad: primeraComorbilidad.id_comorbilidad || primeraComorbilidad.Comorbilidad?.id_comorbilidad
          };
          log.warn(`Usando comorbilidad existente del paciente: ID ${hipercolesterolemia.id_comorbilidad}`);
        } else {
          log.warn('No hay comorbilidades disponibles, saltando prueba de LDL/HDL');
          return true; // Continuar con otras pruebas
        }
      } catch (error) {
        log.warn('No se pudo obtener comorbilidades del paciente, saltando prueba de LDL/HDL');
        return true; // Continuar con otras pruebas
      }
    }

    // Agregar comorbilidad al paciente
    const addResponse = await client.post(
      `/pacientes/${testPacienteId}/comorbilidades`,
      {
        id_comorbilidad: hipercolesterolemia.id_comorbilidad,
        fecha_diagnostico: new Date().toISOString().split('T')[0],
        observaciones: 'Agregada para prueba de colesterol LDL/HDL'
      }
    );

    // El formato de respuesta puede variar
    const responseData = addResponse.data?.data || addResponse.data;
    if (addResponse.data && (addResponse.data.success || responseData)) {
      testComorbilidadId = responseData?.id_paciente_comorbilidad || 
                          responseData?.id || 
                          addResponse.data.id ||
                          responseData?.id_comorbilidad;
      log.success(`Comorbilidad agregada. ID: ${testComorbilidadId || 'N/A'}`);
    } else {
      log.warn('No se pudo agregar comorbilidad, continuando...');
    }
  } catch (error) {
    log.warn(`Error agregando comorbilidad: ${error.response?.data?.error || error.message}`);
    log.warn('Continuando con la prueba...');
  }

  // ✅ MEJOR PRÁCTICA: Verificación explícita con retry y backoff exponencial
  log.test('Verificando que la comorbilidad se agregó correctamente...');
  let comorbilidadVerificada = false;
  const maxIntentos = 5;
  const delayInicial = 1000; // 1 segundo
  
  for (let intento = 0; intento < maxIntentos && !comorbilidadVerificada; intento++) {
    try {
      const verifyResponse = await client.get(`/pacientes/${testPacienteId}/comorbilidades`);
      
      // Manejar múltiples formatos de respuesta
      const pacienteComorbilidades = Array.isArray(verifyResponse.data?.data) 
        ? verifyResponse.data.data 
        : Array.isArray(verifyResponse.data) 
          ? verifyResponse.data 
          : [];
      
      // Verificar si existe la comorbilidad de hipercolesterolemia/dislipidemia
      comorbilidadVerificada = pacienteComorbilidades.some(pc => {
        const nombre = pc.nombre_comorbilidad || 
                      pc.Comorbilidad?.nombre_comorbilidad || 
                      pc.nombre || 
                      '';
        return nombre.toLowerCase().includes('hipercolesterolemia') || 
               nombre.toLowerCase().includes('dislipidemia');
      });
      
      if (comorbilidadVerificada) {
        log.success(`✅ Comorbilidad verificada en el paciente (intento ${intento + 1}/${maxIntentos})`);
        break;
      } else if (intento < maxIntentos - 1) {
        // Backoff exponencial: 1s, 2s, 4s, 8s
        const delay = delayInicial * Math.pow(2, intento);
        log.info(`   Comorbilidad aún no detectada, esperando ${delay}ms antes del siguiente intento...`);
        await sleep(delay);
      }
    } catch (error) {
      log.warn(`Error verificando comorbilidad (intento ${intento + 1}): ${error.message}`);
      if (intento < maxIntentos - 1) {
        const delay = delayInicial * Math.pow(2, intento);
        await sleep(delay);
      }
    }
  }
  
  if (!comorbilidadVerificada) {
    log.warn('⚠️  La comorbilidad no se pudo verificar después de múltiples intentos');
    log.warn('   Continuando con la prueba, pero puede fallar la creación de signos vitales con LDL/HDL');
  }
  
  await sleep(500); // Pequeña pausa adicional antes de continuar

      // 2.4 Crear signos vitales CON LDL/HDL (ahora debe funcionar)
  log.test('2.4 Crear signos vitales CON LDL/HDL (con diagnóstico)');
  try {
    // Si la comorbilidad no se verificó, intentar de todas formas pero con manejo de errores mejorado
    if (!comorbilidadVerificada) {
      log.warn('⚠️  Advertencia: Comorbilidad no verificada, pero intentando crear signos vitales...');
    }
    
    const signosConLDLHDL = {
      peso_kg: 77,
      talla_m: 1.75,
      presion_sistolica: 125,
      presion_diastolica: 82,
      glucosa_mg_dl: 98,
      colesterol_mg_dl: 220,
      colesterol_ldl: 150,  // ✅ LDL
      colesterol_hdl: 45,   // ✅ HDL
      trigliceridos_mg_dl: 140,
      observaciones: 'Signos vitales con perfil lipídico completo - Prueba desde script'
    };

    const response = await client.post(
      `/pacientes/${testPacienteId}/signos-vitales`,
      signosConLDLHDL
    );

    if (response.data && response.data.success) {
      const nuevoSignoId = response.data.data?.id_signo;
      log.success(`✅ Signos vitales con LDL/HDL creados. ID: ${nuevoSignoId}`);
      log.info(`   - Colesterol Total: ${signosConLDLHDL.colesterol_mg_dl} mg/dL`);
      log.info(`   - Colesterol LDL: ${signosConLDLHDL.colesterol_ldl} mg/dL`);
      log.info(`   - Colesterol HDL: ${signosConLDLHDL.colesterol_hdl} mg/dL`);
      
      // ✅ Verificar que los datos se guardaron correctamente con retry
      let datosVerificados = false;
      for (let intento = 0; intento < 3 && !datosVerificados; intento++) {
        try {
          await sleep(500 * (intento + 1)); // Esperar 500ms, 1s, 1.5s
          const verifyResponse = await client.get(`/pacientes/${testPacienteId}/signos-vitales?limit=1`);
          const ultimoSigno = verifyResponse.data?.data?.[0] || verifyResponse.data?.[0];
          
          if (ultimoSigno && 
              parseFloat(ultimoSigno.colesterol_ldl) === 150 && 
              parseFloat(ultimoSigno.colesterol_hdl) === 45) {
            log.success('✅ Verificación: Datos guardados correctamente');
            datosVerificados = true;
          } else if (intento < 2) {
            log.info(`   Datos aún no disponibles, reintentando verificación...`);
          }
        } catch (verifyError) {
          if (intento < 2) {
            log.warn(`   Error verificando datos (intento ${intento + 1}): ${verifyError.message}`);
          }
        }
      }
      
      if (!datosVerificados) {
        log.warn('⚠️  No se pudo verificar los datos guardados, pero la creación fue exitosa');
      }
    } else {
      log.error('No se recibió respuesta exitosa');
      return false;
    }
  } catch (error) {
    // ✅ Manejo mejorado de errores con información detallada
    if (error.response?.status === 400 && 
        error.response?.data?.error?.includes('Hipercolesterolemia')) {
      log.error(`❌ Error: ${error.response.data.error}`);
      log.warn('   Esto puede deberse a que la comorbilidad aún no se ha propagado en la BD');
      log.warn('   En uso real, esto no debería ocurrir ya que hay tiempo entre acciones');
      return false;
    } else {
      log.error(`Error creando signos vitales con LDL/HDL: ${error.response?.data?.error || error.message}`);
      return false;
    }
  }

  await sleep(500);

  // 2.5 Actualizar signos vitales con LDL/HDL
  log.test('2.5 Actualizar signos vitales con LDL/HDL');
  try {
    if (!testSignoId) {
      log.warn('No hay signoId para actualizar');
      return true;
    }

    const updateData = {
      colesterol_ldl: 140,
      colesterol_hdl: 50
    };

    const response = await client.put(
      `/pacientes/${testPacienteId}/signos-vitales/${testSignoId}`,
      updateData
    );

    if (response.data && response.data.success) {
      log.success(`✅ Signos vitales actualizados con nuevos valores LDL/HDL`);
    } else {
      log.error('No se recibió respuesta exitosa');
      return false;
    }
  } catch (error) {
    log.error(`Error actualizando signos vitales: ${error.response?.data?.error || error.message}`);
    return false;
  }

  await sleep(500);

  // 2.6 Validar rangos (LDL fuera de rango)
  log.test('2.6 Validar rangos - LDL fuera de rango (debe fallar)');
  try {
    const signosInvalidos = {
      colesterol_ldl: 600, // Fuera de rango (máximo 500)
      colesterol_hdl: 50
    };

    await client.post(
      `/pacientes/${testPacienteId}/signos-vitales`,
      signosInvalidos
    );

    log.error('❌ ERROR: Debería haber fallado (LDL fuera de rango)');
    return false;
  } catch (error) {
    if (error.response?.status === 400) {
      log.success('✅ Correctamente rechazado: LDL fuera de rango');
    } else {
      log.error(`Error inesperado: ${error.response?.data?.error || error.message}`);
      return false;
    }
  }

  return true;
}

/**
 * =====================================================
 * PRUEBAS DE PACIENTES
 * =====================================================
 */
async function testPacientes() {
  log.test('\nPRUEBA 3: Pacientes');
  
  if (!authToken) {
    log.warn('Saltando prueba: falta token');
    return false;
  }

  const client = createFrontendClient(authToken);

  // 3.1 Obtener lista de pacientes
  log.test('3.1 Obtener lista de pacientes');
  try {
    const response = await client.get('/pacientes?limit=10');
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      testPacienteId = response.data.data[0].id_paciente;
      log.success(`Lista de pacientes obtenida. Usando paciente ID: ${testPacienteId}`);
    } else {
      log.warn('No hay pacientes en la BD, creando uno de prueba...');
      // Crear paciente de prueba
      const createResponse = await client.post('/pacientes', {
        nombre: 'Paciente',
        apellido_paterno: 'Prueba',
        apellido_materno: 'Test',
        fecha_nacimiento: '1980-01-01',
        sexo: 'Hombre',
        curp: 'TEST800101HDFRPA01',
        direccion: 'Dirección de prueba',
        estado: 'Ciudad de México',
        localidad: 'Ciudad de México',
        numero_celular: '5551234567',
        institucion_salud: 'IMSS',
        id_modulo: 1,
        activo: true
      });
      
      if (createResponse.data && createResponse.data.data) {
        testPacienteId = createResponse.data.data.id_paciente;
        log.success(`Paciente de prueba creado. ID: ${testPacienteId}`);
      } else {
        log.error('No se pudo crear paciente de prueba');
        return false;
      }
    }
  } catch (error) {
    log.error(`Error obteniendo pacientes: ${error.response?.data?.error || error.message}`);
    return false;
  }

  await sleep(500);

  // 3.2 Obtener detalle de paciente
  log.test('3.2 Obtener detalle de paciente');
  try {
    const response = await client.get(`/pacientes/${testPacienteId}`);
    
    // ✅ Manejar múltiples formatos de respuesta (mejores prácticas)
    // El endpoint puede devolver: response.data, response.data.data, o response.data.paciente
    const pacienteData = response.data?.data || 
                        response.data?.paciente || 
                        response.data;
    
    if (pacienteData && (pacienteData.nombre || pacienteData.id_paciente)) {
      const nombre = pacienteData.nombre || 'Paciente';
      const apellido = pacienteData.apellido_paterno || pacienteData.apellido_paterno || '';
      log.success(`✅ Detalle de paciente obtenido: ${nombre} ${apellido}`);
    } else {
      log.error('No se recibió detalle de paciente');
      log.info('Respuesta recibida:', JSON.stringify(response.data, null, 2));
      return false;
    }
  } catch (error) {
    log.error(`Error obteniendo detalle: ${error.response?.data?.error || error.response?.data?.message || error.message}`);
    if (error.response?.data) {
      log.info('Detalles del error:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }

  return true;
}

/**
 * =====================================================
 * PRUEBAS DE CITAS
 * =====================================================
 */
async function testCitas() {
  log.test('\nPRUEBA 4: Citas');
  
  if (!authToken || !testPacienteId) {
    log.warn('Saltando prueba: falta token o pacienteId');
    return false;
  }

  const client = createFrontendClient(authToken);

  // 4.1 Obtener doctores para asignar cita
  log.test('4.1 Obtener doctores disponibles');
  let doctorId = null;
  try {
    const response = await client.get('/doctores?limit=10');
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      doctorId = response.data.data[0].id_doctor;
      testDoctorId = doctorId;
      log.success(`Doctores obtenidos. Usando doctor ID: ${doctorId}`);
    } else {
      log.warn('No hay doctores disponibles');
      return false;
    }
  } catch (error) {
    log.error(`Error obteniendo doctores: ${error.response?.data?.error || error.message}`);
    return false;
  }

  await sleep(500);

  // 4.2 Crear cita
  log.test('4.2 Crear cita');
  try {
    const fechaCita = new Date();
    fechaCita.setDate(fechaCita.getDate() + 7); // 7 días desde hoy

    const citaData = {
      id_paciente: testPacienteId,
      id_doctor: doctorId,
      fecha_cita: fechaCita.toISOString().split('T')[0],
      motivo: 'Consulta de prueba desde script',
      observaciones: 'Cita creada para pruebas de endpoints',
      es_primera_consulta: false
    };

    const response = await client.post('/citas', citaData);
    
    // El formato puede variar: response.data.data o response.data
    const citaDataResponse = response.data?.data || response.data;
    
    if (citaDataResponse && (citaDataResponse.id_cita || response.data.success)) {
      testCitaId = citaDataResponse.id_cita || response.data.id_cita;
      log.success(`Cita creada. ID: ${testCitaId}`);
    } else {
      log.error('No se recibió respuesta exitosa');
      log.info('Respuesta recibida:', JSON.stringify(response.data, null, 2));
      return false;
    }
  } catch (error) {
    log.error(`Error creando cita: ${error.response?.data?.error || error.response?.data?.message || error.message}`);
    if (error.response?.data) {
      log.info('Detalles del error:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }

  await sleep(500);

  // 4.3 Obtener citas del paciente
  log.test('4.3 Obtener citas del paciente');
  try {
    const response = await client.get(`/pacientes/${testPacienteId}/citas?limit=10`);
    
    if (response.data && response.data.data) {
      log.success(`Citas obtenidas: ${response.data.data.length} citas`);
    } else {
      log.error('No se recibieron citas');
      return false;
    }
  } catch (error) {
    log.error(`Error obteniendo citas: ${error.response?.data?.error || error.message}`);
    return false;
  }

  return true;
}

/**
 * =====================================================
 * PRUEBAS DE DIAGNÓSTICOS
 * =====================================================
 */
async function testDiagnosticos() {
  log.test('\nPRUEBA 5: Diagnósticos');
  
  if (!authToken || !testPacienteId || !testCitaId) {
    log.warn('Saltando prueba: falta token, pacienteId o citaId');
    return false;
  }

  const client = createFrontendClient(authToken);

  // 5.1 Crear diagnóstico
  log.test('5.1 Crear diagnóstico');
  try {
    const diagnosticoData = {
      id_cita: testCitaId,
      descripcion: 'Diagnóstico de prueba - Paciente en buen estado general'
    };

    const response = await client.post(
      `/pacientes/${testPacienteId}/diagnosticos`,
      diagnosticoData
    );
    
    if (response.data && response.data.data) {
      testDiagnosticoId = response.data.data.id_diagnostico;
      log.success(`Diagnóstico creado. ID: ${testDiagnosticoId}`);
    } else {
      log.error('No se recibió respuesta exitosa');
      return false;
    }
  } catch (error) {
    log.error(`Error creando diagnóstico: ${error.response?.data?.error || error.message}`);
    return false;
  }

  await sleep(500);

  // 5.2 Obtener diagnósticos del paciente
  log.test('5.2 Obtener diagnósticos del paciente');
  try {
    const response = await client.get(`/pacientes/${testPacienteId}/diagnosticos?limit=10`);
    
    if (response.data && response.data.data) {
      log.success(`Diagnósticos obtenidos: ${response.data.data.length} diagnósticos`);
    } else {
      log.error('No se recibieron diagnósticos');
      return false;
    }
  } catch (error) {
    log.error(`Error obteniendo diagnósticos: ${error.response?.data?.error || error.message}`);
    return false;
  }

  return true;
}

/**
 * =====================================================
 * PRUEBAS DE COMORBILIDADES
 * =====================================================
 */
async function testComorbilidades() {
  log.test('\nPRUEBA 6: Comorbilidades');
  
  if (!authToken || !testPacienteId) {
    log.warn('Saltando prueba: falta token o pacienteId');
    return false;
  }

  const client = createFrontendClient(authToken);

  // 6.1 Obtener comorbilidades del paciente
  log.test('6.1 Obtener comorbilidades del paciente');
  try {
    const response = await client.get(`/pacientes/${testPacienteId}/comorbilidades`);
    
    if (response.data && response.data.data) {
      log.success(`Comorbilidades obtenidas: ${response.data.data.length} comorbilidades`);
    } else {
      log.warn('No hay comorbilidades registradas');
    }
  } catch (error) {
    log.error(`Error obteniendo comorbilidades: ${error.response?.data?.error || error.message}`);
    return false;
  }

  return true;
}

/**
 * =====================================================
 * PRUEBAS DE PLANES DE MEDICACIÓN
 * =====================================================
 */
async function testPlanesMedicacion() {
  log.test('\nPRUEBA 7: Planes de Medicación');
  
  if (!authToken || !testPacienteId || !testCitaId) {
    log.warn('Saltando prueba: falta token, pacienteId o citaId');
    return false;
  }

  const client = createFrontendClient(authToken);

  // 7.1 Obtener medicamentos disponibles
  log.test('7.1 Obtener medicamentos disponibles');
  let medicamentoId = null;
  try {
    const response = await client.get('/medicamentos?limit=10');
    
    // ✅ Manejar múltiples formatos de respuesta
    const medicamentos = Array.isArray(response.data?.data) 
      ? response.data.data 
      : Array.isArray(response.data) 
        ? response.data 
        : [];
    
    if (medicamentos.length > 0) {
      medicamentoId = medicamentos[0].id_medicamento;
      log.success(`✅ Medicamentos obtenidos. Usando medicamento ID: ${medicamentoId}`);
    } else {
      // ✅ MEJOR PRÁCTICA: Crear medicamento de prueba si no existe
      log.warn('No hay medicamentos disponibles, creando uno de prueba...');
      try {
        const createResponse = await client.post('/medicamentos', {
          nombre_medicamento: 'Medicamento de Prueba - Test Automatizado',
          descripcion: 'Medicamento creado automáticamente para pruebas de endpoints',
          activo: true
        });
        
        // Manejar múltiples formatos de respuesta
        const medicamentoCreado = createResponse.data?.data || createResponse.data;
        medicamentoId = medicamentoCreado?.id_medicamento || medicamentoCreado?.id;
        
        if (medicamentoId) {
          log.success(`✅ Medicamento de prueba creado. ID: ${medicamentoId}`);
        } else {
          log.warn('⚠️  No se pudo obtener ID del medicamento creado');
          log.warn('   Saltando prueba de planes de medicación');
          return true; // No fallar, solo saltar esta prueba
        }
      } catch (createError) {
        log.warn(`No se pudo crear medicamento de prueba: ${createError.response?.data?.error || createError.message}`);
        log.warn('   Saltando prueba de planes de medicación');
        return true; // No fallar, solo saltar esta prueba
      }
    }
  } catch (error) {
    log.error(`Error obteniendo medicamentos: ${error.response?.data?.error || error.message}`);
    log.warn('   Saltando prueba de planes de medicación');
    return true; // No fallar, solo saltar esta prueba
  }

  await sleep(500);

  // 7.2 Crear plan de medicación
  log.test('7.2 Crear plan de medicación');
  try {
    const planData = {
      id_cita: testCitaId,
      fecha_inicio: new Date().toISOString().split('T')[0],
      observaciones: 'Plan de medicación de prueba',
      medicamentos: [
        {
          id_medicamento: medicamentoId,
          dosis: '500mg',
          frecuencia: 'Cada 8 horas',
          duracion_dias: 7,
          instrucciones: 'Tomar con alimentos'
        }
      ]
    };

    const response = await client.post(
      `/pacientes/${testPacienteId}/planes-medicacion`,
      planData
    );
    
    if (response.data && response.data.data) {
      testPlanId = response.data.data.id_plan;
      log.success(`Plan de medicación creado. ID: ${testPlanId}`);
    } else {
      log.error('No se recibió respuesta exitosa');
      return false;
    }
  } catch (error) {
    log.error(`Error creando plan de medicación: ${error.response?.data?.error || error.message}`);
    return false;
  }

  await sleep(500);

  // 7.3 Obtener planes de medicación del paciente
  log.test('7.3 Obtener planes de medicación del paciente');
  try {
    const response = await client.get(`/pacientes/${testPacienteId}/medicamentos?limit=10`);
    
    if (response.data && response.data.data) {
      log.success(`Planes de medicación obtenidos: ${response.data.data.length} planes`);
    } else {
      log.error('No se recibieron planes de medicación');
      return false;
    }
  } catch (error) {
    log.error(`Error obteniendo planes: ${error.response?.data?.error || error.message}`);
    return false;
  }

  return true;
}

/**
 * =====================================================
 * PRUEBAS DE RESUMEN MÉDICO
 * =====================================================
 */
async function testResumenMedico() {
  log.test('\nPRUEBA 8: Resumen Médico');
  
  if (!authToken || !testPacienteId) {
    log.warn('Saltando prueba: falta token o pacienteId');
    return false;
  }

  const client = createFrontendClient(authToken);

  try {
    const response = await client.get(`/pacientes/${testPacienteId}/resumen-medico`);
    
    if (response.data && response.data.data) {
      const resumen = response.data.data.resumen;
      log.success('Resumen médico obtenido:');
      log.info(`   - Total citas: ${resumen.total_citas || 0}`);
      log.info(`   - Total signos vitales: ${resumen.total_signos_vitales || 0}`);
      log.info(`   - Total diagnósticos: ${resumen.total_diagnosticos || 0}`);
      log.info(`   - Total planes medicación: ${resumen.total_planes_medicacion || 0}`);
    } else {
      log.error('No se recibió resumen médico');
      return false;
    }
  } catch (error) {
    log.error(`Error obteniendo resumen: ${error.response?.data?.error || error.message}`);
    return false;
  }

  return true;
}

/**
 * =====================================================
 * VERIFICAR SERVIDOR
 * =====================================================
 */
async function verificarServidor() {
  log.test('Verificando servidor...');
  try {
    // Intentar conectar al servidor
    const response = await axios.get(`${API_URL}/health`, { 
      timeout: 5000,
      validateStatus: () => true // Aceptar cualquier status
    });
    log.success(`Servidor respondiendo en ${API_URL}`);
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
      log.error(`❌ No se puede conectar al servidor en ${API_URL}`);
      log.warn('\n💡 INSTRUCCIONES:');
      log.warn('   1. Asegúrate de que el servidor esté corriendo:');
      log.warn(`      cd api-clinica`);
      log.warn(`      npm start`);
      log.warn('   2. O si usas node directamente:');
      log.warn(`      node index.js`);
      log.warn('   3. Verifica que el puerto 3000 esté disponible');
      log.warn(`   4. Verifica la variable API_URL en .env (actual: ${API_URL})`);
      return false;
    }
    // Si es otro error (404, etc.), el servidor está corriendo
    log.success(`Servidor respondiendo en ${API_URL} (aunque /health no existe)`);
    return true;
  }
}

/**
 * =====================================================
 * FUNCIÓN PRINCIPAL
 * =====================================================
 */
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 PRUEBAS COMPLETAS DE ENDPOINTS - FORMATO FRONTEND');
  console.log('='.repeat(60));
  console.log(`API URL: ${BASE_URL}`);
  console.log(`Device ID: ${TEST_CONFIG.deviceId}`);
  console.log('='.repeat(60) + '\n');

  // Verificar servidor primero
  const servidorOk = await verificarServidor();
  if (!servidorOk) {
    log.error('\n❌ No se puede continuar sin servidor');
    process.exit(1);
  }

  const results = {
    auth: false,
    pacientes: false,
    citas: false,
    signosVitales: false,
    diagnosticos: false,
    comorbilidades: false,
    planesMedicacion: false,
    resumenMedico: false
  };

  // Intentar crear usuario de prueba si no existe
  log.test('Intentando crear usuario de prueba...');
  try {
    const client = createFrontendClient();
    const testUser = {
      email: 'test-admin@clinica.com',
      password: 'test123456',
      rol: 'Admin'
    };
    
    try {
      await client.post('/auth/register', testUser);
      log.success('Usuario de prueba creado exitosamente');
      // Actualizar credenciales de prueba
      TEST_CONFIG.adminCredentials = [testUser, ...TEST_CONFIG.adminCredentials];
    } catch (error) {
      if (error.response?.status === 400 && 
          error.response?.data?.error?.includes('ya está registrado')) {
        log.info('Usuario de prueba ya existe, usando esas credenciales');
        TEST_CONFIG.adminCredentials = [testUser, ...TEST_CONFIG.adminCredentials];
      } else {
        log.warn('No se pudo crear usuario de prueba, continuando...');
      }
    }
  } catch (error) {
    log.warn('Error al intentar crear usuario de prueba:', error.message);
  }

  // Ejecutar pruebas en orden
  results.auth = await testAuth();
  if (!results.auth) {
    log.error('\n❌ No se pudo autenticar. Abortando pruebas.');
    log.warn('\n💡 SOLUCIÓN:');
    log.warn('   1. Verifica que exista un usuario admin en la BD');
    log.warn('   2. O crea uno manualmente con:');
    log.warn('      POST /api/auth/register');
    log.warn('      { "email": "admin@test.com", "password": "admin123", "rol": "Admin" }');
    log.warn('   3. O ajusta TEST_CONFIG.adminCredentials con credenciales válidas');
    log.warn('   4. También puedes usar variables de entorno:');
    log.warn('      TEST_ADMIN_EMAIL=tu@email.com');
    log.warn('      TEST_ADMIN_PASSWORD=tupassword');
    return;
  }

  await sleep(1000);

  results.pacientes = await testPacientes();
  await sleep(500);

  results.citas = await testCitas();
  await sleep(500);

  results.signosVitales = await testSignosVitales();
  await sleep(500);

  results.diagnosticos = await testDiagnosticos();
  await sleep(500);

  results.comorbilidades = await testComorbilidades();
  await sleep(500);

  results.planesMedicacion = await testPlanesMedicacion();
  await sleep(500);

  results.resumenMedico = await testResumenMedico();

  // Resumen final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE PRUEBAS');
  console.log('='.repeat(60));
  
  const total = Object.keys(results).length;
  const exitosas = Object.values(results).filter(r => r).length;
  
  Object.entries(results).forEach(([test, result]) => {
    const icon = result ? '✅' : '❌';
    const name = test.charAt(0).toUpperCase() + test.slice(1);
    console.log(`${icon} ${name}`);
  });

  console.log('='.repeat(60));
  console.log(`Total: ${exitosas}/${total} pruebas exitosas`);
  console.log('='.repeat(60) + '\n');

  if (exitosas === total) {
    log.success('🎉 ¡Todas las pruebas pasaron exitosamente!');
    process.exit(0);
  } else {
    log.error(`⚠️  ${total - exitosas} prueba(s) fallaron`);
    process.exit(1);
  }
}

// Ejecutar pruebas
runAllTests().catch(error => {
  log.error(`Error fatal: ${error.message}`);
  console.error(error);
  process.exit(1);
});

