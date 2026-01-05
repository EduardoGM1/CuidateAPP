/**
 * @file test-frontend-backend-integration.js
 * @description Pruebas de integración frontend->backend
 * Valida que los datos enviados desde el frontend sean correctos
 * y analiza cada campo de cada formulario
 */

const axios = require('axios');

// Simple color support (sin dependencia externa)
const colorize = (str, codes) => {
  const code = codes.join(';');
  return `\x1b[${code}m${str}\x1b[0m`;
};

// Helper para colores
const colors = {
  green: (str) => colorize(String(str), ['32']),
  red: (str) => colorize(String(str), ['31']),
  yellow: (str) => colorize(String(str), ['33']),
  cyan: (str) => colorize(String(str), ['36']),
  gray: (str) => colorize(String(str), ['90']),
  bold: (str) => colorize(String(str), ['1'])
};

// Extender String prototype para soportar colores encadenados
String.prototype.green = function() { return colors.green(this); };
String.prototype.red = function() { return colors.red(this); };
String.prototype.yellow = function() { return colors.yellow(this); };
String.prototype.cyan = function() { return colors.cyan(this); };
String.prototype.gray = function() { return colors.gray(this); };
String.prototype.bold = function() { return colors.bold(this); };

// Configuración
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_PACIENTE_ID = 7; // ID de paciente para pruebas
const TEST_DOCTOR_ID = 2; // ID de doctor para pruebas

// Credenciales de prueba (ajustar según tu entorno)
const TEST_CREDENTIALS = {
  paciente: {
    id_paciente: TEST_PACIENTE_ID,
    pin: '1234' // Ajustar según tu base de datos
  },
  doctor: {
    email: 'doctor@clinica.com',
    password: 'Doctor123!' // Intentar primero con esta, si falla probar 'admin@clinica.com' / 'Admin123!'
  },
  admin: {
    email: 'admin@clinica.com',
    password: 'Admin123!'
  }
};

// Contadores de pruebas
let testsPassed = 0;
let testsFailed = 0;
let warnings = [];

// Helper para imprimir resultados
function printResult(testName, passed, message = '', details = {}) {
  if (passed) {
    console.log(`✅ ${testName}`.green);
    testsPassed++;
    if (message) console.log(`   ${message}`.gray);
  } else {
    console.log(`❌ ${testName}`.red);
    testsFailed++;
    if (message) console.log(`   ${message}`.red);
    if (Object.keys(details).length > 0) {
      console.log(`   Detalles:`, details);
    }
  }
}

function printWarning(message) {
  console.log(colors.yellow(`⚠️  ${message}`));
  warnings.push(message);
}

// Helper para hacer requests autenticados
async function makeAuthenticatedRequest(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'X-Device-ID': 'test-device-123',
        'X-Platform': 'android',
        'X-App-Version': '1.0.0',
        'X-Client-Type': 'mobile'
      }
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    };
  }
}

