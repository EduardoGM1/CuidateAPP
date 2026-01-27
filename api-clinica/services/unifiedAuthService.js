import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Op } from 'sequelize';
import AuthCredential from '../models/AuthCredential.js';
import { Usuario, Paciente, Doctor } from '../models/associations.js';
import logger from '../utils/logger.js';

/**
 * Servicio unificado de autenticación
 * Maneja todos los métodos: password, pin, biometric
 */
class UnifiedAuthService {
  /**
   * Autentica un usuario usando cualquier método
   * @param {string} userType - 'Usuario', 'Paciente', 'Doctor', 'Admin'
   * @param {number} userId - ID del usuario (opcional para PIN si se busca en todas las credenciales)
   * @param {Object} authData - { method, credential, deviceId?, challenge?, signature?, credentialId? }
   * @returns {Object} { token, user, credential }
   */
  static async authenticate(userType, userId, authData) {
    const { method, credential, deviceId, challenge, signature, credentialId } = authData;

    logger.debug('Iniciando autenticación unificada', {
      userType,
      userId: userId || 'búsqueda global',
      method
    });

    // Para PIN sin userId: buscar en todas las credenciales activas
    if (method === 'pin' && !userId && userType === 'Paciente') {
      return await this.authenticateByPINOnly(credential, deviceId);
    }

    // Validar que el usuario existe y está activo
    // Nota: No pasamos transacción aquí porque authenticate no recibe transacción
    if (userId) {
      await this.validateUser(userType, userId);
    }

    // Construir condición de búsqueda
    const whereClause = {
      user_type: userType,
      user_id: userId,
      auth_method: method,
      activo: true
    };

    // Para PIN: primero intentar con device_id, si no encuentra, buscar sin device_id (credencial primaria)
    // Esto permite que un paciente pueda usar su PIN desde diferentes dispositivos
    let authRecord = null;
    
    if (method === 'pin') {
      if (deviceId) {
        // Primero intentar buscar con device_id específico
        whereClause.device_id = deviceId;
        authRecord = await AuthCredential.findOne({
          where: whereClause
        });
        
        if (authRecord) {
          logger.debug('Credencial PIN encontrada con device_id específico', { userId, deviceId });
        }
      }
      
      // Si no se encontró con device_id, buscar credencial primaria sin device_id
      if (!authRecord) {
        logger.debug('Buscando credencial PIN primaria sin device_id', { userId, deviceId });
        authRecord = await AuthCredential.findOne({
          where: {
            user_type: userType,
            user_id: userId,
            auth_method: method,
            activo: true,
            is_primary: true
          },
          order: [['created_at', 'DESC']] // Tomar la más reciente si hay múltiples primarias
        });
        
        if (authRecord) {
          logger.info('Credencial PIN encontrada (primaria) - permitiendo login desde nuevo dispositivo', {
            userId,
            requestedDeviceId: deviceId,
            storedDeviceId: authRecord.device_id
          });
        }
      }
    } else if (method === 'biometric') {
      // Para biometría, device_id es requerido
      if (!deviceId && !credentialId) {
        throw new Error('device_id o credential_id es requerido para autenticación biométrica');
      }
      whereClause.device_id = deviceId || credentialId;
      authRecord = await AuthCredential.findOne({
        where: whereClause
      });
    } else {
      // Para password, no requiere device_id
      authRecord = await AuthCredential.findOne({
        where: whereClause,
        order: [['is_primary', 'DESC'], ['created_at', 'DESC']]
      });
    }

    if (!authRecord) {
      logger.warn('Credencial no encontrada', { 
        userType, 
        userId, 
        method, 
        deviceId,
        searchedWithDeviceId: method === 'pin' && !!deviceId
      });
      throw new Error('Credencial no encontrada');
    }

    // Verificar bloqueo - TEMPORALMENTE DESHABILITADO PARA PRUEBAS
    // if (authRecord.locked_until && new Date() < authRecord.locked_until) {
    //   const minutesRemaining = Math.ceil((authRecord.locked_until - new Date()) / (1000 * 60));
    //   logger.warn('Cuenta bloqueada', {
    //     userType,
    //     userId,
    //     locked_until: authRecord.locked_until,
    //     minutesRemaining
    //   });
    //   throw {
    //     code: 'ACCOUNT_LOCKED',
    //     message: 'Cuenta temporalmente bloqueada',
    //     locked_until: authRecord.locked_until,
    //     minutes_remaining: minutesRemaining
    //   };
    // }
    
    // Desbloquear automáticamente si está bloqueado (solo para pruebas)
    if (authRecord.locked_until) {
      logger.debug('Desbloqueando cuenta automáticamente (modo pruebas)', {
        userType,
        userId,
        previousLock: authRecord.locked_until
      });
      await authRecord.update({
        locked_until: null,
        failed_attempts: 0
      });
    }

    // Validar según método
    let isValid = false;
    try {
      switch (method) {
        case 'password':
          if (!authRecord.credential_value) {
            logger.error('Credencial value es null o undefined', { userType, userId, method });
            throw new Error('Credencial no configurada correctamente');
          }
          isValid = await bcrypt.compare(credential, authRecord.credential_value);
          logger.debug('Resultado de comparación de contraseña', { 
            isValid, 
            credentialLength: credential?.length,
            hashLength: authRecord.credential_value?.length 
          });
          break;

        case 'pin':
          if (!authRecord.credential_value) {
            logger.error('Credencial PIN value es null o undefined', { userType, userId, method });
            throw new Error('Credencial PIN no configurada correctamente');
          }
          isValid = await bcrypt.compare(credential, authRecord.credential_value);
          logger.debug('Resultado de comparación de PIN', { 
            isValid, 
            pinLength: credential?.length,
            hashLength: authRecord.credential_value?.length,
            userId,
            credentialId: authRecord.id_credential
          });
          break;

        case 'biometric':
          isValid = await this.verifyBiometricSignature(
            signature,
            challenge,
            credentialId || deviceId,
            authRecord
          );
          break;

        default:
          throw new Error(`Método de autenticación no soportado: ${method}`);
      }
    } catch (error) {
      logger.error('Error validando credencial', { error: error.message, method });
      throw error;
    }

    if (!isValid) {
      // TEMPORALMENTE DESHABILITADO: No registrar intentos fallidos para pruebas
      // await this.handleFailedAttempt(authRecord);
      logger.warn('Credencial inválida (no se registra intento fallido en modo pruebas)', {
        userType,
        userId,
        method
      });
      throw {
        code: 'INVALID_CREDENTIAL',
        message: method === 'pin' ? 'PIN incorrecto' : 'Credencial inválida',
        attempts_remaining: 999 // Mostrar como ilimitados en modo pruebas
      };
    }

    // Autenticación exitosa - actualizar registro
    await authRecord.update({
      last_used: new Date(),
      failed_attempts: 0,
      locked_until: null
    });

    // Obtener datos del usuario
    const userData = await this.getUserData(userType, userId);

    // Generar tokens usando RefreshTokenService con tiempos según rol
    const RefreshTokenService = (await import('../services/refreshTokenService.js')).default;
    const tokenPair = await RefreshTokenService.generateTokenPair({
      id: userData.id_usuario || userId,
      email: userData.email || null,
      rol: userType === 'Paciente' ? 'Paciente' : (userType === 'Doctor' ? 'Doctor' : 'Admin'),
      ...(userData.id_paciente && { id_paciente: userData.id_paciente }),
      ...(userData.id_doctor && { id_doctor: userData.id_doctor })
    }, userType); // Pasar userType para diferenciar tiempos

    logger.info('Autenticación exitosa', {
      userType,
      userId,
      method
    });

    return {
      success: true,
      token: tokenPair.accessToken,
      refresh_token: tokenPair.refreshToken,
      expires_in: tokenPair.expiresIn,
      refresh_token_expires_in: tokenPair.refreshTokenExpiresIn,
      user: userData,
      credential: {
        method: authRecord.auth_method,
        is_primary: authRecord.is_primary,
        device_id: authRecord.device_id
      }
    };
  }

