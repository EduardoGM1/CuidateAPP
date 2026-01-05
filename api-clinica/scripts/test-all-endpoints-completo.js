import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const API_URL = process.env.API_URL || 'http://localhost:3000';

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Resultados de las pruebas
const resultados = {
  exitosas: 0,
  fallidas: 0,
  detalles: []
};

// Tokens de autenticación
let tokens = {
  admin: null,
  doctor: null,
  paciente: null
};

// IDs de prueba
let ids = {
  paciente: null,
  doctor: null,
  cita: null,
  signoVital: null,
  diagnostico: null
};

/**
 * Función auxiliar para hacer peticiones HTTP
 */
async function hacerPeticion(method, url, data = null, token = null, descripcion = '') {
  try {
    const config = {
      method,
      url: `${API_URL}${url}`,
      headers: {
        'Content-Type': 'application/json'
      },
      validateStatus: () => true // No lanzar error para códigos 4xx/5xx
    };

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    
    const esExitoso = response.status >= 200 && response.status < 300;
    
    if (esExitoso) {
      resultados.exitosas++;
      console.log(`${colors.green}✅${colors.reset} ${descripcion || url}`);
    } else {
      resultados.fallidas++;
      console.log(`${colors.red}❌${colors.reset} ${descripcion || url} - ${response.status}: ${response.data?.error || response.data?.message || 'Error desconocido'}`);
    }

    resultados.detalles.push({
      metodo: method,
      url,
      descripcion,
      status: response.status,
      exito: esExitoso,
      error: response.data?.error || response.data?.message || null,
      datos: response.data
    });

    return { exito: esExitoso, data: response.data, status: response.status };
  } catch (error) {
    resultados.fallidas++;
    const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Error de conexión';
    const status = error.response?.status || 0;
    console.log(`${colors.red}❌${colors.reset} ${descripcion || url} - ${status ? `${status}: ` : ''}${errorMessage}`);
    
    // Si es error de conexión, mostrar mensaje más claro
    if (error.code === 'ECONNREFUSED' || error.message.includes('connect')) {
      console.log(`${colors.yellow}   ⚠️  El servidor no está corriendo en ${API_URL}${colors.reset}`);
    }
    
    resultados.detalles.push({
      metodo: method,
      url,
      descripcion,
      status: status,
      exito: false,
      error: errorMessage,
      datos: error.response?.data || null
    });
    return { exito: false, data: null, status: status, error: errorMessage };
  }
}

/**
 * Autenticación de usuarios
 */
async function autenticarUsuarios() {
  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}🔐 AUTENTICACIÓN DE USUARIOS${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);

  // Autenticar Admin
  console.log(`${colors.blue}📋 Autenticando Admin...${colors.reset}`);
  const adminLogin = await hacerPeticion('POST', '/api/auth/login', {
    email: 'admin@clinica.com',
    password: 'Admin123!'
  }, null, 'Login Admin');
  
  if (adminLogin.exito && adminLogin.data.token) {
    tokens.admin = adminLogin.data.token;
    console.log(`${colors.green}   ✅ Admin autenticado${colors.reset}\n`);
  } else {
    console.log(`${colors.red}   ❌ Error autenticando Admin${colors.reset}\n`);
  }

  // Autenticar Doctor
  console.log(`${colors.blue}📋 Autenticando Doctor...${colors.reset}`);
  const doctorLogin = await hacerPeticion('POST', '/api/auth/login', {
    email: 'doctor@clinica.com',
    password: 'Doctor123!'
  }, null, 'Login Doctor');
  
  if (doctorLogin.exito && doctorLogin.data.token) {
    tokens.doctor = doctorLogin.data.token;
    ids.doctor = doctorLogin.data.usuario?.id_doctor;
    console.log(`${colors.green}   ✅ Doctor autenticado (ID: ${ids.doctor})${colors.reset}\n`);
  } else {
    console.log(`${colors.red}   ❌ Error autenticando Doctor${colors.reset}\n`);
  }

  // Autenticar Paciente (usando PIN)
  console.log(`${colors.blue}📋 Autenticando Paciente...${colors.reset}`);
  const pacienteLogin = await hacerPeticion('POST', '/api/auth-unified/login-paciente', {
    pin: '2020',
    deviceId: 'test-device-001',
    deviceName: 'Dispositivo de Prueba',
    deviceType: 'mobile'
  }, null, 'Login Paciente (PIN)');
  
  if (pacienteLogin.exito && pacienteLogin.data.token) {
    tokens.paciente = pacienteLogin.data.token;
    ids.paciente = pacienteLogin.data.usuario?.id_paciente || pacienteLogin.data.paciente?.id_paciente || pacienteLogin.data.id_paciente;
    console.log(`${colors.green}   ✅ Paciente autenticado (ID: ${ids.paciente})${colors.reset}\n`);
  } else {
    console.log(`${colors.red}   ❌ Error autenticando Paciente${colors.reset}\n`);
  }
}

