/**
 * Script para probar la conexión con Firebase y el envío de notificaciones
 * 
 * Uso: node scripts/test-firebase-connection.js <userId> [token]
 * 
 * Ejemplo:
 *   node scripts/test-firebase-connection.js 7
 *   node scripts/test-firebase-connection.js 7 "fcm_token_aqui"
 */

import dotenv from 'dotenv';
import pushNotificationService from '../services/pushNotificationService.js';

dotenv.config();

async function testFirebaseConnection() {
  console.log('🧪 Prueba de Conexión con Firebase\n');
  console.log('='.repeat(60));

  // Verificar inicialización de Firebase
  console.log('\n1️⃣ Verificando inicialización de Firebase...');
  await pushNotificationService.initializeFCM();
  
  const isInitialized = pushNotificationService.fcmInitialized;
  console.log(`   Estado: ${isInitialized ? '✅ Inicializado' : '❌ No inicializado'}`);

  if (!isInitialized) {
    console.log('\n❌ Firebase no está inicializado. Verifica:');
    console.log('   - FIREBASE_SERVICE_ACCOUNT_KEY en .env');
    console.log('   - FIREBASE_PROJECT_ID en .env');
    return;
  }

  // Verificar variables de entorno
  console.log('\n2️⃣ Verificando variables de entorno...');
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  
  console.log(`   FIREBASE_SERVICE_ACCOUNT_KEY: ${serviceAccountKey ? '✅ Definido (' + serviceAccountKey.length + ' chars)' : '❌ No definido'}`);
  console.log(`   FIREBASE_PROJECT_ID: ${projectId || '❌ No definido'}`);

  // Obtener argumentos de línea de comandos
  const userId = process.argv[2];
  const testToken = process.argv[3];

  if (!userId) {
    console.log('\n⚠️ Uso: node scripts/test-firebase-connection.js <userId> [token]');
    console.log('   Ejemplo: node scripts/test-firebase-connection.js 7');
    return;
  }

  console.log(`\n   Usuario ID: ${userId}`);
  if (testToken) {
    console.log(`   Token de prueba: ${testToken.substring(0, 30)}...`);
  }

  // Verificar tokens del usuario
  console.log('\n3️⃣ Verificando tokens del usuario...');
  const { Usuario } = await import('../models/associations.js');
  const user = await Usuario.findByPk(parseInt(userId));
  
  if (!user) {
    console.log(`   ❌ Usuario ${userId} no encontrado`);
    return;
  }

  const deviceTokens = user.device_tokens || [];
  console.log(`   Tokens registrados: ${deviceTokens.length}`);
  
  if (deviceTokens.length === 0) {
    console.log('\n⚠️ No hay tokens registrados para este usuario.');
    console.log('   Para registrar un token:');
    console.log('   1. Inicia sesión en la app móvil');
    console.log('   2. El token se registrará automáticamente');
    return;
  }

  deviceTokens.forEach((token, index) => {
    console.log(`   Token ${index + 1}:`);
    console.log(`     - Platform: ${token.platform}`);
    console.log(`     - Token: ${token.token?.substring(0, 40)}...`);
    console.log(`     - Activo: ${token.active ? '✅' : '❌'}`);
    console.log(`     - Tipo: ${token.token?.startsWith('fcm_temp_') ? 'Alternativo (no FCM real)' : 'FCM real'}`);
  });

  console.log(`\n4️⃣ Probando envío de notificación...`);
  const notification = {
    type: 'test',
    title: '🧪 Prueba de Conexión Firebase',
    message: 'Si ves esta notificación, Firebase está funcionando correctamente',
    data: {
      test: true,
      timestamp: Date.now(),
      testType: 'firebase_connection'
    }
  };

  try {
    console.log('\n📤 Enviando notificación...');
    const result = await pushNotificationService.sendPushNotification(parseInt(userId), notification);
    
    console.log('\n✅ Resultado:', {
      success: result.success,
      sent_to: result.sent_to,
      message: result.message,
      results: result.results ? result.results.length : 0
    });

    if (result.results && result.results.length > 0) {
      console.log('\n📊 Detalles por token:');
      result.results.forEach((r, index) => {
        console.log(`\n   Token ${index + 1}:`);
        console.log(`     - Preview: ${r.tokenPreview || r.token?.substring(0, 30) + '...'}`);
        console.log(`     - Método: ${r.method || r.result?.method || 'unknown'}`);
        console.log(`     - Éxito: ${r.success || !!r.result?.messageId ? '✅' : '❌'}`);
        if (r.result?.messageId) {
          console.log(`     - Message ID (Firebase): ${r.result.messageId}`);
          console.log(`     - Timestamp: ${r.result.timestamp}`);
        }
        if (r.error) {
          console.log(`     - Error: ${r.error}`);
          console.log(`     - Código: ${r.code || 'unknown'}`);
        }
        if (r.result && !r.result.messageId) {
          console.log(`     - Resultado: ${JSON.stringify(r.result).substring(0, 100)}...`);
        }
      });
    } else if (result.message) {
      console.log(`\n   Mensaje: ${result.message}`);
    }

    console.log('\n' + '='.repeat(60));
    if (result.success) {
      console.log('✅ Prueba completada - Notificación enviada');
    } else {
      console.log('⚠️ Prueba completada - No se pudo enviar notificación');
      console.log(`   Razón: ${result.message || 'Desconocido'}`);
    }
  } catch (error) {
    console.error('\n❌ Error en la prueba:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
  }
}

testFirebaseConnection().catch(console.error);