  /**
   * Configura una nueva credencial de autenticación
   * @param {string} userType
   * @param {number} userId
   * @param {string} method
   * @param {string|Object} credential
   * @param {Object} options
   */
  static async setupCredential(userType, userId, method, credential, options = {}, transaction = null) {
    const {
      deviceId,
      deviceName,
      deviceType = 'mobile',
      isPrimary = false,
      biometricType,
      credentialId
    } = options;

    logger.debug('Configurando credencial', {
      userType,
      userId,
      method,
      hasTransaction: !!transaction
    });

    // Validar que el usuario existe (pasar transacción si existe)
    await this.validateUser(userType, userId, transaction);

    // Validaciones específicas por método
    if (method === 'pin') {
      if (!/^\d{4}$/.test(credential)) {
        throw new Error('El PIN debe tener exactamente 4 dígitos');
      }

      // Validar PINs débiles
      const weakPINs = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321'];
      if (weakPINs.includes(credential)) {
        throw new Error('El PIN es demasiado débil. Elige un PIN más seguro');
      }

      // Verificar unicidad del PIN (solo para pacientes)
      if (userType === 'Paciente') {
        await this.validatePinUniqueness(credential, userId);
      }

      if (!deviceId) {
        throw new Error('device_id es requerido para configuración de PIN');
      }
    }

    if (method === 'biometric') {
      if (!credentialId && !deviceId) {
        throw new Error('credential_id o device_id es requerido para biométrica');
      }
      if (!biometricType || !['fingerprint', 'face', 'iris'].includes(biometricType)) {
        throw new Error('biometric_type inválido. Debe ser: fingerprint, face, o iris');
      }
      if (typeof credential !== 'string' || !credential.includes('BEGIN PUBLIC KEY')) {
        throw new Error('public_key debe ser una clave pública RSA en formato PEM');
      }
    }

    if (method === 'password') {
      if (typeof credential !== 'string' || credential.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }
    }

    // Preparar datos para crear credencial
    const credentialData = {
      user_type: userType,
      user_id: userId,
      auth_method: method,
      device_id: deviceId || credentialId || null,
      device_name: deviceName || null,
      device_type: deviceType,
      is_primary: isPrimary,
      activo: true
    };

    // Procesar según método
    switch (method) {
      case 'password':
        credentialData.credential_value = await bcrypt.hash(credential, 10);
        credentialData.credential_salt = null;
        break;

      case 'pin':
        credentialData.credential_value = await bcrypt.hash(credential, 10);
        credentialData.credential_salt = crypto.randomBytes(16).toString('hex');
        break;

      case 'biometric':
        credentialData.credential_value = credential; // Public key en PEM
        credentialData.credential_metadata = {
          biometric_type: biometricType,
          credential_id: credentialId || deviceId
        };
        break;
    }

    // Si es primaria, desactivar otras credenciales primarias del mismo método
    if (isPrimary) {
      await AuthCredential.update(
        { is_primary: false },
        {
          where: {
            user_type: userType,
            user_id: userId,
            auth_method: method,
            is_primary: true
          },
          ...(transaction && { transaction })
        }
      );
    }

    // Crear credencial
    const newCredential = await AuthCredential.create(credentialData, {
      ...(transaction && { transaction })
    });

    logger.info('Credencial configurada exitosamente', {
      userType,
      userId,
      method,
      credentialId: newCredential.id_credential
    });

    return {
      success: true,
      credential: {
        id: newCredential.id_credential,
        method: newCredential.auth_method,
        is_primary: newCredential.is_primary,
        device_id: newCredential.device_id
      }
    };
  }

