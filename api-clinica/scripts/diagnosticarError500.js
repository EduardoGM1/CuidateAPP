// Script para diagnosticar el error 500 en dashboard administrativo
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

async function diagnosticarError500() {
  console.log('🔍 DIAGNÓSTICO DEL ERROR 500 EN DASHBOARD ADMINISTRATIVO');
  console.log('========================================================\n');
  
  try {
    // 1. Obtener token fresco
    console.log('1️⃣ Obteniendo token de autenticación...');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: 'admin@clinica.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log(`✅ Token obtenido: ${token.substring(0, 20)}...`);
    
    // 2. Probar endpoint de dashboard con token
    console.log('\n2️⃣ Probando endpoint de dashboard administrativo...');
    
    try {
      const dashboardResponse = await axios.get(`${API_BASE_URL}/api/dashboard/admin/summary`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Device-ID': 'mobile-device-123',
          'X-Platform': 'android',
          'X-App-Version': '1.0.0',
          'X-Client-Type': 'mobile'
        }
      });
      
      console.log(`✅ Dashboard exitoso: ${dashboardResponse.status}`);
      console.log('Respuesta:', JSON.stringify(dashboardResponse.data, null, 2));
      
    } catch (dashboardError) {
      console.log(`❌ Error en dashboard: ${dashboardError.response?.status}`);
      console.log('Mensaje:', dashboardError.response?.data?.message);
      console.log('Detalles completos:', JSON.stringify(dashboardError.response?.data, null, 2));
      
      // 3. Probar endpoints individuales
      console.log('\n3️⃣ Probando endpoints individuales...');
      
      // Probar métricas
      try {
        const metricsResponse = await axios.get(`${API_BASE_URL}/api/dashboard/admin/metrics`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Device-ID': 'mobile-device-123',
            'X-Platform': 'android',
            'X-App-Version': '1.0.0',
            'X-Client-Type': 'mobile'
          }
        });
        console.log(`✅ Métricas: ${metricsResponse.status}`);
      } catch (metricsError) {
        console.log(`❌ Error en métricas: ${metricsError.response?.status} - ${metricsError.response?.data?.message}`);
      }
      
      // Probar gráficos
      try {
        const chartsResponse = await axios.get(`${API_BASE_URL}/api/dashboard/admin/charts/citas`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Device-ID': 'mobile-device-123',
            'X-Platform': 'android',
            'X-App-Version': '1.0.0',
            'X-Client-Type': 'mobile'
          }
        });
        console.log(`✅ Gráficos: ${chartsResponse.status}`);
      } catch (chartsError) {
        console.log(`❌ Error en gráficos: ${chartsError.response?.status} - ${chartsError.response?.data?.message}`);
      }
      
      // Probar alertas
      try {
        const alertsResponse = await axios.get(`${API_BASE_URL}/api/dashboard/admin/alerts`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Device-ID': 'mobile-device-123',
            'X-Platform': 'android',
            'X-App-Version': '1.0.0',
            'X-Client-Type': 'mobile'
          }
        });
        console.log(`✅ Alertas: ${alertsResponse.status}`);
      } catch (alertsError) {
        console.log(`❌ Error en alertas: ${alertsError.response?.status} - ${alertsError.response?.data?.message}`);
      }
    }
    
  } catch (error) {
    console.log(`❌ Error general: ${error.message}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

diagnosticarError500().catch(console.error);