/**
 * Pruebas de endpoints de Autenticación
 */
async function probarEndpointsAuth() {
  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}🔐 ENDPOINTS DE AUTENTICACIÓN${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);

  // Health check
  await hacerPeticion('GET', '/health', null, null, 'Health Check');

  // Refresh token (Admin)
  if (tokens.admin) {
    // Necesitamos refresh_token, pero no lo tenemos en el login actual
    // await hacerPeticion('POST', '/api/auth/refresh', { refresh_token: '...' }, null, 'Refresh Token');
  }
}

/**
 * Pruebas de endpoints de Pacientes
 */
async function probarEndpointsPacientes() {
  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}👤 ENDPOINTS DE PACIENTES${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);

  // GET /api/pacientes (Admin/Doctor)
  if (tokens.admin) {
    const pacientes = await hacerPeticion('GET', '/api/pacientes', null, tokens.admin, 'GET /api/pacientes (Admin)');
    if (pacientes.exito && pacientes.data?.pacientes?.length > 0) {
      ids.paciente = pacientes.data.pacientes[0].id_paciente;
    } else if (pacientes.exito && pacientes.data?.data?.length > 0) {
      ids.paciente = pacientes.data.data[0].id_paciente;
    }
  }

  if (tokens.doctor) {
    const pacientesDoctor = await hacerPeticion('GET', '/api/pacientes', null, tokens.doctor, 'GET /api/pacientes (Doctor)');
    if (!ids.paciente && pacientesDoctor.exito) {
      if (pacientesDoctor.data?.pacientes?.length > 0) {
        ids.paciente = pacientesDoctor.data.pacientes[0].id_paciente;
      } else if (pacientesDoctor.data?.data?.length > 0) {
        ids.paciente = pacientesDoctor.data.data[0].id_paciente;
      }
    }
  }

  // GET /api/pacientes/:id
  if (ids.paciente && tokens.admin) {
    await hacerPeticion('GET', `/api/pacientes/${ids.paciente}`, null, tokens.admin, `GET /api/pacientes/${ids.paciente} (Admin)`);
  }

  if (ids.paciente && tokens.doctor) {
    await hacerPeticion('GET', `/api/pacientes/${ids.paciente}`, null, tokens.doctor, `GET /api/pacientes/${ids.paciente} (Doctor)`);
  }

  if (ids.paciente && tokens.paciente) {
    await hacerPeticion('GET', `/api/pacientes/${ids.paciente}`, null, tokens.paciente, `GET /api/pacientes/${ids.paciente} (Paciente)`);
  }
}

/**
 * Pruebas de endpoints de Doctores
 */