  /**
   * Cambia el PIN de un paciente (requiere validar PIN actual)
   * @param {number} userId - ID del paciente
   * @param {string} currentPin - PIN actual
   * @param {string} newPin - Nuevo PIN
   * @param {string} deviceId - ID del dispositivo
   */
  static async changePIN(userId, currentPin, newPin, deviceId) {
    logger.info('Cambiando PIN', { userId });

    // Validar formato de PINs
    if (!/^\d{4}$/.test(currentPin)) {
      throw new Error('El PIN actual debe tener exactamente 4 dígitos');
    }

    if (!/^\d{4}$/.test(newPin)) {
      throw new Error('El nuevo PIN debe tener exactamente 4 dígitos');
    }

    // Validar que no sea el mismo PIN
    if (currentPin === newPin) {
      throw new Error('El nuevo PIN debe ser diferente al actual');
    }

    // Validar PINs débiles
    const weakPINs = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321'];
    if (weakPINs.includes(newPin)) {
      throw new Error('El PIN es demasiado débil. Elige un PIN más seguro');
    }

    // Validar que el usuario existe
    await this.validateUser('Paciente', userId);

    // Buscar credencial PIN actual
    const whereClause = {
      user_type: 'Paciente',
      user_id: userId,
      auth_method: 'pin',
      activo: true
    };

    // Si hay deviceId, buscar primero con deviceId
    let authRecord = null;
    if (deviceId) {
      authRecord = await AuthCredential.findOne({
        where: {
          ...whereClause,
          device_id: deviceId
        }
      });
    }

    // Si no se encontró con deviceId, buscar cualquier credencial PIN del paciente
    if (!authRecord) {
      authRecord = await AuthCredential.findOne({
        where: whereClause,
        order: [['is_primary', 'DESC'], ['created_at', 'DESC']]
      });
    }

    if (!authRecord) {
      throw new Error('PIN no configurado para este paciente');
    }

    // Validar PIN actual
    const isValidCurrentPin = await bcrypt.compare(currentPin, authRecord.credential_value);
    if (!isValidCurrentPin) {
      logger.warn('Intento de cambio de PIN con PIN actual incorrecto', { userId });
      throw new Error('PIN actual incorrecto');
    }

    // Verificar unicidad del nuevo PIN
    await this.validatePinUniqueness(newPin, userId);

    // Hashear nuevo PIN
    const newPinHash = await bcrypt.hash(newPin, 10);

    // Actualizar credencial
    await authRecord.update({
      credential_value: newPinHash,
      updated_at: new Date()
    });

    logger.info('PIN cambiado exitosamente', {
      userId,
      credentialId: authRecord.id_credential
    });

    return {
      success: true,
      message: 'PIN cambiado exitosamente',
      credential: {
        id: authRecord.id_credential,
        method: authRecord.auth_method,
        is_primary: authRecord.is_primary,
        device_id: authRecord.device_id
      }
    };
  }

