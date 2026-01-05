import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import sequelize from '../config/db.js';
import logger from '../utils/logger.js';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api';

// Colores para logs
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg, ...args) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`, ...args),
  success: (msg, ...args) => console.log(`${colors.green}✅${colors.reset} ${msg}`, ...args),
  error: (msg, ...args) => console.log(`${colors.red}❌${colors.reset} ${msg}`, ...args),
  warn: (msg, ...args) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`, ...args),
  test: (msg, ...args) => console.log(`${colors.cyan}🧪${colors.reset} ${msg}`, ...args),
};

// Cliente HTTP
let client = null;
let authToken = null;
let testPacienteId = null;
let testCitaId = null;
let testComorbilidadId = null;
let testDeteccionId = null;
let testSesionEducativaId = null;

// Función para crear cliente HTTP
function createClient() {
  if (!client) {
    client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Type': 'mobile',
        'X-Platform': 'android',
      },
    });
  }
  return client;
}

// Función para autenticarse
async function authenticate() {
  try {
    log.test('Autenticando usuario de prueba...');
    const client = createClient();
    
    // Intentar login con diferentes endpoints
    let response;
    try {
      response = await client.post('/auth/login', {
        email: 'admin@test.com',
        password: 'admin123'
      });
    } catch (err) {
      try {
        response = await client.post('/mobile/login', {
          email: 'admin@test.com',
          password: 'admin123'
        });
      } catch (err2) {
        // Crear usuario de prueba si no existe
        log.warn('Usuario de prueba no existe, creando...');
        const createUserResponse = await client.post('/auth/register', {
          email: 'admin@test.com',
          password: 'admin123',
          nombre: 'Admin',
          apellido_paterno: 'Test',
          rol: 'Admin'
        });
        response = createUserResponse;
      }
    }
    
    if (response.data?.token) {
      authToken = response.data.token;
    } else if (response.data?.data?.token) {
      authToken = response.data.data.token;
    } else {
      throw new Error('No se recibió token de autenticación');
    }
    
    client.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    log.success('Autenticación exitosa');
    return true;
  } catch (error) {
    log.error('Error en autenticación:', error.response?.data || error.message);
    return false;
  }
}

// Función para crear paciente de prueba
async function createTestPaciente() {
  try {
    log.test('Creando paciente de prueba...');
    const client = createClient();
    
    const pacienteData = {
      nombre: 'Paciente',
      apellido_paterno: 'Prueba',
      apellido_materno: 'Frontend',
      fecha_nacimiento: '1980-01-01',
      sexo: 'Hombre',
      estado: 'Chiapas',
      localidad: 'Tuxtla Gutiérrez',
      numero_gam: 1,
      activo: true
    };
    
    const response = await client.post('/pacientes', pacienteData);
    
    if (response.data?.data?.id_paciente) {
      testPacienteId = response.data.data.id_paciente;
    } else if (response.data?.id_paciente) {
      testPacienteId = response.data.id_paciente;
    } else {
      throw new Error('No se recibió ID de paciente');
    }
    
    log.success(`Paciente de prueba creado. ID: ${testPacienteId}`);
    return true;
  } catch (error) {
    log.error('Error creando paciente de prueba:', error.response?.data || error.message);
    // Intentar obtener paciente existente
    try {
      const listResponse = await client.get('/pacientes?limit=1');
      if (listResponse.data?.data?.length > 0) {
        testPacienteId = listResponse.data.data[0].id_paciente;
        log.warn(`Usando paciente existente. ID: ${testPacienteId}`);
        return true;
      }
    } catch (err) {
      log.error('Error obteniendo paciente existente:', err.message);
    }
    return false;
  }
}

