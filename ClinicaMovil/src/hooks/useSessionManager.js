import { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import sessionService from '../services/sessionService';
import Logger from '../services/logger';

/**
 * Hook para manejar la sesión y expiración de tokens
 * Integra sessionService con AuthContext y navegación
 * 
 * Uso:
 * ```jsx
 * function App() {
 *   useSessionManager();
 *   // ... resto del código
 * }
 * ```
 */
export const useSessionManager = () => {
  const navigation = useNavigation();
  const { logout, isAuthenticated } = useAuth();
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    // Configurar callback para cuando la sesión expire
    sessionService.setOnSessionExpired(async () => {
      Logger.info('Callback de sesión expirada ejecutado');
      setSessionExpired(true);
      
      // Cerrar sesión en el contexto de autenticación
      await logout();
      
      // Redirigir al login después de un breve delay
      setTimeout(() => {
        try {
          // Resetear el stack de navegación y ir al login
          navigation.reset({
            index: 0,
            routes: [{ name: 'PantallaInicioSesion' }],
          });
          Logger.success('Redirigido al login después de sesión expirada');
        } catch (navError) {
          Logger.error('Error redirigiendo al login', navError);
        }
      }, 500);
    });

    // Configurar callback para cuando el token se renueve
    sessionService.setOnTokenRefreshed((newToken) => {
      Logger.info('Token renovado exitosamente', { hasToken: !!newToken });
      // El token ya está guardado en storageService
      // No necesitamos hacer nada más aquí
    });

    // Verificar token periódicamente si el usuario está autenticado
    let intervalId = null;
    let initialCheckTimeout = null;
    
    if (isAuthenticated) {
      // ✅ Verificar cada 5 minutos si el token está próximo a expirar
      // Aumentado de 2 a 5 minutos para reducir carga
      intervalId = setInterval(async () => {
        try {
          Logger.debug('Verificación periódica de token iniciada');
          const isValid = await sessionService.checkAndRefreshTokenIfNeeded();
          if (!isValid) {
            Logger.warn('Token inválido detectado en verificación periódica');
          } else {
            Logger.debug('Token válido en verificación periódica');
          }
        } catch (error) {
          Logger.error('Error en verificación periódica de token', {
            error: error.message,
            stack: error.stack
          });
        }
      }, 5 * 60 * 1000); // ✅ 5 minutos para verificación periódica
      
      // ✅ Verificar después de un delay inicial (30 segundos)
      // Esto evita verificar tokens recién recibidos inmediatamente después del login
      initialCheckTimeout = setTimeout(async () => {
        try {
          Logger.debug('Verificación inicial de token después de delay');
          await sessionService.checkAndRefreshTokenIfNeeded();
        } catch (error) {
          Logger.error('Error en verificación inicial de token', error);
        }
      }, 30 * 1000); // ✅ 30 segundos de delay inicial
    }

    // Cleanup
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (initialCheckTimeout) {
        clearTimeout(initialCheckTimeout);
      }
    };
  }, [navigation, logout, isAuthenticated]);

  return {
    sessionExpired,
  };
};

export default useSessionManager;