async function probarEndpointsDoctores() {
  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}👨‍⚕️ ENDPOINTS DE DOCTORES${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);

  // GET /api/doctores (Admin/Doctor)
  if (tokens.admin) {
    await hacerPeticion('GET', '/api/doctores', null, tokens.admin, 'GET /api/doctores (Admin)');
  }

  if (tokens.doctor) {
    await hacerPeticion('GET', '/api/doctores', null, tokens.doctor, 'GET /api/doctores (Doctor)');
  }

  // GET /api/doctores/:id
  if (ids.doctor && tokens.admin) {
    await hacerPeticion('GET', `/api/doctores/${ids.doctor}`, null, tokens.admin, `GET /api/doctores/${ids.doctor} (Admin)`);
  }

  if (ids.doctor && tokens.doctor) {
    await hacerPeticion('GET', `/api/doctores/${ids.doctor}`, null, tokens.doctor, `GET /api/doctores/${ids.doctor} (Doctor)`);
  }

  // GET /api/doctores/:id/dashboard (Admin)
  if (ids.doctor && tokens.admin) {
    await hacerPeticion('GET', `/api/doctores/${ids.doctor}/dashboard`, null, tokens.admin, `GET /api/doctores/${ids.doctor}/dashboard (Admin)`);
  }
}

/**
 * Pruebas de endpoints de Citas
 */
async function probarEndpointsCitas() {
  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}📅 ENDPOINTS DE CITAS${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);

  // GET /api/citas (Admin/Doctor)
  if (tokens.admin) {
    await hacerPeticion('GET', '/api/citas', null, tokens.admin, 'GET /api/citas (Admin)');
  }

  if (tokens.doctor) {
    await hacerPeticion('GET', '/api/citas', null, tokens.doctor, 'GET /api/citas (Doctor)');
  }

  // GET /api/citas/paciente/:pacienteId
  if (ids.paciente && tokens.admin) {
    const citas = await hacerPeticion('GET', `/api/citas/paciente/${ids.paciente}`, null, tokens.admin, `GET /api/citas/paciente/${ids.paciente} (Admin)`);
    if (citas.exito && citas.data?.citas?.length > 0) {
      ids.cita = citas.data.citas[0].id_cita;
    }
  }

  // GET /api/citas/:id
  if (ids.cita && tokens.admin) {
    await hacerPeticion('GET', `/api/citas/${ids.cita}`, null, tokens.admin, `GET /api/citas/${ids.cita} (Admin)`);
  }
}

/**
 * Pruebas de endpoints de Signos Vitales
 */
async function probarEndpointsSignosVitales() {
  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}💓 ENDPOINTS DE SIGNOS VITALES${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);

  if (!ids.paciente) {
    console.log(`${colors.yellow}⚠️  No hay ID de paciente disponible${colors.reset}\n`);
    return;
  }

  // GET /api/pacientes/:id/signos-vitales
  if (tokens.admin) {
    const signos = await hacerPeticion('GET', `/api/pacientes/${ids.paciente}/signos-vitales`, null, tokens.admin, `GET /api/pacientes/${ids.paciente}/signos-vitales (Admin)`);
    if (signos.exito && signos.data?.signosVitales?.length > 0) {
      ids.signoVital = signos.data.signosVitales[0].id_signo;
    }
  }

  if (tokens.doctor) {
    await hacerPeticion('GET', `/api/pacientes/${ids.paciente}/signos-vitales`, null, tokens.doctor, `GET /api/pacientes/${ids.paciente}/signos-vitales (Doctor)`);
  }

  if (tokens.paciente) {
    await hacerPeticion('GET', `/api/pacientes/${ids.paciente}/signos-vitales`, null, tokens.paciente, `GET /api/pacientes/${ids.paciente}/signos-vitales (Paciente)`);
  }
}

/**
 * Pruebas de endpoints de Diagnósticos
 */
