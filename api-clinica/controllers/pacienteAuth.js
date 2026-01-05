/**
 * ⚠️ DEPRECATED: Este controlador usa tablas legacy que fueron eliminadas
 * Las tablas paciente_auth, paciente_auth_pin, paciente_auth_biometric fueron eliminadas
 * 
 * TODO: Migrar este controlador para usar AuthCredential y unifiedAuthService
 * Ver: controllers/unifiedAuthController.js y services/unifiedAuthService.js
 * 
 * Las rutas en routes/pacienteAuth.js están marcadas como legacy y deben migrarse
 * a /api/auth-unified/*
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Sequelize, Op } from 'sequelize';
import { Paciente } from '../models/associations.js';
// DEPRECATED: Tablas eliminadas - Estos imports fallarán
// TODO: Reemplazar con AuthCredential
// import { PacienteAuth, PacienteAuthPIN, PacienteAuthBiometric } from '../models/PacienteAuth.js';
import logger from '../utils/logger.js';

// Configurar PIN para paciente
export const setupPIN = async (req, res) => {
  try {
    logger.debug('Configurando PIN para paciente', {
      id_paciente: req.body.id_paciente,
      hasDeviceId: !!req.body.device_id
    });
    
    const { id_paciente, pin, device_id } = req.body;
    
    // Validaciones
    if (!id_paciente || !pin || !device_id) {
      return res.status(400).json({ 
        success: false,
        error: 'Faltan campos requeridos: id_paciente, pin, device_id' 
      });
    }

    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({ 
        success: false,
        error: 'El PIN debe tener exactamente 4 dígitos' 
      });
    }

    // Validar PINs débiles
    const weakPINs = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321'];
    if (weakPINs.includes(pin)) {
      return res.status(400).json({ 
        success: false,
        error: 'El PIN es demasiado débil. Elige un PIN más seguro' 
      });
    }
    
    // Validar que el paciente existe y está activo
    const paciente = await Paciente.findByPk(id_paciente);
    if (!paciente) {
      logger.error('Paciente no encontrado al configurar PIN', { id_paciente });
      return res.status(404).json({ 
        success: false,
        error: 'Paciente no encontrado' 
      });
    }

    if (!paciente.activo) {
      return res.status(403).json({ 
        success: false,
        error: 'El paciente está inactivo' 
      });
    }

    // Verificar que el PIN no esté en uso por otro paciente
    // Obtener todos los PINs activos de otros pacientes
    const allPINRecords = await PacienteAuthPIN.findAll({
      where: { activo: true },
      include: [
        {
          model: PacienteAuth,
          as: 'PacienteAuth',
          where: { activo: true },
          required: true,
          include: [
            {
              model: Paciente,
              as: 'paciente',
              required: true,
              attributes: ['id_paciente', 'nombre', 'apellido_paterno']
            }
          ]
        }
      ]
    });

    logger.debug('Verificando unicidad del PIN', {
      id_paciente,
      totalPINsActivos: allPINRecords.length
    });

    // Comparar el PIN ingresado con todos los hashes existentes
    for (const pinRecord of allPINRecords) {
      if (pinRecord.PacienteAuth && pinRecord.PacienteAuth.paciente) {
        const otroPacienteId = pinRecord.PacienteAuth.paciente.id_paciente;
        
        // Solo verificar si es un paciente diferente
        if (parseInt(otroPacienteId) !== parseInt(id_paciente)) {
          const isSamePIN = await bcrypt.compare(pin, pinRecord.pin_hash);
          
          if (isSamePIN) {
            logger.warn('PIN ya está en uso por otro paciente', {
              pinIntentado: pin.substring(0, 1) + '***',
              id_paciente_solicitante: id_paciente,
              id_paciente_existente: otroPacienteId,
              nombre_paciente_existente: `${pinRecord.PacienteAuth.paciente.nombre} ${pinRecord.PacienteAuth.paciente.apellido_paterno}`
            });
            
            return res.status(409).json({
              success: false,
              error: `Este PIN ya está en uso por otro paciente. Por favor, elige un PIN diferente.`
            });
          }
        }
      }
    }

    logger.debug('PIN verificado como único', {
      id_paciente,
      pinLength: pin.length
    });
    
    logger.info('Paciente encontrado para configuración de PIN', { 
      id_paciente,
      nombre: paciente.nombre 
    });
    
    // Crear o actualizar registro de autenticación
    // Usar findOrCreate para manejar mejor la unicidad
    const [authRecord, authCreated] = await PacienteAuth.findOrCreate({
      where: {
        id_paciente: parseInt(id_paciente),
        device_id: device_id
      },
      defaults: {
        device_type: 'mobile',
        is_primary_device: true,
        failed_attempts: 0,
        locked_until: null,
        activo: true
      }
    });

    // Si ya existía, actualizar campos importantes
    if (!authCreated) {
      await authRecord.update({
        is_primary_device: true,
        failed_attempts: 0,
        locked_until: null,
        activo: true,
        last_activity: new Date()
      });
    }
    
    logger.debug('Auth record procesado', { 
      id_auth: authRecord.id_auth,
      created: authCreated 
    });
    
    // Verificar si el paciente ya tiene un PIN configurado
    const pinExistente = await PacienteAuthPIN.findOne({
      where: { id_auth: authRecord.id_auth, activo: true }
    });

    // Si ya tiene un PIN, verificar si es el mismo antes de actualizar
    if (pinExistente) {
      const esMismoPIN = await bcrypt.compare(pin, pinExistente.pin_hash);
      
      if (esMismoPIN) {
        // El paciente quiere mantener el mismo PIN, no hacer nada
        logger.info('PIN sin cambios, manteniendo configuración existente', {
          id_paciente,
          id_auth: authRecord.id_auth
        });

        return res.json({
          success: true,
          message: 'PIN sin cambios, configuración mantenida',
          data: {
            id_paciente: id_paciente,
            auth_id: authRecord.id_auth,
            pin_id: pinExistente.id_pin_auth
          }
        });
      }
      
      // Si es un PIN diferente, ya verificamos la unicidad arriba
      // Proceder con la actualización
    }

    // Crear o actualizar registro de PIN
    const pin_hash = await bcrypt.hash(pin, 10);
    const pin_salt = crypto.randomBytes(16).toString('hex');
    
    const [pinRecord, pinCreated] = await PacienteAuthPIN.findOrCreate({
      where: {
        id_auth: authRecord.id_auth
      },
      defaults: {
        pin_hash: pin_hash,
        pin_salt: pin_salt,
        activo: true
      }
    });

    // Si el PIN ya existía pero es diferente, actualizarlo
    if (!pinCreated) {
      await pinRecord.update({
        pin_hash: pin_hash,
        pin_salt: pin_salt,
        activo: true
      });
      logger.info('PIN actualizado', {
        id_paciente,
        id_auth: authRecord.id_auth
      });
    }
    
    logger.info('PIN configurado exitosamente', {
      id_paciente,
      id_auth: authRecord.id_auth,
      pinCreated
    });

    res.json({
      success: true,
      message: 'PIN configurado exitosamente',
      data: {
        id_paciente: id_paciente,
        auth_id: authRecord.id_auth,
        pin_id: pinRecord.id_pin_auth
      }
    });
  } catch (error) {
    logger.error('Error configurando PIN', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Login con PIN
export const loginWithPIN = async (req, res) => {
  try {
    const { id_paciente, pin, device_id } = req.body;
    
    // Validaciones básicas
    if (!id_paciente || !pin || !device_id) {
      return res.status(400).json({ 
        success: false,
        error: 'Faltan campos requeridos: id_paciente, pin, device_id' 
      });
    }

    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({ 
        success: false,
        error: 'El PIN debe tener exactamente 4 dígitos' 
      });
    }
    
    logger.debug('Intento de login PIN', {
      id_paciente,
      pin: pin?.substring(0, 1) + '***', // Solo mostrar primer dígito para seguridad
      pinLength: pin?.length,
      device_id: device_id?.substring(0, 10) + '...',
      hasPin: !!pin
    });
    
    // Buscar registro de autenticación: primero por device_id exacto, luego por paciente con PIN
    let authRecord = await PacienteAuth.findOne({ 
      where: { 
        id_paciente: parseInt(id_paciente),
        device_id: device_id,
        activo: true // Solo buscar registros activos
      },
      include: [
        { model: Paciente, as: 'paciente' },
        { model: PacienteAuthPIN, as: 'PacienteAuthPIN' }
      ]
    });
    
    // Si no se encuentra con device_id exacto, buscar cualquier registro del paciente con PIN configurado
    // Esto permite que el paciente pueda usar su PIN desde diferentes dispositivos
    if (!authRecord) {
      logger.debug('Device ID no coincide, buscando registro alternativo con PIN', { 
        id_paciente,
        device_id: device_id?.substring(0, 10) + '...' 
      });
      
      authRecord = await PacienteAuth.findOne({ 
        where: { 
          id_paciente: parseInt(id_paciente),
          activo: true
        },
        include: [
          { 
            model: Paciente, 
            as: 'paciente' 
          },
          { 
            model: PacienteAuthPIN, 
            as: 'PacienteAuthPIN',
            where: { activo: true },
            required: true // Requerir PIN activo para login
          }
        ]
      });
      
      // Si encontramos un registro alternativo, actualizar el device_id solo si es diferente
      if (authRecord) {
        // Verificar si ya existe otro registro con el mismo device_id para este paciente
        const existingAuthWithDevice = await PacienteAuth.findOne({
          where: {
            id_paciente: parseInt(id_paciente),
            device_id: device_id,
            activo: true,
            id_auth: { [Op.ne]: authRecord.id_auth }
          }
        });

        if (existingAuthWithDevice) {
          // Ya existe un registro con este device_id, usar ese en su lugar
          logger.info('Registro alternativo con device_id ya existe, usando ese', {
            id_paciente,
            device_id: device_id?.substring(0, 10) + '...',
            existing_id_auth: existingAuthWithDevice.id_auth
          });
          authRecord = existingAuthWithDevice;
          // Recargar el PIN
          authRecord.PacienteAuthPIN = await PacienteAuthPIN.findOne({
            where: { id_auth: authRecord.id_auth, activo: true }
          });
        } else if (authRecord.device_id !== device_id) {
          // Solo actualizar si el device_id es diferente para evitar violación de unicidad
          logger.info('Registro alternativo encontrado, actualizando device_id', { 
            id_paciente,
            old_device_id: authRecord.device_id?.substring(0, 10) + '...',
            new_device_id: device_id?.substring(0, 10) + '...'
          });
          await authRecord.update({ 
            device_id: device_id,
            last_activity: new Date()
          });
        } else {
          // device_id ya es el mismo, solo actualizar last_activity
          await authRecord.update({
            last_activity: new Date()
          });
        }
      }
    }
    
    if (!authRecord) {
      logger.warn('Intento de login sin registro de autenticación', { id_paciente });
      return res.status(401).json({ 
        success: false,
        error: 'Credenciales inválidas o PIN no configurado. Contacta al personal de la clínica para configurar tu PIN.' 
      });
    }

    // Verificar si está activo
    if (!authRecord.activo) {
      return res.status(403).json({ 
        success: false,
        error: 'Cuenta de autenticación desactivada' 
      });
    }

    // TEMPORALMENTE DESHABILITADO PARA PRUEBAS - Verificar si está bloqueado
    // if (authRecord.locked_until && new Date() < authRecord.locked_until) {
    //   const minutesRemaining = Math.ceil((authRecord.locked_until - new Date()) / (1000 * 60));
    //   logger.warn('Intento de login en cuenta bloqueada', { 
    //     id_paciente, 
    //     locked_until: authRecord.locked_until,
    //     minutesRemaining 
    //   });
    //   return res.status(423).json({ 
    //     success: false,
    //     error: 'Cuenta temporalmente bloqueada',
    //     locked_until: authRecord.locked_until,
    //     minutes_remaining: minutesRemaining
    //   });
    // }
    logger.info('Bloqueo de cuenta temporalmente deshabilitado para pruebas', { id_paciente });

    // Verificar PIN - si no se cargó en el include, buscarlo directamente
    let pinRecord = authRecord.PacienteAuthPIN;
    if (!pinRecord || !pinRecord.activo) {
      logger.debug('PIN no incluido en el resultado, buscando directamente', { id_auth: authRecord.id_auth });
      pinRecord = await PacienteAuthPIN.findOne({
        where: {
          id_auth: authRecord.id_auth,
          activo: true
        }
      });
    }

    if (!pinRecord || !pinRecord.activo) {
      logger.warn('Intento de login sin PIN configurado', { id_paciente, id_auth: authRecord.id_auth });
      return res.status(401).json({ 
        success: false,
        error: 'PIN no configurado para este dispositivo' 
      });
    }
    
    logger.debug('Comparando PIN', {
      id_paciente,
      pinLength: pin.length,
      pinHashPrefix: pinRecord.pin_hash.substring(0, 20) + '...'
    });
    
    const isValidPIN = await bcrypt.compare(pin, pinRecord.pin_hash);
    
    logger.debug('Resultado comparación PIN', {
      id_paciente,
      isValid: isValidPIN
    });
    
    if (!isValidPIN) {
      // TEMPORALMENTE DESHABILITADO PARA PRUEBAS - Incrementar intentos fallidos sin bloquear
      const failedAttempts = authRecord.failed_attempts + 1;
      // const lockTime = failedAttempts >= 3 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      
      await authRecord.update({
        failed_attempts: failedAttempts,
        // locked_until: lockTime // Deshabilitado temporalmente
        locked_until: null // Forzar desbloqueo
      });

      logger.warn('PIN incorrecto (bloqueo deshabilitado para pruebas)', { 
        id_paciente, 
        failedAttempts,
        willLock: false // Siempre false mientras está deshabilitado
      });

      return res.status(401).json({ 
        success: false,
        error: 'PIN incorrecto',
        attempts_remaining: Math.max(0, 3 - failedAttempts),
        will_lock: failedAttempts >= 2
      });
    }

    // Reset intentos fallidos y actualizar device_id solo si es diferente y seguro
    const updateData = {
      failed_attempts: 0,
      locked_until: null,
      last_activity: new Date()
    };

    // Solo actualizar device_id si es diferente y no causará violación de unicidad
    if (device_id && authRecord.device_id !== device_id) {
      // Verificar que no exista otro registro activo con este device_id para este paciente
      const existingAuth = await PacienteAuth.findOne({
        where: {
          id_paciente: parseInt(id_paciente),
          device_id: device_id,
          activo: true,
          id_auth: { [require('sequelize').Op.ne]: authRecord.id_auth }
        }
      });

      if (!existingAuth) {
        updateData.device_id = device_id;
      } else {
        logger.warn('No se puede actualizar device_id, ya existe otro registro con este device_id', {
          id_paciente,
          device_id: device_id?.substring(0, 10) + '...',
          existing_id_auth: existingAuth.id_auth
        });
      }
    }

    await authRecord.update(updateData);

    // Generar token
    const token = jwt.sign(
      { 
        id: id_paciente, 
        type: 'paciente',
        auth_method: 'pin',
        device_id 
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' } // Menor tiempo para móviles
    );

    // Obtener datos completos del paciente
    const pacienteCompleto = await Paciente.findByPk(id_paciente, {
      attributes: [
        'id_paciente',
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
        'activo'
      ]
    });

    if (!pacienteCompleto) {
      logger.error('Paciente no encontrado después de autenticación', { id_paciente });
      return res.status(500).json({ error: 'Error al obtener datos del paciente' });
    }

    logger.info('Login PIN exitoso', {
      id_paciente,
      nombre: pacienteCompleto.nombre,
      device_id: device_id?.substring(0, 10) + '...'
    });

    res.json({
      success: true,
      message: 'Login exitoso',
      token,
      paciente: {
        id: pacienteCompleto.id_paciente,
        id_paciente: pacienteCompleto.id_paciente,
        nombre: pacienteCompleto.nombre,
        apellido_paterno: pacienteCompleto.apellido_paterno,
        apellido_materno: pacienteCompleto.apellido_materno,
        nombre_completo: `${pacienteCompleto.nombre} ${pacienteCompleto.apellido_paterno}`.trim(),
        fecha_nacimiento: pacienteCompleto.fecha_nacimiento,
        sexo: pacienteCompleto.sexo,
        curp: pacienteCompleto.curp,
        direccion: pacienteCompleto.direccion,
        localidad: pacienteCompleto.localidad,
        numero_celular: pacienteCompleto.numero_celular,
        institucion_salud: pacienteCompleto.institucion_salud,
        activo: pacienteCompleto.activo,
        auth_method: 'pin'
      },
      auth_method: 'pin'
    });
  } catch (error) {
    logger.error('Error en login PIN', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Error interno del servidor' 
    });
  }
};

// Configurar biometría (simplificado - RSA nativo)
export const setupBiometric = async (req, res) => {
  try {
    const { id_paciente, device_id, public_key, credential_id, biometric_type = 'fingerprint' } = req.body;
    
    // Validaciones básicas
    if (!id_paciente || !device_id || !public_key || !credential_id) {
      return res.status(400).json({ 
        success: false,
        error: 'Faltan campos requeridos: id_paciente, device_id, public_key, credential_id' 
      });
    }

    // Validar formato de clave pública (PEM)
    if (!public_key.includes('-----BEGIN PUBLIC KEY-----') || !public_key.includes('-----END PUBLIC KEY-----')) {
      return res.status(400).json({ 
        success: false,
        error: 'Formato de clave pública inválido. Debe ser PEM' 
      });
    }

    // Validar tipo de biometría
    const validTypes = ['fingerprint', 'face', 'iris'];
    if (!validTypes.includes(biometric_type)) {
      return res.status(400).json({ 
        success: false,
        error: `Tipo de biometría inválido. Debe ser uno de: ${validTypes.join(', ')}` 
      });
    }

    const authRecord = await PacienteAuth.findOne({ 
      where: { 
        id_paciente: parseInt(id_paciente), 
        device_id,
        activo: true
      } 
    });
    
    if (!authRecord) {
      return res.status(404).json({ 
        success: false,
        error: 'Configurar PIN primero o dispositivo no autorizado' 
      });
    }

    // Crear o actualizar registro biométrico
    const [biometricRecord, created] = await PacienteAuthBiometric.upsert({
      id_auth: authRecord.id_auth,
      credential_id: credential_id,
      public_key: public_key,
      biometric_type: biometric_type,
      activo: true
    }, {
      returning: true
    });

    logger.info('Biometría configurada', {
      id_paciente,
      id_auth: authRecord.id_auth,
      credential_id: credential_id?.substring(0, 20) + '...',
      biometric_type,
      created
    });

    // Generar challenge para validar la configuración
    const challenge = crypto.randomBytes(32).toString('base64');

    res.json({
      success: true,
      message: 'Biometría configurada exitosamente',
      data: {
        id_biometric_auth: biometricRecord.id_biometric_auth,
        credential_id: credential_id
      },
      challenge // Para validar que la clave privada funciona
    });
  } catch (error) {
    logger.error('Error configurando biometría', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
};

// Login con biometría (simplificado - RSA nativo)
export const loginWithBiometric = async (req, res) => {
  try {
    const { id_paciente, device_id, signature, challenge, credential_id } = req.body;
    
    // Validaciones básicas
    if (!id_paciente || !device_id || !signature || !challenge || !credential_id) {
      return res.status(400).json({ 
        success: false,
        error: 'Faltan campos requeridos: id_paciente, device_id, signature, challenge, credential_id' 
      });
    }
    
    // Buscar registro de autenticación con relación biométrica
    const authRecord = await PacienteAuth.findOne({ 
      where: { id_paciente, device_id },
      include: [
        { model: Paciente, as: 'paciente' },
        { 
          model: PacienteAuthBiometric,
          as: 'PacienteAuthBiometric',
          where: { 
            credential_id,
            activo: true 
          },
          required: true
        }
      ]
    });
    
    if (!authRecord || !authRecord.PacienteAuthBiometric) {
      logger.warn('Intento de login biométrico fallido', { id_paciente, device_id, hasCredentialId: !!credential_id });
      return res.status(401).json({ 
        success: false,
        error: 'Dispositivo no autorizado o biometría no configurada' 
      });
    }

         // TEMPORALMENTE DESHABILITADO PARA PRUEBAS - Verificar si está bloqueado
         // if (authRecord.locked_until && new Date() < authRecord.locked_until) {
         //   const minutesRemaining = Math.ceil((authRecord.locked_until - new Date()) / (1000 * 60));
         //   return res.status(423).json({ 
         //     success: false,
         //     error: 'Cuenta temporalmente bloqueada',
         //     locked_until: authRecord.locked_until,
         //     minutes_remaining: minutesRemaining
         //   });
         // }
         logger.info('Bloqueo de cuenta temporalmente deshabilitado para pruebas (biométrico)', { id_paciente });

    const biometricAuth = authRecord.PacienteAuthBiometric;

    // Validar campos requeridos
    if (!signature || !challenge || !credential_id) {
      return res.status(400).json({ 
        success: false,
        error: 'Faltan campos requeridos: signature, challenge, credential_id' 
      });
    }

    // Verificar firma RSA con crypto nativo
    let isValidSignature = false;
    try {
      const verify = crypto.createVerify('SHA256');
      // Challenge puede venir como string o base64
      verify.update(challenge, 'utf8');
      verify.end();
      isValidSignature = verify.verify(biometricAuth.public_key, signature, 'base64');
      
      logger.debug('Verificación de firma biométrica', {
        id_paciente,
        isValid: isValidSignature,
        challengeLength: challenge.length,
        signatureLength: signature.length
      });
    } catch (error) {
      logger.warn('Error verificando firma biométrica', { 
        id_paciente, 
        error: error.message 
      });
      isValidSignature = false;
    }

         if (!isValidSignature) {
           // TEMPORALMENTE DESHABILITADO PARA PRUEBAS - Incrementar intentos fallidos sin bloquear
           const failedAttempts = authRecord.failed_attempts + 1;
           // const lockTime = failedAttempts >= 3 ? new Date(Date.now() + 15 * 60 * 1000) : null;
           
           await authRecord.update({
             failed_attempts: failedAttempts,
             // locked_until: lockTime // Deshabilitado temporalmente
             locked_until: null // Forzar desbloqueo
           });

      logger.warn('Firma biométrica inválida', { id_paciente, failedAttempts });
      return res.status(401).json({ 
        success: false,
        error: 'Autenticación biométrica fallida',
        attempts_remaining: Math.max(0, 3 - failedAttempts),
        will_lock: failedAttempts >= 2
      });
    }

    // Reset intentos fallidos y actualizar actividad
    await authRecord.update({
      failed_attempts: 0,
      locked_until: null,
      last_activity: new Date()
    });

    // Actualizar último uso de biometría
    await biometricAuth.update({
      last_used: new Date()
    });

    // Obtener datos completos del paciente
    const pacienteCompleto = await Paciente.findByPk(id_paciente, {
      attributes: [
        'id_paciente',
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
        'activo'
      ]
    });

    if (!pacienteCompleto) {
      logger.error('Paciente no encontrado después de autenticación biométrica', { id_paciente });
      return res.status(500).json({ error: 'Error al obtener datos del paciente' });
    }

    const token = jwt.sign(
      { 
        id: id_paciente, 
        type: 'paciente',
        auth_method: 'biometric',
        device_id 
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    logger.info('Login biométrico exitoso', {
      id_paciente,
      nombre: pacienteCompleto.nombre,
      biometric_type: biometricAuth.biometric_type
    });

    logger.info('Login biométrico exitoso', {
      id_paciente,
      nombre: pacienteCompleto.nombre,
      biometric_type: biometricAuth.biometric_type
    });

    res.json({
      success: true,
      message: 'Login biométrico exitoso',
      token,
      paciente: {
        id: pacienteCompleto.id_paciente,
        id_paciente: pacienteCompleto.id_paciente,
        nombre: pacienteCompleto.nombre,
        apellido_paterno: pacienteCompleto.apellido_paterno,
        apellido_materno: pacienteCompleto.apellido_materno,
        nombre_completo: `${pacienteCompleto.nombre} ${pacienteCompleto.apellido_paterno}`.trim(),
        fecha_nacimiento: pacienteCompleto.fecha_nacimiento,
        sexo: pacienteCompleto.sexo,
        curp: pacienteCompleto.curp,
        direccion: pacienteCompleto.direccion,
        localidad: pacienteCompleto.localidad,
        numero_celular: pacienteCompleto.numero_celular,
        institucion_salud: pacienteCompleto.institucion_salud,
        activo: pacienteCompleto.activo,
        auth_method: 'biometric'
      },
      auth_method: 'biometric'
    });
  } catch (error) {
    logger.error('Error en login biométrico', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};
