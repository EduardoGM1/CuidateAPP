/**
 * Script para obtener el token FCM de un usuario desde la base de datos
 * 
 * Uso: node scripts/obtener-token-fcm-usuario.js <userId>
 * 
 * Ejemplo:
 *   node scripts/obtener-token-fcm-usuario.js 7
 */

import dotenv from 'dotenv';
import { Usuario } from '../models/associations.js';

dotenv.config();

async function obtenerTokenFCM(userId) {
  try {
    console.log('🔍 Buscando token FCM para usuario ID:', userId);
    console.log('='.repeat(60));

    const user = await Usuario.findByPk(parseInt(userId));

    if (!user) {
      console.log(`❌ Usuario ${userId} no encontrado`);
      return;
    }

    const deviceTokens = user.device_tokens || [];

    if (deviceTokens.length === 0) {
      console.log('\n⚠️ No hay tokens registrados para este usuario.');
      console.log('\n📱 Para obtener el token FCM:');
      console.log('   1. Abre la app móvil');
      console.log('   2. Inicia sesión con este usuario');
      console.log('   3. El token se registrará automáticamente');
      console.log('   4. Vuelve a ejecutar este script para ver el token');
      console.log('\n📋 Alternativa: Revisa los logs de Metro/React Native');
      console.log('   Busca: "✅ Token FCM REAL obtenido exitosamente"');
      console.log('   El token aparecerá en los logs');
      return;
    }

    console.log(`\n✅ Tokens encontrados: ${deviceTokens.length}\n`);

    deviceTokens.forEach((token, index) => {
      console.log(`📱 Token ${index + 1}:`);
      console.log(`   Platform: ${token.platform}`);
      console.log(`   Token FCM: ${token.token}`);
      console.log(`   Activo: ${token.active ? '✅' : '❌'}`);
      console.log(`   Tipo: ${token.token?.startsWith('fcm_temp_') ? '⚠️ Alternativo (no FCM real)' : '✅ FCM real'}`);
      console.log(`   Registrado: ${token.registered_at || 'N/A'}`);
      console.log(`   Último uso: ${token.last_used || 'N/A'}`);
      console.log('');

      // Si es un token FCM real, mostrarlo destacado
      if (!token.token?.startsWith('fcm_temp_')) {
        console.log('   🔥 TOKEN FCM REAL PARA FIREBASE CONSOLE:');
        console.log(`   ${token.token}`);
        console.log('');
      }
    });

    // Mostrar solo tokens FCM reales
    const fcmRealTokens = deviceTokens.filter(t => !t.token?.startsWith('fcm_temp_') && t.active);
    
    if (fcmRealTokens.length > 0) {
      console.log('='.repeat(60));
      console.log('📋 TOKENS FCM REALES DISPONIBLES:');
      console.log('='.repeat(60));
      fcmRealTokens.forEach((token, index) => {
        console.log(`\nToken ${index + 1}:`);
        console.log(token.token);
      });
    } else {
      console.log('\n⚠️ No hay tokens FCM reales registrados.');
      console.log('   Los tokens encontrados son alternativos (fcm_temp_)');
      console.log('   Para obtener un token FCM real:');
      console.log('   1. Recompila la app: npm run android');
      console.log('   2. Inicia sesión en la app');
      console.log('   3. Verifica que Firebase se inicialice correctamente');
    }

  } catch (error) {
    console.error('❌ Error obteniendo token:', error.message);
    console.error(error.stack);
  }
}

const userId = process.argv[2];

if (!userId) {
  console.log('⚠️ Uso: node scripts/obtener-token-fcm-usuario.js <userId>');
  console.log('   Ejemplo: node scripts/obtener-token-fcm-usuario.js 7');
  process.exit(1);
}

obtenerTokenFCM(userId).then(() => {
  process.exit(0);
}).catch(error => {
  console.error(error);
  process.exit(1);
});