  /**
   * Verifica firma biométrica RSA
   */
  static async verifyBiometricSignature(signature, challenge, credentialId, authRecord) {
    try {
      const publicKeyPEM = authRecord.credential_value;

      // Verificar que el challenge coincide (debe venir del backend)
      // Por ahora asumimos que viene validado

      const verify = crypto.createVerify('SHA256');
      verify.update(challenge, 'utf8');
      verify.end();

      const isValid = verify.verify(publicKeyPEM, signature, 'base64');

      if (isValid) {
        // Actualizar metadata con último challenge usado (opcional, para prevenir replay attacks)
        await authRecord.update({
          credential_metadata: {
            ...authRecord.credential_metadata,
            last_challenge: challenge,
            last_verified: new Date().toISOString()
          }
        });
      }

      return isValid;
    } catch (error) {
      logger.error('Error verificando firma biométrica', { error: error.message });
      return false;
    }
  }

  /**
   * Maneja intentos fallidos de autenticación
   * TEMPORALMENTE DESHABILITADO PARA PRUEBAS
   */
  static async handleFailedAttempt(authRecord) {
    // TEMPORALMENTE DESHABILITADO: No incrementar intentos fallidos ni bloquear
    logger.debug('Intento fallido ignorado (modo pruebas - bloqueo deshabilitado)', {
      credentialId: authRecord.id_credential
    });
    
    // No hacer nada - no incrementar intentos, no bloquear
    // await authRecord.update({
    //   failed_attempts: failedAttempts,
    //   locked_until: null
    // });
  }

