import React, { createContext, useContext, useReducer, useEffect } from 'react';
import Logger from '../services/logger';
import { clearPrivacyConsent } from '../utils/privacyConsent';
import { storageService } from '../services/storageService';
import sessionService from '../services/sessionService';

// Estados de autenticación
const AuthState = {
  LOADING: 'LOADING',
  AUTHENTICATED: 'AUTHENTICATED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
};

// Tipos de acciones
const AuthActionTypes = {
  SET_LOADING: 'SET_LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  SET_USER: 'SET_USER',
  CLEAR_AUTH: 'CLEAR_AUTH',
};

// Estado inicial
const initialState = {
  isLoading: true,
  isAuthenticated: false,
  user: null,
  userRole: null,
  token: null,
  refreshToken: null,
};

// Reducer de autenticación
const authReducer = (state, action) => {
  switch (action.type) {
    case AuthActionTypes.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };
    
    case AuthActionTypes.LOGIN_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload.user,
        userRole: action.payload.userRole,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
      };
    
    case AuthActionTypes.LOGOUT:
      return {
        ...initialState,
        isLoading: false,
      };
    
    case AuthActionTypes.SET_USER:
      return {
        ...state,
        user: action.payload,
      };
    
    case AuthActionTypes.CLEAR_AUTH:
      return {
        ...initialState,
        isLoading: false,
      };
    
    default:
      return state;
  }
};

// Contexto de autenticación
const AuthContext = createContext();

// Hook para usar el contexto de autenticación
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};

