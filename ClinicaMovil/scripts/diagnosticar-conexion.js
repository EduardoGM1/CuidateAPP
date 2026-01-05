/**
 * Script de diagnóstico de conexión API
 * Ejecuta: node scripts/diagnosticar-conexion.js
 */

const axios = require('axios');

const configs = [
  { name: 'Localhost (adb reverse)', url: 'http://localhost:3000' },
  { name: 'Emulador Android', url: 'http://10.0.2.2:3000' },
  { name: 'Red Local (192.168.1.65)', url: 'http://192.168.1.65:3000' },
  { name: 'Red Local (192.168.1.100)', url: 'http://192.168.1.100:3000' },
];

async function testConnection(config) {
  try {
    console.log(`\n🔍 Probando: ${config.name}`);
    console.log(`   URL: ${config.url}`);
    
    const response = await axios.get(`${config.url}/api/mobile/config`, {
      timeout: 5000,
      validateStatus: () => true // Aceptar cualquier status
    });
    
    if (response.status === 200 || response.status === 401) {
      console.log(`   ✅ CONECTADO (Status: ${response.status})`);
      return { success: true, config };
    } else {
      console.log(`   ⚠️  Respuesta inesperada (Status: ${response.status})`);
      return { success: false, config, status: response.status };
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log(`   ❌ CONEXIÓN RECHAZADA - El servidor no está corriendo en este puerto`);
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      console.log(`   ❌ TIMEOUT - El servidor no responde`);
    } else if (error.code === 'ENOTFOUND') {
      console.log(`   ❌ HOST NO ENCONTRADO - Verifica la IP`);
    } else {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
    return { success: false, config, error: error.message, code: error.code };
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔧 DIAGNÓSTICO DE CONEXIÓN API');
  console.log('═══════════════════════════════════════════════════════════');
  
  const results = [];
  
  for (const config of configs) {
    const result = await testConnection(config);
    results.push(result);
  }
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 RESUMEN');
  console.log('═══════════════════════════════════════════════════════════');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  if (successful.length > 0) {
    console.log('\n✅ CONFIGURACIONES QUE FUNCIONAN:');
    successful.forEach(r => {
      console.log(`   - ${r.config.name}: ${r.config.url}`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ CONFIGURACIONES QUE NO FUNCIONAN:');
    failed.forEach(r => {
      console.log(`   - ${r.config.name}: ${r.config.url}`);
      if (r.code) {
        console.log(`     Error: ${r.code} - ${r.error}`);
      }
    });
  }
  
  if (successful.length === 0) {
    console.log('\n⚠️  ADVERTENCIAS:');
    console.log('   1. Verifica que el backend esté corriendo:');
    console.log('      cd api-clinica && npm start');
    console.log('   2. Para emulador Android, ejecuta:');
    console.log('      adb reverse tcp:3000 tcp:3000');
    console.log('   3. Para dispositivo físico, usa la IP de tu red local');
    console.log('      y asegúrate de que el firewall permita conexiones');
  }
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
}

main().catch(console.error);


