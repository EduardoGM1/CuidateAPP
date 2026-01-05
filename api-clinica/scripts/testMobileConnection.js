// Script para probar conectividad desde la aplicación móvil
import axios from 'axios';

const API_BASE_URL = 'http://192.168.1.65:3000';

async function testConnection() {
  console.log('🔍 Probando conectividad desde aplicación móvil...\n');
  
  const urls = [
    'http://192.168.1.65:3000/health',
    'http://192.168.1.65:3000/api/dashboard/health',
    'http://192.168.1.65:3000/api/auth/login'
  ];
  
  for (const url of urls) {
    try {
      console.log(`📡 Probando: ${url}`);
      const response = await axios.get(url, { timeout: 5000 });
      console.log(`✅ Éxito: ${response.status} - ${response.data.message || 'OK'}`);
    } catch (error) {
      if (error.response) {
        console.log(`⚠️  Respuesta: ${error.response.status} - ${error.response.data.message || error.response.statusText}`);
      } else if (error.request) {
        console.log(`❌ Sin respuesta: ${error.message}`);
      } else {
        console.log(`❌ Error: ${error.message}`);
      }
    }
    console.log('---');
  }
}

testConnection();