// Provider de autenticación
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Verificar autenticación al cargar la app
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      Logger.info('Verificando estado de autenticación');
      
      const token = await storageService.getAuthToken();
      const userData = await storageService.getUserData();
      const userRole = await storageService.getUserRole();
      const refreshToken = await storageService.getRefreshToken();

      if (token && userData && userRole) {
        // Normalizar userData para pacientes y doctores
        const normalizedUserData = {
          ...userData,
          id: userData.id || userData.id_paciente || userData.id_usuario,
          id_paciente: userData.id_paciente || userData.id,
          // Para doctores, incluir id_doctor si está disponible
          ...(userData.id_doctor && { id_doctor: userData.id_doctor }),
        };
        
        Logger.success('Usuario autenticado encontrado', { 
          userRole, 
          userId: normalizedUserData.id,
          hasIdPaciente: !!normalizedUserData.id_paciente
        });
        
        dispatch({
          type: AuthActionTypes.LOGIN_SUCCESS,
          payload: {
            user: normalizedUserData,
            userRole,
            token,
            refreshToken,
          },
        });

        // Registrar token de dispositivo si ya está disponible
        // Esto funciona para TODOS los dispositivos Android
        setTimeout(async () => {
          try {
            const pushTokenService = (await import('../services/pushTokenService.js')).default;
            const userId = normalizedUserData.id || normalizedUserData.id_usuario;
            
            // Guardar user_id en AsyncStorage para que localNotificationService pueda usarlo
            const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
            await AsyncStorage.setItem('user_id', userId.toString());
            
            // El token se registrará automáticamente cuando PushNotification lo obtenga
            Logger.info('User ID guardado para registro automático de token', { userId });
          } catch (error) {
            Logger.warn('Error preparando registro de token:', error);
          }
        }, 500);
      } else {
        Logger.info('No se encontró usuario autenticado');
        dispatch({ type: AuthActionTypes.CLEAR_AUTH });
      }
    } catch (error) {
      Logger.error('Error verificando autenticación', error);
      dispatch({ type: AuthActionTypes.CLEAR_AUTH });
    }
  };

  const login = async (userData, userRole, token, refreshToken = null) => {
    try {
      Logger.auth('login', userRole);
      
      // Normalizar userData antes de guardar
      const normalizedUserData = {
        ...userData,
        id: userData.id || userData.id_paciente || userData.id_usuario,
        id_paciente: userData.id_paciente || userData.id,
        // Para doctores, incluir id_doctor si está disponible
        ...(userData.id_doctor && { id_doctor: userData.id_doctor }),
      };
      
      Logger.debug('Guardando datos de usuario en login', {
        userId: normalizedUserData.id,
        idPaciente: normalizedUserData.id_paciente,
        nombre: normalizedUserData.nombre,
        nombreCompleto: normalizedUserData.nombre_completo,
        allKeys: Object.keys(normalizedUserData)
      });
      
      // Guardar datos en almacenamiento
      await storageService.saveAuthToken(token);
      await storageService.saveUserData(normalizedUserData);
      await storageService.saveUserRole(userRole);
      
      if (refreshToken) {
        await storageService.saveRefreshToken(refreshToken);
      }

      // Guardar user_id en AsyncStorage para que el token se registre automáticamente
      const userId = normalizedUserData.id || normalizedUserData.id_usuario;
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem('user_id', userId.toString());

      dispatch({
        type: AuthActionTypes.LOGIN_SUCCESS,
        payload: {
          user: normalizedUserData,
          userRole,
          token,
          refreshToken,
        },
      });

      sessionService.resetSessionExpiredHandling();

      Logger.success('Login exitoso', { 
        userRole, 
        userId: normalizedUserData.id,
        idPaciente: normalizedUserData.id_paciente,
        nombre: normalizedUserData.nombre
      });

      // Registrar token de dispositivo para notificaciones push
      // SOLUCIÓN PARA TODOS LOS DISPOSITIVOS ANDROID:
      // Las notificaciones push desde el servidor son más confiables que las locales programadas
      // Funciona mejor en Huawei, Xiaomi, Samsung y otros con optimización agresiva de batería
      setTimeout(async () => {
        try {
          const pushTokenService = (await import('../services/pushTokenService.js')).default;
          const pendingToken = await AsyncStorage.getItem('pending_push_token');
          
          if (pendingToken) {
            // Registrar token pendiente
            Logger.info('Registrando token pendiente encontrado', { userId, hasToken: !!pendingToken });
            await pushTokenService.registrarToken(userId, pendingToken);
            await AsyncStorage.removeItem('pending_push_token');
            Logger.success('Token pendiente registrado después del login');
            
            // Reconfigurar listeners después de registrar token (Firebase puede estar listo ahora)
            setTimeout(async () => {
              console.log('🔄 Reconfigurando listeners después de registrar token pendiente...');
              await pushTokenService.reconfigurarListeners();
            }, 3000);
          } else {
            // El token se registrará automáticamente cuando PushNotification lo obtenga
            // en el callback onRegister de localNotificationService
            // Pero también intentamos forzar la obtención del token y verificar si hay uno guardado
            
            Logger.info('No hay token pendiente, intentando obtener token existente o forzar obtención');
            
            // PRIORIDAD: Usar Firebase Messaging para obtener token FCM REAL
            // Nota: Si Firebase no está configurado, esto retornará null silenciosamente
            // y el sistema usará token alternativo automáticamente
            Logger.info('🔥 Intentando obtener token FCM REAL con Firebase Messaging...');
            
            // Primero intentar obtener token con Firebase Messaging (método principal)
            const tokenFCM = await pushTokenService.obtenerTokenFirebaseMessaging();
            if (tokenFCM) {
              Logger.success('✅ Token FCM REAL obtenido, registrándolo en el servidor...');
              await pushTokenService.registrarToken(userId, tokenFCM);
              
              // Reconfigurar listeners después de obtener token FCM (Firebase está listo)
              setTimeout(async () => {
                console.log('🔄 Reconfigurando listeners después de obtener token FCM...');
                await pushTokenService.reconfigurarListeners();
              }, 3000);
              
              return; // Token FCM real obtenido y registrado, salir
            }
            
            // Si Firebase Messaging no funcionó (o no está configurado), usar fallback
            // Esto es normal y esperado si Firebase no está completamente configurado
            Logger.info('📱 Usando token alternativo (Firebase no disponible o no configurado)');
            const tokenExistente = await pushTokenService.obtenerTokenDirecto();
            if (tokenExistente) {
              Logger.info('✅ Token existente encontrado, registrándolo...');
              await pushTokenService.registrarToken(userId, tokenExistente);
              return; // Token existente registrado, salir
            }
            
            // Si no hay token, forzar obtención con método híbrido
            Logger.info('Forzando obtención de token con método híbrido...');
            const exito = await pushTokenService.forzarObtencionToken();
            
            if (exito) {
              // Esperar un poco y verificar si se obtuvo
              setTimeout(async () => {
                // Verificar token pendiente primero (puede ser FCM real)
                const pendingToken = await AsyncStorage.getItem('pending_push_token');
                if (pendingToken) {
                  Logger.success('✅ Token pendiente encontrado, registrándolo...');
                  await pushTokenService.registrarToken(userId, pendingToken);
                  await AsyncStorage.removeItem('pending_push_token');
                  return;
                }
                
                // Verificar de nuevo si hay token en almacenamiento
                const tokenDespues = await pushTokenService.obtenerTokenDirecto();
                if (tokenDespues) {
                  Logger.success('✅ Token obtenido después de forzar obtención, registrándolo...');
                  await pushTokenService.registrarToken(userId, tokenDespues);
                } else {
                  Logger.warn('⚠️ Token aún no disponible. El callback onRegister se ejecutará cuando PushNotification lo obtenga.');
                }
              }, 3000); // Esperar 3 segundos más
            } else {
              Logger.error('❌ No se pudo obtener ningún token (ni FCM ni alternativo)');
            }
          }
        } catch (error) {
          Logger.error('Error registrando token de dispositivo al iniciar sesión:', error);
          // No bloquear el login si falla el registro del token
        }
      }, 1000); // Esperar 1 segundo para que PushNotification se configure
    } catch (error) {
      Logger.error('Error en login', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      Logger.auth('logout', state.userRole);
      
      // Limpiar token de dispositivo del servidor
      try {
        const pushTokenService = (await import('../services/pushTokenService.js')).default;
        await pushTokenService.limpiarToken();
        Logger.info('Token de dispositivo limpiado del servidor');
      } catch (error) {
        Logger.warn('Error limpiando token de dispositivo:', error);
        // No bloquear el logout si falla
      }
      
      // Limpiar almacenamiento
      await storageService.clearAuthData();
      await clearPrivacyConsent();
      
      dispatch({ type: AuthActionTypes.LOGOUT });
      
      Logger.success('Logout exitoso');
    } catch (error) {
      Logger.error('Error en logout', error);
    }
  };

  const updateUser = async (userData) => {
    try {
      await storageService.saveUserData(userData);
      
      dispatch({
        type: AuthActionTypes.SET_USER,
        payload: userData,
      });
      
      Logger.success('Usuario actualizado');
    } catch (error) {
      Logger.error('Error actualizando usuario', error);
    }
  };

  const setLoading = (loading) => {
    dispatch({
      type: AuthActionTypes.SET_LOADING,
      payload: loading,
    });
  };

  const value = {
    ...state,
    // Exponer userData como alias de user para compatibilidad
    userData: state.user,
    login,
    logout,
    updateUser,
    setLoading,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