async function probarEndpointsDiagnosticos() {
  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}📋 ENDPOINTS DE DIAGNÓSTICOS${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);

  if (!ids.paciente) {
    console.log(`${colors.yellow}⚠️  No hay ID de paciente disponible${colors.reset}\n`);
    return;
  }

  // GET /api/pacientes/:id/diagnosticos
  if (tokens.admin) {
    const diagnosticos = await hacerPeticion('GET', `/api/pacientes/${ids.paciente}/diagnosticos`, null, tokens.admin, `GET /api/pacientes/${ids.paciente}/diagnosticos (Admin)`);
    if (diagnosticos.exito && diagnosticos.data?.diagnosticos?.length > 0) {
      ids.diagnostico = diagnosticos.data.diagnosticos[0].id_diagnostico;
    }
  }

  if (tokens.doctor) {
    await hacerPeticion('GET', `/api/pacientes/${ids.paciente}/diagnosticos`, null, tokens.doctor, `GET /api/pacientes/${ids.paciente}/diagnosticos (Doctor)`);
  }

  if (tokens.paciente) {
    await hacerPeticion('GET', `/api/pacientes/${ids.paciente}/diagnosticos`, null, tokens.paciente, `GET /api/pacientes/${ids.paciente}/diagnosticos (Paciente)`);
  }
}

/**
 * Pruebas de endpoints de Planes de Medicación
 */
async function probarEndpointsPlanesMedicacion() {
  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}💊 ENDPOINTS DE PLANES DE MEDICACIÓN${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);

  if (!ids.paciente) {
    console.log(`${colors.yellow}⚠️  No hay ID de paciente disponible${colors.reset}\n`);
    return;
  }

  // GET /api/pacientes/:id/medicamentos (planes de medicación)
  if (tokens.admin) {
    await hacerPeticion('GET', `/api/pacientes/${ids.paciente}/medicamentos`, null, tokens.admin, `GET /api/pacientes/${ids.paciente}/medicamentos (Admin)`);
  }

  if (tokens.doctor) {
    await hacerPeticion('GET', `/api/pacientes/${ids.paciente}/medicamentos`, null, tokens.doctor, `GET /api/pacientes/${ids.paciente}/medicamentos (Doctor)`);
  }

  if (tokens.paciente) {
    await hacerPeticion('GET', `/api/pacientes/${ids.paciente}/medicamentos`, null, tokens.paciente, `GET /api/pacientes/${ids.paciente}/medicamentos (Paciente)`);
  }

  // GET /api/pacientes/:id/resumen-medico
  if (tokens.admin) {
    await hacerPeticion('GET', `/api/pacientes/${ids.paciente}/resumen-medico`, null, tokens.admin, `GET /api/pacientes/${ids.paciente}/resumen-medico (Admin)`);
  }

  if (tokens.doctor) {
    await hacerPeticion('GET', `/api/pacientes/${ids.paciente}/resumen-medico`, null, tokens.doctor, `GET /api/pacientes/${ids.paciente}/resumen-medico (Doctor)`);
  }

  if (tokens.paciente) {
    await hacerPeticion('GET', `/api/pacientes/${ids.paciente}/resumen-medico`, null, tokens.paciente, `GET /api/pacientes/${ids.paciente}/resumen-medico (Paciente)`);
  }
}

/**
 * Pruebas de endpoints de Red de Apoyo
 */
async function probarEndpointsRedApoyo() {
  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}👥 ENDPOINTS DE RED DE APOYO${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);

  if (!ids.paciente) {
    console.log(`${colors.yellow}⚠️  No hay ID de paciente disponible${colors.reset}\n`);
    return;
  }

  // GET /api/pacientes/:id/red-apoyo
  if (tokens.admin) {
    await hacerPeticion('GET', `/api/pacientes/${ids.paciente}/red-apoyo`, null, tokens.admin, `GET /api/pacientes/${ids.paciente}/red-apoyo (Admin)`);
  }

  if (tokens.doctor) {
    await hacerPeticion('GET', `/api/pacientes/${ids.paciente}/red-apoyo`, null, tokens.doctor, `GET /api/pacientes/${ids.paciente}/red-apoyo (Doctor)`);
  }

  if (tokens.paciente) {
    await hacerPeticion('GET', `/api/pacientes/${ids.paciente}/red-apoyo`, null, tokens.paciente, `GET /api/pacientes/${ids.paciente}/red-apoyo (Paciente)`);
  }
}

