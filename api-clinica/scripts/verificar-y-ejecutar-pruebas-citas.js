/**
 * Script que verifica el servidor y ejecuta las pruebas de citas
 * Ejecutar: node scripts/verificar-y-ejecutar-pruebas-citas.js
 */

import axios from 'axios';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const MAX_RETRIES = 10;
const RETRY_DELAY = 2000; // 2 segundos

async function verificarServidor() {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      await axios.get(`${API_BASE_URL}/api/health`, { timeout: 2000 });
      return true;
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        if (i < MAX_RETRIES - 1) {
          process.stdout.write(`\r⏳ Esperando servidor... (${i + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          continue;
        }
        return false;
      }
      // Si hay respuesta (aunque sea error), el servidor está corriendo
      return true;
    }
  }
  return false;
}

async function iniciarServidor() {
  console.log('\n🚀 Iniciando servidor...');
  const serverProcess = spawn('npm', ['start'], {
    cwd: path.join(__dirname, '..'),
    shell: true,
    stdio: 'inherit'
  });

  return new Promise((resolve, reject) => {
    serverProcess.on('error', reject);
    
    // Esperar a que el servidor esté listo
    setTimeout(async () => {
      const activo = await verificarServidor();
      if (activo) {
        console.log('\n✅ Servidor iniciado correctamente');
        resolve(serverProcess);
      } else {
        reject(new Error('Servidor no respondió después de iniciar'));
      }
    }, 5000);
  });
}

async function ejecutarPruebas() {
  console.log('\n🧪 Ejecutando pruebas de citas...\n');
  const testProcess = spawn('node', ['scripts/test-citas-estados-reprogramacion.js'], {
    cwd: path.join(__dirname, '..'),
    shell: true,
    stdio: 'inherit'
  });

  return new Promise((resolve, reject) => {
    testProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Pruebas fallaron con código ${code}`));
      }
    });
    testProcess.on('error', reject);
  });
}

async function main() {
  console.log('='.repeat(80));
  console.log('🔍 VERIFICACIÓN Y EJECUCIÓN DE PRUEBAS DE CITAS');
  console.log('='.repeat(80));

  // Verificar si el servidor está corriendo
  console.log('\n📡 Verificando servidor...');
  const servidorActivo = await verificarServidor();

  let serverProcess = null;

  if (!servidorActivo) {
    console.log('⚠️  Servidor no está corriendo.');
    console.log('💡 Opciones:');
    console.log('   1. Iniciar servidor manualmente: cd api-clinica && npm start');
    console.log('   2. Ejecutar pruebas directamente: npm run test:citas-estados');
    console.log('\n❌ Abortando. Por favor inicia el servidor primero.');
    process.exit(1);
  } else {
    console.log('✅ Servidor está activo');
  }

  // Ejecutar pruebas
  try {
    await ejecutarPruebas();
    console.log('\n✅ Todas las pruebas completadas');
  } catch (error) {
    console.error('\n❌ Error ejecutando pruebas:', error.message);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});

