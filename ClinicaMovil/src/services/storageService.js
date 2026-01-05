import AsyncStorage from '@react-native-async-storage/async-storage';
import EncryptedStorage from 'react-native-encrypted-storage';
import Logger from './logger';

// Claves para almacenamiento
const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  USER_ROLE: 'user_role',
  DEVICE_ID: 'device_id',
  REMEMBER_EMAIL: 'remember_email',
  PIN_CONFIGURED: 'pin_configured',
  BIOMETRIC_CONFIGURED: 'biometric_configured',
};

// Servicio de almacenamiento seguro
// Usa EncryptedStorage para datos sensibles y AsyncStorage para datos no sensibles
export const storageService = {
  // Guardar token de autenticación (DATOS SENSIBLES - usar cifrado)
  async saveAuthToken(token) {
    try {
      Logger.storage('save', 'auth_token');
      // Usar EncryptedStorage para tokens (datos sensibles)
      await EncryptedStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      
      // ✅ Guardar timestamp de cuándo se recibió el token (para período de gracia)
      const tokenReceivedAt = Date.now();
      await AsyncStorage.setItem('token_received_at', tokenReceivedAt.toString());
      
      Logger.success('Token de autenticación guardado (encriptado)', {
        timestamp: new Date(tokenReceivedAt).toISOString()
      });
      return true;
    } catch (error) {
      Logger.error('Error guardando token', error);
      // Fallback a AsyncStorage si EncryptedStorage falla (solo en desarrollo)
      if (__DEV__) {
        Logger.warn('Fallback a AsyncStorage para token (solo desarrollo)');
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
        await AsyncStorage.setItem('token_received_at', Date.now().toString());
      }
      return false;
    }
  },

  // Obtener token de autenticación
  async getAuthToken() {
    try {
      // Intentar obtener de EncryptedStorage primero
      const token = await EncryptedStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (token) return token;
      
      // Fallback a AsyncStorage para compatibilidad (migración)
      if (__DEV__) {
        return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      }
      return null;
    } catch (error) {
      Logger.error('Error obteniendo token', error);
      // Fallback a AsyncStorage si EncryptedStorage falla
      if (__DEV__) {
        return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      }
      return null;
    }
  },

  // ✅ Obtener timestamp de cuándo se recibió el token
  async getTokenReceivedAt() {
    try {
      const timestamp = await AsyncStorage.getItem('token_received_at');
      return timestamp ? parseInt(timestamp, 10) : null;
    } catch (error) {
      Logger.error('Error obteniendo timestamp del token', error);
      return null;
    }
  },

  // Guardar refresh token (DATOS SENSIBLES - usar cifrado)
  async saveRefreshToken(refreshToken) {
    try {
      await EncryptedStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      return true;
    } catch (error) {
      Logger.error('Error guardando refresh token', error);
      // Fallback a AsyncStorage si EncryptedStorage falla (solo en desarrollo)
      if (__DEV__) {
        await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      }
      return false;
    }
  },

  // Obtener refresh token
  async getRefreshToken() {
    try {
      const token = await EncryptedStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (token) return token;
      
      // Fallback a AsyncStorage para compatibilidad (migración)
      if (__DEV__) {
        return await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      }
      return null;
    } catch (error) {
      Logger.error('Error obteniendo refresh token', error);
      if (__DEV__) {
        return await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      }
      return null;
    }
  },

  // Guardar datos del usuario (DATOS SENSIBLES - usar cifrado)
  async saveUserData(userData) {
    try {
      // Cifrar datos del usuario antes de guardar
      const encryptedData = JSON.stringify(userData);
      await EncryptedStorage.setItem(STORAGE_KEYS.USER_DATA, encryptedData);
      Logger.debug('Datos de usuario guardados (encriptados)');
      return true;
    } catch (error) {
      Logger.error('Error guardando datos de usuario', error);
      // Fallback a AsyncStorage si EncryptedStorage falla (solo en desarrollo)
      if (__DEV__) {
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      }
      return false;
    }
  },

  // Obtener datos del usuario
  async getUserData() {
    try {
      const encryptedData = await EncryptedStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (encryptedData) {
        return JSON.parse(encryptedData);
      }
      
      // Fallback a AsyncStorage para compatibilidad (migración)
      if (__DEV__) {
        const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
        return userData ? JSON.parse(userData) : null;
      }
      return null;
    } catch (error) {
      Logger.error('Error obteniendo datos de usuario', error);
      if (__DEV__) {
        const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
        return userData ? JSON.parse(userData) : null;
      }
      return null;
    }
  },

  // Guardar rol del usuario
  async saveUserRole(role) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
      return true;
    } catch (error) {
      console.error('Error guardando rol:', error);
      return false;
    }
  },

  // Obtener rol del usuario
  async getUserRole() {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.USER_ROLE);
    } catch (error) {
      console.error('Error obteniendo rol:', error);
      return null;
    }
  },

  // Generar y guardar ID único del dispositivo
  async getOrCreateDeviceId() {
    try {
      let deviceId = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
      if (!deviceId) {
        // Generar ID único simple
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
      }
      return deviceId;
    } catch (error) {
      console.error('Error con device ID:', error);
      return `device_${Date.now()}`;
    }
  },

  // Marcar PIN como configurado
  async setPINConfigured(pacienteId) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PIN_CONFIGURED, pacienteId.toString());
      return true;
    } catch (error) {
      console.error('Error marcando PIN configurado:', error);
      return false;
    }
  },

  // Verificar si PIN está configurado
  async isPINConfigured(pacienteId) {
    try {
      const configuredId = await AsyncStorage.getItem(STORAGE_KEYS.PIN_CONFIGURED);
      return configuredId === pacienteId.toString();
    } catch (error) {
      console.error('Error verificando PIN:', error);
      return false;
    }
  },

  // Marcar biometría como configurada
  async setBiometricConfigured(pacienteId) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.BIOMETRIC_CONFIGURED, pacienteId.toString());
      return true;
    } catch (error) {
      console.error('Error marcando biometría configurada:', error);
      return false;
    }
  },

  // Verificar si biometría está configurada
  async isBiometricConfigured(pacienteId) {
    try {
      const configuredId = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_CONFIGURED);
      return configuredId === pacienteId.toString();
    } catch (error) {
      console.error('Error verificando biometría:', error);
      return false;
    }
  },

  // Limpiar todos los datos de autenticación (BORRADO SEGURO)
  async clearAuthData() {
    try {
      // Limpiar de EncryptedStorage (datos sensibles)
      try {
        await EncryptedStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        await EncryptedStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        await EncryptedStorage.removeItem(STORAGE_KEYS.USER_DATA);
      } catch (encryptedError) {
        Logger.warn('Error limpiando datos encriptados (puede ser normal si no existen)', encryptedError);
      }
      
      // Limpiar de AsyncStorage (datos no sensibles y fallback)
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.USER_ROLE,
        'token_received_at', // ✅ Limpiar timestamp del token
      ]);
      
      Logger.success('Datos de autenticación limpiados de forma segura');
      return true;
    } catch (error) {
      Logger.error('Error limpiando datos de auth', error);
      return false;
    }
  },

  // Guardar email para recordar
  async saveRememberedEmail(email) {
    try {
      Logger.storage('save', 'remember_email', email);
      await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_EMAIL, email);
      Logger.success('Email recordado guardado');
      return true;
    } catch (error) {
      Logger.error('Error guardando email recordado', error);
      return false;
    }
  },

  // Obtener email recordado
  async getRememberedEmail() {
    try {
      Logger.storage('get', 'remember_email');
      const email = await AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_EMAIL);
      if (email) {
        Logger.debug('Email recordado obtenido');
      } else {
        Logger.debug('No se encontró email recordado');
      }
      return email;
    } catch (error) {
      Logger.error('Error obteniendo email recordado', error);
      return null;
    }
  },

  // Eliminar email recordado
  async removeRememberedEmail() {
    try {
      Logger.storage('remove', 'remember_email');
      await AsyncStorage.removeItem(STORAGE_KEYS.REMEMBER_EMAIL);
      Logger.success('Email recordado eliminado');
      return true;
    } catch (error) {
      Logger.error('Error eliminando email recordado', error);
      return false;
    }
  },

  // Limpiar todos los datos
  async clearAllData() {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.error('Error limpiando todos los datos:', error);
      return false;
    }
  },

  // Métodos genéricos para almacenamiento (para uso con biometría y otros casos)
  async setItem(key, value) {
    try {
      // AsyncStorage solo acepta strings, convertir objetos/arrays a JSON
      let stringValue;
      if (typeof value === 'string') {
        stringValue = value;
      } else {
        // Convertir objetos, arrays, números, booleanos, null a JSON string
        stringValue = JSON.stringify(value);
      }
      await AsyncStorage.setItem(key, stringValue);
      return true;
    } catch (error) {
      console.error(`Error guardando ${key}:`, error);
      return false;
    }
  },

  async getItem(key) {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value === null) {
        return null;
      }
      
      // Intentar parsear como JSON, si falla retornar el string original
      try {
        return JSON.parse(value);
      } catch (parseError) {
        // Si no es JSON válido, retornar el string original
        return value;
      }
    } catch (error) {
      console.error(`Error obteniendo ${key}:`, error);
      return null;
    }
  },

  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error eliminando ${key}:`, error);
      return false;
    }
  },
};

export default storageService;
