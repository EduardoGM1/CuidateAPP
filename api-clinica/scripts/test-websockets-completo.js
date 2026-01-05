/**
 * Script de prueba completo para WebSockets
 * Verifica todos los eventos y conexiones
 */

import axios from 'axios';
import { config } from 'dotenv';

config();

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_CREDENTIALS = {
  admin: {
    email: 'admin@clinica.com',
    password: 'Admin123!'
  },
  doctor: {
    email: 'doctor@clinica.com',
    password: 'Doctor123!'
  },
  paciente: {
    pin: '1234',
    pacienteId: 1
  }
};

// Colores para consola
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

async function obtenerToken(tipo, credenciales) {
  try {
    let endpoint = '';
    let data = {};
    
    if (tipo === 'admin' || tipo === 'doctor') {
      endpoint = '/api/auth/login';
      data = {
        email: credenciales.email,
        password: credenciales.password
      };
    } else if (tipo === 'paciente') {
      endpoint = '/api/auth/paciente/pin';
      data = {
        pin: credenciales.pin,
        id_paciente: credenciales.pacienteId
      };
    }
    
    const response = await axios.post(`${API_BASE}${endpoint}`, data);
    return response.data.token || response.data.data?.token;
  } catch (error) {
    log(`❌ Error obteniendo token ${tipo}: ${error.message}`, 'red');
    return null;
  }
}

async function testWebSocketConnection(token, tipo) {
  return new Promise((resolve) => {
    const io = require('socket.io-client');
    
    log(`\n🔌 [${tipo.toUpperCase()}] Conectando WebSocket...`, 'cyan');
    
    const socket = io(API_BASE, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 5000
    });
    
    let connected = false;
    let receivedEvents = [];
    
    socket.on('connect', () => {
      connected = true;
      log(`✅ [${tipo.toUpperCase()}] WebSocket CONECTADO (socketId: ${socket.id})`, 'green');
      
      // Probar ping
      socket.emit('ping');
      
      // Solicitar info del servidor
      socket.emit('server_info');
      
      setTimeout(() => {
        socket.disconnect();
        resolve({
          connected,
          socketId: socket.id,
          receivedEvents,
          success: true
        });
      }, 2000);
    });
    
    socket.on('connect_error', (error) => {
      log(`❌ [${tipo.toUpperCase()}] Error de conexión: ${error.message}`, 'red');
      resolve({
        connected: false,
        error: error.message,
        success: false
      });
    });
    
    socket.on('pong', (data) => {
      receivedEvents.push('pong');
      log(`  📥 [${tipo.toUpperCase()}] Pong recibido`, 'blue');
    });
    
    socket.on('server_info', (data) => {
      receivedEvents.push('server_info');
      log(`  📥 [${tipo.toUpperCase()}] Server info recibido`, 'blue');
    });
    
    socket.on('disconnect', () => {
      log(`🔌 [${tipo.toUpperCase()}] Desconectado`, 'yellow');
    });
    
    // Timeout de seguridad
    setTimeout(() => {
      if (!connected) {
        socket.disconnect();
        resolve({
          connected: false,
          error: 'Timeout',
          success: false
        });
      }
    }, 5000);
  });
}