/**
 * Pruebas de endpoints de Vacunas
 */
async function probarEndpointsVacunas() {
  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}💉 ENDPOINTS DE VACUNAS${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);

  // GET /api/vacunas (público)
  await hacerPeticion('GET', '/api/vacunas', null, null, 'GET /api/vacunas (Público)');

  if (!ids.paciente) {
    console.log(`${colors.yellow}⚠️  No hay ID de paciente disponible${colors.reset}\n`);
    return;
  }

  // GET /api/pacientes/:id/esquema-vacunacion
  if (tokens.admin) {
    await hacerPeticion('GET', `/api/pacientes/${ids.paciente}/esquema-vacunacion`, null, tokens.admin, `GET /api/pacientes/${ids.paciente}/esquema-vacunacion (Admin)`);
  }

  if (tokens.doctor) {
    await hacerPeticion('GET', `/api/pacientes/${ids.paciente}/esquema-vacunacion`, null, tokens.doctor, `GET /api/pacientes/${ids.paciente}/esquema-vacunacion (Doctor)`);
  }

  if (tokens.paciente) {
    await hacerPeticion('GET', `/api/pacientes/${ids.paciente}/esquema-vacunacion`, null, tokens.paciente, `GET /api/pacientes/${ids.paciente}/esquema-vacunacion (Paciente)`);
  }
}

/**
 * Pruebas de endpoints de Comorbilidades
 */
async function probarEndpointsComorbilidades() {
  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}🏥 ENDPOINTS DE COMORBILIDADES${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);

  // GET /api/comorbilidades (público)
  await hacerPeticion('GET', '/api/comorbilidades', null, null, 'GET /api/comorbilidades (Público)');

  if (!ids.paciente) {
    console.log(`${colors.yellow}⚠️  No hay ID de paciente disponible${colors.reset}\n`);
    return;
  }

  // GET /api/pacientes/:id/comorbilidades
  if (tokens.admin) {
    await hacerPeticion('GET', `/api/pacientes/${ids.paciente}/comorbilidades`, null, tokens.admin, `GET /api/pacientes/${ids.paciente}/comorbilidades (Admin)`);
  }

  if (tokens.doctor) {
    await hacerPeticion('GET', `/api/pacientes/${ids.paciente}/comorbilidades`, null, tokens.doctor, `GET /api/pacientes/${ids.paciente}/comorbilidades (Doctor)`);
  }

  if (tokens.paciente) {
    await hacerPeticion('GET', `/api/pacientes/${ids.paciente}/comorbilidades`, null, tokens.paciente, `GET /api/pacientes/${ids.paciente}/comorbilidades (Paciente)`);
  }
}

/**
 * Pruebas de endpoints de Módulos
 */
async function probarEndpointsModulos() {
  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}📦 ENDPOINTS DE MÓDULOS${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);

  // GET /api/modulos (público)
  await hacerPeticion('GET', '/api/modulos', null, null, 'GET /api/modulos (Público)');
}

/**
 * Pruebas de endpoints de Dashboard
 */
async function probarEndpointsDashboard() {
  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}📊 ENDPOINTS DE DASHBOARD${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);

  // GET /api/dashboard/doctor/summary (Doctor)
  if (tokens.doctor) {
    await hacerPeticion('GET', '/api/dashboard/doctor/summary', null, tokens.doctor, 'GET /api/dashboard/doctor/summary (Doctor)');
    await hacerPeticion('GET', '/api/dashboard/doctor/patients', null, tokens.doctor, 'GET /api/dashboard/doctor/patients (Doctor)');
    await hacerPeticion('GET', '/api/dashboard/doctor/appointments', null, tokens.doctor, 'GET /api/dashboard/doctor/appointments (Doctor)');
  }

  // GET /api/dashboard/admin/summary (Admin)
  if (tokens.admin) {
    await hacerPeticion('GET', '/api/dashboard/admin/summary', null, tokens.admin, 'GET /api/dashboard/admin/summary (Admin)');
    await hacerPeticion('GET', '/api/dashboard/admin/metrics', null, tokens.admin, 'GET /api/dashboard/admin/metrics (Admin)');
  }
}

