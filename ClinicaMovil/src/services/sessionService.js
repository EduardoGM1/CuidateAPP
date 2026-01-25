import { storageService } from './storageService';
import { doctorAuthService } from '../api/authService';
import Logger from './logger';
import { Alert } from 'react-native';

/**
 * Servicio centralizado para manejo de sesión y expiración de tokens
 * Implementa mejores prácticas:
 * - Renovación automática de tokens
 * - Notificación clara al usuario
 * - Limpieza de datos de autenticación
 * - Callbacks para integración con navegación
 */
class SessionService {
  constructor() {
    this.isRefreshing = false;
    this.failedQueue = [];
    this.onSessionExpiredCallback = null;
    this.onTokenRefreshedCallback = null;
    // ✅ Cache para evitar múltiples verificaciones simultáneas
    // Reducido a 10 segundos para tokens de corta duración (2 minutos)
    this.lastCheckTime = 0;
    this.lastCheckResult = null;
    this.CHECK_CACHE_DURATION = 10 * 1000; // 10 segundos de cache
    // ✅ Período de gracia para tokens nuevos (10 minutos)
    this.TOKEN_GRACE_PERIOD = 10 * 60 * 1000; // 10 minutos
  }

  /**
   * Registrar callback para cuando la sesión expire
   * @param {Function} callback - Función a ejecutar cuando expire la sesión
   */
  setOnSessionExpired(callback) {
    this.onSessionExpiredCallback = callback;
  }

  /**
   * Registrar callback para cuando el token se renueve exitosamente
   * @param {Function} callback - Función a ejecutar cuando se renueve el token
   */
  setOnTokenRefreshed(callback) {
    this.onTokenRefreshedCallback = callback;
  }

  /**
   * Intentar renovar el token automáticamente
   * @returns {Promise<string|null>} - Nuevo token o null si falla
   */
  async refreshToken() {
    // Evitar múltiples intentos simultáneos
    if (this.isRefreshing) {
      Logger.info('🔄 [REFRESH TOKEN] Renovación de token ya en progreso, esperando...');
      return new Promise((resolve) => {
        this.failedQueue.push(resolve);
      });
    }

    this.isRefreshing = true;

    try {
      Logger.info('🔄 [REFRESH TOKEN] Iniciando renovación automática de token...');
      
      const refreshToken = await storageService.getRefreshToken();
      
      if (!refreshToken) {
        Logger.warn('⚠️ [REFRESH TOKEN] No hay refresh token disponible, cerrando sesión');
        this.isRefreshing = false;
        this.processQueue(null);
        // Si no hay refresh token, la sesión ha expirado - cerrar sesión
        await this.handleSessionExpired();
        return null;
      }

      Logger.debug('🔄 [REFRESH TOKEN] Refresh token encontrado, enviando solicitud al servidor...');

      // Intentar renovar usando el servicio de autenticación
      // Nota: El endpoint de refresh puede variar según el tipo de usuario
      // Por ahora usamos el endpoint de doctor/admin, pero esto debería ser genérico
      const response = await doctorAuthService.refreshToken(refreshToken);
      
      // Verificar que la respuesta sea válida
      if (!response) {
        Logger.error('❌ [REFRESH TOKEN] No se recibió respuesta del servidor al renovar token');
        throw new Error('No se recibió respuesta del servidor');
      }

      Logger.debug('✅ [REFRESH TOKEN] Respuesta del servidor recibida', {
        hasToken: !!response.token,
        hasAccessToken: !!response.accessToken,
        hasData: !!response.data,
        hasRefreshToken: !!response.refresh_token,
        success: response.success,
        expiresIn: response.expires_in,
        keys: Object.keys(response)
      });

      // El backend puede devolver token o accessToken (según el formato de respuesta)
      // El endpoint /mobile/refresh-token devuelve: { success: true, token: ..., refresh_token: ... }
      const newToken = response.token || response.accessToken || response.data?.token || response.data?.accessToken;
      const newRefreshToken = response.refresh_token || response.refreshToken || response.data?.refresh_token || response.data?.refreshToken;
      
      if (newToken) {
        // Guardar nuevo token (esto también guardará el timestamp)
        await storageService.saveAuthToken(newToken);
        Logger.debug('✅ [REFRESH TOKEN] Nuevo access token guardado en storage');
        
        if (newRefreshToken) {
          await storageService.saveRefreshToken(newRefreshToken);
          Logger.debug('✅ [REFRESH TOKEN] Nuevo refresh token guardado en storage');
        }

        // ✅ Limpiar cache de verificación al renovar token
        this.lastCheckTime = 0;
        this.lastCheckResult = null;

        Logger.success('✅ [REFRESH TOKEN] Token renovado exitosamente', {
          expiresIn: response.expires_in || 'N/A',
          refreshTokenExpiresIn: response.refresh_token_expires_in || 'N/A'
        });
        
        // Notificar que el token fue renovado
        if (this.onTokenRefreshedCallback) {
          this.onTokenRefreshedCallback(newToken);
        }

        this.isRefreshing = false;
        this.processQueue(newToken);
        
        return newToken;
      } else {
        Logger.error('❌ [REFRESH TOKEN] Respuesta de refresh token inválida - no se recibió token', { 
          responseKeys: Object.keys(response),
          hasSuccess: !!response.success
        });
        throw new Error('No se recibió token en la respuesta del servidor');
      }
    } catch (error) {
      // Mejorar el logging de errores con manejo robusto
      const errorDetails = {
        error: error.message || 'Error desconocido',
        status: error.response?.status || error.status || undefined,
        statusText: error.response?.statusText || undefined,
        data: error.response?.data || error.data || undefined,
        code: error.code || undefined,
        type: error.type || undefined,
        isNetworkError: !error.response && !error.status,
        isAxiosError: error.isAxiosError || false,
        hasResponse: !!error.response
      };
      
      Logger.error('Error renovando token', errorDetails);

      this.isRefreshing = false;
      this.processQueue(null);
      
      // Determinar si es un error recuperable o definitivo
      // 401 = token inválido/expirado (definitivo)
      // 403 = acceso denegado (definitivo)
      // Errores de conexión = temporal, no cerrar sesión
      const isDefinitiveError = errorDetails.status === 401 || errorDetails.status === 403;
      const isConnectionError = errorDetails.type === 'connection_error' || errorDetails.isNetworkError;
      
      // Si es un error definitivo de autenticación, la sesión ha expirado
      if (isDefinitiveError) {
        Logger.warn('Error definitivo de autenticación, cerrando sesión', errorDetails);
        await this.handleSessionExpired();
      } else if (isConnectionError) {
        // Para errores de conexión, no cerrar sesión (puede ser temporal)
        Logger.warn('Error de conexión al renovar token, no cerrando sesión', errorDetails);
      } else if (!errorDetails.hasResponse) {
        // Si no hay respuesta, puede ser un error de red
        Logger.warn('Sin respuesta del servidor al renovar token, no cerrando sesión', errorDetails);
      } else {
        // Para otros errores (500, etc.), solo loguear pero no cerrar sesión
        Logger.warn('Error renovando token, pero no es crítico. Continuando con sesión actual.', errorDetails);
      }
      
      return null;
    }
  }