  /**
   * Valida que el usuario existe y está activo
   * @param {string} userType - Tipo de usuario
   * @param {number} userId - ID del usuario
   * @param {Object} transaction - Transacción opcional de Sequelize
   */
  static async validateUser(userType, userId, transaction = null) {
    let user;
    const queryOptions = transaction ? { transaction } : {};

    switch (userType) {
      case 'Usuario':
        user = await Usuario.findByPk(userId, queryOptions);
        if (!user || !user.activo) {
          throw new Error('Usuario no encontrado o inactivo');
        }
        break;

      case 'Paciente':
        user = await Paciente.findByPk(userId, queryOptions);
        if (!user || !user.activo) {
          logger.error('Paciente no encontrado o inactivo', { 
            userType, 
            userId, 
            hasTransaction: !!transaction,
            pacienteExists: !!user,
            pacienteActivo: user?.activo 
          });
          throw new Error('Paciente no encontrado o inactivo');
        }
        break;

      case 'Doctor':
      case 'Admin':
        // Buscar en Usuario
        user = await Usuario.findOne({
          where: {
            id_usuario: userId,
            rol: userType === 'Doctor' ? 'Doctor' : 'Admin',
            activo: true
          },
          ...queryOptions
        });
        if (!user) {
          throw new Error(`${userType} no encontrado o inactivo`);
        }
        break;

      default:
        throw new Error(`Tipo de usuario no válido: ${userType}`);
    }

    return user;
  }

  /**
   * Obtiene datos del usuario según su tipo
   */
  static async getUserData(userType, userId) {
    switch (userType) {
      case 'Usuario':
        const usuario = await Usuario.findByPk(userId);
        return {
          id: usuario.id_usuario,
          email: usuario.email,
          rol: usuario.rol,
          tipo: 'Usuario'
        };

      case 'Paciente':
        const paciente = await Paciente.findByPk(userId, {
          attributes: [
            'id_paciente',
            'id_usuario',
            'nombre',
            'apellido_paterno',
            'apellido_materno',
            'fecha_nacimiento',
            'sexo',
            'curp',
            'direccion',
            'localidad',
            'numero_celular',
            'institucion_salud',
            'activo',
            'fecha_registro'
          ]
        });
        if (!paciente) {
          throw new Error('Paciente no encontrado');
        }
        const pacienteData = paciente.toJSON();
        return {
          id: pacienteData.id_paciente,
          id_paciente: pacienteData.id_paciente,
          id_usuario: pacienteData.id_usuario,
          nombre: pacienteData.nombre,
          apellido_paterno: pacienteData.apellido_paterno,
          apellido_materno: pacienteData.apellido_materno,
          nombre_completo: `${pacienteData.nombre} ${pacienteData.apellido_paterno || ''} ${pacienteData.apellido_materno || ''}`.trim(),
          fecha_nacimiento: pacienteData.fecha_nacimiento,
          sexo: pacienteData.sexo,
          curp: pacienteData.curp,
          direccion: pacienteData.direccion,
          localidad: pacienteData.localidad,
          numero_celular: pacienteData.numero_celular,
          institucion_salud: pacienteData.institucion_salud,
          activo: pacienteData.activo,
          fecha_registro: pacienteData.fecha_registro,
          tipo: 'Paciente',
          rol: 'Paciente' // Agregar rol para compatibilidad con middleware
        };

      case 'Doctor':
      case 'Admin':
        const usuario2 = await Usuario.findByPk(userId);
        if (!usuario2) {
          throw new Error(`${userType} no encontrado`);
        }
        return {
          id: usuario2.id_usuario,
          email: usuario2.email,
          rol: usuario2.rol,
          tipo: userType
        };

      default:
        throw new Error(`Tipo de usuario no válido: ${userType}`);
    }
  }

