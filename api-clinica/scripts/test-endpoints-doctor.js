import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function testDoctorEndpoints() {
  try {
    console.log('🔐 Autenticando doctor...\n');
    
    // Login
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'doctor@clinica.com',
      password: 'Doctor123!'
    });
    
    if (!loginResponse.data.token) {
      console.error('❌ No se recibió token');
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Login exitoso\n');
    
    // Test endpoints
    const endpoints = [
      { method: 'GET', url: '/api/pacientes?estado=activos&sort=recent', name: 'Pacientes' },
      { method: 'GET', url: '/api/doctores?estado=activos&sort=recent', name: 'Doctores' },
      { method: 'GET', url: '/api/citas?limit=50', name: 'Citas' }
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`📋 Probando ${endpoint.name}...`);
        const response = await axios({
          method: endpoint.method,
          url: `${API_URL}${endpoint.url}`,
          headers: {
            'Authorization': `Bearer ${token}`
          },
          validateStatus: () => true
        });
        
        if (response.status === 200) {
          console.log(`✅ ${endpoint.name}: OK`);
          console.log(`   Status: ${response.status}`);
          console.log(`   Datos: ${JSON.stringify(response.data).substring(0, 100)}...\n`);
        } else {
          console.log(`❌ ${endpoint.name}: Error ${response.status}`);
          console.log(`   Error: ${JSON.stringify(response.data)}\n`);
        }
      } catch (error) {
        console.log(`❌ ${endpoint.name}: Error`);
        console.log(`   Message: ${error.message}`);
        if (error.response) {
          console.log(`   Status: ${error.response.status}`);
          console.log(`   Data: ${JSON.stringify(error.response.data)}\n`);
        } else {
          console.log(`   ${error}\n`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testDoctorEndpoints();

