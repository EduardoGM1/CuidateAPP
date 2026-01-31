/**
 * @format
 */

import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import Logger from './src/services/logger';

// Verificar que el nombre de la app esté correctamente configurado
if (!appName) {
  console.error('❌ ERROR: appName no está definido en app.json');
  throw new Error('appName no está definido. Verifica app.json');
}

console.log('✅ Registrando componente:', appName);

// Firebase Messaging: cargar de forma segura para no crashear si falla la config
try {
  const messaging = require('@react-native-firebase/messaging').default;
  if (messaging && typeof messaging === 'function') {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      Logger.info('📬 NOTIFICACIÓN PUSH (background)', remoteMessage?.notification?.title || '');
      if (remoteMessage?.data) Logger.info('   Datos:', remoteMessage.data);
    });
    console.log('✅ Firebase Messaging configurado');
  }
} catch (e) {
  console.warn('⚠️ Firebase Messaging no disponible (la app funciona sin push):', e?.message || e);
}

// Registrar el componente principal
try {
  AppRegistry.registerComponent(appName, () => App);
  console.log(`✅ Componente "${appName}" registrado correctamente`);
} catch (error) {
  console.error('❌ ERROR al registrar componente:', error);
  console.error('Nombre de app esperado:', appName);
  throw error;
}