  /**
   * Procesar cola de requests esperando renovación
   * @param {string|null} newToken - Nuevo token o null si falló
   */
  processQueue(newToken) {
    this.failedQueue.forEach((resolve) => {
      resolve(newToken);
    });
    this.failedQueue = [];
  }

  /**
   * Manejar sesión expirada
   * - Limpiar datos de autenticación
   * - Notificar al usuario
   * - Ejecutar callback de expiración
   */
  async handleSessionExpired() {
    try {
      Logger.warn('Sesión expirada, limpiando datos de autenticación...');
      
      // Limpiar datos de autenticación
      await storageService.clearAuthData();
      
      // Mostrar alerta al usuario
      Alert.alert(
        'Sesión Expirada',
        'Tu sesión ha caducado por seguridad. Por favor, inicia sesión nuevamente.',
        [
          {
            text: 'Entendido',
            onPress: () => {
              // Ejecutar callback para redirigir al login
              if (this.onSessionExpiredCallback) {
                this.onSessionExpiredCallback();
              }
            }
          }
        ],
        { cancelable: false }
      );
      
      Logger.info('Sesión expirada manejada correctamente');
    } catch (error) {
      Logger.error('Error manejando sesión expirada', error);
      
      // Aún así, ejecutar callback para asegurar redirección
      if (this.onSessionExpiredCallback) {
        this.onSessionExpiredCallback();
      }
    }
  }

  /**
   * Verificar si el token está próximo a expirar
   * @param {string} token - Token JWT
   * @returns {boolean} - true si está próximo a expirar
   */
  isTokenNearExpiry(token) {
    try {
      if (!token) return true;
      
      // Decodificar JWT (sin verificar firma, solo para leer exp)
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      
      // Decodificar base64 usando Buffer (disponible en React Native)
      let payload;
      try {
        payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      } catch (decodeError) {
        Logger.warn('Error decodificando token JWT', decodeError);
        return true; // Si no se puede decodificar, asumir que está próximo a expirar
      }
      
      const exp = payload.exp * 1000; // Convertir a milisegundos
      const now = Date.now();
      const timeUntilExpiry = exp - now;
      
      // ✅ Renovar si falta menos de 1 minuto (60 segundos)
      // Esto asegura renovación proactiva antes de que expire
      const oneMinute = 60 * 1000;
      
      return timeUntilExpiry < oneMinute;
    } catch (error) {
      Logger.warn('Error verificando expiración de token', error);
      return true; // Si no se puede verificar, asumir que está próximo a expirar
    }
  }