  /**
   * Autentica paciente usando solo PIN (sin id_paciente)
   * Busca el PIN en todas las credenciales activas de pacientes
   * @param {string} pin - PIN del paciente
   * @param {string} deviceId - ID del dispositivo (opcional)
   * @returns {Object} { token, user, credential }
   */
  static async authenticateByPINOnly(pin, deviceId) {
    logger.info('Buscando PIN en todas las credenciales activas', {
      pinLength: pin?.length,
      hasDeviceId: !!deviceId
    });

    // Obtener todas las credenciales PIN activas de pacientes
    const whereClause = {
      user_type: 'Paciente',
      auth_method: 'pin',
      activo: true
    };

    // Si hay device_id, intentar primero con device_id específico
    let credentials = [];
    if (deviceId) {
      credentials = await AuthCredential.findAll({
        where: {
          ...whereClause,
          device_id: deviceId
        },
        order: [['is_primary', 'DESC'], ['created_at', 'DESC']]
      });
    }

    // Si no se encontró con device_id o no se proporcionó, buscar todas las credenciales primarias
    if (credentials.length === 0) {
      credentials = await AuthCredential.findAll({
        where: {
          ...whereClause,
          is_primary: true
        },
        order: [['created_at', 'DESC']]
      });
      
      // Si aún no hay primarias, buscar todas las activas
      if (credentials.length === 0) {
        credentials = await AuthCredential.findAll({
          where: whereClause,
          order: [['created_at', 'DESC']]
        });
      }
    }

    logger.debug('Credenciales encontradas para comparación', {
      total: credentials.length,
      withDeviceId: deviceId ? credentials.filter(c => c.device_id === deviceId).length : 0
    });

    // Comparar el PIN contra todas las credenciales encontradas
    let matchedCredential = null;
    for (const cred of credentials) {
      if (!cred.credential_value) {
        continue;
      }
      
      const isMatch = await bcrypt.compare(pin, cred.credential_value);
      if (isMatch) {
        matchedCredential = cred;
        logger.info('PIN encontrado en credencial', {
          userId: cred.user_id,
          credentialId: cred.id_credential,
          deviceId: cred.device_id,
          isPrimary: cred.is_primary
        });
        break;
      }
    }

    if (!matchedCredential) {
      logger.warn('PIN no encontrado en ninguna credencial activa', {
        totalCredentialsChecked: credentials.length
      });
      throw {
        code: 'INVALID_CREDENTIAL',
        message: 'PIN incorrecto'
      };
    }

    // Verificar bloqueo de cuenta
    if (matchedCredential.locked_until && new Date() < matchedCredential.locked_until) {
      const minutesRemaining = Math.ceil((matchedCredential.locked_until - new Date()) / (1000 * 60));
      logger.warn('Cuenta bloqueada - intento de login con PIN', {
        userId: matchedCredential.user_id,
        lockedUntil: matchedCredential.locked_until,
        minutesRemaining
      });
      throw {
        code: 'ACCOUNT_LOCKED',
        message: 'Cuenta temporalmente bloqueada',
        locked_until: matchedCredential.locked_until,
        minutes_remaining: minutesRemaining
      };
    }

    // Desbloquear automáticamente si está bloqueado (solo para pruebas - remover en producción)
    if (matchedCredential.locked_until) {
      logger.debug('Desbloqueando cuenta automáticamente (modo pruebas)', {
        userId: matchedCredential.user_id
      });
      await matchedCredential.update({
        locked_until: null,
        failed_attempts: 0
      });
    }

    // Resetear intentos fallidos en login exitoso
    if (matchedCredential.failed_attempts > 0) {
      await matchedCredential.update({
        failed_attempts: 0,
        last_successful_login: new Date()
      });
    }

    // Obtener datos del paciente
    const paciente = await Paciente.findByPk(matchedCredential.user_id);
    if (!paciente || !paciente.activo) {
      logger.error('Paciente no encontrado o inactivo después de autenticación PIN', {
        userId: matchedCredential.user_id
      });
      throw new Error('Paciente no encontrado o inactivo');
    }

    // Obtener datos completos del usuario
    const userData = await this.getUserData('Paciente', matchedCredential.user_id);

    // Generar tokens usando RefreshTokenService para pacientes (7 días)
    const RefreshTokenService = (await import('../services/refreshTokenService.js')).default;
    const tokenPair = await RefreshTokenService.generateTokenPair({
      id: userData.id_usuario || matchedCredential.user_id,
      email: userData.email || null,
      rol: 'Paciente',
      id_paciente: userData.id_paciente || matchedCredential.user_id
    }, 'Paciente'); // Pasar 'Paciente' como userType para usar tiempos correctos (7 días)

    logger.info('Login PIN exitoso (búsqueda global)', {
      userId: matchedCredential.user_id,
      pacienteNombre: paciente.nombre
    });

    return {
      token: tokenPair.accessToken,
      refresh_token: tokenPair.refreshToken,
      expires_in: tokenPair.expiresIn,
      refresh_token_expires_in: tokenPair.refreshTokenExpiresIn,
      user: userData,
      credential: {
        id: matchedCredential.id_credential,
        method: matchedCredential.auth_method,
        device_id: matchedCredential.device_id,
        is_primary: matchedCredential.is_primary
      }
    };
  }

