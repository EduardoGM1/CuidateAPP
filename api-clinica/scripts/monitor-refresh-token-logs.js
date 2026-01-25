#!/usr/bin/env node

/**
 * Script para monitorear logs de refresh token en tiempo real
 * 
 * Uso:
 *   node scripts/monitor-refresh-token-logs.js
 * 
 * Este script monitorea los logs del backend relacionados con refresh tokens
 * y muestra mensajes relevantes en tiempo real con colores.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Palabras clave para filtrar logs relevantes
const keywords = [
  'refresh token',
  'refresh-token',
  'refreshToken',
  'REFRESH TOKEN',
  'MOBILE REFRESH',
  'token renovado',
  'token expirado',
  '401',
  'expires',
  'expiresIn',
  'access token',
  'accessToken'
];

// Función para colorear mensajes según el tipo
function colorizeMessage(message) {
  if (message.includes('✅') || message.includes('exitosamente') || message.includes('success')) {
    return `${colors.green}${message}${colors.reset}`;
  }
  if (message.includes('⚠️') || message.includes('warn') || message.includes('advertencia')) {
    return `${colors.yellow}${message}${colors.reset}`;
  }
  if (message.includes('❌') || message.includes('error') || message.includes('fallo')) {
    return `${colors.red}${message}${colors.reset}`;
  }
  if (message.includes('🔄') || message.includes('renovando') || message.includes('refresh')) {
    return `${colors.cyan}${message}${colors.reset}`;
  }
  return message;
}

// Función para verificar si una línea contiene palabras clave relevantes
function isRelevant(line) {
  const lowerLine = line.toLowerCase();
  return keywords.some(keyword => lowerLine.includes(keyword.toLowerCase()));
}

// Función para monitorear archivo de log
function monitorLogFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`${colors.yellow}⚠️  Archivo de log no existe: ${filePath}${colors.reset}`);
    console.log(`${colors.cyan}📝 Los logs aparecerán aquí cuando se generen...${colors.reset}\n`);
    return;
  }

  console.log(`${colors.blue}📂 Monitoreando: ${filePath}${colors.reset}\n`);

  // Leer el archivo completo primero
  let lastSize = fs.statSync(filePath).size;
  let lastPosition = lastSize;

  // Leer las últimas 50 líneas al inicio
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    const relevantLines = lines
      .slice(-50)
      .filter(isRelevant)
      .slice(-10); // Mostrar solo las últimas 10 relevantes

    if (relevantLines.length > 0) {
      console.log(`${colors.cyan}📋 Últimas líneas relevantes:${colors.reset}`);
      relevantLines.forEach(line => {
        console.log(colorizeMessage(line));
      });
      console.log('');
    }
  } catch (error) {
    // Archivo vacío o error al leer, continuar
  }

  // Monitorear cambios en el archivo
  const watchInterval = setInterval(() => {
    try {
      const stats = fs.statSync(filePath);
      const currentSize = stats.size;

      if (currentSize > lastSize) {
        // Nuevo contenido agregado
        const stream = fs.createReadStream(filePath, {
          start: lastPosition,
          end: currentSize
        });

        let buffer = '';
        stream.on('data', (chunk) => {
          buffer += chunk.toString();
        });

        stream.on('end', () => {
          const newLines = buffer.split('\n').filter(line => line.trim());
          newLines.forEach(line => {
            if (isRelevant(line)) {
              const timestamp = new Date().toLocaleTimeString('es-ES');
              console.log(`${colors.magenta}[${timestamp}]${colors.reset} ${colorizeMessage(line)}`);
            }
          });
        });

        lastSize = currentSize;
        lastPosition = currentSize;
      }
    } catch (error) {
      // Archivo puede no existir aún o hubo un error
    }
  }, 500); // Verificar cada 500ms

  // Limpiar al salir
  process.on('SIGINT', () => {
    clearInterval(watchInterval);
    console.log(`\n${colors.yellow}👋 Monitoreo detenido${colors.reset}`);
    process.exit(0);
  });
}

// Función principal
function main() {
  console.log(`${colors.bright}${colors.cyan}
╔══════════════════════════════════════════════════════════════╗
║     🔍 Monitor de Refresh Token Logs - Backend              ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);

  console.log(`${colors.blue}ℹ️  Este script monitorea los logs relacionados con refresh tokens${colors.reset}`);
  console.log(`${colors.blue}ℹ️  Presiona Ctrl+C para detener el monitoreo${colors.reset}\n`);

  // Rutas de archivos de log
  const logsDir = path.join(__dirname, '..', 'logs');
  const combinedLog = path.join(logsDir, 'combined.log');
  const errorLog = path.join(logsDir, 'error.log');

  // Crear directorio de logs si no existe
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log(`${colors.yellow}📁 Directorio de logs creado: ${logsDir}${colors.reset}\n`);
  }

  // Monitorear ambos archivos de log
  monitorLogFile(combinedLog);
  monitorLogFile(errorLog);

  // También monitorear la consola si los logs se imprimen ahí
  console.log(`${colors.cyan}💡 Tip: Los logs también aparecen en la consola del servidor${colors.reset}`);
  console.log(`${colors.cyan}💡 Tip: Busca mensajes con prefijos [REFRESH TOKEN] o [MOBILE REFRESH]${colors.reset}\n`);
}

// Ejecutar
main();
