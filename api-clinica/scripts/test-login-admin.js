/**
 * Script para probar el login del administrador
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import sequelize from '../config/db.js';
import { Usuario } from '../models/associations.js';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function testLoginAdmin() {
  try {
    console.log('🔍 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión establecida\n');

    // 1. Verificar que el usuario administrador existe
    console.log('1️⃣ Verificando usuario administrador en BD...');
    const adminUsuario = await Usuario.findOne({
      where: { email: 'admin@clinica.com', rol: 'Admin' }
    });

    if (!adminUsuario) {
      console.log('❌ Usuario administrador NO encontrado en BD');
      console.log('   Creando usuario administrador...');
      
      const passwordHash = await bcrypt.hash('Admin123!', 10);
      const nuevoAdmin = await Usuario.create({
        email: 'admin@clinica.com',
        password_hash: passwordHash,
        rol: 'Admin',
        activo: true,
        fecha_creacion: new Date()
      });
      console.log('   ✅ Usuario administrador creado');
      console.log(`   ID: ${nuevoAdmin.id_usuario}`);
    } else {
      console.log('✅ Usuario administrador encontrado');
      console.log(`   ID: ${adminUsuario.id_usuario}`);
      console.log(`   Email: ${adminUsuario.email}`);
      console.log(`   Rol: ${adminUsuario.rol}`);
      console.log(`   Activo: ${adminUsuario.activo}`);
      
      // Verificar password
      const testPassword = 'Admin123!';
      const isValid = await bcrypt.compare(testPassword, adminUsuario.password_hash);
      console.log(`   Password válido: ${isValid ? '✅ SÍ' : '❌ NO'}`);
      
      if (!isValid) {
        console.log('   ⚠️  El password no coincide. Actualizando password...');
        const newPasswordHash = await bcrypt.hash(testPassword, 10);
        await adminUsuario.update({ password_hash: newPasswordHash });
        console.log('   ✅ Password actualizado');
      }
    }

    // 2. Probar login con endpoint /api/mobile/login
    console.log('\n2️⃣ Probando login con /api/mobile/login...');
    try {
      const response = await axios.post(`${API_BASE_URL}/api/mobile/login`, {
        email: 'admin@clinica.com',
        password: 'Admin123!'
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log('✅ Login exitoso');
      console.log('   Status:', response.status);
      console.log('   Token recibido:', response.data.token ? '✅ SÍ' : '❌ NO');
      console.log('   Refresh token recibido:', response.data.refresh_token ? '✅ SÍ' : '❌ NO');
      console.log('   Usuario:', JSON.stringify(response.data.usuario, null, 2));
      console.log('   Expires in:', response.data.expires_in);
      
      if (response.data.usuario) {
        console.log(`   Rol del usuario: ${response.data.usuario.rol}`);
        if (response.data.usuario.rol !== 'Admin') {
          console.log('   ⚠️  ADVERTENCIA: El rol no es Admin');
        }
      }
    } catch (error) {
      console.log('❌ Error en login:', error.response?.data || error.message);
      if (error.response) {
        console.log('   Status:', error.response.status);
        console.log('   Data:', JSON.stringify(error.response.data, null, 2));
      }
    }

    // 3. Probar login con endpoint /api/auth/login
    console.log('\n3️⃣ Probando login con /api/auth/login...');
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email: 'admin@clinica.com',
        password: 'Admin123!'
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log('✅ Login exitoso');
      console.log('   Status:', response.status);
      console.log('   Token recibido:', response.data.token ? '✅ SÍ' : '❌ NO');
      console.log('   Usuario:', JSON.stringify(response.data.usuario || response.data, null, 2));
    } catch (error) {
      console.log('❌ Error en login:', error.response?.data || error.message);
      if (error.response) {
        console.log('   Status:', error.response.status);
        console.log('   Data:', JSON.stringify(error.response.data, null, 2));
      } else if (error.code === 'ECONNREFUSED') {
        console.log('   ⚠️  El servidor no está corriendo en', API_BASE_URL);
        console.log('   Inicia el servidor con: npm start o node server.js');
      } else {
        console.log('   Error completo:', error);
      }
    }

    // 4. Probar acceso a endpoint protegido con el token
    console.log('\n4️⃣ Probando acceso a endpoint protegido...');
    try {
      // Primero obtener token
      const loginResponse = await axios.post(`${API_BASE_URL}/api/mobile/login`, {
        email: 'admin@clinica.com',
        password: 'Admin123!'
      });

      if (loginResponse.data.token) {
        const token = loginResponse.data.token;
        console.log('   Token obtenido, probando acceso a /api/dashboard/admin/summary...');
        
        const dashboardResponse = await axios.get(`${API_BASE_URL}/api/dashboard/admin/summary`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        console.log('✅ Acceso a dashboard exitoso');
        console.log('   Status:', dashboardResponse.status);
        console.log('   Datos recibidos:', dashboardResponse.data.success ? '✅ SÍ' : '❌ NO');
        if (dashboardResponse.data.data) {
          console.log('   Total pacientes:', dashboardResponse.data.data.metrics?.totalPacientes || 'N/A');
          console.log('   Total doctores:', dashboardResponse.data.data.metrics?.totalDoctores || 'N/A');
        }
      }
    } catch (error) {
      console.log('❌ Error accediendo a endpoint protegido:', error.response?.data || error.message);
      if (error.response) {
        console.log('   Status:', error.response.status);
        console.log('   Data:', JSON.stringify(error.response.data, null, 2));
      } else if (error.code === 'ECONNREFUSED') {
        console.log('   ⚠️  El servidor no está corriendo en', API_BASE_URL);
      } else {
        console.log('   Error completo:', error);
      }
    }

    console.log('\n✅ Pruebas completadas\n');

  } catch (error) {
    console.error('❌ Error en pruebas:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Ejecutar pruebas
testLoginAdmin()
  .then(() => {
    console.log('✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en script:', error);
    process.exit(1);
  });
