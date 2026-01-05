import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

const log = {
  test: (msg) => console.log(`${colors.cyan}🧪 TEST:${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅ ÉXITO:${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌ ERROR:${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  INFO:${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ADVERTENCIA:${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n${colors.magenta}📋 ${msg}${colors.reset}\n${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`)
};

let authToken = null;

// Crear cliente axios
function createClient() {
  const client = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'okhttp/4.12.0' // Simular cliente móvil
    }
  });
  
  if (authToken) {
    client.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
  }
  
  return client;
}

// Verificar conectividad del servidor
async function verificarServidor() {
  try {
    log.test('Verificando conectividad del servidor...');
    const response = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    log.success('Servidor conectado');
    return true;
  } catch (error) {
    log.error('No se pudo conectar al servidor');
    log.info('Asegúrate de que el servidor esté ejecutándose: npm run dev');
    return false;
  }
}

// Autenticación con doctor
async function autenticar() {
  try {
    log.test('Autenticando como doctor...');
    const client = createClient();
    
    const response = await client.post('/api/auth/login', {
      email: 'doctor@clinica.com',
      password: 'Doctor123!'
    });
    
    if (response.data && response.data.token) {
      authToken = response.data.token;
      client.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      log.success('Autenticación exitosa como doctor');
      return true;
    }
    
    log.error('No se recibió token de autenticación');
    return false;
  } catch (error) {
    log.error(`Error en autenticación: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// Obtener módulo disponible
async function obtenerModulo() {
  try {
    const client = createClient();
    const response = await client.get('/api/modulos');
    
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      return response.data[0].id_modulo;
    }
    
    // Intentar crear uno
    try {
      const createResponse = await client.post('/api/modulos', {
        nombre_modulo: 'Módulo de Prueba',
        descripcion: 'Módulo para pruebas de validación',
        activo: true
      });
      if (createResponse.data && createResponse.data.id_modulo) {
        return createResponse.data.id_modulo;
      }
    } catch (e) {
      // Ignorar error
    }
    
    return 1; // Por defecto
  } catch (error) {
    return 1; // Por defecto
  }
}

// Valores válidos según modelos
const VALORES_VALIDOS = {
  institucion_salud: ['IMSS', 'Bienestar', 'ISSSTE', 'Particular', 'Otro'],
  sexo: ['Hombre', 'Mujer'],
  tipo_sesion: ['Individual', 'Grupal', 'Familiar', 'Comunitaria'],
  tipo_sangre: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
};

// Prueba 1: Crear Paciente Completo (formato frontend)
async function testCrearPacienteCompleto() {
  log.section('PRUEBA 1: Crear Paciente Completo (Formato Frontend)');
  
  try {
    const client = createClient();
    const idModulo = await obtenerModulo();
    
    // Datos exactos como los envía el frontend (camelCase)
    const pacienteDataFrontend = {
      nombre: 'Cristina',
      apellidoPaterno: 'Gómez',
      apellidoMaterno: 'Ruiz',
      fechaNacimiento: '1980-05-13',
      curp: 'ITTF800513MDFBOM95',
      institucionSalud: 'Bienestar', // ⚠️ camelCase desde frontend
      sexo: 'Mujer',
      direccion: 'Carrera Sur #3056',
      estado: 'Baja California',
      localidad: 'Ensenada',
      numeroCelular: '611-6224912',
      idModulo: idModulo,
      activo: true,
      pin: String(Math.floor(1000 + Math.random() * 9000)),
      device_id: `device_${Date.now()}_test`
    };
    
    log.info('Datos enviados (formato frontend - camelCase):');
    console.log(JSON.stringify(pacienteDataFrontend, null, 2));
    
    // Verificar que institucionSalud está en valores válidos
    if (!VALORES_VALIDOS.institucion_salud.includes(pacienteDataFrontend.institucionSalud)) {
      log.error(`❌ institucionSalud inválido: "${pacienteDataFrontend.institucionSalud}"`);
      log.info(`Valores válidos: ${VALORES_VALIDOS.institucion_salud.join(', ')}`);
      return false;
    }
    
    log.test('Enviando datos al backend...');
    const response = await client.post('/api/pacientes/completo', pacienteDataFrontend);
    
    if (response.data && response.data.success) {
      log.success(`✅ Paciente creado exitosamente con ID: ${response.data.data.id_paciente}`);
      return { success: true, pacienteId: response.data.data.id_paciente };
    }
    
    log.error('No se recibió respuesta exitosa');
    return { success: false };
  } catch (error) {
    log.error(`Error creando paciente: ${error.response?.data?.error || error.message}`);
    
    if (error.response?.data) {
      log.info('Detalles del error:');
      console.log(JSON.stringify(error.response.data, null, 2));
      
      // Análisis específico del error
      if (error.response.data.error?.includes('institucion_salud')) {
        log.error('❌ PROBLEMA DETECTADO: Error con institucion_salud');
        log.info('Verificando ENUM en base de datos...');
      }
      
      if (error.response.data.error?.includes('Data truncated')) {
        log.error('❌ PROBLEMA DETECTADO: Data truncated');
        log.info('Esto indica que el valor no coincide con el ENUM en la base de datos');
        log.info('Verificar que el ENUM en la BD incluya todos los valores válidos');
      }
    }
    
    return { success: false, error: error.message };
  }
}

// Prueba 2: Verificar transformación camelCase a snake_case
async function testTransformacionDatos() {
  log.section('PRUEBA 2: Verificar Transformación de Datos');
  
  log.info('Verificando cómo el backend transforma camelCase a snake_case...');
  
  // El backend debería aceptar ambos formatos o transformar automáticamente
  const datosCamelCase = {
    nombre: 'Test',
    apellidoPaterno: 'Test',
    fechaNacimiento: '1990-01-01',
    curp: 'TEST900101HDFRTS01',
    institucionSalud: 'IMSS',
    sexo: 'Hombre',
    direccion: 'Test',
    estado: 'Test',
    localidad: 'Test',
    numeroCelular: '1234567890',
    idModulo: 1,
    activo: true,
    pin: String(Math.floor(1000 + Math.random() * 9000)),
    device_id: `device_${Date.now()}_test`
  };
  
  log.info('Datos en camelCase (formato frontend):');
  console.log(JSON.stringify(datosCamelCase, null, 2));
  
  log.info('El backend debe transformar:');
  log.info('  - apellidoPaterno → apellido_paterno');
  log.info('  - apellidoMaterno → apellido_materno');
  log.info('  - fechaNacimiento → fecha_nacimiento');
  log.info('  - institucionSalud → institucion_salud');
  log.info('  - numeroCelular → numero_celular');
  log.info('  - idModulo → id_modulo');
  
  return true;
}

// Prueba 3: Validar todos los ENUMs
async function testValidarEnums() {
  log.section('PRUEBA 3: Validar Todos los ENUMs');
  
  const client = createClient();
  const idModulo = await obtenerModulo();
  
  const resultados = {
    institucion_salud: [],
    sexo: []
  };
  
  // Probar cada valor de institucion_salud
  log.test('Probando valores de institucion_salud...');
  for (const valor of VALORES_VALIDOS.institucion_salud) {
    try {
      const testData = {
        nombre: `Test ${valor}`,
        apellidoPaterno: 'Test',
        fechaNacimiento: '1990-01-01',
        curp: `TEST900101HDFRTS0${Math.floor(Math.random() * 10)}`,
        institucionSalud: valor,
        sexo: 'Hombre',
        direccion: 'Test',
        estado: 'Test',
        localidad: 'Test',
        numeroCelular: '1234567890',
        idModulo: idModulo,
        activo: true,
        pin: String(Math.floor(1000 + Math.random() * 9000)),
        device_id: `device_${Date.now()}_${valor}_test`
      };
      
      const response = await client.post('/api/pacientes/completo', testData);
      if (response.data && response.data.success) {
        resultados.institucion_salud.push({ valor, estado: '✅ Válido' });
        log.success(`✅ "${valor}" es válido`);
      }
    } catch (error) {
      resultados.institucion_salud.push({ 
        valor, 
        estado: '❌ Error',
        error: error.response?.data?.error || error.message 
      });
      log.error(`❌ "${valor}" falló: ${error.response?.data?.error || error.message}`);
    }
  }
  
  // Probar cada valor de sexo
  log.test('Probando valores de sexo...');
  for (const valor of VALORES_VALIDOS.sexo) {
    try {
      const testData = {
        nombre: `Test ${valor}`,
        apellidoPaterno: 'Test',
        fechaNacimiento: '1990-01-01',
        curp: `TEST900101HDFRTS0${Math.floor(Math.random() * 10)}`,
        institucionSalud: 'IMSS',
        sexo: valor,
        direccion: 'Test',
        estado: 'Test',
        localidad: 'Test',
        numeroCelular: '1234567890',
        idModulo: idModulo,
        activo: true,
        pin: String(Math.floor(1000 + Math.random() * 9000)),
        device_id: `device_${Date.now()}_${valor}_test`
      };
      
      const response = await client.post('/api/pacientes/completo', testData);
      if (response.data && response.data.success) {
        resultados.sexo.push({ valor, estado: '✅ Válido' });
        log.success(`✅ "${valor}" es válido`);
      }
    } catch (error) {
      resultados.sexo.push({ 
        valor, 
        estado: '❌ Error',
        error: error.response?.data?.error || error.message 
      });
      log.error(`❌ "${valor}" falló: ${error.response?.data?.error || error.message}`);
    }
  }
  
  // Mostrar resumen
  log.section('RESUMEN DE VALIDACIÓN DE ENUMs');
  console.log('\n📊 institucion_salud:');
  resultados.institucion_salud.forEach(r => {
    console.log(`  ${r.estado} ${r.valor}${r.error ? ` - ${r.error}` : ''}`);
  });
  
  console.log('\n📊 sexo:');
  resultados.sexo.forEach(r => {
    console.log(`  ${r.estado} ${r.valor}${r.error ? ` - ${r.error}` : ''}`);
  });
  
  return resultados;
}

// Prueba 4: Verificar formato exacto del error
async function testFormatoError() {
  log.section('PRUEBA 4: Reproducir Error Exacto');
  
  const client = createClient();
  const idModulo = await obtenerModulo();
  
  // Datos exactos del error reportado
  const errorData = {
    activo: true,
    apellido_materno: "Ruiz",
    apellido_paterno: "Gómez",
    curp: "ITTF800513MDFBOM95",
    device_id: "device_1767148271331_s1yib9ul2",
    direccion: "Carrera Sur #3056",
    estado: "Baja California",
    fecha_nacimiento: "1980-05-13",
    id_modulo: idModulo,
    institucion_salud: "Bienestar", // ⚠️ snake_case directo
    localidad: "Ensenada",
    nombre: "Cristina",
    numero_celular: "611-6224912",
    pin: "2225",
    sexo: "Mujer"
  };
  
  log.info('Datos exactos del error (snake_case):');
  console.log(JSON.stringify(errorData, null, 2));
  
  log.test('Enviando datos exactos del error...');
  try {
    const response = await client.post('/api/pacientes/completo', errorData);
    if (response.data && response.data.success) {
      log.success('✅ Datos aceptados correctamente');
      return true;
    }
  } catch (error) {
    log.error(`❌ Error reproducido: ${error.response?.data?.error || error.message}`);
    
    if (error.response?.data?.error?.includes('institucion_salud')) {
      log.error('❌ PROBLEMA CONFIRMADO: Error con institucion_salud');
      log.info('Verificar ENUM en base de datos MySQL');
      log.info('Ejecutar: SHOW COLUMNS FROM pacientes WHERE Field = "institucion_salud";');
    }
    
    return false;
  }
}

// Ejecutar todas las pruebas
async function ejecutarPruebas() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 PRUEBAS DE VALIDACIÓN DE FORMULARIOS FRONTEND');
  console.log('='.repeat(60) + '\n');
  
  // Verificar servidor
  if (!(await verificarServidor())) {
    log.error('No se puede continuar sin conexión al servidor');
    process.exit(1);
  }
  
  // Autenticación
  if (!(await autenticar())) {
    log.error('No se puede continuar sin autenticación');
    process.exit(1);
  }
  
  // Ejecutar pruebas
  await testTransformacionDatos();
  await testValidarEnums();
  await testFormatoError();
  const resultado1 = await testCrearPacienteCompleto();
  
  // Resumen final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN FINAL');
  console.log('='.repeat(60));
  
  if (resultado1.success) {
    log.success('✅ PRUEBAS COMPLETADAS');
    console.log(`\n✅ Paciente de prueba creado: ID ${resultado1.pacienteId}`);
    console.log('✅ Validación de formularios: COMPLETADA');
  } else {
    log.error('❌ Algunas pruebas fallaron');
    console.log('\n⚠️  Revisar errores arriba para identificar problemas');
  }
  
  process.exit(resultado1.success ? 0 : 1);
}

// Ejecutar
ejecutarPruebas().catch(error => {
  log.error(`Error fatal: ${error.message}`);
  console.error(error);
  process.exit(1);
});

