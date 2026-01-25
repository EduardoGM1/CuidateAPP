/**
 * Script simple para probar login del administrador
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function testLogin() {
  console.log('🔍 Probando login del administrador...\n');
  console.log(`URL: ${API_BASE_URL}/api/mobile/login`);
  console.log(`Email: admin@clinica.com`);
  console.log(`Password: Admin123!\n`);

  try {
    const response = await axios.post(`${API_BASE_URL}/api/mobile/login`, {
      email: 'admin@clinica.com',
      password: 'Admin123!'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });

    console.log('✅ ========================================');
    console.log('✅ LOGIN EXITOSO');
    console.log('✅ ========================================\n');
    console.log('📊 Detalles:');
    console.log(`   Status: ${response.status}`);
    console.log(`   Token recibido: ${response.data.token ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   Refresh token recibido: ${response.data.refresh_token ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   Expires in: ${response.data.expires_in || 'N/A'}`);
    console.log('\n👤 Usuario:');
    if (response.data.usuario) {
      console.log(`   ID: ${response.data.usuario.id}`);
      console.log(`   Email: ${response.data.usuario.email}`);
      console.log(`   Rol: ${response.data.usuario.rol}`);
      if (response.data.usuario.rol === 'Admin') {
        console.log('   ✅ Rol correcto (Admin)');
      } else {
        console.log('   ⚠️  ADVERTENCIA: El rol no es Admin');
      }
    }
    console.log('\n🔑 Token (primeros 50 caracteres):');
    if (response.data.token) {
      console.log(`   ${response.data.token.substring(0, 50)}...`);
    }
    console.log('\n✅ Login funcionando correctamente!\n');

    // Probar acceso a endpoint protegido
    if (response.data.token) {
      console.log('🔒 Probando acceso a endpoint protegido...\n');
      try {
        const dashboardResponse = await axios.get(`${API_BASE_URL}/api/dashboard/admin/summary`, {
          headers: {
            'Authorization': `Bearer ${response.data.token}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });

        console.log('✅ Acceso a dashboard exitoso');
        console.log(`   Status: ${dashboardResponse.status}`);
        if (dashboardResponse.data.data) {
          console.log(`   Total pacientes: ${dashboardResponse.data.data.metrics?.totalPacientes || 'N/A'}`);
          console.log(`   Total doctores: ${dashboardResponse.data.data.metrics?.totalDoctores || 'N/A'}`);
          console.log(`   Citas hoy: ${dashboardResponse.data.data.metrics?.citasHoy?.total || 'N/A'}`);
        }
        console.log('\n✅ Token válido y funcionando correctamente!\n');
      } catch (dashboardError) {
        console.log('❌ Error accediendo a dashboard:');
        if (dashboardError.response) {
          console.log(`   Status: ${dashboardError.response.status}`);
          console.log(`   Error: ${JSON.stringify(dashboardError.response.data, null, 2)}`);
        } else {
          console.log(`   Error: ${dashboardError.message}`);
        }
        console.log('');
      }
    }

  } catch (error) {
    console.log('❌ ========================================');
    console.log('❌ ERROR EN LOGIN');
    console.log('❌ ========================================\n');
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      console.log('⚠️  El servidor no está respondiendo');
      console.log(`   URL intentada: ${API_BASE_URL}`);
      console.log('\n💡 Solución:');
      console.log('   1. Verifica que el servidor esté corriendo');
      console.log('   2. Inicia el servidor con: cd api-clinica && npm start');
      console.log('   3. Verifica que el puerto 3000 esté disponible\n');
    } else if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
      
      if (error.response.status === 401) {
        console.log('\n💡 Posibles causas:');
        console.log('   - Email o password incorrectos');
        console.log('   - Usuario no existe en la BD');
        console.log('   - Usuario inactivo');
      }
    } else {
      console.log(`   Error: ${error.message}`);
      console.log(`   Code: ${error.code || 'N/A'}`);
    }
    console.log('');
  }
}

testLogin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