  /**
   * Valida que el PIN no esté en uso por otro paciente
   */
  static async validatePinUniqueness(pin, currentUserId) {
    const allPINRecords = await AuthCredential.findAll({
      where: {
        user_type: 'Paciente',
        auth_method: 'pin',
        activo: true,
        user_id: { [Op.ne]: currentUserId }
      }
    });

    for (const pinRecord of allPINRecords) {
      const isSamePIN = await bcrypt.compare(pin, pinRecord.credential_value);
      if (isSamePIN) {
        throw new Error('Este PIN ya está en uso por otro paciente. Elige un PIN diferente');
      }
    }
  }

  /**
   * Genera token JWT
   * @deprecated Usar RefreshTokenService.generateTokenPair() en su lugar
   */
  static generateToken(userType, userId, userData = {}) {
    const payload = {
      id: userId,
      user_type: userType,
      ...userData
    };

    // Tiempos según rol: Pacientes 7 días, Doctores 48 horas
    let expiresIn = '24h'; // Default
    if (userType === 'Paciente') {
      expiresIn = process.env.PATIENT_TOKEN_EXPIRES_IN || '7d';
    } else if (userType === 'Doctor' || userType === 'Admin') {
      expiresIn = process.env.DOCTOR_TOKEN_EXPIRES_IN || '48h';
    }

    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn
    });
  }

  /**
   * Elimina una credencial
   */
  static async deleteCredential(credentialId) {
    const credential = await AuthCredential.findByPk(credentialId);
    if (!credential) {
      throw new Error('Credencial no encontrada');
    }

    await credential.update({ activo: false });
    logger.info('Credencial eliminada', { credentialId });

    return { success: true };
  }

  /**
   * Obtiene todas las credenciales activas de un usuario
   */
  static async getUserCredentials(userType, userId) {
    const credentials = await AuthCredential.findAll({
      where: {
        user_type: userType,
        user_id: userId,
        activo: true
      },
      order: [['is_primary', 'DESC'], ['created_at', 'DESC']]
    });

    return credentials.map(cred => ({
      id: cred.id_credential,
      method: cred.auth_method,
      device_id: cred.device_id,
      device_name: cred.device_name,
      device_type: cred.device_type,
      is_primary: cred.is_primary,
      last_used: cred.last_used,
      created_at: cred.created_at
    }));
  }
}

export default UnifiedAuthService;

