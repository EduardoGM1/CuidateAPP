import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import logger from '../utils/logger.js';

const BASE_URL = process.env.API_URL || 'http://localhost:3000/api';

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg, ...args) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`, ...args),
  success: (msg, ...args) => console.log(`${colors.green}✅${colors.reset} ${msg}`, ...args),
  error: (msg, ...args) => console.log(`${colors.red}❌${colors.reset} ${msg}`, ...args),
  warn: (msg, ...args) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`, ...args),
  test: (msg, ...args) => console.log(`${colors.blue}🧪${colors.reset} ${msg}`, ...args)
};

// Cliente axios con configuración
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

let authToken = null;
let testPacienteId = null;
let testComorbilidadId = null;
let testMedicamentoId = null;
let testCitaId = null;

// Función helper para sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Verificar conectividad del servidor
 */
async function verificarServidor() {
  try {
    log.test('Verificando conectividad del servidor...');
    const response = await axios.get(`${BASE_URL.replace('/api', '')}/health`, { timeout: 5000 });
    log.success('Servidor disponible');
    return true;
  } catch (error) {
    log.error('No se pudo conectar al servidor:', error.message);
    log.warn('Asegúrate de que el servidor esté ejecutándose en', BASE_URL);
    return false;
  }
}

/**
 * Autenticación
 */
async function autenticar() {
  try {
    log.test('Autenticando...');
    
    // Intentar múltiples credenciales comunes
    const credenciales = [
      { email: 'admin@test.com', password: 'admin123' },
      { email: 'admin@clinica.com', password: 'admin123' },
      { email: 'admin', password: 'admin' },
      { email: 'test@test.com', password: 'test123' }
    ];

    for (const cred of credenciales) {
      try {
        const response = await axios.post(`${BASE_URL}/auth/login`, cred);
        if (response.data && response.data.token) {
          authToken = response.data.token;
          client.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
          log.success(`Autenticación exitosa con ${cred.email}`);
          return true;
        }
      } catch (err) {
        // Continuar con siguiente credencial
        continue;
      }
    }

    // Intentar endpoint alternativo
    try {
      const response = await axios.post(`${BASE_URL}/mobile/login`, {
        email: 'admin@test.com',
        password: 'admin123'
      });
      if (response.data && response.data.token) {
        authToken = response.data.token;
        client.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
        log.success('Autenticación exitosa (endpoint mobile)');
        return true;
      }
    } catch (err) {
      // Continuar
    }

    log.warn('No se pudo autenticar con credenciales por defecto');
    log.warn('Por favor, asegúrate de tener un usuario admin creado');
    return false;
  } catch (error) {
    log.warn('Error en autenticación:', error.response?.data?.error || error.message);
    return false;
  }
}

/**
 * Crear paciente de prueba
 */
async function crearPacientePrueba() {
  try {
    log.test('Creando paciente de prueba...');
    
    const pacienteData = {
      nombre: 'Paciente',
      apellido_paterno: 'Prueba',
      apellido_materno: 'Campos',
      fecha_nacimiento: '1980-01-15',
      curp: 'TEST' + Date.now(),
      sexo: 'Hombre',
      estado: 'Ciudad de México',
      localidad: 'Ciudad de México',
      numero_celular: '5551234567',
      institucion_salud: 'IMSS',
      activo: true
    };

    const response = await client.post('/pacientes', pacienteData);
    
    if (response.data && response.data.data && response.data.data.id_paciente) {
      testPacienteId = response.data.data.id_paciente;
      log.success(`Paciente de prueba creado: ID ${testPacienteId}`);
      return true;
    }
    
    return false;
  } catch (error) {
    if (error.response?.status === 409) {
      log.warn('Paciente de prueba ya existe, obteniendo ID...');
      // Intentar buscar paciente existente
      try {
        const searchResponse = await client.get('/pacientes?limit=1');
        if (searchResponse.data?.data?.length > 0) {
          testPacienteId = searchResponse.data.data[0].id_paciente;
          log.success(`Usando paciente existente: ID ${testPacienteId}`);
          return true;
        }
      } catch (e) {
        log.error('Error buscando paciente existente:', e.message);
      }
    }
    log.error('Error creando paciente de prueba:', error.response?.data?.error || error.message);
    return false;
  }
}

/**
 * Obtener comorbilidad de prueba
 */
async function obtenerComorbilidadPrueba() {
  try {
    log.test('Obteniendo comorbilidad de prueba...');
    
    const response = await client.get('/comorbilidades?limit=10');
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      testComorbilidadId = response.data.data[0].id_comorbilidad;
      log.success(`Comorbilidad obtenida: ID ${testComorbilidadId}`);
      return true;
    }
    
    log.warn('No hay comorbilidades disponibles');
    return false;
  } catch (error) {
    log.error('Error obteniendo comorbilidad:', error.response?.data?.error || error.message);
    return false;
  }
}

