/**
 * Script que inicia el servidor y ejecuta las pruebas
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

let serverProcess = null;

// Función para verificar si el servidor está listo
async function waitForServer(url, maxAttempts = 30) {
  const axios = (await import('axios')).default;
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await axios.get(`${url}/api/mobile/config`, {
        timeout: 2000
      });
      if (response.status === 200 || response.status === 401) {
        return true;
      }
    } catch (error) {
      // Continuar intentando
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}

// Función para iniciar el servidor
function startServer() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Iniciando servidor...\n');
    
    serverProcess = spawn('npm', ['start'], {
      cwd: projectRoot,
      shell: true,
      stdio: 'pipe'
    });
    
    let serverReady = false;
    
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      process.stdout.write(output);
      
      // Detectar cuando el servidor está listo
      if (output.includes('Server running') || 
          output.includes('listening on') || 
          output.includes('port 3000') ||
          output.includes('Puerto')) {
        if (!serverReady) {
          serverReady = true;
          console.log('\n✅ Servidor iniciado, esperando a que esté listo...\n');
          setTimeout(() => resolve(), 2000);
        }
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      process.stderr.write(output);
    });
    
    serverProcess.on('error', (error) => {
      console.error('❌ Error al iniciar servidor:', error);
      reject(error);
    });
    
    // Timeout de seguridad
    setTimeout(() => {
      if (!serverReady) {
        console.log('\n⚠️  Timeout esperando servidor, continuando...\n');
        resolve();
      }
    }, 15000);
  });
}

// Función para ejecutar las pruebas
async function runTests() {
  const { spawn } = await import('child_process');
  
  return new Promise((resolve) => {
    console.log('🧪 Ejecutando pruebas...\n');
    
    const testProcess = spawn('node', ['scripts/test-endpoints.js'], {
      cwd: projectRoot,
      shell: true,
      stdio: 'inherit'
    });
    
    testProcess.on('close', (code) => {
      resolve(code);
    });
  });
}

// Función para detener el servidor
function stopServer() {
  if (serverProcess) {
    console.log('\n🛑 Deteniendo servidor...\n');
    serverProcess.kill();
  }
}

// Función principal
async function main() {
  try {
    // Iniciar servidor
    await startServer();
    
    // Esperar a que el servidor esté listo
    console.log('⏳ Esperando a que el servidor esté listo...\n');
    const serverReady = await waitForServer('http://localhost:3000');
    
    if (!serverReady) {
      console.log('⚠️  No se pudo verificar que el servidor esté listo, pero continuando...\n');
    } else {
      console.log('✅ Servidor listo!\n');
    }
    
    // Ejecutar pruebas
    const exitCode = await runTests();
    
    // Detener servidor
    stopServer();
    
    process.exit(exitCode);
  } catch (error) {
    console.error('❌ Error:', error);
    stopServer();
    process.exit(1);
  }
}

// Manejar cierre del proceso
process.on('SIGINT', () => {
  stopServer();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopServer();
  process.exit(0);
});

// Ejecutar
main();

