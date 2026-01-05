/**
 * @format
 */

import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import messaging from '@react-native-firebase/messaging';
import Logger from './src/services/logger';

// Verificar que el nombre de la app esté correctamente configurado
if (!appName) {
  console.error('❌ ERROR: appName no está definido en app.json');
  throw new Error('appName no está definido. Verifica app.json');
}

console.log('✅ Registrando componente:', appName);

// Handler para notificaciones push cuando la app está en BACKGROUND (segundo plano)
// Según documentación oficial: https://rnfirebase.io/messaging/usage#background-application-state
// DEBE estar en el archivo raíz (index.js) antes de registrar el componente
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  Logger.info('═══════════════════════════════════════════════════════════');
  Logger.info('📬 NOTIFICACIÓN PUSH RECIBIDA (App en BACKGROUND)');
  Logger.info('═══════════════════════════════════════════════════════════');
  Logger.info('📋 Información de la notificación:');
  Logger.info('   Estado: App en segundo plano');
  Logger.info('   From:', remoteMessage.from);
  
  if (remoteMessage.notification) {
    Logger.info('   Título:', remoteMessage.notification.title);
    Logger.info('   Cuerpo:', remoteMessage.notification.body);
    Logger.info('   ID de notificación:', remoteMessage.messageId);
  }
  
  if (remoteMessage.data && Object.keys(remoteMessage.data).length > 0) {
    Logger.info('   Datos adicionales:');
    Object.entries(remoteMessage.data).forEach(([key, value]) => {
      Logger.info(`     ${key}: ${value}`);
    });
  }
  
  Logger.info('═══════════════════════════════════════════════════════════');
  console.log('📬 Notificación completa (background):', JSON.stringify(remoteMessage, null, 2));
  Logger.info('═══════════════════════════════════════════════════════════');
  
  // Aquí puedes agregar lógica adicional para manejar la notificación
  // Por ejemplo, actualizar datos locales, sincronizar, etc.
});

// Registrar el componente principal
try {
  AppRegistry.registerComponent(appName, () => App);
  console.log(`✅ Componente "${appName}" registrado correctamente`);
} catch (error) {
  console.error('❌ ERROR al registrar componente:', error);
  console.error('Nombre de app esperado:', appName);
  throw error;
}