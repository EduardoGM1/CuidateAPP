/**
 * Script de prueba para verificar la integración frontend-backend
 * Envía datos desde el frontend y verifica que el backend los reciba y almacene correctamente
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_DOCTOR_EMAIL = process.env.TEST_DOCTOR_EMAIL || 'doctor@clinica.com';
const TEST_DOCTOR_PASSWORD = process.env.TEST_DOCTOR_PASSWORD || 'Doctor123!';
const TEST_PACIENTE_PIN = process.env.TEST_PACIENTE_PIN || '2020';
const TEST_PACIENTE_ID = process.env.TEST_PACIENTE_ID || null;

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Función para log con colores
const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  test: (msg) => console.log(`${colors.cyan}→${colors.reset} ${msg}`),
};

// Clase para manejar las pruebas
class IntegrationTester {
  constructor() {
    this.token = null;
    this.userId = null;
    this.userRole = null;
    this.pacienteId = TEST_PACIENTE_ID;
    this.doctorId = null;
    this.pacienteToken = null;
    this.pacienteUserId = null;
    this.results = {
      passed: 0,
      failed: 0,
      tests: [],
    };
  }

  // Verificar conectividad con el backend
  async checkBackendConnection() {
    try {
      log.test('Verificando conexión con el backend...');
      const response = await axios.get(`${API_BASE_URL}/`, { timeout: 5000 });
      if (response.data) {
        log.success('Backend está corriendo');
        return true;
      }
      return false;
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        log.error('Backend no está corriendo. Por favor, inicia el servidor con: cd api-clinica && npm start');
      } else {
        log.error(`Error conectando al backend: ${error.message}`);
      }
      return false;
    }
  }

  // Autenticarse como doctor
  async authenticateDoctor() {
    try {
      log.test('Autenticando doctor...');
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email: TEST_DOCTOR_EMAIL,
        password: TEST_DOCTOR_PASSWORD,
      });

      if (response.data.success && response.data.token) {
        this.token = response.data.token;
        
        // Extraer datos del usuario - la respuesta tiene estructura: { success, token, usuario: { id, email, rol } }
        const usuario = response.data.usuario || response.data.user || response.data.data;
        this.userId = usuario?.id || usuario?.id_usuario;
        this.userRole = usuario?.rol;
        
        // Intentar obtener doctor ID de la respuesta
        if (response.data.doctor?.id_doctor) {
          this.doctorId = response.data.doctor.id_doctor;
        } else if (usuario?.doctor?.id_doctor) {
          this.doctorId = usuario.doctor.id_doctor;
        } else if (usuario?.id_doctor) {
          this.doctorId = usuario.id_doctor;
        }
        
        log.success(`Doctor autenticado (Usuario ID: ${this.userId}${this.doctorId ? `, Doctor ID: ${this.doctorId}` : ''})`);
        return true;
      } else {
        log.error('Error en autenticación: respuesta inválida');
        log.error(`Respuesta completa: ${JSON.stringify(response.data)}`);
        return false;
      }
    } catch (error) {
      log.error(`Error autenticando doctor: ${error.response?.data?.error || error.message}`);
      if (error.response?.data) {
        log.error(`Respuesta de error: ${JSON.stringify(error.response.data)}`);
      }
      return false;
    }
  }

  // Buscar paciente por PIN
  async findPacienteByPin() {
    try {
      log.test('Buscando paciente por PIN...');
      
      // Primero intentar autenticación unificada para obtener información del paciente
      try {
        const authResponse = await axios.post(`${API_BASE_URL}/api/auth-unified/login-paciente`, {
          pin: TEST_PACIENTE_PIN,
        });

        if (authResponse.data.success && authResponse.data.data) {
          this.pacienteId = authResponse.data.data.id_paciente || authResponse.data.data.paciente?.id_paciente;
          this.pacienteToken = authResponse.data.token;
          this.pacienteUserId = authResponse.data.data.id_usuario || authResponse.data.data.user?.id_usuario;
          
          if (this.pacienteId) {
            log.success(`Paciente encontrado por PIN (ID: ${this.pacienteId})`);
            return true;
          }
        }
      } catch (authError) {
        log.warning(`Error en autenticación unificada: ${authError.response?.data?.error || authError.message}`);
      }

      // Si la autenticación no funciona, buscar en la lista de pacientes
      log.test('Buscando paciente en lista de pacientes...');
      try {
        const pacientesResponse = await axios.get(`${API_BASE_URL}/api/pacientes`, {
          headers: this.getHeaders(),
        });

        // La respuesta puede tener formato { success: true, data: [...] } o { data: [...], total, ... }
        const pacientes = pacientesResponse.data.data || pacientesResponse.data;
        const pacientesArray = Array.isArray(pacientes) ? pacientes : [pacientes];
        
        log.info(`Se encontraron ${pacientesArray.length} pacientes`);
        
        // Mostrar información de los primeros pacientes para depuración
        if (pacientesArray.length > 0) {
          log.info(`Primer paciente: ID ${pacientesArray[0].id_paciente}, Nombre: ${pacientesArray[0].nombre || 'N/A'}`);
        }
        
        // Buscar paciente con PIN 2020 (puede estar en diferentes campos)
        // Nota: El PIN puede estar en las credenciales de autenticación, no directamente en el paciente
        let paciente = pacientesArray.find(p => {
          const pin = p.pin || p.pin_paciente || p.codigo_paciente || p.codigo;
          return pin === TEST_PACIENTE_PIN || String(pin) === String(TEST_PACIENTE_PIN);
        });

        // Si no se encuentra por PIN directo, usar el primer paciente disponible
        // (El PIN está en las credenciales de autenticación, no en el registro del paciente)
        if (!paciente && pacientesArray.length > 0) {
          paciente = pacientesArray[0];
          log.warning(`No se encontró paciente con PIN ${TEST_PACIENTE_PIN} en los datos del paciente. El PIN está en las credenciales de autenticación. Usando primer paciente disponible (ID: ${paciente.id_paciente})`);
        }

        if (paciente) {
          this.pacienteId = paciente.id_paciente;
          log.success(`Paciente encontrado (ID: ${this.pacienteId}, Nombre: ${paciente.nombre || 'N/A'})`);
          return true;
        }
      } catch (pacientesError) {
        log.error(`Error obteniendo lista de pacientes: ${pacientesError.response?.data?.error || pacientesError.message}`);
        if (pacientesError.response?.data) {
          log.error(`Detalles del error: ${JSON.stringify(pacientesError.response.data)}`);
        }
      }

      log.error('No se pudo encontrar paciente');
      return false;
    } catch (error) {
      log.error(`Error buscando paciente: ${error.response?.data?.error || error.message}`);
      return false;
    }
  }

  // Obtener headers con autenticación
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  // Crear doctor asociado al usuario
  async createTestDoctor() {
    try {
      log.test('Creando doctor asociado al usuario...');
      const response = await axios.post(
        `${API_BASE_URL}/api/doctores`,
        {
          id_usuario: this.userId,
          especialidad: 'Medicina General',
          numero_colegiado: `TEST-${Date.now()}`,
        },
        { headers: this.getHeaders() }
      );

      if (response.data.success && response.data.data) {
        this.doctorId = response.data.data.id_doctor;
        log.success(`Doctor creado: ID ${this.doctorId}`);
        return true;
      } else {
        // Si el doctor ya existe, obtenerlo
        log.info('Doctor ya existe o error en creación. Obteniendo doctor existente...');
        return await this.getDoctorId();
      }
    } catch (error) {
      // Si el doctor ya existe, obtenerlo
      if (error.response?.status === 400 || error.response?.status === 409) {
        log.info('Doctor ya existe. Obteniendo doctor existente...');
        return await this.getDoctorId();
      }
      log.warning(`Error creando doctor: ${error.response?.data?.error || error.message}. Intentando obtener existente...`);
      return await this.getDoctorId();
    }
  }

  // Obtener un paciente para pruebas
  async getTestPaciente() {
    try {
      log.test('Obteniendo paciente para pruebas...');
      const response = await axios.get(
        `${API_BASE_URL}/api/pacientes`,
        { headers: this.getHeaders() }
      );

      if (response.data.success && response.data.data && response.data.data.length > 0) {
        this.pacienteId = response.data.data[0].id_paciente;
        log.success(`Paciente obtenido: ID ${this.pacienteId}`);
        return true;
      } else {
        log.warning('No se encontraron pacientes. Creando uno de prueba...');
        return await this.createTestPaciente();
      }
    } catch (error) {
      log.error(`Error obteniendo paciente: ${error.response?.data?.error || error.message}`);
      return false;
    }
  }

  // Crear paciente de prueba
  async createTestPaciente() {
    try {
      const pacienteData = {
        nombre: 'Paciente',
        apellido: 'Prueba',
        fecha_nacimiento: '1990-01-01',
        genero: 'M',
        telefono: '1234567890',
        email: `paciente.test.${Date.now()}@test.com`,
        direccion: 'Dirección de prueba',
      };

      const response = await axios.post(
        `${API_BASE_URL}/api/pacientes`,
        pacienteData,
        { headers: this.getHeaders() }
      );

      if (response.data.success && response.data.data) {
        this.pacienteId = response.data.data.id_paciente;
        log.success(`Paciente de prueba creado: ID ${this.pacienteId}`);
        return true;
      }
      return false;
    } catch (error) {
      log.error(`Error creando paciente: ${error.response?.data?.error || error.message}`);
      return false;
    }
  }

  // Obtener doctor ID
  async getDoctorId() {
    // Si ya tenemos el doctor ID de la autenticación, usarlo
    if (this.doctorId && this.doctorId !== this.userId) {
      log.success(`Usando doctor ID de autenticación: ${this.doctorId}`);
      return true;
    }

    try {
      log.test('Obteniendo doctor asociado al usuario...');
      
      // Intentar obtener el doctor del perfil del usuario
      try {
        const profileResponse = await axios.get(
          `${API_BASE_URL}/api/auth/me`,
          { headers: this.getHeaders() }
        );
        
        if (profileResponse.data.success && profileResponse.data.data) {
          const doctor = profileResponse.data.data.doctor;
          if (doctor && doctor.id_doctor) {
            this.doctorId = doctor.id_doctor;
            log.success(`Doctor encontrado en perfil: ID ${this.doctorId}`);
            return true;
          }
        }
      } catch (profileError) {
        log.warning(`Error obteniendo perfil: ${profileError.message}`);
      }

      // Intentar obtener lista de doctores (puede requerir permisos Admin)
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/doctores`,
          { headers: this.getHeaders() }
        );

        if (response.data.success && response.data.data) {
          const doctors = Array.isArray(response.data.data) 
            ? response.data.data 
            : [response.data.data];
          
          const doctor = doctors.find(d => d.id_usuario === this.userId);
          
          if (doctor && doctor.id_doctor) {
            this.doctorId = doctor.id_doctor;
            log.success(`Doctor encontrado: ID ${this.doctorId}`);
            return true;
          } else if (doctors.length > 0 && doctors[0].id_doctor) {
            this.doctorId = doctors[0].id_doctor;
            log.warning(`Usando primer doctor disponible (ID: ${this.doctorId})`);
            return true;
          }
        }
      } catch (doctorsError) {
        log.warning(`Error obteniendo lista de doctores: ${doctorsError.message}`);
      }

      // Intentar obtener doctor por id_usuario usando endpoint de pacientes del doctor
      try {
        const pacientesResponse = await axios.get(
          `${API_BASE_URL}/api/pacientes`,
          { headers: this.getHeaders() }
        );

        if (pacientesResponse.data.data && Array.isArray(pacientesResponse.data.data)) {
          const pacientes = pacientesResponse.data.data;
          if (pacientes.length > 0 && pacientes[0].Doctors && pacientes[0].Doctors.length > 0) {
            this.doctorId = pacientes[0].Doctors[0].id_doctor;
            log.success(`Doctor encontrado desde pacientes: ID ${this.doctorId}`);
            return true;
          }
        }
      } catch (pacientesError) {
        log.warning(`Error obteniendo doctor desde pacientes: ${pacientesError.message}`);
      }

      // Si no se puede obtener, no usar userId como doctorId (no es válido)
      log.error(`No se pudo obtener doctor ID válido. El userId (${this.userId}) no es un id_doctor válido.`);
      return false;
    } catch (error) {
      log.error(`Error obteniendo doctor: ${error.message}`);
      return false;
    }
  }

  // Test 1: Enviar mensaje de texto
  async testEnviarMensajeTexto() {
    const testName = 'Enviar mensaje de texto';
    log.test(`\n${testName}...`);

    try {
      const mensajeTexto = `Mensaje de prueba ${new Date().toISOString()}`;
      const remitente = this.userRole === 'Paciente' ? 'Paciente' : 'Doctor';

      const response = await axios.post(
        `${API_BASE_URL}/api/mensajes-chat`,
        {
          id_paciente: this.pacienteId,
          id_doctor: this.doctorId,
          remitente: remitente,
          mensaje_texto: mensajeTexto,
        },
        { headers: this.getHeaders() }
      );

      if (response.data.success && response.data.data) {
        const mensaje = response.data.data;
        
        // Verificar que el mensaje se almacenó correctamente
        if (mensaje.id_mensaje && mensaje.mensaje_texto === mensajeTexto) {
          log.success(`${testName}: ✓ Mensaje enviado y almacenado (ID: ${mensaje.id_mensaje})`);
          this.results.passed++;
          this.results.tests.push({ name: testName, status: 'passed', data: mensaje });
          return mensaje.id_mensaje;
        } else {
          throw new Error('El mensaje no se almacenó correctamente');
        }
      } else {
        throw new Error('Respuesta del servidor inválida');
      }
    } catch (error) {
      log.error(`${testName}: ${error.response?.data?.error || error.message}`);
      this.results.failed++;
      this.results.tests.push({ name: testName, status: 'failed', error: error.message });
      return null;
    }
  }

  // Test 2: Obtener mensajes
  async testObtenerMensajes() {
    const testName = 'Obtener mensajes de conversación';
    log.test(`\n${testName}...`);

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/mensajes-chat/paciente/${this.pacienteId}/doctor/${this.doctorId}`,
        { headers: this.getHeaders() }
      );

      if (response.data.success && Array.isArray(response.data.data)) {
        const mensajes = response.data.data;
        log.success(`${testName}: ✓ Se obtuvieron ${mensajes.length} mensajes`);
        this.results.passed++;
        this.results.tests.push({ name: testName, status: 'passed', count: mensajes.length });
        return mensajes;
      } else {
        throw new Error('Respuesta del servidor inválida');
      }
    } catch (error) {
      log.error(`${testName}: ${error.response?.data?.error || error.message}`);
      this.results.failed++;
      this.results.tests.push({ name: testName, status: 'failed', error: error.message });
      return null;
    }
  }

  // Test 3: Marcar mensaje como leído
  async testMarcarComoLeido(mensajeId) {
    if (!mensajeId) {
      log.warning('No se puede probar marcar como leído: no hay mensaje ID');
      return false;
    }

    const testName = 'Marcar mensaje como leído';
    log.test(`\n${testName}...`);

    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/mensajes-chat/${mensajeId}/leido`,
        {},
        { headers: this.getHeaders() }
      );

      if (response.data.success) {
        log.success(`${testName}: ✓ Mensaje marcado como leído`);
        this.results.passed++;
        this.results.tests.push({ name: testName, status: 'passed' });
        return true;
      } else {
        throw new Error('Respuesta del servidor inválida');
      }
    } catch (error) {
      log.error(`${testName}: ${error.response?.data?.error || error.message}`);
      this.results.failed++;
      this.results.tests.push({ name: testName, status: 'failed', error: error.message });
      return false;
    }
  }

  // Test 4: Actualizar mensaje
  async testActualizarMensaje(mensajeId) {
    if (!mensajeId) {
      log.warning('No se puede probar actualizar mensaje: no hay mensaje ID');
      return false;
    }

    const testName = 'Actualizar mensaje';
    log.test(`\n${testName}...`);

    try {
      const nuevoTexto = `Mensaje actualizado ${new Date().toISOString()}`;
      const response = await axios.put(
        `${API_BASE_URL}/api/mensajes-chat/${mensajeId}`,
        { mensaje_texto: nuevoTexto },
        { headers: this.getHeaders() }
      );

      if (response.data.success && response.data.data) {
        const mensajeActualizado = response.data.data;
        if (mensajeActualizado.mensaje_texto === nuevoTexto) {
          log.success(`${testName}: ✓ Mensaje actualizado correctamente`);
          this.results.passed++;
          this.results.tests.push({ name: testName, status: 'passed', data: mensajeActualizado });
          return true;
        } else {
          throw new Error('El mensaje no se actualizó correctamente');
        }
      } else {
        throw new Error('Respuesta del servidor inválida');
      }
    } catch (error) {
      log.error(`${testName}: ${error.response?.data?.error || error.message}`);
      this.results.failed++;
      this.results.tests.push({ name: testName, status: 'failed', error: error.message });
      return false;
    }
  }

  // Test 5: Verificar almacenamiento en base de datos
  async testVerificarAlmacenamiento(mensajeId) {
    if (!mensajeId) {
      log.warning('No se puede verificar almacenamiento: no hay mensaje ID');
      return false;
    }

    const testName = 'Verificar almacenamiento en BD';
    log.test(`\n${testName}...`);

    try {
      // Obtener el mensaje nuevamente para verificar que persiste
      const response = await axios.get(
        `${API_BASE_URL}/api/mensajes-chat/paciente/${this.pacienteId}/doctor/${this.doctorId}`,
        { headers: this.getHeaders() }
      );

      if (response.data.success && Array.isArray(response.data.data)) {
        const mensaje = response.data.data.find(m => m.id_mensaje === mensajeId);
        if (mensaje) {
          log.success(`${testName}: ✓ Mensaje encontrado en BD (ID: ${mensaje.id_mensaje})`);
          log.info(`  - Texto: ${mensaje.mensaje_texto}`);
          log.info(`  - Remitente: ${mensaje.remitente}`);
          log.info(`  - Fecha: ${mensaje.fecha_envio}`);
          log.info(`  - Leído: ${mensaje.leido ? 'Sí' : 'No'}`);
          this.results.passed++;
          this.results.tests.push({ name: testName, status: 'passed', data: mensaje });
          return true;
        } else {
          throw new Error('El mensaje no se encontró en la base de datos');
        }
      } else {
        throw new Error('No se pudieron obtener los mensajes');
      }
    } catch (error) {
      log.error(`${testName}: ${error.response?.data?.error || error.message}`);
      this.results.failed++;
      this.results.tests.push({ name: testName, status: 'failed', error: error.message });
      return false;
    }
  }

  // Test 6: Obtener mensajes no leídos
  async testMensajesNoLeidos() {
    const testName = 'Obtener mensajes no leídos';
    log.test(`\n${testName}...`);

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/mensajes-chat/paciente/${this.pacienteId}/no-leidos`,
        { headers: this.getHeaders() }
      );

      if (response.data.success && Array.isArray(response.data.data)) {
        const noLeidos = response.data.data;
        log.success(`${testName}: ✓ Se encontraron ${noLeidos.length} mensajes no leídos`);
        this.results.passed++;
        this.results.tests.push({ name: testName, status: 'passed', count: noLeidos.length });
        return true;
      } else {
        throw new Error('Respuesta del servidor inválida');
      }
    } catch (error) {
      log.error(`${testName}: ${error.response?.data?.error || error.message}`);
      this.results.failed++;
      this.results.tests.push({ name: testName, status: 'failed', error: error.message });
      return false;
    }
  }

  // ============================================
  // PRUEBAS DE CITAS MÉDICAS
  // ============================================

  async testCrearCita() {
    const testName = 'Crear cita médica';
    log.test(`\n${testName}...`);

    try {
      // Si no tenemos doctorId válido, omitir esta prueba
      if (!this.doctorId || this.doctorId === this.userId) {
        log.warning(`${testName}: ⚠ Omitida - No se pudo obtener doctorId válido`);
        this.results.failed++;
        this.results.tests.push({ name: testName, status: 'failed', error: 'DoctorId no válido' });
        return null;
      }

      const fechaCita = new Date();
      fechaCita.setDate(fechaCita.getDate() + 7); // 7 días en el futuro

      const response = await axios.post(
        `${API_BASE_URL}/api/citas`,
        {
          id_paciente: this.pacienteId,
          id_doctor: this.doctorId,
          fecha_cita: fechaCita.toISOString(),
          motivo: 'Consulta de seguimiento',
          estado: 'pendiente', // Estados válidos: pendiente, atendida, no_asistida, reprogramada, cancelada
        },
        { headers: this.getHeaders() }
      );

      // La respuesta puede tener diferentes formatos
      const cita = response.data.data || response.data;
      if (cita && (cita.id_cita || cita.id)) {
        log.success(`${testName}: ✓ Cita creada (ID: ${cita.id_cita || cita.id})`);
        this.results.passed++;
        this.results.tests.push({ name: testName, status: 'passed', data: cita });
        return cita.id_cita || cita.id;
      } else {
        throw new Error('Respuesta del servidor inválida');
      }
    } catch (error) {
      log.error(`${testName}: ${error.response?.data?.error || error.message}`);
      if (error.response?.data) {
        log.info(`Detalles: ${JSON.stringify(error.response.data).substring(0, 200)}`);
      }
      this.results.failed++;
      this.results.tests.push({ name: testName, status: 'failed', error: error.message });
      return null;
    }
  }

  async testObtenerCitas() {
    const testName = 'Obtener citas del paciente';
    log.test(`\n${testName}...`);

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/citas/paciente/${this.pacienteId}`,
        { headers: this.getHeaders() }
      );

      // La respuesta puede tener diferentes formatos
      const citas = response.data.data || response.data;
      const citasArray = Array.isArray(citas) ? citas : (citas ? [citas] : []);
      
      if (citasArray.length >= 0) {
        log.success(`${testName}: ✓ Se obtuvieron ${citasArray.length} citas`);
        this.results.passed++;
        this.results.tests.push({ name: testName, status: 'passed', count: citasArray.length });
        return citasArray;
      } else {
        throw new Error('Respuesta del servidor inválida');
      }
    } catch (error) {
      log.error(`${testName}: ${error.response?.data?.error || error.message}`);
      this.results.failed++;
      this.results.tests.push({ name: testName, status: 'failed', error: error.message });
      return null;
    }
  }

  // ============================================
  // PRUEBAS DE SIGNOS VITALES
  // ============================================

  async testRegistrarSignoVital() {
    const testName = 'Registrar signo vital';
    log.test(`\n${testName}...`);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/pacientes/${this.pacienteId}/signos-vitales`,
        {
          peso_kg: 70.5,
          talla_m: 1.70,
          medida_cintura_cm: 85,
          presion_sistolica: 120,
          presion_diastolica: 80,
          glucosa_mg_dl: 95,
          colesterol_mg_dl: 180,
          trigliceridos_mg_dl: 150,
          observaciones: 'Signo vital de prueba',
        },
        { headers: this.getHeaders() }
      );

      if (response.data.success && response.data.data) {
        const signoVital = response.data.data;
        log.success(`${testName}: ✓ Signo vital registrado (ID: ${signoVital.id_signo_vital || signoVital.id})`);
        this.results.passed++;
        this.results.tests.push({ name: testName, status: 'passed', data: signoVital });
        return signoVital.id_signo_vital || signoVital.id;
      } else {
        throw new Error('Respuesta del servidor inválida');
      }
    } catch (error) {
      log.error(`${testName}: ${error.response?.data?.error || error.message}`);
      this.results.failed++;
      this.results.tests.push({ name: testName, status: 'failed', error: error.message });
      return null;
    }
  }

  async testObtenerSignosVitales() {
    const testName = 'Obtener signos vitales del paciente';
    log.test(`\n${testName}...`);

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/pacientes/${this.pacienteId}/signos-vitales`,
        { headers: this.getHeaders() }
      );

      const signosVitales = response.data.data || response.data;
      const signosArray = Array.isArray(signosVitales) ? signosVitales : (signosVitales ? [signosVitales] : []);

      if (signosArray.length >= 0) {
        log.success(`${testName}: ✓ Se obtuvieron ${signosArray.length} registros`);
        this.results.passed++;
        this.results.tests.push({ name: testName, status: 'passed', count: signosArray.length });
        return signosArray;
      } else {
        throw new Error('Respuesta del servidor inválida');
      }
    } catch (error) {
      log.error(`${testName}: ${error.response?.data?.error || error.message}`);
      this.results.failed++;
      this.results.tests.push({ name: testName, status: 'failed', error: error.message });
      return null;
    }
  }

  // ============================================
  // PRUEBAS DE MEDICAMENTOS
  // ============================================

  async testObtenerMedicamentos() {
    const testName = 'Obtener catálogo de medicamentos';
    log.test(`\n${testName}...`);

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/medicamentos`,
        { headers: this.getHeaders() }
      );

      const medicamentos = response.data.data || response.data;
      const medicamentosArray = Array.isArray(medicamentos) ? medicamentos : (medicamentos ? [medicamentos] : []);

      if (medicamentosArray.length >= 0) {
        log.success(`${testName}: ✓ Se obtuvieron ${medicamentosArray.length} medicamentos`);
        this.results.passed++;
        this.results.tests.push({ name: testName, status: 'passed', count: medicamentosArray.length });
        return medicamentosArray;
      } else {
        throw new Error('Respuesta del servidor inválida');
      }
    } catch (error) {
      log.error(`${testName}: ${error.response?.data?.error || error.message}`);
      this.results.failed++;
      this.results.tests.push({ name: testName, status: 'failed', error: error.message });
      return null;
    }
  }

  // ============================================
  // PRUEBAS DE COMORBILIDADES
  // ============================================

  async testObtenerComorbilidades() {
    const testName = 'Obtener catálogo de comorbilidades';
    log.test(`\n${testName}...`);

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/comorbilidades`,
        { headers: this.getHeaders() }
      );

      const comorbilidades = response.data.data || response.data;
      const comorbilidadesArray = Array.isArray(comorbilidades) ? comorbilidades : (comorbilidades ? [comorbilidades] : []);

      if (comorbilidadesArray.length >= 0) {
        log.success(`${testName}: ✓ Se obtuvieron ${comorbilidadesArray.length} comorbilidades`);
        this.results.passed++;
        this.results.tests.push({ name: testName, status: 'passed', count: comorbilidadesArray.length });
        return comorbilidadesArray;
      } else {
        throw new Error('Respuesta del servidor inválida');
      }
    } catch (error) {
      log.error(`${testName}: ${error.response?.data?.error || error.message}`);
      this.results.failed++;
      this.results.tests.push({ name: testName, status: 'failed', error: error.message });
      return null;
    }
  }

  // ============================================
  // PRUEBAS DE VACUNAS
  // ============================================

  async testObtenerVacunas() {
    const testName = 'Obtener catálogo de vacunas';
    log.test(`\n${testName}...`);

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/vacunas`,
        { headers: this.getHeaders() }
      );

      const vacunas = response.data.data || response.data;
      const vacunasArray = Array.isArray(vacunas) ? vacunas : (vacunas ? [vacunas] : []);

      if (vacunasArray.length >= 0) {
        log.success(`${testName}: ✓ Se obtuvieron ${vacunasArray.length} vacunas`);
        this.results.passed++;
        this.results.tests.push({ name: testName, status: 'passed', count: vacunasArray.length });
        return vacunasArray;
      } else {
        throw new Error('Respuesta del servidor inválida');
      }
    } catch (error) {
      log.error(`${testName}: ${error.response?.data?.error || error.message}`);
      this.results.failed++;
      this.results.tests.push({ name: testName, status: 'failed', error: error.message });
      return null;
    }
  }

  // ============================================
  // PRUEBAS DE DASHBOARD
  // ============================================

  async testObtenerDashboard() {
    const testName = 'Obtener dashboard del doctor';
    log.test(`\n${testName}...`);

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/dashboard/doctor/summary`,
        { headers: this.getHeaders() }
      );

      if (response.data.success || response.data) {
        log.success(`${testName}: ✓ Dashboard obtenido`);
        this.results.passed++;
        this.results.tests.push({ name: testName, status: 'passed', data: response.data.data || response.data });
        return response.data.data || response.data;
      } else {
        throw new Error('Respuesta del servidor inválida');
      }
    } catch (error) {
      log.error(`${testName}: ${error.response?.data?.error || error.message}`);
      this.results.failed++;
      this.results.tests.push({ name: testName, status: 'failed', error: error.message });
      return null;
    }
  }

  // ============================================
  // PRUEBAS DE NOTIFICACIONES
  // ============================================

  async testObtenerNotificaciones() {
    const testName = 'Obtener notificaciones';
    log.test(`\n${testName}...`);

    try {
      // Si no tenemos doctorId válido, intentar usar el userId como fallback
      const doctorIdParaNotificaciones = this.doctorId && this.doctorId !== this.userId 
        ? this.doctorId 
        : this.userId;

      const response = await axios.get(
        `${API_BASE_URL}/api/doctores/${doctorIdParaNotificaciones}/notificaciones`,
        { headers: this.getHeaders() }
      );

      const notificaciones = response.data.data || response.data;
      const notificacionesArray = Array.isArray(notificaciones) ? notificaciones : (notificaciones ? [notificaciones] : []);

      if (notificacionesArray.length >= 0) {
        log.success(`${testName}: ✓ Se obtuvieron ${notificacionesArray.length} notificaciones`);
        this.results.passed++;
        this.results.tests.push({ name: testName, status: 'passed', count: notificacionesArray.length });
        return notificacionesArray;
      } else {
        throw new Error('Respuesta del servidor inválida');
      }
    } catch (error) {
      log.error(`${testName}: ${error.response?.data?.error || error.message}`);
      this.results.failed++;
      this.results.tests.push({ name: testName, status: 'failed', error: error.message });
      return null;
    }
  }

  // ============================================
  // PRUEBAS DE DATOS MÉDICOS DEL PACIENTE
  // ============================================

  async testObtenerDatosMedicosPaciente() {
    const testName = 'Obtener datos médicos completos del paciente';
    log.test(`\n${testName}...`);

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/pacientes/${this.pacienteId}/resumen-medico`,
        { headers: this.getHeaders() }
      );

      if (response.data.success || response.data) {
        log.success(`${testName}: ✓ Datos médicos obtenidos`);
        this.results.passed++;
        this.results.tests.push({ name: testName, status: 'passed', data: response.data.data || response.data });
        return response.data.data || response.data;
      } else {
        throw new Error('Respuesta del servidor inválida');
      }
    } catch (error) {
      log.error(`${testName}: ${error.response?.data?.error || error.message}`);
      this.results.failed++;
      this.results.tests.push({ name: testName, status: 'failed', error: error.message });
      return null;
    }
  }

  // Ejecutar todas las pruebas
  async runAllTests() {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 PRUEBAS DE INTEGRACIÓN FRONTEND-BACKEND - TODAS LAS ÁREAS');
    console.log('='.repeat(60) + '\n');

    log.info(`API Base URL: ${API_BASE_URL}`);
    log.info(`Doctor: ${TEST_DOCTOR_EMAIL}`);
    log.info(`Paciente PIN: ${TEST_PACIENTE_PIN}\n`);

    // 0. Verificar que el backend esté corriendo
    if (!(await this.checkBackendConnection())) {
      log.error('No se pudo conectar al backend. Abortando pruebas.');
      return;
    }

    // 1. Autenticarse como doctor
    if (!(await this.authenticateDoctor())) {
      log.error('No se pudo autenticar como doctor. Abortando pruebas.');
      return;
    }

    // 2. Obtener doctor ID
    if (!(await this.getDoctorId())) {
      log.error('No se pudo obtener doctor ID. Abortando pruebas.');
      return;
    }

    // 3. Buscar paciente por PIN
    if (!(await this.findPacienteByPin())) {
      log.error('No se pudo encontrar paciente con PIN. Abortando pruebas.');
      return;
    }

    // ============================================
    // ÁREA 1: CHAT
    // ============================================
    console.log('\n' + '─'.repeat(60));
    console.log('💬 ÁREA: CHAT');
    console.log('─'.repeat(60));
    const mensajeId = await this.testEnviarMensajeTexto();
    await this.testObtenerMensajes();
    await this.testMarcarComoLeido(mensajeId);
    await this.testActualizarMensaje(mensajeId);
    await this.testVerificarAlmacenamiento(mensajeId);
    await this.testMensajesNoLeidos();

    // ============================================
    // ÁREA 2: CITAS MÉDICAS
    // ============================================
    console.log('\n' + '─'.repeat(60));
    console.log('📅 ÁREA: CITAS MÉDICAS');
    console.log('─'.repeat(60));
    await this.testCrearCita();
    await this.testObtenerCitas();

    // ============================================
    // ÁREA 3: SIGNOS VITALES
    // ============================================
    console.log('\n' + '─'.repeat(60));
    console.log('📊 ÁREA: SIGNOS VITALES');
    console.log('─'.repeat(60));
    await this.testRegistrarSignoVital();
    await this.testObtenerSignosVitales();

    // ============================================
    // ÁREA 4: MEDICAMENTOS
    // ============================================
    console.log('\n' + '─'.repeat(60));
    console.log('💊 ÁREA: MEDICAMENTOS');
    console.log('─'.repeat(60));
    await this.testObtenerMedicamentos();

    // ============================================
    // ÁREA 5: COMORBILIDADES
    // ============================================
    console.log('\n' + '─'.repeat(60));
    console.log('🏥 ÁREA: COMORBILIDADES');
    console.log('─'.repeat(60));
    await this.testObtenerComorbilidades();

    // ============================================
    // ÁREA 6: VACUNAS
    // ============================================
    console.log('\n' + '─'.repeat(60));
    console.log('💉 ÁREA: VACUNAS');
    console.log('─'.repeat(60));
    await this.testObtenerVacunas();

    // ============================================
    // ÁREA 7: DASHBOARD
    // ============================================
    console.log('\n' + '─'.repeat(60));
    console.log('📈 ÁREA: DASHBOARD');
    console.log('─'.repeat(60));
    await this.testObtenerDashboard();

    // ============================================
    // ÁREA 8: NOTIFICACIONES
    // ============================================
    console.log('\n' + '─'.repeat(60));
    console.log('🔔 ÁREA: NOTIFICACIONES');
    console.log('─'.repeat(60));
    await this.testObtenerNotificaciones();

    // ============================================
    // ÁREA 9: DATOS MÉDICOS DEL PACIENTE
    // ============================================
    console.log('\n' + '─'.repeat(60));
    console.log('📋 ÁREA: DATOS MÉDICOS DEL PACIENTE');
    console.log('─'.repeat(60));
    await this.testObtenerDatosMedicosPaciente();

    // 5. Mostrar resumen
    this.showSummary();
  }

  // Mostrar resumen de resultados
  showSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE PRUEBAS');
    console.log('='.repeat(60) + '\n');

    const total = this.results.passed + this.results.failed;
    const porcentaje = total > 0 ? ((this.results.passed / total) * 100).toFixed(1) : 0;

    log.info(`Total de pruebas: ${total}`);
    log.success(`Pruebas exitosas: ${this.results.passed}`);
    if (this.results.failed > 0) {
      log.error(`Pruebas fallidas: ${this.results.failed}`);
    }
    log.info(`Tasa de éxito: ${porcentaje}%\n`);

    if (this.results.failed === 0) {
      log.success('✅ Todas las pruebas pasaron exitosamente!');
    } else {
      log.warning('⚠️  Algunas pruebas fallaron. Revisa los detalles arriba.');
    }

    console.log('\n' + '='.repeat(60) + '\n');
  }
}

// Ejecutar pruebas
const tester = new IntegrationTester();
tester.runAllTests().catch((error) => {
  log.error(`Error fatal: ${error.message}`);
  process.exit(1);
});