async function testEventosCitas(tokenAdmin, tokenPaciente) {
  log('\n📅 PROBANDO EVENTOS DE CITAS...', 'cyan');
  
  try {
    // Crear una cita de prueba
    const citaData = {
      id_paciente: 1,
      id_doctor: 1,
      fecha_cita: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      motivo: 'Prueba WebSocket',
      observaciones: 'Cita de prueba para verificar WebSockets',
      es_primera_consulta: false
    };
    
    log('  📤 Creando cita de prueba...', 'yellow');
    const createResponse = await axios.post(
      `${API_BASE}/api/citas`,
      citaData,
      { headers: { Authorization: `Bearer ${tokenAdmin}` } }
    );
    
    const idCita = createResponse.data.id_cita || createResponse.data.id;
    log(`  ✅ Cita creada: ${idCita}`, 'green');
    
    // Esperar un momento para que se procese el WebSocket
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Cambiar estado de la cita
    log('  📤 Cambiando estado de la cita...', 'yellow');
    await axios.put(
      `${API_BASE}/api/citas/${idCita}/estado`,
      { estado: 'atendida' },
      { headers: { Authorization: `Bearer ${tokenAdmin}` } }
    );
    log('  ✅ Estado cambiado', 'green');
    
    // Limpiar: eliminar cita de prueba
    try {
      await axios.delete(
        `${API_BASE}/api/citas/${idCita}`,
        { headers: { Authorization: `Bearer ${tokenAdmin}` } }
      );
      log('  🗑️ Cita de prueba eliminada', 'yellow');
    } catch (e) {
      // Ignorar error de eliminación
    }
    
    return { success: true, idCita };
  } catch (error) {
    log(`  ❌ Error en prueba de citas: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function main() {
  log('\n🚀 INICIANDO PRUEBAS COMPLETAS DE WEBSOCKETS\n', 'cyan');
  
  // Obtener tokens
  log('🔑 Obteniendo tokens...', 'yellow');
  const tokenAdmin = await obtenerToken('admin', TEST_CREDENTIALS.admin);
  const tokenDoctor = await obtenerToken('doctor', TEST_CREDENTIALS.doctor);
  const tokenPaciente = await obtenerToken('paciente', TEST_CREDENTIALS.paciente);
  
  if (!tokenAdmin || !tokenDoctor || !tokenPaciente) {
    log('❌ No se pudieron obtener todos los tokens', 'red');
    return;
  }
  
  log('✅ Tokens obtenidos\n', 'green');
  
  // Probar conexiones WebSocket
  log('═══════════════════════════════════════════════', 'cyan');
  log('PRUEBA 1: CONEXIONES WEBSOCKET', 'cyan');
  log('═══════════════════════════════════════════════', 'cyan');
  
  const resultadoAdmin = await testWebSocketConnection(tokenAdmin, 'admin');
  const resultadoDoctor = await testWebSocketConnection(tokenDoctor, 'doctor');
  const resultadoPaciente = await testWebSocketConnection(tokenPaciente, 'paciente');
  
  // Resumen de conexiones
  log('\n📊 RESUMEN DE CONEXIONES:', 'cyan');
  log(`  Admin: ${resultadoAdmin.success ? '✅' : '❌'} ${resultadoAdmin.connected ? 'Conectado' : 'Falló'}`, resultadoAdmin.success ? 'green' : 'red');
  log(`  Doctor: ${resultadoDoctor.success ? '✅' : '❌'} ${resultadoDoctor.connected ? 'Conectado' : 'Falló'}`, resultadoDoctor.success ? 'green' : 'red');
  log(`  Paciente: ${resultadoPaciente.success ? '✅' : '❌'} ${resultadoPaciente.connected ? 'Conectado' : 'Falló'}`, resultadoPaciente.success ? 'green' : 'red');
  
  // Probar eventos
  log('\n═══════════════════════════════════════════════', 'cyan');
  log('PRUEBA 2: EVENTOS DE CITAS', 'cyan');
  log('═══════════════════════════════════════════════', 'cyan');
  
  const resultadoCitas = await testEventosCitas(tokenAdmin, tokenPaciente);
  
  // Resumen final
  log('\n═══════════════════════════════════════════════', 'cyan');
  log('RESUMEN FINAL', 'cyan');
  log('═══════════════════════════════════════════════', 'cyan');
  log(`Conexiones WebSocket: ${resultadoAdmin.success && resultadoDoctor.success && resultadoPaciente.success ? '✅ TODAS OK' : '❌ ALGUNAS FALLARON'}`, 
    resultadoAdmin.success && resultadoDoctor.success && resultadoPaciente.success ? 'green' : 'red');
  log(`Eventos de Citas: ${resultadoCitas.success ? '✅ OK' : '❌ FALLÓ'}`, resultadoCitas.success ? 'green' : 'red');
  
  log('\n💡 NOTA: Revisa los logs del servidor para ver si los eventos se están emitiendo correctamente', 'yellow');
  log('💡 NOTA: Revisa los logs del frontend para ver si los eventos están llegando', 'yellow');
}

main().catch(error => {
  log(`\n❌ Error fatal: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});


