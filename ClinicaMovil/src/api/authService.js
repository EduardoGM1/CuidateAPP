import axios from 'axios';
import ReactNativeBiometrics from 'react-native-biometrics';
import Logger from '../services/logger';
import { getApiConfig } from '../config/apiConfig';
import { storageService } from '../services/storageService';

// Configuración dinámica de la API
let API_CONFIG = null;

// Función para inicializar la configuración
const initializeApiConfig = async () => {
  if (!API_CONFIG) {
    API_CONFIG = await getApiConfig();
    Logger.info('Auth API Config inicializada', { 
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout 
    });
  }
  return API_CONFIG;
};

// Función para crear cliente API dinámico
const createApiClient = async () => {
  const config = await initializeApiConfig();
  // IMPORTANTE: Agregar /api al baseURL para que coincida con las rutas del backend
  const baseURL = `${config.baseURL}/api`;
  
  if (__DEV__) {
    Logger.info('AuthService: Creando cliente API', { baseURL });
  }
  
  return axios.create({
    baseURL: baseURL,
    timeout: config.timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

// Headers específicos para móvil
const getMobileHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Device-ID': 'mobile-device-123', // TODO: Obtener ID real del dispositivo
  'X-Platform': 'android',
  'X-App-Version': '1.0.0',
  'X-Client-Type': 'mobile',
});

// Servicio de autenticación para pacientes
// ✅ MIGRADO a rutas unificadas (/auth-unified/*)
export const pacienteAuthService = {
  // Configurar PIN de 4 dígitos
  async setupPIN(pacienteId, pin, deviceId) {
    try {
      Logger.apiCall('POST', '/auth-unified/setup-pin', { pacienteId, deviceId });
      
      const apiClient = await createApiClient();
      const response = await apiClient.post('/auth-unified/setup-pin', {
        id_paciente: pacienteId,
        pin: pin,
        device_id: deviceId,
      }, {
        headers: getMobileHeaders(),
      });
      
      Logger.apiResponse('/auth-unified/setup-pin', response.status, 'PIN configurado exitosamente');
      return response.data;
    } catch (error) {
      Logger.error('Error configurando PIN', { pacienteId, error: error.message });
      throw this.handleError(error);
    }
  },

  // Cambiar PIN (requiere autenticación)
  async changePIN(currentPin, newPin, deviceId) {
    try {
      Logger.apiCall('PUT', '/auth-unified/change-pin', {});
      
      const apiClient = await createApiClient();
      const token = await storageService.getAuthToken();
      
      if (!token) {
        throw new Error('No hay token de autenticación disponible');
      }
      
      const response = await apiClient.put('/auth-unified/change-pin', {
        currentPin,
        newPin,
        device_id: deviceId,
      }, {
        headers: {
          ...getMobileHeaders(),
          'Authorization': `Bearer ${token}`,
        },
      });
      
      Logger.apiResponse('/auth-unified/change-pin', response.status, 'PIN cambiado exitosamente');
      return response.data;
    } catch (error) {
      Logger.error('Error cambiando PIN', { error: error.message });
      throw this.handleError(error);
    }
  },

  // Login con PIN
  // Ahora soporta dos modos:
  // 1. Con pacienteId: Búsqueda rápida (backward compatibility)
  // 2. Solo con PIN: Búsqueda global (nuevo método recomendado)
  async loginWithPIN(pacienteId, pin, deviceId) {
    try {
      Logger.apiCall('POST', '/auth-unified/login-paciente', { 
        pacienteId: pacienteId || 'none (búsqueda global)', 
        deviceId 
      });
      
      const apiClient = await createApiClient();
      
      // Construir body según si hay pacienteId o no
      const requestBody = {
        pin: pin,
        device_id: deviceId, // Opcional ahora
      };
      
      // Solo incluir id_paciente si se proporciona (modo backward compatibility)
      if (pacienteId) {
        requestBody.id_paciente = pacienteId;
      }
      
      const response = await apiClient.post('/auth-unified/login-paciente', requestBody, {
        headers: getMobileHeaders(),
      });
      
      Logger.apiResponse('/auth-unified/login-paciente', response.status, 'Login PIN exitoso');
      Logger.auth('login', 'paciente');
      
      // Normalizar respuesta para compatibilidad con código existente
      // El backend unificado retorna { success, token, user: {...} }
      // Necesitamos adaptarlo al formato esperado: { token, paciente: {...} }
      if (response.data && response.data.success) {
        return {
          ...response.data,
          paciente: response.data.user, // Mapear 'user' a 'paciente' para compatibilidad
          refresh_token: response.data.refresh_token || response.data.refreshToken,
        };
      }
      
      return response.data;
    } catch (error) {
      Logger.error('Error en login PIN', { 
        pacienteId: pacienteId || 'none', 
        error: error.message, 
        status: error.response?.status 
      });
      throw this.handleError(error);
    }
  },

  // Configurar biometría
  async setupBiometric(pacienteId, deviceId, publicKey, credentialId, biometricType = 'fingerprint') {
    try {
      Logger.apiCall('POST', '/auth-unified/setup-biometric', { pacienteId, deviceId, biometricType });
      
      const apiClient = await createApiClient();
      const response = await apiClient.post('/auth-unified/setup-biometric', {
        id_paciente: pacienteId,
        device_id: deviceId,
        public_key: publicKey,
        credential_id: credentialId,
        biometric_type: biometricType,
      }, {
        headers: getMobileHeaders(),
      });
      
      Logger.apiResponse('/auth-unified/setup-biometric', response.status, 'Biometría configurada exitosamente');
      return response.data;
    } catch (error) {
      Logger.error('Error configurando biometría', { pacienteId, error: error.message });
      throw this.handleError(error);
    }
  },

  // Login con biometría
  async loginWithBiometric(pacienteId, deviceId, signature, challenge, credentialId) {
    try {
      Logger.apiCall('POST', '/auth-unified/login-paciente', { pacienteId, deviceId });
      
      const apiClient = await createApiClient();
      const response = await apiClient.post('/auth-unified/login-paciente', {
        id_paciente: pacienteId,
        signature: signature,
        challenge: challenge,
        credential_id: credentialId || deviceId,
        device_id: deviceId,
      }, {
        headers: getMobileHeaders(),
      });
      
      Logger.apiResponse('/auth-unified/login-paciente', response.status, 'Login biométrico exitoso');
      
      // Normalizar respuesta para compatibilidad con código existente
      if (response.data && response.data.success) {
        return {
          ...response.data,
          paciente: response.data.user, // Mapear 'user' a 'paciente' para compatibilidad
          refresh_token: response.data.refresh_token || response.data.refreshToken,
        };
      }
      
      return response.data;
    } catch (error) {
      Logger.error('Error en login biométrico', { pacienteId, error: error.message });
      throw this.handleError(error);
    }
  },

  // Manejo de errores
  handleError(error) {
    if (error.response) {
      // Error del servidor
      const { status, data } = error.response;
      const errorObj = {
        type: 'server_error',
        status,
        message: data.error || data.message || 'Error del servidor',
        details: data,
        response: error.response
      };
      
      // Propagar campos útiles del response
      if (data.attempts_remaining !== undefined) {
        errorObj.attempts_remaining = data.attempts_remaining;
      }
      if (data.locked_until) {
        errorObj.locked_until = data.locked_until;
      }
      if (data.minutes_remaining !== undefined) {
        errorObj.minutes_remaining = data.minutes_remaining;
      }
      if (data.will_lock !== undefined) {
        errorObj.will_lock = data.will_lock;
      }
      
      // Crear error mejorado para throw
      const enhancedError = new Error(errorObj.message);
      Object.assign(enhancedError, errorObj);
      throw enhancedError;
    } else if (error.request) {
      // Error de conexión
      const connectionError = new Error('No se pudo conectar con el servidor');
      connectionError.type = 'connection_error';
      throw connectionError;
    } else {
      // Error de configuración
      const configError = new Error('Error de configuración');
      configError.type = 'config_error';
      throw configError;
    }
  },
};

// Servicio de autenticación para doctores
export const doctorAuthService = {
  // Login estándar con email y contraseña (usa /api/mobile/login - compatible con credenciales creadas)
  async login(email, password) {
    try {
      Logger.apiCall('POST', '/mobile/login', { email });
      
      const apiClient = await createApiClient();
      const response = await apiClient.post('/mobile/login', {
        email: email.trim().toLowerCase(),
        password: password,
      });
      
      Logger.apiResponse('/mobile/login', response.status, 'Login doctor/administrador exitoso');
      Logger.auth('login', 'doctor/administrador');
      return response.data;
    } catch (error) {
      Logger.error('Error en login doctor/administrador', { email, error: error.message, status: error.response?.status });
      throw this.handleError(error);
    }
  },

  // Registro de doctor
  async register(email, password, rol = 'Doctor') {
    try {
      const apiClient = await createApiClient();
      const response = await apiClient.post('/auth/register', {
        email: email,
        password: password,
        rol: rol,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Renovar token
  async refreshToken(refreshToken) {
    try {
      Logger.apiCall('POST', '/mobile/refresh-token', { hasRefreshToken: !!refreshToken });
      
      const apiClient = await createApiClient();
      const response = await apiClient.post('/mobile/refresh-token', {
        refresh_token: refreshToken,
      }, {
        headers: getMobileHeaders(),
      });
      
      Logger.apiResponse('/mobile/refresh-token', response.status, 'Token renovado exitosamente');
      return response.data;
    } catch (error) {
      Logger.error('Error en refreshToken', { 
        error: error.message, 
        status: error.response?.status,
        type: error.type,
        code: error.code
      });
      throw this.handleError(error);
    }
  },

  // Solicitar recuperación de contraseña
  async forgotPassword(email) {
    try {
      Logger.apiCall('POST', '/auth/forgot-password', { email });
      
      const apiClient = await createApiClient();
      const response = await apiClient.post('/auth/forgot-password', {
        email: email.trim().toLowerCase(),
      });
      
      Logger.apiResponse('/auth/forgot-password', response.status, 'Solicitud de recuperación enviada');
      return response.data;
    } catch (error) {
      Logger.error('Error solicitando recuperación de contraseña', { email, error: error.message });
      throw this.handleError(error);
    }
  },

  // Resetear contraseña con token
  async resetPassword(token, newPassword) {
    try {
      Logger.apiCall('POST', '/auth/reset-password', { token: token.substring(0, 10) + '...' });
      
      const apiClient = await createApiClient();
      const response = await apiClient.post('/auth/reset-password', {
        token,
        newPassword,
      });
      
      Logger.apiResponse('/auth/reset-password', response.status, 'Contraseña reseteada exitosamente');
      return response.data;
    } catch (error) {
      Logger.error('Error reseteando contraseña', { error: error.message });
      throw this.handleError(error);
    }
  },

  // Cambiar contraseña (requiere autenticación)
  async changePassword(currentPassword, newPassword) {
    try {
      Logger.apiCall('PUT', '/auth/change-password', {});
      
      const apiClient = await createApiClient();
      const token = await storageService.getAuthToken();
      
      if (!token) {
        throw new Error('No hay token de autenticación disponible. Por favor, inicia sesión nuevamente.');
      }
      
      const response = await apiClient.put('/auth/change-password', {
        currentPassword,
        newPassword,
      }, {
        headers: {
          ...getMobileHeaders(),
          'Authorization': `Bearer ${token}`,
        },
      });
      
      Logger.apiResponse('/auth/change-password', response.status, 'Contraseña cambiada exitosamente');
      return response.data;
    } catch (error) {
      Logger.error('Error cambiando contraseña', { error: error.message });
      throw this.handleError(error);
    }
  },

  // Manejo de errores
  handleError(error) {
    if (error.response) {
      const { status, data } = error.response;
      return {
        type: 'server_error',
        status,
        message: data.error || 'Error del servidor',
        details: data,
      };
    } else if (error.request) {
      return {
        type: 'connection_error',
        message: 'No se pudo conectar con el servidor',
      };
    } else {
      return {
        type: 'config_error',
        message: 'Error de configuración',
      };
    }
  },
};

// Servicio de biometría nativo (integración con react-native-biometrics)
export const biometricService = {
  // Instancia de ReactNativeBiometrics (singleton)
  rnBiometrics: null,

  // Inicializar instancia
  _getInstance() {
    if (!this.rnBiometrics) {
      this.rnBiometrics = new ReactNativeBiometrics();
    }
    return this.rnBiometrics;
  },

  // Verificar si biometría está disponible
  async isAvailable() {
    try {
      const rnBiometrics = this._getInstance();
      const { available, biometryType } = await rnBiometrics.isSensorAvailable();
      return {
        available,
        biometryType: biometryType || null, // 'FaceID', 'TouchID', 'Biometrics', etc.
      };
    } catch (error) {
      Logger.error('Error verificando disponibilidad de biometría', error);
      return { available: false, biometryType: null };
    }
  },

  // Crear par de claves RSA en Keychain/Keystore
  async createKeys() {
    try {
      const rnBiometrics = this._getInstance();
      const { publicKey } = await rnBiometrics.createKeys();
      
      // Almacenar credential_id (usaremos device_id como identificador único)
      const deviceId = await storageService.getOrCreateDeviceId();
      await storageService.setItem('biometric_credential_id', deviceId);
      await storageService.setItem('biometric_public_key', publicKey);
      
      Logger.info('Claves biométricas creadas exitosamente', {
        hasPublicKey: !!publicKey,
        deviceId: deviceId?.substring(0, 10) + '...'
      });
      
      return {
        success: true,
        publicKey,
        credentialId: deviceId,
      };
    } catch (error) {
      Logger.error('Error creando claves biométricas', error);
      throw error;
    }
  },

  // Obtener clave pública almacenada
  async getPublicKey() {
    try {
      const publicKey = await storageService.getItem('biometric_public_key');
      const credentialId = await storageService.getItem('biometric_credential_id');
      
      if (!publicKey || !credentialId) {
        return null;
      }
      
      return {
        publicKey,
        credentialId,
      };
    } catch (error) {
      Logger.error('Error obteniendo clave pública', error);
      return null;
    }
  },

  // Autenticar con biometría y firmar challenge
  async signChallenge(challenge) {
    try {
      const rnBiometrics = this._getInstance();
      const deviceId = await storageService.getOrCreateDeviceId();
      const promptMessage = 'Autentícate para continuar';
      
      const { success, signature } = await rnBiometrics.createSignature({
        promptMessage,
        payload: challenge,
      });
      
      if (!success || !signature) {
        throw new Error('Autenticación biométrica fallida');
      }
      
      Logger.info('Challenge firmado exitosamente con biometría');
      
      return {
        success: true,
        signature,
        credentialId: deviceId,
      };
    } catch (error) {
      Logger.error('Error firmando challenge con biometría', error);
      throw error;
    }
  },

  // Eliminar claves biométricas (si usuario desactiva biometría)
  async deleteKeys() {
    try {
      const rnBiometrics = this._getInstance();
      await rnBiometrics.deleteKeys();
      await storageService.removeItem('biometric_credential_id');
      await storageService.removeItem('biometric_public_key');
      
      Logger.info('Claves biométricas eliminadas');
      return { success: true };
    } catch (error) {
      Logger.error('Error eliminando claves biométricas', error);
      throw error;
    }
  },

  // Mapear tipo de biometría de React Native a nuestro ENUM
  mapBiometryType(rnType) {
    const mapping = {
      'FaceID': 'face',
      'TouchID': 'fingerprint',
      'Biometrics': 'fingerprint', // Android genérico
      'Fingerprint': 'fingerprint',
    };
    
    return mapping[rnType] || 'fingerprint';
  },
};

export default {
  pacienteAuthService,
  doctorAuthService,
  biometricService,
  createApiClient,
  getApiConfig: initializeApiConfig
};
