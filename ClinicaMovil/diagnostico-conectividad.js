// Script de diagnóstico de conectividad para la aplicación móvil
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

async function diagnosticarConectividad() {
  console.log('🔍 DIAGNÓSTICO DE CONECTIVIDAD MÓVIL');
  console.log('=====================================\n');
  
  // 1. Verificar conectividad básica
  console.log('1️⃣ Verificando conectividad básica...');
  try {
    const response = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
    console.log(`✅ Servidor accesible: ${response.status} - ${response.data.message}`);
  } catch (error) {
    console.log(`❌ Error conectando al servidor: ${error.message}`);
    if (error.code === 'ECONNREFUSED') {
      console.log('   → El servidor no está ejecutándose o no es accesible');
    } else if (error.code === 'ENOTFOUND') {
      console.log('   → No se puede resolver la dirección IP');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('   → Timeout de conexión - posible problema de firewall');
    }
    return;
  }
  
  // 2. Verificar endpoint de login
  console.log('\n2️⃣ Verificando endpoint de login...');
  try {
    const loginData = {
      email: 'admin@clinica.com',
      password: 'admin123'
    };
    
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, loginData, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ Login exitoso: ${response.status}`);
    console.log(`   Token recibido: ${response.data.token ? 'Sí' : 'No'}`);
    console.log(`   Usuario: ${response.data.usuario?.email || 'N/A'}`);
    console.log(`   Rol: ${response.data.usuario?.rol || 'N/A'}`);
    
    // 3. Probar endpoint de dashboard con token
    console.log('\n3️⃣ Verificando endpoint de dashboard...');
    const token = response.data.token;
    
    try {
      const dashboardResponse = await axios.get(`${API_BASE_URL}/api/dashboard/health`, {
        timeout: 5000,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Device-ID': 'mobile-device-123',
          'X-Platform': 'android',
          'X-App-Version': '1.0.0',
          'X-Client-Type': 'mobile'
        }
      });
      
      console.log(`✅ Dashboard accesible: ${dashboardResponse.status}`);
      console.log(`   Respuesta: ${JSON.stringify(dashboardResponse.data, null, 2)}`);
      
    } catch (dashboardError) {
      console.log(`❌ Error accediendo al dashboard: ${dashboardError.response?.status || dashboardError.message}`);
      if (dashboardError.response?.data) {
        console.log(`   Detalles: ${JSON.stringify(dashboardError.response.data, null, 2)}`);
      }
    }
    
  } catch (error) {
    console.log(`❌ Error en login: ${error.response?.status || error.message}`);
    if (error.response?.data) {
      console.log(`   Detalles: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
  
  // 4. Verificar configuración de red
  console.log('\n4️⃣ Información de red:');
  console.log(`   IP del servidor: 192.168.1.65:3000`);
  console.log(`   Protocolo: HTTP`);
  console.log(`   Timeout configurado: 5000ms`);
  
  console.log('\n✅ Diagnóstico completado');
}

// Ejecutar diagnóstico
diagnosticarConectividad().catch(console.error);