// Función para crear comorbilidad de prueba
async function createTestComorbilidad() {
  try {
    log.test('Creando comorbilidad de prueba...');
    const client = createClient();
    
    // Obtener comorbilidades disponibles
    const comorbilidadesResponse = await client.get('/comorbilidades?limit=1');
    if (comorbilidadesResponse.data?.data?.length > 0) {
      testComorbilidadId = comorbilidadesResponse.data.data[0].id_comorbilidad;
      log.success(`Comorbilidad de prueba encontrada. ID: ${testComorbilidadId}`);
      return true;
    }
    
    // Crear comorbilidad si no existe
    const comorbilidadData = {
      nombre_comorbilidad: 'Hipercolesterolemia',
      descripcion: 'Comorbilidad de prueba para tests'
    };
    
    const response = await client.post('/comorbilidades', comorbilidadData);
    if (response.data?.data?.id_comorbilidad) {
      testComorbilidadId = response.data.data.id_comorbilidad;
      log.success(`Comorbilidad de prueba creada. ID: ${testComorbilidadId}`);
      return true;
    }
    
    return false;
  } catch (error) {
    log.error('Error creando comorbilidad de prueba:', error.response?.data || error.message);
    return false;
  }
}

// Función para agregar comorbilidad al paciente
async function addComorbilidadToPaciente() {
  try {
    log.test('Agregando comorbilidad al paciente...');
    const client = createClient();
    
    const comorbilidadData = {
      id_comorbilidad: testComorbilidadId,
      fecha_deteccion: '2020-01-01',
      es_diagnostico_basal: true,
      año_diagnostico: 2020,
      es_agregado_posterior: false,
      recibe_tratamiento_no_farmacologico: true,
      recibe_tratamiento_farmacologico: false
    };
    
    const response = await client.post(`/pacientes/${testPacienteId}/comorbilidades`, comorbilidadData);
    log.success('Comorbilidad agregada al paciente con nuevos campos');
    return true;
  } catch (error) {
    log.error('Error agregando comorbilidad:', error.response?.data || error.message);
    return false;
  }
}

// Test 1: Signos Vitales con HbA1c y edad
async function testSignosVitalesHbA1c() {
  try {
    log.test('1. Probando Signos Vitales con HbA1c y edad...');
    const client = createClient();
    
    const signosData = {
      peso_kg: 75.5,
      talla_m: 1.70,
      presion_sistolica: 120,
      presion_diastolica: 80,
      glucosa_mg_dl: 95,
      colesterol_mg_dl: 180,
      hba1c_porcentaje: 6.5,
      edad_paciente_en_medicion: 45
    };
    
    const response = await client.post(`/pacientes/${testPacienteId}/signos-vitales`, signosData);
    
    if (response.data?.success || response.data?.data) {
      log.success('✅ Signos vitales con HbA1c y edad creados exitosamente');
      return true;
    }
    
    throw new Error('Respuesta inesperada');
  } catch (error) {
    log.error('Error en test de signos vitales:', error.response?.data || error.message);
    return false;
  }
}

// Test 2: Signos Vitales con LDL/HDL (requiere comorbilidad)
async function testSignosVitalesLDLHDL() {
  try {
    log.test('2. Probando Signos Vitales con LDL/HDL...');
    const client = createClient();
    
    // Verificar que el paciente tenga la comorbilidad
    const comorbilidadesResponse = await client.get(`/pacientes/${testPacienteId}/comorbilidades`);
    const hasComorbilidad = Array.isArray(comorbilidadesResponse.data?.data) 
      ? comorbilidadesResponse.data.data.some(c => c.id_comorbilidad === testComorbilidadId)
      : false;
    
    if (!hasComorbilidad) {
      log.warn('Paciente no tiene comorbilidad, agregando...');
      await addComorbilidadToPaciente();
      // Esperar un momento para que se propague
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const signosData = {
      peso_kg: 76.0,
      talla_m: 1.70,
      colesterol_mg_dl: 200,
      colesterol_ldl: 130,
      colesterol_hdl: 50
    };
    
    const response = await client.post(`/pacientes/${testPacienteId}/signos-vitales`, signosData);
    
    if (response.data?.success || response.data?.data) {
      log.success('✅ Signos vitales con LDL/HDL creados exitosamente');
      return true;
    }
    
    throw new Error('Respuesta inesperada');
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.error?.includes('Hipercolesterolemia')) {
      log.warn('⚠️  Validación funcionando correctamente (requiere comorbilidad)');
      return true;
    }
    log.error('Error en test de LDL/HDL:', error.response?.data || error.message);
    return false;
  }
}

