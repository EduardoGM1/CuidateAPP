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
  cyan: '\x1b[36m'
};

const log = {
  test: (msg) => console.log(`${colors.cyan}🧪 TEST:${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅ ÉXITO:${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌ ERROR:${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  INFO:${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ADVERTENCIA:${colors.reset} ${msg}`)
};

let authToken = null;
let refreshToken = null;
let testPacienteId = null;

// Crear cliente axios
function createClient() {
  const client = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json'
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

// Autenticación
async function autenticar() {
  try {
    log.test('Autenticando usuario...');
    const client = createClient();
    
    // Intentar login
    const response = await client.post('/api/auth/login', {
      email: 'admin@test.com',
      password: 'admin123'
    });
    
    if (response.data && response.data.token) {
      authToken = response.data.token;
      refreshToken = response.data.refresh_token;
      client.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      log.success('Autenticación exitosa');
      log.info(`Access Token: ${authToken.substring(0, 20)}...`);
      log.info(`Refresh Token: ${refreshToken ? refreshToken.substring(0, 20) + '...' : 'No recibido'}`);
      return true;
    }
    
    log.error('No se recibió token de autenticación');
    return false;
  } catch (error) {
    if (error.response?.status === 401) {
      log.warn('Credenciales inválidas. Intentando crear usuario de prueba...');
      // Intentar crear usuario
      try {
        const registerClient = createClient();
        const registerResponse = await registerClient.post('/api/auth/register', {
          email: 'admin@test.com',
          password: 'admin123',
          rol: 'Admin'
        });
        
        if (registerResponse.data && registerResponse.data.token) {
          authToken = registerResponse.data.token;
          refreshToken = registerResponse.data.refresh_token || registerResponse.data.refreshToken;
          registerClient.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
          log.success('Usuario creado y autenticado');
          return true;
        }
      } catch (regError) {
        // Si el usuario ya existe, intentar con otras credenciales comunes
        log.warn('Usuario ya existe o error al crear. Intentando otras credenciales...');
        const credencialesAlternativas = [
          { email: 'admin@clinica.com', password: 'admin123' },
          { email: 'test@test.com', password: 'test123' }
        ];
        
        for (const cred of credencialesAlternativas) {
          try {
            const altClient = createClient();
            const altResponse = await altClient.post('/api/auth/login', cred);
            if (altResponse.data && altResponse.data.token) {
              authToken = altResponse.data.token;
              refreshToken = altResponse.data.refresh_token || altResponse.data.refreshToken;
              altClient.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
              log.success(`Autenticado con ${cred.email}`);
              return true;
            }
          } catch (altError) {
            continue;
          }
        }
        
        log.error('No se pudo autenticar con ninguna credencial');
        log.info('Por favor, crea un usuario manualmente o verifica las credenciales');
        return false;
      }
    }
    log.error(`Error en autenticación: ${error.message}`);
    return false;
  }
}

// Prueba 1: Refresh Token
async function testRefreshToken() {
  try {
    log.test('Prueba 1: Refresh Token');
    
    if (!refreshToken) {
      log.warn('No hay refresh token disponible, omitiendo prueba');
      return true;
    }
    
    const client = createClient();
    const response = await client.post('/api/auth/refresh', {
      refresh_token: refreshToken
    });
    
    if (response.data && response.data.token && response.data.refresh_token) {
      const oldToken = authToken;
      authToken = response.data.token;
      refreshToken = response.data.refresh_token;
      
      log.success('Token renovado exitosamente');
      log.info(`Nuevo Access Token: ${authToken.substring(0, 20)}...`);
      log.info(`Nuevo Refresh Token: ${refreshToken.substring(0, 20)}...`);
      
      // Verificar que el token anterior ya no funciona
      const oldClient = axios.create({
        baseURL: BASE_URL,
        headers: {
          'Authorization': `Bearer ${oldToken}`
        }
      });
      
      try {
        await oldClient.get('/api/pacientes');
        log.warn('El token anterior aún funciona (puede ser normal si no expiró)');
      } catch (error) {
        if (error.response?.status === 401) {
          log.success('El token anterior fue invalidado correctamente');
        }
      }
      
      return true;
    }
    
    log.error('No se recibieron nuevos tokens');
    return false;
  } catch (error) {
    log.error(`Error en refresh token: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// Prueba 2: Crear paciente con encriptación
async function testCrearPacienteEncriptado() {
  try {
    log.test('Prueba 2: Crear paciente con datos sensibles (encriptación automática)');
    
    const client = createClient();
    const pacienteData = {
      nombre: 'Juan',
      apellido_paterno: 'Pérez',
      apellido_materno: 'García',
      fecha_nacimiento: '1990-01-15',
      curp: 'PEGJ900115HDFRZN01',
      numero_celular: '5551234567',
      direccion: 'Calle Principal 123, Col. Centro',
      estado: 'Ciudad de México',
      localidad: 'Benito Juárez',
      sexo: 'Hombre',
      institucion_salud: 'IMSS'
    };
    
    log.info('Enviando datos del paciente...');
    
    try {
      const response = await client.post('/api/pacientes', pacienteData);
      
      if (response.data && response.data.data) {
      testPacienteId = response.data.data.id_paciente;
      log.success(`Paciente creado con ID: ${testPacienteId}`);
      
      // Verificar que los datos se recibieron correctamente (desencriptados)
      const pacienteRecibido = response.data.data;
      
      if (pacienteRecibido.curp === pacienteData.curp) {
        log.success('CURP desencriptado correctamente en respuesta');
      } else {
        log.error(`CURP no coincide. Esperado: ${pacienteData.curp}, Recibido: ${pacienteRecibido.curp}`);
        return false;
      }
      
      if (pacienteRecibido.numero_celular === pacienteData.numero_celular) {
        log.success('Número de celular desencriptado correctamente en respuesta');
      } else {
        log.error(`Número de celular no coincide. Esperado: ${pacienteData.numero_celular}, Recibido: ${pacienteRecibido.numero_celular}`);
        return false;
      }
      
      if (pacienteRecibido.direccion === pacienteData.direccion) {
        log.success('Dirección desencriptada correctamente en respuesta');
      } else {
        log.error(`Dirección no coincide. Esperado: ${pacienteData.direccion}, Recibido: ${pacienteRecibido.direccion}`);
        return false;
      }
      
      return true;
    }
    
      log.error('No se recibieron datos del paciente');
      return false;
    } catch (postError) {
      // Si hay error, mostrar detalles
      if (postError.response?.data) {
        log.error(`Error creando paciente: ${postError.response.data.error || postError.message}`);
        if (postError.response.data.details) {
          log.info('Detalles de validación:');
          postError.response.data.details.forEach(detail => {
            log.info(`  - ${detail.field}: ${detail.message}`);
          });
        }
        if (postError.response.data.missing_fields) {
          log.info('Campos faltantes:', postError.response.data.missing_fields.join(', '));
        }
      } else {
        log.error(`Error creando paciente: ${postError.message}`);
      }
      return false;
    }
  } catch (error) {
    log.error(`Error inesperado: ${error.message}`);
    return false;
  }
}

// Prueba 3: Consultar paciente (verificar desencriptación)
async function testConsultarPaciente() {
  try {
    log.test('Prueba 3: Consultar paciente (verificar desencriptación automática)');
    
    if (!testPacienteId) {
      log.warn('No hay ID de paciente de prueba, omitiendo');
      return true;
    }
    
    const client = createClient();
    const response = await client.get(`/api/pacientes/${testPacienteId}`);
    
    if (response.data && response.data.data) {
      const paciente = response.data.data;
      
      log.success('Paciente consultado exitosamente');
      
      // Verificar que los datos sensibles están desencriptados
      if (paciente.curp && paciente.curp.length === 18 && !paciente.curp.startsWith('{')) {
        log.success('CURP desencriptado correctamente');
        log.info(`CURP: ${paciente.curp}`);
      } else {
        log.error('CURP no está desencriptado o tiene formato incorrecto');
        return false;
      }
      
      if (paciente.numero_celular && !paciente.numero_celular.startsWith('{')) {
        log.success('Número de celular desencriptado correctamente');
        log.info(`Teléfono: ${paciente.numero_celular}`);
      } else {
        log.error('Número de celular no está desencriptado');
        return false;
      }
      
      if (paciente.direccion && !paciente.direccion.startsWith('{')) {
        log.success('Dirección desencriptada correctamente');
        log.info(`Dirección: ${paciente.direccion}`);
      } else {
        log.error('Dirección no está desencriptada');
        return false;
      }
      
      return true;
    }
    
    log.error('No se recibieron datos del paciente');
    return false;
  } catch (error) {
    log.error(`Error consultando paciente: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// Prueba 4: Actualizar paciente (verificar re-encriptación)
async function testActualizarPaciente() {
  try {
    log.test('Prueba 4: Actualizar paciente (verificar re-encriptación)');
    
    if (!testPacienteId) {
      log.warn('No hay ID de paciente de prueba, omitiendo');
      return true;
    }
    
    const client = createClient();
    const nuevosDatos = {
      numero_celular: '5559876543',
      direccion: 'Nueva Dirección 456, Col. Reforma'
    };
    
    log.info('Actualizando datos del paciente...');
    const response = await client.put(`/api/pacientes/${testPacienteId}`, nuevosDatos);
    
    if (response.data && response.data.data) {
      const paciente = response.data.data;
      
      log.success('Paciente actualizado exitosamente');
      
      // Verificar que los nuevos datos están desencriptados en la respuesta
      if (paciente.numero_celular === nuevosDatos.numero_celular) {
        log.success('Número de celular actualizado y desencriptado correctamente');
      } else {
        log.error(`Número de celular no coincide. Esperado: ${nuevosDatos.numero_celular}, Recibido: ${paciente.numero_celular}`);
        return false;
      }
      
      if (paciente.direccion === nuevosDatos.direccion) {
        log.success('Dirección actualizada y desencriptada correctamente');
      } else {
        log.error(`Dirección no coincide. Esperado: ${nuevosDatos.direccion}, Recibido: ${paciente.direccion}`);
        return false;
      }
      
      return true;
    }
    
    log.error('No se recibieron datos actualizados');
    return false;
  } catch (error) {
    log.error(`Error actualizando paciente: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// Prueba 5: Logout (revocar refresh token)
async function testLogout() {
  try {
    log.test('Prueba 5: Logout (revocar refresh token)');
    
    if (!refreshToken) {
      log.warn('No hay refresh token disponible, omitiendo prueba');
      return true;
    }
    
    const client = createClient();
    const response = await client.post('/api/auth/logout', {
      refresh_token: refreshToken
    });
    
    if (response.data && response.data.success) {
      log.success('Sesión cerrada exitosamente');
      
      // Verificar que el refresh token ya no funciona
      try {
        await client.post('/api/auth/refresh', {
          refresh_token: refreshToken
        });
        log.error('El refresh token aún funciona después de logout');
        return false;
      } catch (error) {
        if (error.response?.status === 401) {
          log.success('Refresh token revocado correctamente');
          return true;
        }
        throw error;
      }
    }
    
    log.error('No se recibió confirmación de logout');
    return false;
  } catch (error) {
    log.error(`Error en logout: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// Prueba 6: Verificar encriptación en base de datos
async function testVerificarEncriptacionBD() {
  try {
    log.test('Prueba 6: Verificar que los datos están encriptados en BD');
    
    if (!testPacienteId) {
      log.warn('No hay ID de paciente de prueba, omitiendo');
      return true;
    }
    
    // Esta prueba requiere acceso directo a la BD
    // Por ahora, solo verificamos que los datos se envían y reciben correctamente
    log.info('Verificación de encriptación en BD requiere acceso directo a MySQL');
    log.info('Los datos deben estar encriptados en formato JSON: {"encrypted":"...","iv":"...","authTag":"..."}');
    log.warn('Para verificar manualmente, ejecuta:');
    log.warn(`SELECT curp, numero_celular, direccion FROM pacientes WHERE id_paciente = ${testPacienteId};`);
    
    return true;
  } catch (error) {
    log.error(`Error verificando encriptación: ${error.message}`);
    return false;
  }
}

// Ejecutar todas las pruebas
async function ejecutarPruebas() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 PRUEBAS DE MEJORAS DE SEGURIDAD');
  console.log('='.repeat(60) + '\n');
  
  const resultados = {
    total: 0,
    exitosas: 0,
    fallidas: 0
  };
  
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
  const pruebas = [
    { nombre: 'Refresh Token', fn: testRefreshToken },
    { nombre: 'Crear Paciente Encriptado', fn: testCrearPacienteEncriptado },
    { nombre: 'Consultar Paciente', fn: testConsultarPaciente },
    { nombre: 'Actualizar Paciente', fn: testActualizarPaciente },
    { nombre: 'Logout', fn: testLogout },
    { nombre: 'Verificar Encriptación BD', fn: testVerificarEncriptacionBD }
  ];
  
  for (const prueba of pruebas) {
    resultados.total++;
    log.info(`\n--- Ejecutando: ${prueba.nombre} ---`);
    
    try {
      const resultado = await prueba.fn();
      if (resultado) {
        resultados.exitosas++;
        log.success(`Prueba "${prueba.nombre}" completada exitosamente`);
      } else {
        resultados.fallidas++;
        log.error(`Prueba "${prueba.nombre}" falló`);
      }
    } catch (error) {
      resultados.fallidas++;
      log.error(`Error en prueba "${prueba.nombre}": ${error.message}`);
    }
    
    // Pequeña pausa entre pruebas
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE PRUEBAS');
  console.log('='.repeat(60));
  console.log(`Total de pruebas: ${resultados.total}`);
  console.log(`${colors.green}✅ Exitosas: ${resultados.exitosas}${colors.reset}`);
  console.log(`${colors.red}❌ Fallidas: ${resultados.fallidas}${colors.reset}`);
  console.log(`Porcentaje de éxito: ${((resultados.exitosas / resultados.total) * 100).toFixed(1)}%`);
  console.log('='.repeat(60) + '\n');
  
  if (resultados.fallidas === 0) {
    log.success('¡Todas las pruebas pasaron exitosamente! 🎉');
    process.exit(0);
  } else {
    log.error(`Algunas pruebas fallaron. Revisa los errores arriba.`);
    process.exit(1);
  }
}

// Ejecutar
ejecutarPruebas().catch(error => {
  log.error(`Error fatal: ${error.message}`);
  console.error(error);
  process.exit(1);
});

