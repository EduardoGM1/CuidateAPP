/**
 * Script de prueba específico para el endpoint de creación de citas
 * Simula exactamente lo que envía el frontend
 * 
 * Ejecutar: node scripts/test-crear-cita.js
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Credenciales de prueba
const TEST_CREDENTIALS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@clinica.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'admin123'
  },
  doctor: {
    email: process.env.TEST_DOCTOR_EMAIL || 'doctor@clinica.com',
    password: process.env.TEST_DOCTOR_PASSWORD || 'doctor123'
  }
};

async function obtenerToken(rol = 'admin') {
  try {
    const creds = TEST_CREDENTIALS[rol];
    const response = await axios.post(`${API_BASE_URL}/api/auth-unified/login-doctor-admin`, creds);
    
    if (response.data && response.data.token) {
      return response.data.token;
    }
    return null;
  } catch (error) {
    console.error(`Error obteniendo token ${rol}:`, error.response?.data || error.message);
    return null;
  }
}

async function probarCrearCita() {
  console.log('\n=== PRUEBA DE CREACIÓN DE CITA ===\n');

  // Obtener token
  let token = await obtenerToken('admin');
  if (!token) {
    token = await obtenerToken('doctor');
  }

  if (!token) {
    console.error('❌ No se pudo obtener token. Verifica las credenciales.');
    process.exit(1);
  }

  console.log('✅ Token obtenido\n');

  // Datos exactos que envía el frontend
  const fechaCita = new Date('2025-11-28T17:00:00');
  
  const citaData = {
    id_paciente: 7,
    id_doctor: 1,
    fecha_cita: fechaCita.toISOString(),
    motivo: 'Consulta de prueba',
    observaciones: 'Observaciones de prueba',
    es_primera_consulta: false
  };

  console.log('📤 Datos a enviar:');
  console.log(JSON.stringify(citaData, null, 2));
  console.log('\n');

  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/citas`,
      citaData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Device-ID': 'test-device',
          'X-Platform': 'android',
          'X-App-Version': '1.0.0',
          'X-Client-Type': 'mobile'
        },
        timeout: 10000
      }
    );

    console.log('✅ Cita creada exitosamente');
    console.log('📥 Respuesta:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log(`\nStatus: ${response.status}`);

  } catch (error) {
    console.error('❌ Error creando cita:');
    console.error(`Status: ${error.response?.status || 'N/A'}`);
    console.error(`Error: ${error.response?.data?.error || error.message}`);
    
    if (error.response?.data) {
      console.error('\n📥 Respuesta completa:');
      console.error(JSON.stringify(error.response.data, null, 2));
    }

    if (error.response?.data?.details) {
      console.error('\n📋 Detalles del error:');
      console.error(JSON.stringify(error.response.data.details, null, 2));
    }

    if (error.response?.data?.message) {
      console.error(`\n💬 Mensaje: ${error.response.data.message}`);
    }

    process.exit(1);
  }
}

// Verificar servidor
async function verificarServidor() {
  try {
    await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('🔍 Verificando servidor...');
  const servidorActivo = await verificarServidor();
  
  if (!servidorActivo) {
    console.error(`❌ El servidor no está respondiendo en ${API_BASE_URL}`);
    console.error('   Asegúrate de que el servidor esté corriendo.');
    process.exit(1);
  }

  console.log('✅ Servidor activo\n');

  await probarCrearCita();
}

main().catch(error => {
  console.error('Error ejecutando prueba:', error);
  process.exit(1);
});

