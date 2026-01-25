/**
 * Script para probar el login y ver qué está pasando
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

async function testLogin() {
  console.log('\n🔐 Probando login...\n');
  console.log(`URL: ${BASE_URL}/api/auth/login`);
  console.log(`Email: Doctor@clinica.com`);
  
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'Doctor@clinica.com',
      password: 'Doctor123'
    }, {
      validateStatus: () => true // No lanzar error en cualquier status
    });

    console.log('\n📊 Respuesta del servidor:');
    console.log(`Status: ${response.status}`);
    console.log(`Data:`, JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.token) {
      console.log('\n✅ Login exitoso!');
      console.log(`Token: ${response.data.token.substring(0, 30)}...`);
    } else {
      console.log('\n❌ Login falló');
    }
  } catch (error) {
    console.log('\n❌ Error:');
    console.log(`Message: ${error.message}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Data:`, JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('No se recibió respuesta del servidor');
      console.log('Request:', error.request);
    }
  }
}

testLogin();
