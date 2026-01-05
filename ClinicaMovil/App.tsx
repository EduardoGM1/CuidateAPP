import React from 'react';

// Manejo inteligente de errores del debugger
// Nota: React Native 0.82+ con New Architecture tiene problemas conocidos con DevTools
// Estos errores de timeout son esperados y no afectan la funcionalidad de la app
if (__DEV__) {
  const originalError = console.error;
  console.error = (...args) => {
    const message = args[0]?.toString() || '';
    
    // Solo silenciar errores de timeout del debugger bridgeless que son conocidos y no críticos
    // Mantener visibles otros errores de debugger para facilitar troubleshooting
    const isNonCriticalBridgelessError = (
      message.includes('Failed to open debugger') &&
      message.includes('React Native Bridgeless') &&
      (message.includes('HeadersTimeoutError') || message.includes('UND_ERR_HEADERS_TIMEOUT'))
    );
    
    // También silenciar errores de dispositivo no registrado que son temporales
    const isDeviceRegistrationError = (
      message.includes('UNREGISTERED_DEVICE') ||
      message.includes('device that was not registered')
    );
    
    if (isNonCriticalBridgelessError || isDeviceRegistrationError) {
      // Estos errores son esperados con New Architecture y no son críticos
      // Puedes descomentar la siguiente línea para verlos si estás debuggeando DevTools:
      // originalError('[DevTools] Error silenciado (no crítico):', ...args);
      return;
    }
    
    originalError.apply(console, args);
  };
}

// Importar tests en desarrollo
if (__DEV__) {
  require('./src/utils/testPacienteInterface');
}
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar, View, Text, ActivityIndicator } from 'react-native';
import { store, persistor } from './src/store/store';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import NavegacionAuth from './src/navigation/NavegacionAuth';
import NavegacionProfesional from './src/navigation/NavegacionProfesional';
import NavegacionPaciente from './src/navigation/NavegacionPaciente';
import Logger from './src/services/logger';
import ErrorBoundary from './src/components/ErrorBoundary';
import firebaseInitService from './src/services/firebaseInitService';
import offlineService from './src/services/offlineService';
import { Platform, Alert } from 'react-native';
import { useSessionManager } from './src/hooks/useSessionManager';

// Componente de carga
const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' }}>
    <ActivityIndicator size="large" color="#1976D2" />
    <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>Cargando...</Text>
  </View>
);

// Componente principal de navegación
const AppNavigator = () => {
  const { isLoading, isAuthenticated, userRole } = useAuth();
  
  // Gestionar sesión y expiración de tokens
  useSessionManager();

  Logger.info('AppNavigator renderizado', { isLoading, isAuthenticated, userRole });

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    Logger.info('Usuario no autenticado, mostrando NavegacionAuth');
    return <NavegacionAuth />;
  }

  // Usuario autenticado - navegación según rol
  if (userRole === 'paciente') {
    Logger.info('Usuario autenticado como paciente, mostrando NavegacionPaciente');
    return <NavegacionPaciente />;
  } else if (userRole === 'Doctor' || userRole === 'doctor' || userRole === 'Admin' || userRole === 'admin' || userRole === 'administrador') {
    Logger.info('Usuario autenticado como doctor/admin, mostrando NavegacionProfesional');
    return <NavegacionProfesional />;
  }

  // Rol no reconocido
  Logger.warn('Rol no reconocido', { userRole });
  return <NavegacionAuth />;
};