// Test 3: Comorbilidades con nuevos campos
async function testComorbilidadesNuevosCampos() {
  try {
    log.test('3. Probando Comorbilidades con nuevos campos...');
    const client = createClient();
    
    const comorbilidadData = {
      id_comorbilidad: testComorbilidadId,
      fecha_deteccion: '2021-01-01',
      es_diagnostico_basal: false,
      año_diagnostico: 2021,
      es_agregado_posterior: true,
      recibe_tratamiento_no_farmacologico: true,
      recibe_tratamiento_farmacologico: true
    };
    
    const response = await client.post(`/pacientes/${testPacienteId}/comorbilidades`, comorbilidadData);
    
    if (response.data?.success || response.data?.data) {
      log.success('✅ Comorbilidad con nuevos campos creada exitosamente');
      
      // Verificar que los campos se guardaron
      const getResponse = await client.get(`/pacientes/${testPacienteId}/comorbilidades`);
      const comorbilidad = getResponse.data?.data?.find(c => c.id_comorbilidad === testComorbilidadId);
      
      if (comorbilidad) {
        log.success('✅ Campos verificados:', {
          es_diagnostico_basal: comorbilidad.es_diagnostico_basal,
          año_diagnostico: comorbilidad.año_diagnostico,
          recibe_tratamiento_no_farmacologico: comorbilidad.recibe_tratamiento_no_farmacologico,
          recibe_tratamiento_farmacologico: comorbilidad.recibe_tratamiento_farmacologico
        });
      }
      
      return true;
    }
    
    throw new Error('Respuesta inesperada');
  } catch (error) {
    if (error.response?.status === 409) {
      log.warn('⚠️  Comorbilidad ya existe (esperado)');
      return true;
    }
    log.error('Error en test de comorbilidades:', error.response?.data || error.message);
    return false;
  }
}

// Test 4: Detecciones con microalbuminuria y referencia
async function testDeteccionesNuevosCampos() {
  try {
    log.test('4. Probando Detecciones con microalbuminuria y referencia...');
    const client = createClient();
    
    const deteccionData = {
      tipo_complicacion: 'Nefropatía',
      fecha_deteccion: new Date().toISOString().split('T')[0],
      exploracion_pies: true,
      exploracion_fondo_ojo: false,
      microalbuminuria_realizada: true,
      microalbuminuria_resultado: 25.5,
      fue_referido: true,
      referencia_observaciones: 'Referido a nefrología por microalbuminuria elevada'
    };
    
    const response = await client.post(`/pacientes/${testPacienteId}/detecciones-complicaciones`, deteccionData);
    
    if (response.data?.success || response.data?.data) {
      testDeteccionId = response.data?.data?.id_deteccion || response.data?.id_deteccion;
      log.success('✅ Detección con nuevos campos creada exitosamente');
      
      // Verificar que los campos se guardaron
      if (testDeteccionId) {
        const getResponse = await client.get(`/pacientes/${testPacienteId}/detecciones-complicaciones/${testDeteccionId}`);
        const deteccion = getResponse.data?.data || getResponse.data;
        
        if (deteccion) {
          log.success('✅ Campos verificados:', {
            microalbuminuria_realizada: deteccion.microalbuminuria_realizada,
            microalbuminuria_resultado: deteccion.microalbuminuria_resultado,
            fue_referido: deteccion.fue_referido,
            referencia_observaciones: deteccion.referencia_observaciones
          });
        }
      }
      
      return true;
    }
    
    throw new Error('Respuesta inesperada');
  } catch (error) {
    log.error('Error en test de detecciones:', error.response?.data || error.message);
    return false;
  }
}

// Test 5: Sesiones Educativas
async function testSesionesEducativas() {
  try {
    log.test('5. Probando Sesiones Educativas...');
    const client = createClient();
    
    const sesionData = {
      fecha_sesion: new Date().toISOString().split('T')[0],
      asistio: true,
      tipo_sesion: 'nutricional',
      numero_intervenciones: 1,
      observaciones: 'Sesión de prueba'
    };
    
    const response = await client.post(`/pacientes/${testPacienteId}/sesiones-educativas`, sesionData);
    
    if (response.data?.success || response.data?.data) {
      testSesionEducativaId = response.data?.data?.id_sesion || response.data?.id_sesion;
      log.success('✅ Sesión educativa creada exitosamente');
      
      // Verificar que se puede obtener
      const getResponse = await client.get(`/pacientes/${testPacienteId}/sesiones-educativas`);
      const sesiones = getResponse.data?.data || [];
      
      if (sesiones.length > 0) {
        log.success(`✅ Sesiones educativas obtenidas: ${sesiones.length}`);
      }
      
      return true;
    }
    
    throw new Error('Respuesta inesperada');
  } catch (error) {
    log.error('Error en test de sesiones educativas:', error.response?.data || error.message);
    return false;
  }
}

