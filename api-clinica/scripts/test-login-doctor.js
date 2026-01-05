import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const API_URL = process.env.API_URL || 'http://localhost:3000';

/**
 * Prueba de login de doctor con el formato exacto del frontend
 */
async function testLoginDoctor() {
  try {
    console.log('🧪 Probando login de doctor...\n');
    console.log('📋 Configuración:');
    console.log(`   API URL: ${API_URL}`);
    console.log(`   Endpoint: ${API_URL}/api/auth/login`);
    console.log(`   Email: doctor@clinica.com`);
    console.log(`   Password: Doctor123!\n`);

    // Formato exacto que envía el frontend
    const loginData = {
      email: 'doctor@clinica.com',
      password: 'Doctor123!'
    };

    console.log('📤 Enviando petición POST...');
    console.log('   Body:', JSON.stringify(loginData, null, 2));
    console.log('   Headers:', {
      'Content-Type': 'application/json'
    });
    console.log('');

    const response = await axios.post(
      `${API_URL}/api/auth/login`,
      loginData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: (status) => status < 500 // No lanzar error para códigos 4xx
      }
    );

    console.log('📥 Respuesta recibida:');
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Headers:`, JSON.stringify(response.headers, null, 2));
    console.log(`   Data:`, JSON.stringify(response.data, null, 2));
    console.log('');

    if (response.status === 200 && response.data.token) {
      console.log('✅ LOGIN EXITOSO');
      console.log(`   Token recibido: ${response.data.token.substring(0, 50)}...`);
      console.log(`   Usuario: ${response.data.usuario?.email}`);
      console.log(`   Rol: ${response.data.usuario?.rol}`);
    } else {
      console.log('❌ LOGIN FALLIDO');
      console.log(`   Error: ${response.data?.error || 'Error desconocido'}`);
      console.log(`   Detalles: ${JSON.stringify(response.data, null, 2)}`);
    }

  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('   No se recibió respuesta del servidor');
      console.error('   Verifica que el servidor esté corriendo en:', API_URL);
    }
    process.exit(1);
  }
}

testLoginDoctor();