const App = () => {
  // Inicializar servicios al iniciar la app
  React.useEffect(() => {
    // Inicializar servicio offline
    offlineService.initialize().catch((error) => {
      Logger.error('Error inicializando servicio offline:', error);
    });

    // Verificar que Firebase esté disponible al inicio de la app
    // Según documentación oficial: Firebase se inicializa automáticamente
    const checkFirebase = async () => {
      try {
        Logger.info('🔥 Verificando que Firebase esté disponible...');
        await firebaseInitService.initialize();
        Logger.success('✅ Firebase está disponible');
      } catch (error) {
        Logger.warn('⚠️ Firebase aún no está disponible (puede estar inicializándose):', error);
        // No bloquear la app, Firebase se inicializará automáticamente
      }
    };

    checkFirebase();

    // Solicitar permisos de notificaciones y micrófono al iniciar la app
    const requestNotificationPermissions = async () => {
      try {
        Logger.info('📱 Solicitando permisos de notificaciones al iniciar la app...');
        
        // Esperar un momento para que Firebase se inicialice
        await new Promise(resolve => setTimeout(resolve, 2000));

        if (Platform.OS === 'android') {
          // Android: Usar react-native-push-notification
          try {
            const PushNotification = require('react-native-push-notification').default;
            
            if (typeof PushNotification.requestPermissions === 'function') {
              const permissionsResult = PushNotification.requestPermissions();
              
              if (permissionsResult && typeof permissionsResult.then === 'function') {
                const permissions = await permissionsResult;
                Logger.info('✅ Permisos de notificación obtenidos (Android):', permissions);
                
                if (permissions.alert && permissions.badge && permissions.sound) {
                  Logger.success('✅ Todos los permisos de notificación otorgados');
                } else {
                  Logger.warn('⚠️ Algunos permisos de notificación no fueron otorgados:', permissions);
                }
              } else {
                // Verificar permisos existentes
                PushNotification.checkPermissions((checkResult: any) => {
                  Logger.info('📱 Estado de permisos (Android):', checkResult);
                });
              }
            } else {
              Logger.warn('⚠️ PushNotification.requestPermissions no está disponible');
            }
          } catch (error) {
            Logger.error('❌ Error solicitando permisos con PushNotification:', error);
          }
        }

        // También solicitar permisos con Firebase Messaging (funciona en iOS y Android)
        try {
          const messagingModule = await import('@react-native-firebase/messaging');
          const messaging = messagingModule.default;
          
          if (messaging && typeof messaging === 'function') {
            const messagingInstance = messaging();
            
            if (messagingInstance && typeof messagingInstance.requestPermission === 'function') {
              const authStatus = await messagingInstance.requestPermission();
              Logger.info('📱 Estado de permisos (Firebase Messaging):', { authStatus });
              
              // 0 = denied, 1 = authorized, 2 = provisional (iOS)
              const enabled = authStatus === 1 || authStatus === 2;
              
              if (enabled) {
                Logger.success('✅ Permisos de notificación otorgados (Firebase Messaging)');
              } else {
                Logger.warn('⚠️ Permisos de notificación no otorgados (Firebase Messaging)');
                
                // Mostrar alerta al usuario solo si es la primera vez
                if (Platform.OS === 'ios') {
                  Alert.alert(
                    'Permisos de Notificaciones',
                    'Para recibir notificaciones importantes, por favor activa los permisos de notificaciones en Configuración.',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { 
                        text: 'Ir a Configuración', 
                        onPress: () => {
                          // En iOS, no podemos abrir configuración directamente desde aquí
                          // El usuario debe ir manualmente
                          Logger.info('Usuario debe ir a Configuración manualmente');
                        }
                      }
                    ]
                  );
                }
              }
            }
          }
        } catch (error) {
          Logger.warn('⚠️ Error solicitando permisos con Firebase Messaging:', error);
          // No es crítico, continuar
        }
      } catch (error) {
        Logger.error('❌ Error general solicitando permisos de notificaciones:', error);
        // No bloquear la app si falla
      }
    };

    // Solicitar permiso de micrófono al iniciar la app
    const requestMicrophonePermission = async () => {
      try {
        Logger.info('🎤 Solicitando permiso de micrófono al iniciar la app...');
        
        // Esperar un momento para que la app se inicialice
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const permissionsService = await import('./src/services/permissionsService');
        const hasPermission = await permissionsService.default.requestMicrophonePermission();
        
        if (hasPermission) {
          Logger.success('✅ Permiso de micrófono otorgado');
        } else {
          Logger.warn('⚠️ Permiso de micrófono no otorgado');
        }
      } catch (error) {
        Logger.error('❌ Error solicitando permiso de micrófono:', error);
        // No bloquear la app si falla
      }
    };

    // Solicitar permisos después de un breve delay para que la app se inicialice
    setTimeout(() => {
      requestNotificationPermissions();
      requestMicrophonePermission();
    }, 3000);
  }, []);

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <PersistGate loading={<LoadingScreen />} persistor={persistor}>
          <PaperProvider>
            <AuthProvider>
              <NavigationContainer>
                <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
                <AppNavigator />
              </NavigationContainer>
            </AuthProvider>
          </PaperProvider>
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  );
};

export default App;