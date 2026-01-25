#!/usr/bin/env node

/**
 * Script para probar la renovación de tokens
 * 
 * Uso:
 *   node scripts/test-refresh-token.js <email> <password>
 * 
 * Ejemplo:
 *   node scripts/test-refresh-token.js Doctor@clinica.com Doctor123!
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env') });

const API_URL = process.env.API_URL || 'http://localhost:3000/api';

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testRefreshToken(email, password) {
  try {
    log('\n╔══════════════════════════════════════════════════════════════╗', 'cyan');
    log('║     🔄 Prueba de Renovación de Tokens                        ║', 'cyan');
    log('╚══════════════════════════════════════════════════════════════╝\n', 'cyan');

    // Paso 1: Login inicial
    log('📝 Paso 1: Iniciando sesión...', 'blue');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email,
      password
    });

    if (!loginResponse.data.success) {
      log('❌ Error en login: ' + (loginResponse.data.error || 'Error desconocido'), 'red');
      return;
    }

    const { token: accessToken, refresh_token: refreshToken, expires_in, refresh_token_expires_in } = loginResponse.data;
    
    log('✅ Login exitoso', 'green');
    log(`   Access Token: ${accessToken.substring(0, 20)}...`, 'cyan');
    log(`   Refresh Token: ${refreshToken.substring(0, 20)}...`, 'cyan');
    log(`   Access Token expira en: ${expires_in}`, 'cyan');
    log(`   Refresh Token expira en: ${refresh_token_expires_in}\n`, 'cyan');

    // Decodificar el access token para ver su expiración
    try {
      const tokenParts = accessToken.split('.');
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      const expDate = new Date(payload.exp * 1000);
      const now = new Date();
      const timeUntilExpiry = Math.floor((expDate - now) / 1000 / 60);
      
      log(`   ⏰ Access Token expira en: ${timeUntilExpiry} minutos (${expDate.toLocaleTimeString('es-ES')})`, 'yellow');
    } catch (e) {
      log('   ⚠️  No se pudo decodificar el token', 'yellow');
    }

    // Paso 2: Esperar un momento
    log('\n⏳ Esperando 3 segundos antes de probar refresh...\n', 'yellow');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Paso 3: Probar refresh token
    log('📝 Paso 2: Probando renovación de token...', 'blue');
    
    try {
      const refreshResponse = await axios.post(`${API_URL}/mobile/refresh-token`, {
        refresh_token: refreshToken
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-Device-ID': 'test-device-refresh-token',
          'X-Platform': 'test'
        }
      });

      if (refreshResponse.data.success) {
        const { token: newAccessToken, refresh_token: newRefreshToken, expires_in: newExpiresIn } = refreshResponse.data;
        
        log('✅ Refresh token exitoso!', 'green');
        log(`   Nuevo Access Token: ${newAccessToken.substring(0, 20)}...`, 'cyan');
        log(`   Nuevo Refresh Token: ${newRefreshToken.substring(0, 20)}...`, 'cyan');
        log(`   Nuevo Access Token expira en: ${newExpiresIn}\n`, 'cyan');

        // Verificar que los tokens son diferentes (rotación)
        if (accessToken !== newAccessToken) {
          log('✅ Los tokens fueron rotados correctamente (son diferentes)', 'green');
        } else {
          log('⚠️  Los tokens son iguales (no hubo rotación)', 'yellow');
        }

        // Paso 4: Verificar que el nuevo token funciona
        log('\n📝 Paso 3: Verificando que el nuevo token funciona...', 'blue');
        
        try {
          // Intentar usar el nuevo token en un endpoint protegido
          const testResponse = await axios.get(`${API_URL}/mobile/config`, {
            headers: {
              'Authorization': `Bearer ${newAccessToken}`,
              'X-Device-ID': 'test-device-refresh-token',
              'X-Platform': 'test'
            }
          });

          log('✅ El nuevo token funciona correctamente!', 'green');
          log(`   Endpoint probado: /mobile/config`, 'cyan');
          log(`   Status: ${testResponse.status}\n`, 'cyan');

        } catch (testError) {
          if (testError.response?.status === 401) {
            log('❌ El nuevo token no es válido (401 Unauthorized)', 'red');
          } else {
            log(`⚠️  Error al probar el token: ${testError.message}`, 'yellow');
          }
        }

        log('\n✅ Prueba de renovación de tokens completada exitosamente!\n', 'green');

      } else {
        log('❌ Error en refresh token: ' + (refreshResponse.data.error || 'Error desconocido'), 'red');
        log('   Código: ' + (refreshResponse.data.code || 'N/A'), 'red');
      }

    } catch (refreshError) {
      log('❌ Error al renovar token:', 'red');
      if (refreshError.response) {
        log(`   Status: ${refreshError.response.status}`, 'red');
        log(`   Error: ${JSON.stringify(refreshError.response.data, null, 2)}`, 'red');
      } else {
        log(`   Error: ${refreshError.message}`, 'red');
      }
    }

  } catch (error) {
    log('❌ Error general:', 'red');
    if (error.response) {
      log(`   Status: ${error.response.status}`, 'red');
      log(`   Error: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    } else if (error.code === 'ECONNREFUSED') {
      log(`   Error: No se pudo conectar al servidor en ${API_URL}`, 'red');
      log(`   Verifica que el servidor esté corriendo en el puerto 3000`, 'yellow');
    } else {
      log(`   Error: ${error.message}`, 'red');
      log(`   Código: ${error.code || 'N/A'}`, 'red');
      if (error.stack) {
        log(`   Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`, 'yellow');
      }
    }
    process.exit(1);
  }
}

// Obtener argumentos de línea de comandos
const args = process.argv.slice(2);

if (args.length < 2) {
  log('❌ Uso: node scripts/test-refresh-token.js <email> <password>', 'red');
  log('   Ejemplo: node scripts/test-refresh-token.js Doctor@clinica.com Doctor123!', 'yellow');
  process.exit(1);
}

const [email, password] = args;

// Ejecutar prueba
testRefreshToken(email, password);