// ============================================
// 1. ANÁLISIS DE FORMULARIO: SIGNOS VITALES
// ============================================
async function testSignosVitalesForm(token) {
  console.log(colors.cyan(colors.bold('\n📊 FORMULARIO: SIGNOS VITALES')));
  console.log(colors.cyan('='.repeat(60)));

  // Campos esperados del frontend (basado en RegistrarSignosVitales.js)
  const frontendFields = {
    peso_kg: { type: 'number', required: true, frontend: 'parseFloat' },
    talla_m: { type: 'number', required: true, frontend: 'parseFloat' },
    presion_sistolica: { type: 'number', required: true, frontend: 'parseInt' },
    presion_diastolica: { type: 'number', required: true, frontend: 'parseInt' },
    glucosa_mg_dl: { type: 'number', required: true, frontend: 'parseInt' },
    medida_cintura_cm: { type: 'number', required: false, frontend: 'parseFloat' },
    observaciones: { type: 'string', required: false, frontend: 'trim' },
    imc: { type: 'number', required: false, frontend: 'calculated' }
  };

  // Campos esperados del backend (basado en pacienteMedicalData.js)
  const backendFields = {
    peso_kg: { type: 'DECIMAL(6,2)', nullable: true },
    talla_m: { type: 'DECIMAL(4,2)', nullable: true },
    presion_sistolica: { type: 'SMALLINT', nullable: true },
    presion_diastolica: { type: 'SMALLINT', nullable: true },
    glucosa_mg_dl: { type: 'DECIMAL(6,2)', nullable: true },
    medida_cintura_cm: { type: 'DECIMAL(6,2)', nullable: true },
    observaciones: { type: 'TEXT', nullable: true },
    imc: { type: 'DECIMAL(6,2)', nullable: true },
    id_cita: { type: 'INTEGER', nullable: true },
    // Campos NO enviados por frontend (backend los crea):
    registrado_por: { type: 'ENUM', backendOnly: true, note: 'Backend lo determina por rol' },
    fecha_medicion: { type: 'DATE', backendOnly: true, note: 'Backend usa new Date()' },
    fecha_creacion: { type: 'DATE', backendOnly: true, note: 'Backend lo crea' }
  };

  console.log(colors.yellow('\n📋 Campos del Formulario Frontend:'));
  Object.keys(frontendFields).forEach(field => {
    const info = frontendFields[field];
    console.log(`   ${field}: ${info.type} ${info.required ? '(requerido)' : '(opcional)'} - Frontend: ${info.frontend}`);
  });

  console.log(colors.yellow('\n📋 Campos Esperados por Backend:'));
  Object.keys(backendFields).forEach(field => {
    const info = backendFields[field];
    if (info.backendOnly) {
      console.log(`   ${field}: ${info.type} - ${info.note}`);
    } else {
      console.log(`   ${field}: ${info.type} ${info.nullable ? '(nullable)' : '(not null)'}`);
    }
  });

  // Test 1: Envío con datos válidos completos
  console.log(colors.yellow('\n🧪 Test 1: Envío con datos válidos completos'));
  const validData = {
    peso_kg: 72.5,
    talla_m: 1.78,
    presion_sistolica: 120,
    presion_diastolica: 80,
    glucosa_mg_dl: 95,
    medida_cintura_cm: 85.5,
    observaciones: 'Control de rutina',
    imc: 22.87 // Calculado: 72.5 / (1.78 * 1.78)
  };

  const result1 = await makeAuthenticatedRequest(
    'POST',
    `/api/pacientes/${TEST_PACIENTE_ID}/signos-vitales`,
    validData,
    token
  );

  if (result1.success && result1.status === 201) {
    printResult('Envío de datos válidos', true, 'Datos aceptados correctamente');
    
    // Validar que el backend no devuelve campos que no enviamos
    const receivedData = result1.data?.data;
    if (receivedData.registrado_por) {
      printResult('Backend crea registrado_por automáticamente', true);
    } else {
      printResult('Backend crea registrado_por automáticamente', false, 'Campo no presente en respuesta');
    }
    
    if (receivedData.fecha_medicion) {
      printResult('Backend crea fecha_medicion automáticamente', true);
    } else {
      printResult('Backend crea fecha_medicion automáticamente', false, 'Campo no presente en respuesta');
    }
  } else {
    printResult('Envío de datos válidos', false, result1.error, result1.data);
  }

  // Test 2: Validar que NO se envían campos que el backend crea
  console.log(colors.yellow('\n🧪 Test 2: Validar que NO se envían campos backend-only'));
  const dataWithBackendFields = {
    ...validData,
    registrado_por: 'paciente', // ❌ NO debería enviarse
    fecha_medicion: new Date().toISOString() // ❌ NO debería enviarse
  };

  const result2 = await makeAuthenticatedRequest(
    'POST',
    `/api/pacientes/${TEST_PACIENTE_ID}/signos-vitales`,
    dataWithBackendFields,
    token
  );

  if (result2.success) {
    printWarning('Backend aceptó campos que no deberían enviarse (registrado_por, fecha_medicion)');
    printResult('Validación de campos backend-only', false, 'Backend debería ignorar estos campos');
  } else {
    printResult('Validación de campos backend-only', true, 'Backend rechazó campos no permitidos');
  }

  // Test 3: Validar tipos de datos
  console.log(colors.yellow('\n🧪 Test 3: Validar tipos de datos incorrectos'));
  const invalidTypes = {
    peso_kg: 'no es un número', // ❌ String en lugar de número
    talla_m: 1.78, // ✅ Correcto
    presion_sistolica: '120', // ⚠️ String que puede convertirse
    presion_diastolica: 80, // ✅ Correcto
    glucosa_mg_dl: null // ⚠️ Null (permitido según backend)
  };

  const result3 = await makeAuthenticatedRequest(
    'POST',
    `/api/pacientes/${TEST_PACIENTE_ID}/signos-vitales`,
    invalidTypes,
    token
  );

  if (!result3.success) {
    printResult('Validación de tipos de datos', true, 'Backend rechazó tipos incorrectos');
  } else {
    printResult('Validación de tipos de datos', false, 'Backend aceptó tipos incorrectos');
  }

  // Test 4: Validar que al menos un campo requerido esté presente
  console.log(colors.yellow('\n🧪 Test 4: Validar requerimiento de al menos un campo'));
  const emptyData = {};
  
  const result4 = await makeAuthenticatedRequest(
    'POST',
    `/api/pacientes/${TEST_PACIENTE_ID}/signos-vitales`,
    emptyData,
    token
  );

  if (!result4.success && result4.status === 400) {
    printResult('Validación de campos requeridos', true, 'Backend rechazó datos vacíos');
  } else {
    printResult('Validación de campos requeridos', false, 'Backend no validó campos requeridos');
  }
}