/**
 * Función principal
 */
async function ejecutarPruebas() {
  console.log(`\n${colors.magenta}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.magenta}║${colors.reset}  ${colors.cyan}🧪 PRUEBA COMPLETA DE ENDPOINTS - API CLÍNICA${colors.reset}  ${colors.magenta}║${colors.reset}`);
  console.log(`${colors.magenta}╚═══════════════════════════════════════════════════════════╝${colors.reset}\n`);
  console.log(`API URL: ${API_URL}\n`);

  try {
    // 1. Autenticación
    await autenticarUsuarios();

    // 2. Endpoints de Autenticación
    await probarEndpointsAuth();

    // 3. Endpoints de Pacientes
    await probarEndpointsPacientes();

    // 4. Endpoints de Doctores
    await probarEndpointsDoctores();

    // 5. Endpoints de Citas
    await probarEndpointsCitas();

    // 6. Endpoints de Signos Vitales
    await probarEndpointsSignosVitales();

    // 7. Endpoints de Diagnósticos
    await probarEndpointsDiagnosticos();

    // 8. Endpoints de Planes de Medicación
    await probarEndpointsPlanesMedicacion();

    // 9. Endpoints de Red de Apoyo
    await probarEndpointsRedApoyo();

    // 10. Endpoints de Vacunas
    await probarEndpointsVacunas();

    // 11. Endpoints de Comorbilidades
    await probarEndpointsComorbilidades();

    // 12. Endpoints de Módulos
    await probarEndpointsModulos();

    // 13. Endpoints de Dashboard
    await probarEndpointsDashboard();

    // Resumen final
    console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}📊 RESUMEN DE PRUEBAS${colors.reset}`);
    console.log(`${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);
    console.log(`${colors.green}✅ Exitosas: ${resultados.exitosas}${colors.reset}`);
    console.log(`${colors.red}❌ Fallidas: ${resultados.fallidas}${colors.reset}`);
    console.log(`📋 Total: ${resultados.exitosas + resultados.fallidas}\n`);

    // Mostrar detalles de fallos
    if (resultados.fallidas > 0) {
      console.log(`${colors.yellow}⚠️  DETALLES DE FALLOS:${colors.reset}\n`);
      resultados.detalles
        .filter(r => !r.exito)
        .forEach(r => {
          console.log(`${colors.red}❌${colors.reset} ${r.metodo} ${r.url}`);
          console.log(`   ${r.descripcion || 'Sin descripción'}`);
          console.log(`   Status: ${r.status}`);
          console.log(`   Error: ${r.error || 'Error desconocido'}\n`);
        });
    }

    // Guardar reporte en archivo
    const fs = await import('fs');
    const reporte = {
      fecha: new Date().toISOString(),
      resumen: {
        exitosas: resultados.exitosas,
        fallidas: resultados.fallidas,
        total: resultados.exitosas + resultados.fallidas
      },
      detalles: resultados.detalles
    };

    const reportePath = path.join(__dirname, `../logs/test-endpoints-${Date.now()}.json`);
    fs.writeFileSync(reportePath, JSON.stringify(reporte, null, 2));
    console.log(`${colors.blue}📄 Reporte guardado en: ${reportePath}${colors.reset}\n`);

    process.exit(resultados.fallidas > 0 ? 1 : 0);
  } catch (error) {
    console.error(`${colors.red}❌ Error fatal:${colors.reset}`, error);
    process.exit(1);
  }
}

// Ejecutar pruebas
ejecutarPruebas();