  /**
   * Verificar si el token es muy nuevo (dentro del período de gracia)
   * @param {number} tokenReceivedAt - Timestamp de cuándo se recibió el token
   * @returns {boolean} - true si el token es muy nuevo
   */
  isTokenTooNew(tokenReceivedAt) {
    if (!tokenReceivedAt) return false;
    const now = Date.now();
    const age = now - tokenReceivedAt;
    return age < this.TOKEN_GRACE_PERIOD;
  }

  /**
   * Verificar y renovar token si es necesario (proactivo)
   * @param {boolean} forceCheck - Forzar verificación ignorando cache
   * @returns {Promise<boolean>} - true si el token es válido o fue renovado
   */
  async checkAndRefreshTokenIfNeeded(forceCheck = false) {
    try {
      // ✅ Usar cache para evitar verificaciones múltiples en corto tiempo
      // Pero si el token está próximo a expirar, verificar más frecuentemente
      const now = Date.now();
      const token = await storageService.getAuthToken();
      
      // Si hay token, verificar si está próximo a expirar antes de usar cache
      let shouldSkipCache = false;
      if (token) {
        const isNearExpiry = this.isTokenNearExpiry(token);
        const isExpired = this.isTokenExpired(token);
        // Si está próximo a expirar o ya expiró, no usar cache
        shouldSkipCache = isNearExpiry || isExpired;
      }
      
      if (!forceCheck && !shouldSkipCache && this.lastCheckResult !== null && (now - this.lastCheckTime) < this.CHECK_CACHE_DURATION) {
        Logger.debug('Usando resultado cacheado de verificación de token', {
          cached: this.lastCheckResult,
          age: now - this.lastCheckTime
        });
        return this.lastCheckResult;
      }
      
      if (!token) {
        Logger.warn('No hay token disponible');
        this.lastCheckTime = now;
        this.lastCheckResult = false;
        return false;
      }

      // ✅ Verificar si el token es muy nuevo (período de gracia)
      const tokenReceivedAt = await storageService.getTokenReceivedAt();
      if (this.isTokenTooNew(tokenReceivedAt)) {
        const age = now - (tokenReceivedAt || 0);
        Logger.debug('Token muy nuevo, saltando verificación (período de gracia)', {
          ageMinutes: Math.floor(age / 60000),
          gracePeriodMinutes: this.TOKEN_GRACE_PERIOD / 60000
        });
        this.lastCheckTime = now;
        this.lastCheckResult = true;
        return true; // Token nuevo, no necesita renovación
      }

      // Verificar si el token está expirado o próximo a expirar
      const isNearExpiry = this.isTokenNearExpiry(token);
      const isExpired = this.isTokenExpired(token);
      
      if (isExpired) {
        Logger.warn('⚠️ [TOKEN CHECK] Token ya expirado, renovando inmediatamente...');
        const newToken = await this.refreshToken();
        const result = newToken !== null;
        this.lastCheckTime = now;
        this.lastCheckResult = result;
        return result;
      }
      
      if (isNearExpiry) {
        Logger.info('🔄 [TOKEN CHECK] Token próximo a expirar, renovando proactivamente...');
        const newToken = await this.refreshToken();
        const result = newToken !== null;
        this.lastCheckTime = now;
        this.lastCheckResult = result;
        return result;
      }

      // Token válido y no próximo a expirar
      this.lastCheckTime = now;
      this.lastCheckResult = true;
      return true;
    } catch (error) {
      Logger.error('Error verificando token', {
        error: error.message,
        stack: error.stack
      });
      // En caso de error, asumir que el token es válido para no bloquear requests
      // El interceptor de respuesta manejará el 401 si el token realmente está expirado
      this.lastCheckTime = Date.now();
      this.lastCheckResult = true;
      return true;
    }
  }

  /**
   * Verificar si el token ya expiró
   * @param {string} token - Token JWT
   * @returns {boolean} - true si el token expiró
   */
  isTokenExpired(token) {
    try {
      if (!token) return true;
      
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      
      let payload;
      try {
        payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      } catch (decodeError) {
        Logger.warn('Error decodificando token JWT para verificar expiración', decodeError);
        return true;
      }
      
      const exp = payload.exp * 1000; // Convertir a milisegundos
      const now = Date.now();
      
      // Token expirado si la fecha de expiración es menor o igual a ahora
      return exp <= now;
    } catch (error) {
      Logger.warn('Error verificando expiración de token', error);
      return true; // Si no se puede verificar, asumir que expiró
    }
  }
}

// Exportar instancia singleton
export default new SessionService();