// ============================================
// 2. ANÁLISIS DE FORMULARIO: CITAS
// ============================================
async function testCitasForm(token) {
  console.log('\n📅 FORMULARIO: CITAS MÉDICAS'.cyan.bold);
  console.log('='.repeat(60).cyan);

  const frontendFields = {
    id_paciente: { type: 'number', required: true },
    id_doctor: { type: 'number', required: true },
    fecha_cita: { type: 'Date/string', required: true },
    motivo: { type: 'string', required: true },
    observaciones: { type: 'string', required: false },
    es_primera_consulta: { type: 'boolean', required: false }
  };

  console.log(colors.yellow('\n📋 Campos del Formulario Frontend:'));
  Object.keys(frontendFields).forEach(field => {
    const info = frontendFields[field];
    console.log(`   ${field}: ${info.type} ${info.required ? '(requerido)' : '(opcional)'}`);
  });

  // Test: Envío de cita válida
  console.log(colors.yellow('\n🧪 Test: Envío de cita válida'));
  const validCita = {
    id_paciente: TEST_PACIENTE_ID,
    id_doctor: TEST_DOCTOR_ID,
    fecha_cita: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días desde ahora
    motivo: 'Control de rutina',
    observaciones: 'Paciente estable',
    es_primera_consulta: false
  };

  const result = await makeAuthenticatedRequest(
    'POST',
    '/api/citas',
    validCita,
    token
  );

  if (result.success && result.status === 201) {
    printResult('Envío de cita válida', true, 'Cita creada correctamente');
  } else {
    printResult('Envío de cita válida', false, result.error, result.data);
  }
}

// ============================================
// 3. ANÁLISIS DE FORMULARIO: DIAGNÓSTICOS
// ============================================
async function testDiagnosticosForm(token) {
  console.log('\n🩺 FORMULARIO: DIAGNÓSTICOS'.cyan.bold);
  console.log('='.repeat(60).cyan);

  const frontendFields = {
    id_cita: { type: 'number', required: false },
    descripcion: { type: 'string', required: true }
  };

  console.log(colors.yellow('\n📋 Campos del Formulario Frontend:'));
  Object.keys(frontendFields).forEach(field => {
    const info = frontendFields[field];
    console.log(`   ${field}: ${info.type} ${info.required ? '(requerido)' : '(opcional)'}`);
  });

  // Test: Envío de diagnóstico válido
  console.log(colors.yellow('\n🧪 Test: Envío de diagnóstico válido'));
  const validDiagnostico = {
    descripcion: 'Paciente con diabetes tipo 2 bien controlada. Hemoglobina glicosilada dentro de parámetros normales.'
  };

  const result = await makeAuthenticatedRequest(
    'POST',
    `/api/pacientes/${TEST_PACIENTE_ID}/diagnosticos`,
    validDiagnostico,
    token
  );

  if (result.success && result.status === 201) {
    printResult('Envío de diagnóstico válido', true, 'Diagnóstico creado correctamente');
  } else {
    printResult('Envío de diagnóstico válido', false, result.error, result.data);
  }
}