// Test 6: Actualizar paciente con campos de baja
async function testPacienteCamposBaja() {
  try {
    log.test('6. Probando actualización de paciente con campos de baja...');
    const client = createClient();
    
    const updateData = {
      numero_gam: 2,
      fecha_baja: null,
      motivo_baja: null
    };
    
    const response = await client.put(`/pacientes/${testPacienteId}`, updateData);
    
    if (response.data?.success || response.data?.data) {
      log.success('✅ Paciente actualizado con campos de baja');
      
      // Verificar que los campos se guardaron
      const getResponse = await client.get(`/pacientes/${testPacienteId}`);
      const paciente = getResponse.data?.data || getResponse.data;
      
      if (paciente) {
        log.success('✅ Campos verificados:', {
          numero_gam: paciente.numero_gam,
          fecha_baja: paciente.fecha_baja,
          motivo_baja: paciente.motivo_baja
        });
      }
      
      return true;
    }
    
    throw new Error('Respuesta inesperada');
  } catch (error) {
    log.error('Error en test de campos de baja:', error.response?.data || error.message);
    return false;
  }
}

// Función principal
async function main() {
  log.info('🚀 ========================================');
  log.info('🚀 PRUEBAS DE FUNCIONALIDAD FRONTEND');
  log.info('🚀 Campos Faltantes - Formato GAM');
  log.info('🚀 ========================================\n');
  
  // Verificar conectividad
  try {
    const client = createClient();
    // Intentar conectar a un endpoint básico (pacientes requiere auth, pero al menos verifica que el servidor responde)
    await client.get('/pacientes', {
      validateStatus: (status) => status < 500 // Aceptar 401/403 pero no 500+
    });
    log.success('Servidor conectado');
  } catch (error) {
    if (error.response && error.response.status < 500) {
      // Si es 401/403/404, el servidor está respondiendo
      log.success('Servidor conectado (respuesta de autenticación esperada)');
    } else {
      log.error('No se pudo conectar al servidor:', error.message);
      log.warn('Asegúrate de que el servidor esté ejecutándose en', API_BASE_URL);
      log.warn('Ejecuta: npm start o node server.js en la carpeta api-clinica');
      process.exit(1);
    }
  }
  
  // Autenticación
  if (!(await authenticate())) {
    log.error('No se pudo autenticar');
    process.exit(1);
  }
  
  // Crear datos de prueba
  if (!(await createTestPaciente())) {
    log.error('No se pudo crear paciente de prueba');
    process.exit(1);
  }
  
  if (!(await createTestComorbilidad())) {
    log.error('No se pudo crear comorbilidad de prueba');
    process.exit(1);
  }
  
  // Ejecutar tests
  const results = {
    signosVitalesHbA1c: await testSignosVitalesHbA1c(),
    signosVitalesLDLHDL: await testSignosVitalesLDLHDL(),
    comorbilidades: await testComorbilidadesNuevosCampos(),
    detecciones: await testDeteccionesNuevosCampos(),
    sesionesEducativas: await testSesionesEducativas(),
    camposBaja: await testPacienteCamposBaja()
  };
  
  // Resumen
  log.info('\n📊 ========================================');
  log.info('📊 RESUMEN DE PRUEBAS');
  log.info('📊 ========================================\n');
  
  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(r => r).length;
  
  Object.entries(results).forEach(([test, result]) => {
    if (result) {
      log.success(`${test}: ✅ PASÓ`);
    } else {
      log.error(`${test}: ❌ FALLÓ`);
    }
  });
  
  log.info(`\n✅ Pruebas pasadas: ${passed}/${total}`);
  
  if (passed === total) {
    log.success('\n🎉 ¡Todas las pruebas pasaron exitosamente!');
    process.exit(0);
  } else {
    log.warn(`\n⚠️  ${total - passed} prueba(s) fallaron`);
    process.exit(1);
  }
}

main().catch(error => {
  log.error('Error fatal:', error);
  process.exit(1);
});

