#!/usr/bin/env node

/**
 * Script de inicio automático para desarrollo
 * Configura automáticamente IPs, puertos y conectividad
 */

import { execSync, spawn } from 'child_process';
import os from 'os';

// Función para obtener IP local
const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  
  return 'localhost';
};

// Función para configurar adb reverse
const setupAdbReverse = (port) => {
  try {
    console.log('📱 Configurando adb reverse...');
    execSync(`adb reverse tcp:${port} tcp:${port}`, { stdio: 'pipe' });
    console.log(`✅ adb reverse configurado: tcp:${port} -> tcp:${port}`);
    return true;
  } catch (error) {
    console.log('⚠️ adb reverse no disponible (emulador no conectado)');
    return false;
  }
};

// Función para verificar conectividad
const testConnectivity = (url) => {
  try {
    console.log(`🔍 Probando conectividad: ${url}`);
    execSync(`curl -s ${url}/health`, { stdio: 'pipe', timeout: 5000 });
    console.log(`✅ Servidor respondiendo en: ${url}`);
    return true;
  } catch (error) {
    console.log(`❌ Servidor no responde en: ${url}`);
    return false;
  }
};

// Función para iniciar servidor
const startServer = (port) => {
  console.log(`🚀 Iniciando servidor en puerto ${port}...`);
  
  const server = spawn('node', ['index.js'], {
    stdio: 'inherit',
    env: { ...process.env, PORT: port }
  });
  
  server.on('error', (error) => {
    console.error('❌ Error iniciando servidor:', error);
  });
  
  return server;
};

// Función principal
const startDevelopment = async () => {
  const localIP = getLocalIP();
  const port = 3000;
  
  console.log('🔧 Iniciando configuración de desarrollo...');
  console.log(`📍 IP Local: ${localIP}`);
  console.log(`🔌 Puerto: ${port}`);
  console.log(`🌐 URL Local: http://localhost:${port}`);
  console.log(`📱 URL Móvil: http://${localIP}:${port}`);
  
  // Configurar adb reverse
  const adbConfigured = setupAdbReverse(port);
  
  // Iniciar servidor
  const server = startServer(port);
  
  // Esperar un momento para que el servidor inicie
  setTimeout(() => {
    // Probar conectividad
    const localhostWorking = testConnectivity(`http://localhost:${port}`);
    const networkWorking = testConnectivity(`http://${localIP}:${port}`);
    
    console.log('\n📊 Estado de conectividad:');
    console.log(`   localhost:${port} - ${localhostWorking ? '✅' : '❌'}`);
    console.log(`   ${localIP}:${port} - ${networkWorking ? '✅' : '❌'}`);
    console.log(`   adb reverse - ${adbConfigured ? '✅' : '❌'}`);
    
    if (localhostWorking || networkWorking) {
      console.log('\n🎉 ¡Servidor listo para desarrollo!');
      console.log('\n📱 Para la app móvil:');
      if (adbConfigured) {
        console.log('   ✅ Usar: http://localhost:3000 (con adb reverse)');
      } else {
        console.log(`   ✅ Usar: http://${localIP}:3000 (red local)`);
      }
    } else {
      console.log('\n⚠️ Servidor no responde. Verificar configuración.');
    }
  }, 3000);
  
  // Manejar cierre del proceso
  process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando servidor...');
    server.kill();
    process.exit(0);
  });
};

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  startDevelopment().catch(console.error);
}

export { startDevelopment, getLocalIP, setupAdbReverse };