// ============================================
// 4. ANÁLISIS DE FORMULARIO: PLAN DE MEDICACIÓN
// ============================================
async function testPlanMedicacionForm(token) {
  console.log('\n💊 FORMULARIO: PLAN DE MEDICACIÓN'.cyan.bold);
  console.log('='.repeat(60).cyan);

  const frontendFields = {
    id_cita: { type: 'number', required: false },
    fecha_inicio: { type: 'Date/string', required: true },
    fecha_fin: { type: 'Date/string', required: false },
    observaciones: { type: 'string', required: false },
    medicamentos: { type: 'array', required: true, structure: [
      { id_medicamento: 'number', dosis: 'string', frecuencia: 'string', horario: 'string' }
    ]}
  };

  console.log(colors.yellow('\n📋 Campos del Formulario Frontend:'));
  console.log('   medicamentos: Array de objetos con estructura compleja');
  Object.keys(frontendFields).forEach(field => {
    if (field !== 'medicamentos') {
      const info = frontendFields[field];
      console.log(`   ${field}: ${info.type} ${info.required ? '(requerido)' : '(opcional)'}`);
    }
  });

  // Test: Envío de plan de medicación válido
  console.log(colors.yellow('\n🧪 Test: Envío de plan de medicación válido'));
  const validPlan = {
    id_cita: null,
    fecha_inicio: new Date().toISOString(),
    fecha_fin: null,
    observaciones: 'Tomar con alimentos',
    medicamentos: [
      {
        id_medicamento: 1, // Ajustar según tu BD
        dosis: '500mg',
        frecuencia: 'Cada 8 horas',
        horario: '08:00, 16:00, 00:00'
      }
    ]
  };

  const result = await makeAuthenticatedRequest(
    'POST',
    `/api/pacientes/${TEST_PACIENTE_ID}/planes-medicacion`,
    validPlan,
    token
  );

  if (result.success && result.status === 201) {
    printResult('Envío de plan de medicación válido', true, 'Plan creado correctamente');
  } else {
    printResult('Envío de plan de medicación válido', false, result.error, result.data);
  }
}

// ============================================
// 5. ANÁLISIS DE FORMULARIO: RED DE APOYO
// ============================================
async function testRedApoyoForm(token) {
  console.log('\n👥 FORMULARIO: RED DE APOYO'.cyan.bold);
  console.log('='.repeat(60).cyan);

  const frontendFields = {
    nombre_contacto: { type: 'string', required: true },
    relacion: { type: 'string', required: true },
    numero_celular: { type: 'string', required: true },
    email: { type: 'string', required: false },
    direccion: { type: 'string', required: false }
  };

  console.log(colors.yellow('\n📋 Campos del Formulario Frontend:'));
  Object.keys(frontendFields).forEach(field => {
    const info = frontendFields[field];
    console.log(`   ${field}: ${info.type} ${info.required ? '(requerido)' : '(opcional)'}`);
  });

  // Test: Envío de contacto válido
  console.log(colors.yellow('\n🧪 Test: Envío de contacto de red de apoyo válido'));
  const validContacto = {
    nombre_contacto: 'María López',
    relacion: 'Familiar',
    numero_celular: '5551234567',
    email: 'maria@example.com',
    direccion: 'Calle Principal 123'
  };

  const result = await makeAuthenticatedRequest(
    'POST',
    `/api/pacientes/${TEST_PACIENTE_ID}/red-apoyo`,
    validContacto,
    token
  );

  if (result.success && result.status === 201) {
    printResult('Envío de contacto válido', true, 'Contacto creado correctamente');
  } else {
    printResult('Envío de contacto válido', false, result.error, result.data);
  }
}