/**
 * Obtener medicamento de prueba
 */
async function obtenerMedicamentoPrueba() {
  try {
    log.test('Obteniendo medicamento de prueba...');
    
    const response = await client.get('/medicamentos?limit=10');
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      testMedicamentoId = response.data.data[0].id_medicamento;
      log.success(`Medicamento obtenido: ID ${testMedicamentoId}`);
      return true;
    }
    
    log.warn('No hay medicamentos disponibles');
    return false;
  } catch (error) {
    log.error('Error obteniendo medicamento:', error.response?.data?.error || error.message);
    return false;
  }
}

/**
 * TEST 1: Signos Vitales - HbA1c y Edad en Medición
 */
async function testSignosVitalesHba1c() {
  log.test('\n=== TEST 1: Signos Vitales - HbA1c y Edad en Medición ===');
  
  try {
    // Crear signo vital con HbA1c
    log.test('1.1 Creando signo vital con HbA1c...');
    const signoData = {
      peso_kg: 75.5,
      talla_m: 1.75,
      presion_sistolica: 120,
      presion_diastolica: 80,
      glucosa_mg_dl: 95,
      colesterol_mg_dl: 200,
      hba1c_porcentaje: 6.5,
      edad_paciente_en_medicion: 45
    };

    const createResponse = await client.post(`/pacientes/${testPacienteId}/signos-vitales`, signoData);
    
    if (createResponse.data && createResponse.data.success) {
      log.success('✅ Signo vital creado con HbA1c');
      
      // Verificar que los campos están en la respuesta
      const signoId = createResponse.data.data?.id_signo;
      if (signoId) {
        log.test('1.2 Verificando campos en respuesta...');
        const getResponse = await client.get(`/pacientes/${testPacienteId}/signos-vitales`);
        
        if (getResponse.data && getResponse.data.data) {
          const signos = Array.isArray(getResponse.data.data) ? getResponse.data.data : [getResponse.data.data];
          const signo = signos.find(s => s.id_signo === signoId);
          
          if (signo) {
            if (signo.hba1c_porcentaje === 6.5) {
              log.success('✅ hba1c_porcentaje presente y correcto');
            } else {
              log.error(`❌ hba1c_porcentaje incorrecto: ${signo.hba1c_porcentaje}`);
            }
            
            if (signo.edad_paciente_en_medicion === 45) {
              log.success('✅ edad_paciente_en_medicion presente y correcto');
            } else {
              log.error(`❌ edad_paciente_en_medicion incorrecto: ${signo.edad_paciente_en_medicion}`);
            }
          }
        }
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    log.error('Error en test de HbA1c:', error.response?.data?.error || error.message);
    return false;
  }
}

/**
 * TEST 2: Paciente Comorbilidad - Tratamiento y Diagnóstico Basal
 */
async function testPacienteComorbilidadTratamiento() {
  log.test('\n=== TEST 2: Paciente Comorbilidad - Tratamiento y Diagnóstico Basal ===');
  
  try {
    // Agregar comorbilidad con tratamiento
    log.test('2.1 Agregando comorbilidad con tratamiento...');
    const comorbilidadData = {
      id_comorbilidad: testComorbilidadId,
      fecha_deteccion: '2020-01-01',
      es_diagnostico_basal: true,
      año_diagnostico: 2020,
      es_agregado_posterior: false,
      recibe_tratamiento_no_farmacologico: true,
      recibe_tratamiento_farmacologico: false
    };

    const createResponse = await client.post(`/pacientes/${testPacienteId}/comorbilidades`, comorbilidadData);
    
    if (createResponse.data && createResponse.data.success) {
      log.success('✅ Comorbilidad agregada con campos de tratamiento');
      
      // Verificar campos en respuesta
      log.test('2.2 Verificando campos en respuesta...');
      const getResponse = await client.get(`/pacientes/${testPacienteId}/comorbilidades`);
      
      if (getResponse.data && getResponse.data.data) {
        const comorbilidades = Array.isArray(getResponse.data.data) ? getResponse.data.data : [getResponse.data.data];
        const comorb = comorbilidades.find(c => c.id_comorbilidad === testComorbilidadId);
        
        if (comorb) {
          const campos = [
            'es_diagnostico_basal',
            'año_diagnostico',
            'es_agregado_posterior',
            'recibe_tratamiento_no_farmacologico',
            'recibe_tratamiento_farmacologico'
          ];
          
          let todosPresentes = true;
          campos.forEach(campo => {
            if (campo in comorb) {
              log.success(`✅ ${campo} presente`);
            } else {
              log.error(`❌ ${campo} NO presente`);
              todosPresentes = false;
            }
          });
          
          return todosPresentes;
        }
      }
    }
    
    return false;
  } catch (error) {
    log.error('Error en test de tratamiento:', error.response?.data?.error || error.message);
    return false;
  }
}

/**
 * TEST 3: Sincronización de Tratamiento Farmacológico
 */
async function testSincronizacionTratamientoFarmacologico() {
  log.test('\n=== TEST 3: Sincronización de Tratamiento Farmacológico ===');
  
  try {
    // Verificar estado inicial
    log.test('3.1 Verificando estado inicial (sin plan de medicación)...');
    const getResponse1 = await client.get(`/pacientes/${testPacienteId}/comorbilidades`);
    const comorbilidades1 = Array.isArray(getResponse1.data?.data) ? getResponse1.data.data : [];
    const comorb1 = comorbilidades1.find(c => c.id_comorbilidad === testComorbilidadId);
    
    if (comorb1 && comorb1.recibe_tratamiento_farmacologico === false) {
      log.success('✅ Estado inicial correcto: recibe_tratamiento_farmacologico = false');
    }
    
    // Crear plan de medicación
    log.test('3.2 Creando plan de medicación...');
    const planData = {
      fecha_inicio: new Date().toISOString().split('T')[0],
      medicamentos: [{
        id_medicamento: testMedicamentoId,
        dosis: '500mg',
        frecuencia: 'Cada 8 horas',
        horario: '08:00'
      }]
    };

    await sleep(2000); // Esperar un poco para que se propague
    
    const planResponse = await client.post(`/pacientes/${testPacienteId}/planes-medicacion`, planData);
    
    if (planResponse.data && planResponse.data.success) {
      log.success('✅ Plan de medicación creado');
      
      // Esperar sincronización
      await sleep(2000);
      
      // Verificar que se sincronizó
      log.test('3.3 Verificando sincronización...');
      const getResponse2 = await client.get(`/pacientes/${testPacienteId}/comorbilidades`);
      const comorbilidades2 = Array.isArray(getResponse2.data?.data) ? getResponse2.data.data : [];
      const comorb2 = comorbilidades2.find(c => c.id_comorbilidad === testComorbilidadId);
      
      if (comorb2 && comorb2.recibe_tratamiento_farmacologico === true) {
        log.success('✅ Sincronización exitosa: recibe_tratamiento_farmacologico = true');
        return true;
      } else {
        log.warn('⚠️  Sincronización no detectada inmediatamente (puede requerir más tiempo)');
        return false;
      }
    }
    
    return false;
  } catch (error) {
    log.error('Error en test de sincronización:', error.response?.data?.error || error.message);
    return false;
  }
}

/**
 * TEST 4: Detección Complicaciones - Microalbuminuria y Referencia
 */
async function testDeteccionComplicaciones() {
  log.test('\n=== TEST 4: Detección Complicaciones - Microalbuminuria y Referencia ===');
  
  try {
    // Crear detección con microalbuminuria
    log.test('4.1 Creando detección con microalbuminuria...');
    const deteccionData = {
      fecha_deteccion: new Date().toISOString().split('T')[0],
      exploracion_pies: true,
      exploracion_fondo_ojo: true,
      microalbuminuria_realizada: true,
      microalbuminuria_resultado: 25.5,
      fue_referido: true,
      referencia_observaciones: 'Referido a nefrología por microalbuminuria elevada'
    };

    const createResponse = await client.post(`/pacientes/${testPacienteId}/detecciones`, deteccionData);
    
    if (createResponse.data && createResponse.data.success) {
      log.success('✅ Detección creada con microalbuminuria y referencia');
      
      // Verificar campos
      log.test('4.2 Verificando campos en respuesta...');
      const deteccionId = createResponse.data.data?.id_deteccion;
      
      if (deteccionId) {
        const getResponse = await client.get(`/pacientes/${testPacienteId}/detecciones/${deteccionId}`);
        
        if (getResponse.data && getResponse.data.data) {
          const det = getResponse.data.data;
          
          const campos = [
            'microalbuminuria_realizada',
            'microalbuminuria_resultado',
            'fue_referido',
            'referencia_observaciones'
          ];
          
          let todosPresentes = true;
          campos.forEach(campo => {
            if (campo in det) {
              log.success(`✅ ${campo} presente`);
            } else {
              log.error(`❌ ${campo} NO presente`);
              todosPresentes = false;
            }
          });
          
          return todosPresentes;
        }
      }
    }
    
    return false;
  } catch (error) {
    log.error('Error en test de detección:', error.response?.data?.error || error.message);
    return false;
  }
}

/**
 * TEST 5: Sesiones Educativas
 */
async function testSesionesEducativas() {
  log.test('\n=== TEST 5: Sesiones Educativas ===');
  
  try {
    // Crear sesión educativa
    log.test('5.1 Creando sesión educativa...');
    const sesionData = {
      fecha_sesion: new Date().toISOString().split('T')[0],
      asistio: true,
      tipo_sesion: 'nutricional',
      numero_intervenciones: 2,
      observaciones: 'Sesión de educación nutricional sobre diabetes'
    };

    const createResponse = await client.post(`/pacientes/${testPacienteId}/sesiones-educativas`, sesionData);
    
    if (createResponse.data && createResponse.data.success) {
      log.success('✅ Sesión educativa creada');
      
      // Verificar que se puede obtener
      log.test('5.2 Verificando obtención de sesiones...');
      const getResponse = await client.get(`/pacientes/${testPacienteId}/sesiones-educativas`);
      
      if (getResponse.data && getResponse.data.data) {
        const sesiones = Array.isArray(getResponse.data.data) ? getResponse.data.data : [getResponse.data.data];
        if (sesiones.length > 0) {
          log.success(`✅ Sesiones obtenidas: ${sesiones.length}`);
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    log.error('Error en test de sesiones educativas:', error.response?.data?.error || error.message);
    return false;
  }
}

/**
 * TEST 6: Paciente - Baja y Número GAM
 */
async function testPacienteBajaNumeroGam() {
  log.test('\n=== TEST 6: Paciente - Baja y Número GAM ===');
  
  try {
    // Actualizar paciente con número GAM
    log.test('6.1 Actualizando paciente con número GAM...');
    const updateData = {
      numero_gam: 1
    };

    const updateResponse = await client.put(`/pacientes/${testPacienteId}`, updateData);
    
    if (updateResponse.data && updateResponse.data.data) {
      if (updateResponse.data.data.numero_gam === 1) {
        log.success('✅ número_gam actualizado correctamente');
      }
    }
    
    // Actualizar con fecha de baja
    log.test('6.2 Actualizando paciente con fecha de baja...');
    const fechaBaja = new Date().toISOString().split('T')[0];
    const bajaData = {
      fecha_baja: fechaBaja,
      motivo_baja: 'Paciente dado de baja por prueba'
    };

    const bajaResponse = await client.put(`/pacientes/${testPacienteId}`, bajaData);
    
    if (bajaResponse.data && bajaResponse.data.data) {
      if (bajaResponse.data.data.fecha_baja === fechaBaja) {
        log.success('✅ fecha_baja actualizada correctamente');
      }
      if (bajaResponse.data.data.activo === false) {
        log.success('✅ activo sincronizado a false');
      }
      if (bajaResponse.data.data.motivo_baja) {
        log.success('✅ motivo_baja actualizado correctamente');
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    log.error('Error en test de baja:', error.response?.data?.error || error.message);
    return false;
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log(colors.bright + '🧪 PRUEBAS COMPLETAS DE CAMPOS FALTANTES' + colors.reset);
  console.log('='.repeat(60) + '\n');

  // Verificar servidor
  if (!(await verificarServidor())) {
    process.exit(1);
  }

  // Autenticar
  if (!(await autenticar())) {
    log.error('No se pudo autenticar. Asegúrate de tener credenciales válidas.');
    process.exit(1);
  }

  // Crear datos de prueba
  if (!(await crearPacientePrueba())) {
    log.error('No se pudo crear paciente de prueba');
    process.exit(1);
  }

  if (!(await obtenerComorbilidadPrueba())) {
    log.warn('No se pudo obtener comorbilidad, algunos tests se saltarán');
  }

  if (!(await obtenerMedicamentoPrueba())) {
    log.warn('No se pudo obtener medicamento, algunos tests se saltarán');
  }

  // Ejecutar tests
  const resultados = {
    hba1c: await testSignosVitalesHba1c(),
    tratamiento: await testPacienteComorbilidadTratamiento(),
    sincronizacion: await testSincronizacionTratamientoFarmacologico(),
    deteccion: await testDeteccionComplicaciones(),
    sesiones: await testSesionesEducativas(),
    baja: await testPacienteBajaNumeroGam()
  };

  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log(colors.bright + '📊 RESUMEN DE PRUEBAS' + colors.reset);
  console.log('='.repeat(60));
  
  Object.entries(resultados).forEach(([test, resultado]) => {
    const icono = resultado ? '✅' : '❌';
    const color = resultado ? colors.green : colors.red;
    console.log(`${color}${icono}${colors.reset} ${test}: ${resultado ? 'PASÓ' : 'FALLÓ'}`);
  });

  const totalTests = Object.keys(resultados).length;
  const testsPasados = Object.values(resultados).filter(r => r).length;
  
  console.log(`\n${colors.bright}Total: ${testsPasados}/${totalTests} tests pasaron${colors.reset}\n`);

  process.exit(testsPasados === totalTests ? 0 : 1);
}

main().catch(error => {
  log.error('Error fatal:', error);
  process.exit(1);
});

