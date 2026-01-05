#!/usr/bin/env node

/**
 * Script de configuración automática para el servidor API
 * Configura automáticamente la IP y puerto para desarrollo local
 */

import os from 'os';
import { execSync } from 'child_process';

// Función para obtener la IP local
const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Buscar IPv4, no interno, no loopback
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  
  return 'localhost';
};

// Función para verificar si el puerto está disponible
const isPortAvailable = (port) => {
  try {
    execSync(`netstat -an | findstr :${port}`, { stdio: 'pipe' });
    return false; // Si encuentra algo, el puerto está ocupado
  } catch (error) {
    return true; // Si no encuentra nada, el puerto está disponible
  }
};

// Función para encontrar un puerto disponible
const findAvailablePort = (startPort = 3000) => {
  let port = startPort;
  while (port < startPort + 100) {
    if (isPortAvailable(port)) {
      return port;
    }
    port++;
  }
  return startPort; // Si no encuentra ninguno, usar el original
};

// Función principal
const configureServer = () => {
  const localIP = getLocalIP();
  const port = findAvailablePort(3000);
  
  console.log('🔧 Configurando servidor API...');
  console.log(`📍 IP Local: ${localIP}`);
  console.log(`🔌 Puerto: ${port}`);
  console.log(`🌐 URL Local: http://${localIP}:${port}`);
  console.log(`📱 URL Móvil: http://${localIP}:${port}`);
  
  // Crear archivo de configuración temporal
  const config = {
    localIP,
    port,
    baseURL: `http://${localIP}:${port}`,
    mobileURL: `http://${localIP}:${port}`,
    timestamp: new Date().toISOString()
  };
  
  // Escribir configuración a archivo
  import fs from 'fs';
  fs.writeFileSync('./temp-api-config.json', JSON.stringify(config, null, 2));
  
  console.log('✅ Configuración guardada en temp-api-config.json');
  
  return config;
};

// Ejecutar configuración
if (import.meta.url === `file://${process.argv[1]}`) {
  configureServer();
}

export { configureServer, getLocalIP, findAvailablePort };