// ============================================
// 6. ANÁLISIS DE FORMULARIO: ESQUEMA DE VACUNACIÓN
// ============================================
async function testEsquemaVacunacionForm(token) {
  console.log('\n💉 FORMULARIO: ESQUEMA DE VACUNACIÓN'.cyan.bold);
  console.log('='.repeat(60).cyan);

  const frontendFields = {
    id_vacuna: { type: 'number', required: true },
    fecha_aplicacion: { type: 'Date/string', required: true },
    lote: { type: 'string', required: false },
    lugar_aplicacion: { type: 'string', required: false },
    observaciones: { type: 'string', required: false }
  };

  console.log(colors.yellow('\n📋 Campos del Formulario Frontend:'));
  Object.keys(frontendFields).forEach(field => {
    const info = frontendFields[field];
    console.log(`   ${field}: ${info.type} ${info.required ? '(requerido)' : '(opcional)'}`);
  });

  // Test: Envío de esquema de vacunación válido
  console.log(colors.yellow('\n🧪 Test: Envío de esquema de vacunación válido'));
  const validVacuna = {
    id_vacuna: 1, // Ajustar según tu BD
    fecha_aplicacion: new Date().toISOString(),
    lote: 'LOT123456',
    lugar_aplicacion: 'Brazo izquierdo',
    observaciones: 'Sin reacciones adversas'
  };

  const result = await makeAuthenticatedRequest(
    'POST',
    `/api/pacientes/${TEST_PACIENTE_ID}/esquema-vacunacion`,
    validVacuna,
    token
  );

  if (result.success && result.status === 201) {
    printResult('Envío de esquema de vacunación válido', true, 'Esquema creado correctamente');
  } else {
    printResult('Envío de esquema de vacunación válido', false, result.error, result.data);
  }
}

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================
async function main() {
  console.log(colors.cyan(colors.bold('\n🧪 PRUEBAS DE INTEGRACIÓN FRONTEND->BACKEND')));
  console.log(colors.cyan('='.repeat(60)));
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Paciente ID: ${TEST_PACIENTE_ID}`);
  console.log(`Doctor ID: ${TEST_DOCTOR_ID}`);

  // Autenticación
  console.log(colors.yellow('\n🔐 Autenticando...'));
  let token = null;

  // Intentar login como doctor primero, luego admin
  let loginResult = await makeAuthenticatedRequest(
    'POST',
    '/api/auth-unified/login-doctor-admin',
    {
      email: TEST_CREDENTIALS.doctor.email,
      password: TEST_CREDENTIALS.doctor.password
    }
  );

  // Si falla, intentar con admin
  if (!loginResult.success || !loginResult.data.token) {
    console.log(colors.yellow('Intentando login como admin...'));
    loginResult = await makeAuthenticatedRequest(
      'POST',
      '/api/auth-unified/login-doctor-admin',
      {
        email: TEST_CREDENTIALS.admin.email,
        password: TEST_CREDENTIALS.admin.password
      }
    );
  }

  if (loginResult.success && loginResult.data.token) {
    token = loginResult.data.token;
    printResult('Autenticación', true, 'Token obtenido correctamente');
  } else {
    printResult('Autenticación', false, 'No se pudo autenticar', loginResult.data);
    console.log(colors.yellow('\n⚠️  Continuando sin autenticación (algunas pruebas fallarán)'));
  }

  // Ejecutar pruebas de cada formulario
  await testSignosVitalesForm(token);
  await testCitasForm(token);
  await testDiagnosticosForm(token);
  await testPlanMedicacionForm(token);
  await testRedApoyoForm(token);
  await testEsquemaVacunacionForm(token);

  // Resumen
  console.log(colors.cyan('\n' + '='.repeat(60)));
  console.log(colors.cyan(colors.bold('📊 RESUMEN DE PRUEBAS')));
  console.log(colors.cyan('='.repeat(60)));
  console.log(colors.green(`✅ Pruebas pasadas: ${testsPassed}`));
  console.log(colors.red(`❌ Pruebas fallidas: ${testsFailed}`));
  console.log(colors.yellow(`⚠️  Advertencias: ${warnings.length}`));
  
  if (warnings.length > 0) {
    console.log(colors.yellow('\n⚠️  ADVERTENCIAS:'));
    warnings.forEach(warning => console.log(colors.yellow(`   - ${warning}`)));
  }

  const total = testsPassed + testsFailed;
  const successRate = total > 0 ? ((testsPassed / total) * 100).toFixed(1) : 0;
  console.log(colors.cyan(`\n📈 Tasa de éxito: ${successRate}%`));
  
  if (testsFailed > 0) {
    console.log(colors.red('\n❌ Algunas pruebas fallaron. Revisa los detalles arriba.'));
    process.exit(1);
  } else {
    console.log(colors.green('\n✅ Todas las pruebas pasaron exitosamente!'));
    process.exit(0);
  }
}

// Ejecutar
main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});

