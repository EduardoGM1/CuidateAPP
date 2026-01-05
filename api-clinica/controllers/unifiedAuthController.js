import UnifiedAuthService from '../services/unifiedAuthService.js';
import logger from '../utils/logger.js';
import auditoriaService from '../services/auditoriaService.js';

/**
 * Controlador unificado de autenticación
 * Reemplaza los controladores separados de auth.js y pacienteAuth.js
 */

/**
 * Login para Doctores y Administradores (email/password)
 * POST /api/auth/login-unified
 */
export const loginDoctorAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const ip_address = req.ip || req.connection.remoteAddress || null;
    const user_agent = req.get('User-Agent') || null;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email y contraseña son requeridos'
      });
    }

    logger.info('Iniciando login unificado Doctor/Admin', { email });

    // Buscar usuario
    const { Usuario } = await import('../models/associations.js');
    const usuario = await Usuario.findOne({
      where: { email: email.trim().toLowerCase(), activo: true }
    });

    if (!usuario) {
      // Registrar login fallido
      await auditoriaService.registrarLoginFallido(email, ip_address, user_agent, 'Usuario no encontrado');
      
      // Detectar accesos sospechosos
      const deteccion = await auditoriaService.detectarAccesosSospechosos(ip_address, user_agent);
      if (deteccion.esSospechoso) {
        await auditoriaService.registrarAccesoSospechoso(null, ip_address, user_agent, deteccion.sospechas[0].descripcion);
      }
      
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    // Validar rol
    if (!['Doctor', 'Admin'].includes(usuario.rol)) {
      return res.status(403).json({
        success: false,
        error: 'Este endpoint es solo para Doctores y Administradores'
      });
    }

    // Autenticar usando servicio unificado
    const result = await UnifiedAuthService.authenticate(
      usuario.rol,
      usuario.id_usuario,
      {
        method: 'password',
        credential: password
      }
    );

    // Actualizar último login
    await usuario.update({ ultimo_login: new Date() });

    // Registrar login exitoso
    await auditoriaService.registrarLoginExitoso(usuario.id_usuario, ip_address, user_agent);

    res.json(result);

  } catch (error) {
    logger.error('Error en login Doctor/Admin unificado', {
      error: error.message,
      code: error.code
    });

    if (error.code === 'ACCOUNT_LOCKED') {
      return res.status(423).json({
        success: false,
        error: error.message,
        locked_until: error.locked_until,
        minutes_remaining: error.minutes_remaining
      });
    }

    if (error.code === 'INVALID_CREDENTIAL') {
      // Registrar login fallido
      const ip_address = req.ip || req.connection.remoteAddress || null;
      const user_agent = req.get('User-Agent') || null;
      await auditoriaService.registrarLoginFallido(req.body.email, ip_address, user_agent, error.message);
      
      // Detectar accesos sospechosos
      const deteccion = await auditoriaService.detectarAccesosSospechosos(ip_address, user_agent);
      if (deteccion.esSospechoso) {
        await auditoriaService.registrarAccesoSospechoso(null, ip_address, user_agent, deteccion.sospechas[0].descripcion);
      }
      
      return res.status(401).json({
        success: false,
        error: error.message,
        attempts_remaining: error.attempts_remaining
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error en autenticación',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Login para Pacientes (PIN o biométrico)
 * POST /api/auth/login-paciente-unified
 * 
 * Soporta dos modos:
 * 1. Con id_paciente: Búsqueda rápida (backward compatibility)
 * 2. Solo con PIN: Búsqueda en todas las credenciales (nuevo método recomendado)
 */
export const loginPaciente = async (req, res) => {
  try {
    const { id_paciente, pin, device_id, signature, challenge, credential_id } = req.body;

    let method, credential, deviceId;

    // Determinar método de autenticación
    if (pin) {
      method = 'pin';
      credential = pin;
      deviceId = device_id; // Opcional ahora

      // Validar formato de PIN
      if (!/^\d{4}$/.test(pin)) {
        return res.status(400).json({
          success: false,
          error: 'El PIN debe tener exactamente 4 dígitos'
        });
      }
    } else if (signature && challenge) {
      method = 'biometric';
      credential = { signature, challenge };
      deviceId = credential_id || device_id;

      if (!deviceId) {
        return res.status(400).json({
          success: false,
          error: 'credential_id o device_id es requerido para autenticación biométrica'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Se requiere pin o (signature + challenge) para autenticación'
      });
    }

    const ip_address = req.ip || req.connection.remoteAddress || null;
    const user_agent = req.get('User-Agent') || null;

    // Si se proporciona id_paciente, usar método tradicional (más rápido)
    // SOLUCIÓN DEFENSIVA: Si el paciente no existe, intentar búsqueda global por PIN como fallback
    if (id_paciente && method === 'pin') {
      logger.info('Iniciando login unificado Paciente (con id_paciente)', { id_paciente });

      try {
        // Autenticar usando servicio unificado con id_paciente
        const result = await UnifiedAuthService.authenticate(
          'Paciente',
          parseInt(id_paciente),
          {
            method,
            credential,
            deviceId
          }
        );

        // Registrar login exitoso
        if (result.user?.id_paciente) {
          await auditoriaService.registrarLoginExitoso(result.user.id_usuario, ip_address, user_agent);
        }

        return res.json({
          success: true,
          ...result
        });
      } catch (authError) {
        // SOLUCIÓN DEFENSIVA: Si el error es "Paciente no encontrado", intentar búsqueda global por PIN
        if (authError.message?.includes('Paciente no encontrado') || authError.message?.includes('no encontrado o inactivo')) {
          logger.warn('Paciente con id_paciente no encontrado, intentando búsqueda global por PIN', {
            id_paciente,
            fallback: 'búsqueda global por PIN'
          });

          try {
            // Intentar búsqueda global por PIN como fallback
            const result = await UnifiedAuthService.authenticate(
              'Paciente',
              null, // Sin id_paciente para búsqueda global
              {
                method,
                credential,
                deviceId
              }
            );

            // Registrar login exitoso con fallback
            if (result.user?.id_paciente) {
              await auditoriaService.registrarLoginExitoso(result.user.id_usuario, ip_address, user_agent);
              
              // Registrar en auditoría que se usó fallback
              await auditoriaService.registrarAccion({
                tipo_accion: 'login_exitoso', // Usar tipo existente
                entidad_afectada: 'acceso',
                id_entidad: result.user.id_paciente,
                descripcion: `Login exitoso con búsqueda global por PIN (id_paciente ${id_paciente} no existía - fallback usado)`,
                id_usuario: result.user.id_usuario,
                ip_address,
                user_agent,
                severidad: 'warning',
                datos_nuevos: {
                  fallback_used: true,
                  original_id_paciente: id_paciente,
                  actual_id_paciente: result.user.id_paciente
                }
              });
            }

            return res.json({
              success: true,
              ...result,
              fallback_used: true, // Indicar que se usó fallback
              warning: `El id_paciente ${id_paciente} no existe, se usó búsqueda global por PIN`
            });
          } catch (fallbackError) {
            // Si el fallback también falla, registrar ambos errores
            logger.error('Error en búsqueda global por PIN (fallback)', {
              id_paciente_original: id_paciente,
              error: fallbackError.message
            });
            await auditoriaService.registrarLoginFallido(`Paciente #${id_paciente}`, ip_address, user_agent, `Original: ${authError.message}, Fallback: ${fallbackError.message}`);
            throw authError; // Lanzar el error original
          }
        } else {
          // Para otros errores (PIN incorrecto, etc.), registrar y lanzar normalmente
          await auditoriaService.registrarLoginFallido(`Paciente #${id_paciente}`, ip_address, user_agent, authError.message);
          throw authError;
        }
      }
    }

    // Si NO se proporciona id_paciente, usar búsqueda global por PIN
    if (!id_paciente && method === 'pin') {
      logger.info('Iniciando login unificado Paciente (solo PIN - búsqueda global)');

      // Autenticar usando servicio unificado sin id_paciente (búsqueda global)
      const result = await UnifiedAuthService.authenticate(
        'Paciente',
        null, // Sin id_paciente para búsqueda global
        {
          method,
          credential,
          deviceId
        }
      );

      return res.json({
        success: true,
        ...result
      });
    }

    // Para biometría, id_paciente es requerido
    if (method === 'biometric' && !id_paciente) {
      return res.status(400).json({
        success: false,
        error: 'id_paciente es requerido para autenticación biométrica'
      });
    }

    // Autenticación biométrica (requiere id_paciente)
    logger.info('Iniciando login unificado Paciente (biométrico)', { id_paciente });
    const result = await UnifiedAuthService.authenticate(
      'Paciente',
      parseInt(id_paciente),
      {
        method,
        credential: credential.signature,
        deviceId,
        challenge: credential.challenge,
        signature: credential.signature,
        credentialId: deviceId
      }
    );

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    logger.error('Error en login Paciente unificado', {
      error: error.message,
      code: error.code,
      id_paciente: req.body.id_paciente
    });

    if (error.code === 'ACCOUNT_LOCKED') {
      return res.status(423).json({
        success: false,
        error: error.message,
        locked_until: error.locked_until,
        minutes_remaining: error.minutes_remaining
      });
    }

    if (error.code === 'INVALID_CREDENTIAL') {
      return res.status(401).json({
        success: false,
        error: error.message || 'PIN o credencial biométrica incorrecta',
        attempts_remaining: error.attempts_remaining
      });
    }

    // Error de credencial no encontrada
    if (error.message.includes('no encontrada') || error.message.includes('no encontrado')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error en autenticación',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Configurar PIN para paciente
 * POST /api/auth/setup-pin-unified
 */
export const setupPIN = async (req, res) => {
  try {
    const { id_paciente, pin, device_id, device_name, is_primary } = req.body;

    if (!id_paciente || !pin || !device_id) {
      return res.status(400).json({
        success: false,
        error: 'id_paciente, pin y device_id son requeridos'
      });
    }

    logger.info('Configurando PIN unificado', { id_paciente });

    const result = await UnifiedAuthService.setupCredential(
      'Paciente',
      parseInt(id_paciente),
      'pin',
      pin,
      {
        deviceId: device_id,
        deviceName: device_name,
        deviceType: 'mobile',
        isPrimary: is_primary || false
      }
    );

    res.status(201).json({
      success: true,
      message: 'PIN configurado exitosamente',
      ...result
    });

  } catch (error) {
    logger.error('Error configurando PIN unificado', {
      error: error.message,
      id_paciente: req.body.id_paciente
    });

    res.status(400).json({
      success: false,
      error: error.message || 'Error configurando PIN'
    });
  }
};

/**
 * Cambiar PIN de paciente (requiere autenticación y PIN actual)
 * PUT /api/auth-unified/change-pin
 */
export const changePIN = async (req, res) => {
  try {
    const { currentPin, newPin, device_id } = req.body;
    const userId = req.user?.id || req.user?.id_paciente || req.user?.id_usuario;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Autenticación requerida'
      });
    }

    if (!currentPin || !newPin || !device_id) {
      return res.status(400).json({
        success: false,
        error: 'currentPin, newPin y device_id son requeridos'
      });
    }

    logger.info('Cambiando PIN unificado', { userId });

    const result = await UnifiedAuthService.changePIN(
      parseInt(userId),
      currentPin,
      newPin,
      device_id
    );

    res.json({
      success: true,
      message: 'PIN cambiado exitosamente',
      ...result
    });

  } catch (error) {
    logger.error('Error cambiando PIN unificado', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(400).json({
      success: false,
      error: error.message || 'Error cambiando PIN'
    });
  }
};

/**
 * Configurar biometría para paciente
 * POST /api/auth/setup-biometric-unified
 */
export const setupBiometric = async (req, res) => {
  try {
    const {
      id_paciente,
      device_id,
      public_key,
      credential_id,
      biometric_type,
      device_name,
      is_primary
    } = req.body;

    if (!id_paciente || !public_key || !credential_id || !biometric_type) {
      return res.status(400).json({
        success: false,
        error: 'id_paciente, public_key, credential_id y biometric_type son requeridos'
      });
    }

    logger.info('Configurando biometría unificada', { id_paciente, biometric_type });

    const result = await UnifiedAuthService.setupCredential(
      'Paciente',
      parseInt(id_paciente),
      'biometric',
      public_key,
      {
        deviceId: device_id || credential_id,
        credentialId: credential_id,
        deviceName: device_name,
        deviceType: 'mobile',
        biometricType: biometric_type,
        isPrimary: is_primary || false
      }
    );

    // Generar challenge para verificación inmediata
    const challenge = `${Date.now()}_${Math.random().toString(36).substring(7)}`;

    res.status(201).json({
      success: true,
      message: 'Biometría configurada exitosamente',
      challenge,
      ...result
    });

  } catch (error) {
    logger.error('Error configurando biometría unificada', {
      error: error.message,
      id_paciente: req.body.id_paciente
    });

    res.status(400).json({
      success: false,
      error: error.message || 'Error configurando biometría'
    });
  }
};

/**
 * Configurar password para Doctor/Admin
 * POST /api/auth/setup-password-unified
 */
export const setupPassword = async (req, res) => {
  try {
    const { id_usuario, password, rol } = req.body;

    if (!id_usuario || !password || !rol) {
      return res.status(400).json({
        success: false,
        error: 'id_usuario, password y rol son requeridos'
      });
    }

    if (!['Doctor', 'Admin'].includes(rol)) {
      return res.status(400).json({
        success: false,
        error: 'Rol debe ser Doctor o Admin'
      });
    }

    logger.info('Configurando password unificado', { id_usuario, rol });

    const result = await UnifiedAuthService.setupCredential(
      rol,
      parseInt(id_usuario),
      'password',
      password,
      {
        isPrimary: true
      }
    );

    res.status(201).json({
      success: true,
      message: 'Contraseña configurada exitosamente',
      ...result
    });

  } catch (error) {
    logger.error('Error configurando password unificado', {
      error: error.message,
      id_usuario: req.body.id_usuario
    });

    res.status(400).json({
      success: false,
      error: error.message || 'Error configurando contraseña'
    });
  }
};

/**
 * Obtener credenciales de un usuario
 * GET /api/auth/credentials/:userType/:userId
 */
export const getUserCredentials = async (req, res) => {
  try {
    const { userType, userId } = req.params;

    if (!['Usuario', 'Paciente', 'Doctor', 'Admin'].includes(userType)) {
      return res.status(400).json({
        success: false,
        error: 'userType inválido'
      });
    }

    const credentials = await UnifiedAuthService.getUserCredentials(
      userType,
      parseInt(userId)
    );

    res.json({
      success: true,
      credentials,
      count: credentials.length
    });

  } catch (error) {
    logger.error('Error obteniendo credenciales', {
      error: error.message,
      params: req.params
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Error obteniendo credenciales'
    });
  }
};

/**
 * Eliminar credencial
 * DELETE /api/auth/credentials/:credentialId
 */
export const deleteCredential = async (req, res) => {
  try {
    const { credentialId } = req.params;

    const result = await UnifiedAuthService.deleteCredential(parseInt(credentialId));

    res.json({
      success: true,
      message: 'Credencial eliminada exitosamente',
      ...result
    });

  } catch (error) {
    logger.error('Error eliminando credencial', {
      error: error.message,
      credentialId: req.params.credentialId
    });

    res.status(400).json({
      success: false,
      error: error.message || 'Error eliminando credencial'
    });
  }
};

