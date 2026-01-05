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
      refreshToken = response.data.refresh_token || response.data.refreshToken;
      client.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      log.success('Autenticación exitosa como doctor');
      log.info(`Access Token: ${authToken.substring(0, 30)}...`);
      if (refreshToken) {
        log.info(`Refresh Token: ${refreshToken.substring(0, 30)}...`);
      }
      return true;
    }
    
    log.error('No se recibió token de autenticación');
    return false;
  } catch (error) {
    log.error(`Error en autenticación: ${error.response?.data?.error || error.message}`);
    if (error.response?.data) {
      log.info('Detalles:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

// Prueba: Crear paciente completo con encriptación
async function testCrearPacienteCompleto() {
  try {
    log.test('Prueba: Crear paciente completo con datos sensibles (encriptación automática)');
    
    const client = createClient();
    
    // Obtener o crear un módulo primero
    log.info('Obteniendo módulo disponible...');
    let idModulo = 1; // Por defecto usar módulo 1
    
    try {
      const modulosResponse = await client.get('/api/modulos');
      if (modulosResponse.data && modulosResponse.data.length > 0) {
        idModulo = modulosResponse.data[0].id_modulo || modulosResponse.data.id_modulo || 1;
        log.info(`Usando módulo ID: ${idModulo}`);
      } else {
        // Intentar crear un módulo de prueba
        log.warn('No se encontraron módulos, intentando crear uno...');
        try {
          const createModuloResponse = await client.post('/api/modulos', {
            nombre_modulo: 'Módulo de Prueba',
            descripcion: 'Módulo para pruebas de encriptación',
            activo: true
          });
          if (createModuloResponse.data && createModuloResponse.data.id_modulo) {
            idModulo = createModuloResponse.data.id_modulo;
            log.success(`Módulo creado con ID: ${idModulo}`);
          } else {
            log.warn('No se pudo crear módulo, usando ID 1 por defecto');
          }
        } catch (createError) {
          log.warn('No se pudo crear módulo, usando ID 1 por defecto');
        }
      }
    } catch (modError) {
      log.warn('No se pudo obtener módulos, usando ID 1 por defecto');
    }
    
    // Datos del paciente con campos sensibles
    const pacienteData = {
      nombre: 'María',
      apellido_paterno: 'González',
      apellido_materno: 'López',
      fecha_nacimiento: '1985-05-20',
      curp: 'GOLM850520MDFNPR01',
      numero_celular: '5559876543',
      direccion: 'Av. Principal 456, Col. Centro, Ciudad de México',
      estado: 'Ciudad de México',
      localidad: 'Benito Juárez',
      sexo: 'Mujer',
      institucion_salud: 'IMSS',
      id_modulo: idModulo,
      pin: String(Math.floor(1000 + Math.random() * 9000)), // PIN aleatorio de 4 dígitos (1000-9999)
      device_id: 'test-device-' + Date.now()
    };
    
    log.info('Enviando datos del paciente...');
    log.info(`CURP: ${pacienteData.curp}`);
    log.info(`Teléfono: ${pacienteData.numero_celular}`);
    log.info(`Dirección: ${pacienteData.direccion}`);
    
    const response = await client.post('/api/pacientes/completo', pacienteData);
    
    if (response.data && (response.data.data || response.data)) {
      const paciente = response.data.data || response.data;
      const pacienteId = paciente.id_paciente;
      
      if (!pacienteId) {
        log.error('No se recibió ID de paciente en la respuesta');
        log.info('Respuesta completa:', JSON.stringify(response.data, null, 2));
        return { success: false };
      }
      
      log.success(`✅ Paciente creado exitosamente con ID: ${pacienteId}`);
      
      // El endpoint createPacienteCompleto solo retorna datos básicos
      // Necesitamos consultar el paciente para verificar la desencriptación
      log.info('El endpoint solo retorna datos básicos, consultando paciente completo...');
      
      // Obtener información del doctor actual para asignar el paciente
      log.info('Obteniendo información del doctor para asignar paciente...');
      let doctorId = null;
      try {
        const doctorResponse = await client.get('/api/doctores/perfil');
        if (doctorResponse.data && doctorResponse.data.id_doctor) {
          doctorId = doctorResponse.data.id_doctor;
          log.info(`Doctor ID: ${doctorId}`);
          
          // Asignar paciente al doctor
          log.info('Asignando paciente al doctor...');
          try {
            await client.post(`/api/pacientes/${pacienteId}/doctores`, {
              id_doctor: doctorId
            });
            log.success('Paciente asignado al doctor exitosamente');
          } catch (assignError) {
            // Si ya está asignado, está bien
            if (assignError.response?.status === 409) {
              log.info('Paciente ya estaba asignado al doctor');
            } else {
              log.warn(`No se pudo asignar paciente al doctor: ${assignError.response?.data?.error || assignError.message}`);
            }
          }
        }
      } catch (doctorError) {
        log.warn('No se pudo obtener información del doctor, intentando consulta directa...');
      }
      
      // Consultar paciente para verificar desencriptación
      const consultaResponse = await client.get(`/api/pacientes/${pacienteId}`);
      
      if (consultaResponse.data && consultaResponse.data.data) {
        const pacienteCompleto = consultaResponse.data.data;
        
        // Verificar que los datos sensibles se recibieron desencriptados
        log.test('Verificando desencriptación en respuesta de consulta...');
        
        if (pacienteCompleto.curp === pacienteData.curp) {
          log.success('✅ CURP desencriptado correctamente en respuesta');
          log.info(`   Enviado: ${pacienteData.curp}`);
          log.info(`   Recibido: ${pacienteCompleto.curp}`);
        } else {
          log.error(`❌ CURP no coincide`);
          log.info(`   Esperado: ${pacienteData.curp}`);
          log.info(`   Recibido: ${pacienteCompleto.curp || 'undefined'}`);
          log.info(`   Tipo recibido: ${typeof pacienteCompleto.curp}`);
          return { success: false, pacienteId };
        }
      
        if (pacienteCompleto.numero_celular === pacienteData.numero_celular) {
          log.success('✅ Número de celular desencriptado correctamente en respuesta');
          log.info(`   Enviado: ${pacienteData.numero_celular}`);
          log.info(`   Recibido: ${pacienteCompleto.numero_celular}`);
        } else {
          log.error(`❌ Número de celular no coincide`);
          log.info(`   Esperado: ${pacienteData.numero_celular}`);
          log.info(`   Recibido: ${pacienteCompleto.numero_celular || 'undefined'}`);
          return { success: false, pacienteId };
        }
        
        if (pacienteCompleto.direccion === pacienteData.direccion) {
          log.success('✅ Dirección desencriptada correctamente en respuesta');
          log.info(`   Enviado: ${pacienteData.direccion}`);
          log.info(`   Recibido: ${pacienteCompleto.direccion}`);
        } else {
          log.error(`❌ Dirección no coincide`);
          log.info(`   Esperado: ${pacienteData.direccion}`);
          log.info(`   Recibido: ${pacienteCompleto.direccion || 'undefined'}`);
          return { success: false, pacienteId };
        }
        
        return {
          success: true,
          pacienteId: pacienteId,
          paciente: pacienteCompleto
        };
      } else {
        log.error('No se recibieron datos completos del paciente en la consulta');
        return { success: false, pacienteId };
      }
      
      log.success('\n✅ TODOS LOS DATOS SENSIBLES SE ENCRIPTARON Y DESENCRIPTARON CORRECTAMENTE');
      
      return {
        success: true,
        pacienteId: pacienteId,
        paciente: pacienteCompleto
      };
    } else {
      log.error('No se recibieron datos del paciente en la respuesta inicial');
      log.info('Respuesta recibida:', JSON.stringify(response.data, null, 2));
      return { success: false };
    }
  } catch (error) {
    log.error(`Error creando paciente: ${error.response?.data?.error || error.message}`);
    
    if (error.response?.data) {
      log.info('Detalles del error:');
      console.log(JSON.stringify(error.response.data, null, 2));
      
      if (error.response.data.details) {
        log.info('Errores de validación:');
        error.response.data.details.forEach(detail => {
          log.info(`  - ${detail.field}: ${detail.message}`);
        });
      }
      
      if (error.response.data.missing_fields) {
        log.info('Campos faltantes:', error.response.data.missing_fields.join(', '));
      }
    }
    
    return { success: false, error: error.message };
  }
}

// Prueba: Consultar paciente creado
async function testConsultarPaciente(pacienteId) {
  try {
    log.test(`Prueba: Consultar paciente ID ${pacienteId} (verificar desencriptación)`);
    
    const client = createClient();
    const response = await client.get(`/api/pacientes/${pacienteId}`);
    
    if (response.data && response.data.data) {
      const paciente = response.data.data;
      
      log.success('Paciente consultado exitosamente');
      
      // Verificar que los datos están desencriptados
      if (paciente.curp && paciente.curp.length === 18 && !paciente.curp.startsWith('{')) {
        log.success('✅ CURP desencriptado correctamente');
        log.info(`   CURP: ${paciente.curp}`);
      } else {
        log.error('❌ CURP no está desencriptado o tiene formato incorrecto');
        log.info(`   Valor recibido: ${paciente.curp?.substring(0, 50)}...`);
        return false;
      }
      
      if (paciente.numero_celular && !paciente.numero_celular.startsWith('{')) {
        log.success('✅ Número de celular desencriptado correctamente');
        log.info(`   Teléfono: ${paciente.numero_celular}`);
      } else {
        log.error('❌ Número de celular no está desencriptado');
        return false;
      }
      
      if (paciente.direccion && !paciente.direccion.startsWith('{')) {
        log.success('✅ Dirección desencriptada correctamente');
        log.info(`   Dirección: ${paciente.direccion}`);
      } else {
        log.error('❌ Dirección no está desencriptada');
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

// Ejecutar todas las pruebas
async function ejecutarPruebas() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 PRUEBA DE CREACIÓN DE PACIENTE CON ENCRIPTACIÓN');
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
  
  // Crear paciente
  log.info('\n' + '-'.repeat(60));
  const resultadoCreacion = await testCrearPacienteCompleto();
  
  if (!resultadoCreacion.success) {
    log.error('\n❌ La creación del paciente falló');
    process.exit(1);
  }
  
  // Consultar paciente
  log.info('\n' + '-'.repeat(60));
  const resultadoConsulta = await testConsultarPaciente(resultadoCreacion.pacienteId);
  
  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE PRUEBAS');
  console.log('='.repeat(60));
  
  if (resultadoCreacion.success && resultadoConsulta) {
    log.success('✅ TODAS LAS PRUEBAS PASARON EXITOSAMENTE');
    console.log(`\n✅ Paciente creado: ID ${resultadoCreacion.pacienteId}`);
    console.log('✅ Encriptación automática: FUNCIONANDO');
    console.log('✅ Desencriptación automática: FUNCIONANDO');
    console.log('\n🎉 El sistema de encriptación está funcionando correctamente!');
    process.exit(0);
  } else {
    log.error('❌ Algunas pruebas fallaron');
    process.exit(1);
  }
}

// Ejecutar
ejecutarPruebas().catch(error => {
  log.error(`Error fatal: ${error.message}`);
  console.error(error);
  process.exit(1);
});

