import api from './servicioApi';
import Logger from '../services/logger';

/**
 * Servicio para autenticación de pacientes con PIN
 */
class PacienteAuthService {
  /**
   * Configurar PIN para un paciente
   */
  async setupPIN(pacienteId, pin, deviceId) {
    try {
      Logger.info('PacienteAuthService: Configurando PIN', { 
        pacienteId,
        deviceId: deviceId?.substring(0, 10) + '...' // Solo mostrar parte del device ID
      });
      
      const response = await api.post('/paciente-auth/setup-pin', {
        id_paciente: pacienteId,
        pin: pin,
        device_id: deviceId
      });
      
      Logger.success('PacienteAuthService: PIN configurado exitosamente', { 
        pacienteId: response.data.data?.id_paciente,
        authId: response.data.data?.auth_id,
        pinId: response.data.data?.pin_id
      });
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'PIN configurado exitosamente'
      };
    } catch (error) {
      Logger.error('PacienteAuthService: Error configurando PIN', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Error al configurar PIN'
      };
    }
  }

  /**
   * Login con PIN
   */
  async loginWithPIN(pacienteId, pin, deviceId) {
    try {
      Logger.info('PacienteAuthService: Login con PIN', { 
        pacienteId,
        deviceId: deviceId?.substring(0, 10) + '...'
      });
      
      const response = await api.post('/paciente-auth/login-pin', {
        id_paciente: pacienteId,
        pin: pin,
        device_id: deviceId
      });
      
      Logger.success('PacienteAuthService: Login exitoso', { 
        pacienteId,
        auth_method: 'pin'
      });
      
      return {
        success: true,
        data: response.data,
        message: 'Login exitoso'
      };
    } catch (error) {
      Logger.error('PacienteAuthService: Error en login', error);
      return {
        success: false,
        error: error.message || 'Error en login'
      };
    }
  }

  /**
   * Configurar autenticación biométrica
   */
  async setupBiometric(pacienteId, deviceId, publicKey, credentialId) {
    try {
      Logger.info('PacienteAuthService: Configurando biometría', { 
        pacienteId,
        deviceId: deviceId?.substring(0, 10) + '...'
      });
      
      const response = await api.post('/paciente-auth/setup-biometric', {
        id_paciente: pacienteId,
        device_id: deviceId,
        public_key: publicKey,
        credential_id: credentialId
      });
      
      Logger.success('PacienteAuthService: Biometría configurada exitosamente', { 
        pacienteId 
      });
      
      return {
        success: true,
        data: response.data,
        message: 'Biometría configurada exitosamente'
      };
    } catch (error) {
      Logger.error('PacienteAuthService: Error configurando biometría', error);
      return {
        success: false,
        error: error.message || 'Error al configurar biometría'
      };
    }
  }

  /**
   * Login con biometría
   */
  async loginWithBiometric(pacienteId, deviceId, signature, challenge) {
    try {
      Logger.info('PacienteAuthService: Login con biometría', { 
        pacienteId,
        deviceId: deviceId?.substring(0, 10) + '...'
      });
      
      const response = await api.post('/paciente-auth/login-biometric', {
        id_paciente: pacienteId,
        device_id: deviceId,
        signature: signature,
        challenge: challenge
      });
      
      Logger.success('PacienteAuthService: Login biométrico exitoso', { 
        pacienteId,
        auth_method: 'biometric'
      });
      
      return {
        success: true,
        data: response.data,
        message: 'Login biométrico exitoso'
      };
    } catch (error) {
      Logger.error('PacienteAuthService: Error en login biométrico', error);
      return {
        success: false,
        error: error.message || 'Error en login biométrico'
      };
    }
  }

  /**
   * Generar device ID único
   */
  generateDeviceId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `device_${timestamp}_${random}`;
  }

  /**
   * Validar formato de PIN
   */
  validatePIN(pin) {
    if (!pin || typeof pin !== 'string') {
      return { valid: false, error: 'PIN es requerido' };
    }
    
    if (!/^\d{4}$/.test(pin)) {
      return { valid: false, error: 'PIN debe tener exactamente 4 dígitos' };
    }
    
    return { valid: true };
  }
}

export default new PacienteAuthService();
