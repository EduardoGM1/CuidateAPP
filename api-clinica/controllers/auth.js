import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Op } from 'sequelize';
import { Usuario, PasswordResetToken } from '../models/associations.js';
import { SecurityValidator } from '../middlewares/securityValidator.js';
import MassAssignmentProtection from '../middlewares/massAssignmentProtection.js';
import logger from '../utils/logger.js';

export const register = async (req, res) => {
  try {
    logger.info('Register request received', { 
      email: req.body.email,
      rol: req.body.rol 
    });
    const { email, password, rol } = req.body;
    
    // Validación adicional de datos recibidos
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Datos faltantes',
        details: {
          email_received: !!email,
          password_received: !!password,
          rol_received: rol || 'undefined'
        }
      });
    }
    
    const existingUser = await Usuario.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ 
        error: 'El email ya está registrado',
        email: email
      });
    }

    const password_hash = await bcrypt.hash(password, 10);
    
    const usuario = await Usuario.create({
      email,
      password_hash,
      rol: rol || 'Paciente'
    });

    // Generar par de tokens (access + refresh)
    const RefreshTokenService = (await import('../services/refreshTokenService.js')).default;
    const tokenPair = await RefreshTokenService.generateTokenPair({
      id: usuario.id_usuario,
      email: usuario.email,
      rol: usuario.rol
    });

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token: tokenPair.accessToken,
      refresh_token: tokenPair.refreshToken,
      expires_in: tokenPair.expiresIn,
      refresh_token_expires_in: tokenPair.refreshTokenExpiresIn,
      usuario: {
        id_usuario: usuario.id_usuario,  // ← ID para vincular
        email: usuario.email,
        rol: usuario.rol,
        activo: usuario.activo
      },
      // Para facilitar vinculación
      next_step: usuario.rol === 'Doctor' 
        ? `POST /api/doctores con id_usuario: ${usuario.id_usuario}`
        : 'Usuario listo para usar'
    });
  } catch (error) {
    logger.error('Error en registro', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });
    res.status(400).json({ 
      error: 'Error en el registro',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Listar usuarios para vincular con perfiles (legacy - mantiene compatibilidad)
export const getUsuarios = async (req, res) => {
  try {
    const { Usuario, Doctor } = await import('../models/associations.js');
    
    const { includeInactive = false } = req.query;
    const whereClause = includeInactive === 'true' ? {} : { activo: true };
    
    const usuarios = await Usuario.findAll({
      attributes: ['id_usuario', 'email', 'rol', 'activo', 'fecha_creacion', 'ultimo_login'],
      where: whereClause,
      include: [{
        model: Doctor,
        required: false,
        attributes: ['id_doctor', 'nombre', 'apellido_paterno']
      }],
      order: [['fecha_creacion', 'DESC']]
    });
    
    const usuariosConEstado = usuarios.map(usuario => ({
      id_usuario: usuario.id_usuario,
      email: usuario.email,
      rol: usuario.rol,
      activo: usuario.activo,
      fecha_creacion: usuario.fecha_creacion,
      ultimo_login: usuario.ultimo_login,
      tiene_perfil: usuario.rol === 'Doctor' ? !!usuario.Doctor : true,
      perfil_completo: usuario.Doctor ? {
        nombre: usuario.Doctor.nombre,
        apellido: usuario.Doctor.apellido_paterno
      } : null
    }));
    
    const sinPerfil = usuariosConEstado.filter(u => !u.tiene_perfil);
    
    res.json({
      todos_usuarios: usuariosConEstado,
      usuarios_sin_perfil: sinPerfil,
      total: usuarios.length,
      sin_perfil_count: sinPerfil.length
    });
  } catch (error) {
    logger.error('Error obteniendo usuarios', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtener un usuario por ID (solo Admin)
 * GET /api/auth/usuarios/:id
 */
export const getUsuarioById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ 
        success: false,
        error: 'ID de usuario inválido' 
      });
    }
    
    logger.info(`Obteniendo usuario con ID ${id}`);
    
    const { Usuario, Doctor } = await import('../models/associations.js');
    
    const usuario = await Usuario.findByPk(id, {
      attributes: ['id_usuario', 'email', 'rol', 'activo', 'fecha_creacion', 'ultimo_login'],
      include: [{
        model: Doctor,
        required: false,
        attributes: ['id_doctor', 'nombre', 'apellido_paterno']
      }]
    });
    
    if (!usuario) {
      return res.status(404).json({ 
        success: false,
        error: 'Usuario no encontrado' 
      });
    }
    
    return res.json({
      success: true,
      usuario: {
        id_usuario: usuario.id_usuario,
        email: usuario.email,
        rol: usuario.rol,
        activo: usuario.activo,
        fecha_creacion: usuario.fecha_creacion,
        ultimo_login: usuario.ultimo_login,
        tiene_perfil: usuario.rol === 'Doctor' ? !!usuario.Doctor : true,
        perfil_completo: usuario.Doctor ? {
          nombre: usuario.Doctor.nombre,
          apellido: usuario.Doctor.apellido_paterno
        } : null
      }
    });
  } catch (error) {
    logger.error('Error obteniendo usuario por ID', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

/**
 * Crear nuevo usuario (solo Admin)
 * POST /api/auth/usuarios
 */
export const createUsuario = async (req, res) => {
  try {
    const { email, password, rol } = req.body;
    
    // Validaciones
    if (!email || !password || !rol) {
      return res.status(400).json({ 
        success: false,
        error: 'Email, contraseña y rol son requeridos' 
      });
    }
    
    if (!['Paciente', 'Doctor', 'Admin'].includes(rol)) {
      return res.status(400).json({ 
        success: false,
        error: 'Rol inválido. Debe ser: Paciente, Doctor o Admin' 
      });
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        error: 'Formato de email inválido' 
      });
    }
    
    // Validar contraseña
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        error: 'La contraseña debe tener al menos 6 caracteres' 
      });
    }
    
    logger.info(`Creando usuario administrativo: ${email}, rol: ${rol}`);
    
    // Verificar si ya existe
    const usuarioExistente = await Usuario.findOne({ where: { email } });
    if (usuarioExistente) {
      return res.status(409).json({ 
        success: false,
        error: 'El email ya está registrado' 
      });
    }
    
    // Hashear contraseña
    const password_hash = await bcrypt.hash(password, 10);
    
    // Crear usuario
    const nuevoUsuario = await Usuario.create({
      email: email.trim().toLowerCase(),
      password_hash,
      rol: rol
    });
    
    logger.info(`Usuario creado: ${nuevoUsuario.email} (ID: ${nuevoUsuario.id_usuario})`);
    
    return res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      usuario: {
        id_usuario: nuevoUsuario.id_usuario,
        email: nuevoUsuario.email,
        rol: nuevoUsuario.rol,
        activo: nuevoUsuario.activo,
        fecha_creacion: nuevoUsuario.fecha_creacion
      }
    });
  } catch (error) {
    logger.error('Error creando usuario', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

/**
 * Actualizar usuario (solo Admin)
 * PUT /api/auth/usuarios/:id
 */
export const updateUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, rol, activo, password } = req.body;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ 
        success: false,
        error: 'ID de usuario inválido' 
      });
    }
    
    logger.info(`Actualizando usuario ID ${id}`);
    
    const usuario = await Usuario.findByPk(id);
    
    if (!usuario) {
      return res.status(404).json({ 
        success: false,
        error: 'Usuario no encontrado' 
      });
    }
    
    // Validar email si se proporciona
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          success: false,
          error: 'Formato de email inválido' 
        });
      }
      
      // Verificar si el nuevo email ya existe
      const usuarioConEmail = await Usuario.findOne({
        where: { 
          email: email.trim().toLowerCase(),
          id_usuario: { [Op.ne]: id }
        }
      });
      
      if (usuarioConEmail) {
        return res.status(409).json({ 
          success: false,
          error: 'El email ya está registrado por otro usuario' 
        });
      }
    }
    
    // Validar rol si se proporciona
    if (rol && !['Paciente', 'Doctor', 'Admin'].includes(rol)) {
      return res.status(400).json({ 
        success: false,
        error: 'Rol inválido. Debe ser: Paciente, Doctor o Admin' 
      });
    }
    
    // Preparar datos para actualizar
    const dataToUpdate = {};
    if (email) dataToUpdate.email = email.trim().toLowerCase();
    if (rol) dataToUpdate.rol = rol;
    if (activo !== undefined) dataToUpdate.activo = activo;
    
    // Actualizar contraseña si se proporciona
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ 
          success: false,
          error: 'La contraseña debe tener al menos 6 caracteres' 
        });
      }
      dataToUpdate.password_hash = await bcrypt.hash(password, 10);
    }
    
    await usuario.update(dataToUpdate);
    
    logger.info(`Usuario ID ${id} actualizado exitosamente`);
    
    return res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      usuario: {
        id_usuario: usuario.id_usuario,
        email: usuario.email,
        rol: usuario.rol,
        activo: usuario.activo,
        fecha_creacion: usuario.fecha_creacion,
        ultimo_login: usuario.ultimo_login
      }
    });
  } catch (error) {
    logger.error('Error actualizando usuario', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

/**
 * Eliminar/Desactivar usuario (solo Admin)
 * DELETE /api/auth/usuarios/:id
 */
export const deleteUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ 
        success: false,
        error: 'ID de usuario inválido' 
      });
    }
    
    logger.info(`Eliminando/desactivando usuario ID ${id}`);
    
    const usuario = await Usuario.findByPk(id);
    
    if (!usuario) {
      return res.status(404).json({ 
        success: false,
        error: 'Usuario no encontrado' 
      });
    }
    
    // Verificar si el usuario está asociado a un doctor o paciente activo
    const { Doctor, Paciente } = await import('../models/associations.js');
    
    if (usuario.rol === 'Doctor') {
      const doctorAsociado = await Doctor.findOne({ where: { id_usuario: id } });
      if (doctorAsociado && doctorAsociado.activo) {
        return res.status(409).json({ 
          success: false,
          error: 'No se puede eliminar el usuario porque está asociado a un doctor activo. Desactiva primero el doctor.' 
        });
      }
    }
    
    if (usuario.rol === 'Paciente') {
      const pacienteAsociado = await Paciente.findOne({ where: { id_usuario: id } });
      if (pacienteAsociado && pacienteAsociado.activo) {
        return res.status(409).json({ 
          success: false,
          error: 'No se puede eliminar el usuario porque está asociado a un paciente activo. Desactiva primero el paciente.' 
        });
      }
    }
    
    // En lugar de eliminar físicamente, desactivamos el usuario
    await usuario.update({ activo: false });
    
    logger.info(`Usuario ${usuario.email} desactivado exitosamente`);
    
    return res.json({
      success: true,
      message: 'Usuario desactivado exitosamente'
    });
  } catch (error) {
    logger.error('Error eliminando usuario', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email y contraseña son requeridos' 
      });
    }

    logger.info('Iniciando login Doctor/Admin', { email });

    // Buscar usuario
    const usuario = await Usuario.findOne({ 
      where: { email: email.trim().toLowerCase(), activo: true } 
    });
    
    if (!usuario) {
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

    // Usar sistema unificado de autenticación
    // Esto busca la credencial en auth_credentials en lugar de password_hash
    const UnifiedAuthService = (await import('../services/unifiedAuthService.js')).default;
    
    try {
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

      // Si es Doctor, obtener id_doctor
      let id_doctor = null;
      if (usuario.rol === 'Doctor') {
        const { Doctor } = await import('../models/associations.js');
        const doctor = await Doctor.findOne({ 
          where: { id_usuario: usuario.id_usuario },
          attributes: ['id_doctor']
        });
        if (doctor) {
          id_doctor = doctor.id_doctor;
        }
      }

      // Generar refresh token usando el nuevo servicio
      const RefreshTokenService = (await import('../services/refreshTokenService.js')).default;
      const tokenPair = await RefreshTokenService.generateTokenPair({
        id: usuario.id_usuario,
        email: usuario.email,
        rol: usuario.rol
      });

      // Formatear respuesta con access token y refresh token
      res.json({
        success: true,
        message: 'Login exitoso',
        token: tokenPair.accessToken, // Access token (1 hora)
        refresh_token: tokenPair.refreshToken, // Refresh token (7 días)
        expires_in: tokenPair.expiresIn,
        refresh_token_expires_in: tokenPair.refreshTokenExpiresIn,
        usuario: {
          id: usuario.id_usuario,
          email: usuario.email,
          rol: usuario.rol,
          ...(id_doctor && { id_doctor }) // Incluir id_doctor si existe
        }
      });
    } catch (authError) {
      logger.warn('Error en autenticación unificada', { 
        email, 
        error: authError.message 
      });
      return res.status(401).json({ 
        success: false,
        error: 'Credenciales inválidas' 
      });
    }

  } catch (error) {
    logger.error('Error en login', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// Actualizar contraseña de usuario (Doctor/Admin)
/**
 * Renovar access token usando refresh token
 * POST /api/auth/refresh
 */
export const refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token es requerido'
      });
    }

    logger.info('Renovando access token');

    const RefreshTokenService = (await import('../services/refreshTokenService.js')).default;
    const tokenPair = await RefreshTokenService.refreshAccessToken(refresh_token);

    res.json({
      success: true,
      message: 'Token renovado exitosamente',
      token: tokenPair.accessToken,
      refresh_token: tokenPair.refreshToken,
      expires_in: tokenPair.expiresIn,
      refresh_token_expires_in: tokenPair.refreshTokenExpiresIn
    });
  } catch (error) {
    logger.warn('Error renovando token', {
      error: error.message
    });
    res.status(401).json({
      success: false,
      error: error.message || 'Refresh token inválido o expirado'
    });
  }
};

/**
 * Cerrar sesión (revocar refresh token)
 * POST /api/auth/logout
 */
export const logout = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token es requerido'
      });
    }

    logger.info('Cerrando sesión', {
      userId: req.user?.id
    });

    const RefreshTokenService = (await import('../services/refreshTokenService.js')).default;
    
    // Obtener información del token antes de revocarlo
    const crypto = (await import('crypto')).default;
    const tokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex');
    
    // Decodificar para obtener jti
    const jwt = (await import('jsonwebtoken')).default;
    let decoded;
    try {
      decoded = jwt.verify(
        refresh_token,
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
      );
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token inválido'
      });
    }

    await RefreshTokenService.revokeRefreshToken(tokenHash, decoded.jti);

    res.json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
  } catch (error) {
    logger.error('Error cerrando sesión', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Cerrar todas las sesiones (revocar todos los refresh tokens del usuario)
 * POST /api/auth/logout-all
 */
export const logoutAll = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    logger.info('Cerrando todas las sesiones', {
      userId: req.user.id,
      rol: req.user.rol
    });

    const RefreshTokenService = (await import('../services/refreshTokenService.js')).default;
    await RefreshTokenService.revokeAllUserTokens(req.user.id, req.user.rol);

    res.json({
      success: true,
      message: 'Todas las sesiones cerradas exitosamente'
    });
  } catch (error) {
    logger.error('Error cerrando todas las sesiones', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Cambiar contraseña (requiere autenticación y contraseña actual)
 * PUT /api/auth/change-password
 * 
 * Requiere:
 * - Token JWT válido (usuario autenticado)
 * - Contraseña actual
 * - Nueva contraseña
 * 
 * Solo permite cambiar la contraseña propia (o Admin puede cambiar de otros si se proporciona userId)
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, userId } = req.body;
    const authenticatedUserId = req.user?.id_usuario || req.user?.id;
    const userRole = req.user?.rol;

    // Validación de datos
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false,
        error: 'Datos faltantes',
        details: {
          currentPassword_received: !!currentPassword,
          newPassword_received: !!newPassword
        }
      });
    }

    // Determinar qué usuario cambiar (propio o si Admin especifica otro)
    let targetUserId = authenticatedUserId;
    if (userId && userRole === 'Admin') {
      targetUserId = userId;
    } else if (userId && userRole !== 'Admin') {
      return res.status(403).json({ 
        success: false,
        error: 'Solo los administradores pueden cambiar contraseñas de otros usuarios'
      });
    }

    // Buscar usuario
    const usuario = await Usuario.findByPk(targetUserId);

    if (!usuario) {
      return res.status(404).json({ 
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Validar que el rol sea Doctor o Admin
    if (!['Doctor', 'Admin'].includes(usuario.rol)) {
      return res.status(403).json({ 
        success: false,
        error: 'Solo doctores y administradores pueden cambiar contraseñas mediante este endpoint'
      });
    }

    // Validar contraseña actual
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, usuario.password_hash);
    
    if (!isCurrentPasswordValid) {
      logger.warn('Intento de cambio de contraseña con contraseña actual incorrecta', {
        userId: targetUserId,
        email: usuario.email,
        ip: req.ip
      });
      return res.status(401).json({ 
        success: false,
        error: 'Contraseña actual incorrecta'
      });
    }

    // Validar que la nueva contraseña sea diferente
    const isSamePassword = await bcrypt.compare(newPassword, usuario.password_hash);
    if (isSamePassword) {
      return res.status(400).json({ 
        success: false,
        error: 'La nueva contraseña debe ser diferente a la actual'
      });
    }

    // Validar fortaleza de nueva contraseña
    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false,
        error: 'La nueva contraseña debe tener al menos 8 caracteres'
      });
    }

    // Hashear nueva contraseña
    logger.info('Cambiando contraseña para usuario', { 
      userId: targetUserId,
      email: usuario.email,
      changedBy: authenticatedUserId 
    });
    
    const password_hash = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña
    await usuario.update({ 
      password_hash: password_hash,
      fecha_actualizacion: new Date()
    });

    // Invalidar todos los refresh tokens del usuario (forzar re-login)
    try {
      const RefreshTokenService = (await import('../services/refreshTokenService.js')).default;
      await RefreshTokenService.revokeAllUserTokens(targetUserId);
      logger.info('Refresh tokens invalidados después de cambio de contraseña', { userId: targetUserId });
    } catch (tokenError) {
      // No crítico, solo log
      logger.warn('Error invalidando refresh tokens (no crítico)', { error: tokenError.message });
    }
    
    logger.info('Contraseña actualizada exitosamente', { 
      userId: targetUserId,
      email: usuario.email 
    });

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente. Por favor, inicia sesión nuevamente.',
      usuario: {
        id_usuario: usuario.id_usuario,
        email: usuario.email,
        rol: usuario.rol
      }
    });

  } catch (error) {
    logger.error('Error al cambiar contraseña', {
      error: error.message,
      stack: error.stack,
      userId: req.body.userId
    });
    res.status(500).json({ 
      success: false,
      error: 'Error al cambiar contraseña',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Solicitar recuperación de contraseña (Forgot Password)
 * POST /api/auth/forgot-password
 * 
 * Genera un token de recuperación y envía email con link
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validación
    if (!email) {
      return res.status(400).json({ 
        success: false,
        error: 'Email es requerido'
      });
    }

    // Buscar usuario (solo Doctor o Admin)
    const usuario = await Usuario.findOne({ 
      where: { 
        email: email.trim().toLowerCase(),
        rol: { [Op.in]: ['Doctor', 'Admin'] },
        activo: true 
      } 
    });

    // Siempre responder igual para prevenir enumeración de emails
    // No revelar si el email existe o no
    const successResponse = {
      success: true,
      message: 'Si el email existe en nuestro sistema, recibirás un enlace para recuperar tu contraseña.'
    };

    if (!usuario) {
      logger.info('Solicitud de recuperación para email no encontrado (no revelado al usuario)', {
        email: email.substring(0, 3) + '***',
        ip: ipAddress
      });
      // Responder igual para no revelar si el email existe
      return res.json(successResponse);
    }

    // Generar token único
    const token = crypto.randomBytes(32).toString('hex');
    const fechaExpiracion = new Date();
    fechaExpiracion.setHours(fechaExpiracion.getHours() + 1); // Expira en 1 hora

    // Invalidar tokens anteriores no usados del usuario
    await PasswordResetToken.update(
      { usado: true },
      { 
        where: { 
          id_usuario: usuario.id_usuario,
          usado: false,
          fecha_expiracion: { [Op.gt]: new Date() }
        } 
      }
    );

    // Crear nuevo token
    const resetToken = await PasswordResetToken.create({
      id_usuario: usuario.id_usuario,
      token,
      fecha_expiracion: fechaExpiracion,
      ip_address: ipAddress,
      user_agent: userAgent
    });

    // Construir URL de recuperación
    const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    // Enviar email (en background, no bloquea la respuesta)
    setImmediate(async () => {
      try {
        const emailService = (await import('../services/emailService.js')).default;
        await emailService.sendPasswordResetEmail(usuario.email, token, resetUrl);
      } catch (emailError) {
        // No crítico - el token ya está guardado
        logger.error('Error enviando email de recuperación (no crítico)', {
          error: emailError.message,
          userId: usuario.id_usuario
        });
      }
    });

    logger.info('Token de recuperación de contraseña creado', {
      userId: usuario.id_usuario,
      email: usuario.email.substring(0, 3) + '***',
      tokenId: resetToken.id_token,
      ip: ipAddress
    });

    res.json(successResponse);

  } catch (error) {
    logger.error('Error en forgot-password', {
      error: error.message,
      stack: error.stack,
      email: req.body.email?.substring(0, 3) + '***'
    });
    
    // Siempre responder igual para no revelar errores
    res.json({
      success: true,
      message: 'Si el email existe en nuestro sistema, recibirás un enlace para recuperar tu contraseña.'
    });
  }
};

/**
 * Resetear contraseña con token (Reset Password)
 * POST /api/auth/reset-password
 * 
 * Valida token y actualiza contraseña
 */
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Validación
    if (!token || !newPassword) {
      return res.status(400).json({ 
        success: false,
        error: 'Token y nueva contraseña son requeridos'
      });
    }

    // Validar fortaleza de contraseña
    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false,
        error: 'La contraseña debe tener al menos 8 caracteres'
      });
    }

    // Buscar token
    const resetToken = await PasswordResetToken.findOne({
      where: { token },
      include: [{ model: Usuario }]
    });

    if (!resetToken) {
      return res.status(400).json({ 
        success: false,
        error: 'Token inválido o expirado'
      });
    }

    // Validar que el token sea válido (no usado y no expirado)
    if (!resetToken.isValid()) {
      return res.status(400).json({ 
        success: false,
        error: 'Token inválido o expirado'
      });
    }

    const usuario = resetToken.Usuario;
    if (!usuario || !usuario.activo) {
      return res.status(400).json({ 
        success: false,
        error: 'Usuario no encontrado o inactivo'
      });
    }

    // Validar que la nueva contraseña sea diferente a la actual
    const isSamePassword = await bcrypt.compare(newPassword, usuario.password_hash);
    if (isSamePassword) {
      return res.status(400).json({ 
        success: false,
        error: 'La nueva contraseña debe ser diferente a la actual'
      });
    }

    // Hashear nueva contraseña
    const password_hash = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña
    await usuario.update({ 
      password_hash,
      fecha_actualizacion: new Date()
    });

    // Marcar token como usado
    await resetToken.markAsUsed();

    // Invalidar todos los refresh tokens del usuario
    try {
      const RefreshTokenService = (await import('../services/refreshTokenService.js')).default;
      await RefreshTokenService.revokeAllUserTokens(usuario.id_usuario);
      logger.info('Refresh tokens invalidados después de reset de contraseña', {
        userId: usuario.id_usuario
      });
    } catch (tokenError) {
      logger.warn('Error invalidando refresh tokens (no crítico)', {
        error: tokenError.message
      });
    }

    // Enviar notificación por email (en background)
    setImmediate(async () => {
      try {
        const emailService = (await import('../services/emailService.js')).default;
        await emailService.sendPasswordChangedNotification(
          usuario.email,
          new Date().toLocaleString('es-MX'),
          ipAddress
        );
      } catch (emailError) {
        logger.warn('Error enviando notificación de cambio (no crítico)', {
          error: emailError.message
        });
      }
    });

    logger.info('Contraseña reseteada exitosamente', {
      userId: usuario.id_usuario,
      email: usuario.email.substring(0, 3) + '***',
      tokenId: resetToken.id_token,
      ip: ipAddress
    });

    res.json({
      success: true,
      message: 'Contraseña restablecida exitosamente. Por favor, inicia sesión con tu nueva contraseña.'
    });

  } catch (error) {
    logger.error('Error en reset-password', {
      error: error.message,
      stack: error.stack,
      token: req.body.token?.substring(0, 10) + '***'
    });
    res.status(500).json({ 
      success: false,
      error: 'Error al restablecer contraseña',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Cambiar contraseña de otro usuario (solo Admin, sin requerir contraseña actual)
 * PUT /api/auth/admin/change-password
 * 
 * Requiere:
 * - Token JWT válido (Admin autenticado)
 * - Email del usuario o userId
 * - Nueva contraseña
 * 
 * Solo Admin puede usar este endpoint para cambiar contraseñas de otros usuarios
 */
export const adminChangePassword = async (req, res) => {
  try {
    const { email, userId, newPassword } = req.body;
    const authenticatedUserId = req.user?.id_usuario || req.user?.id;
    const userRole = req.user?.rol;

    // Validar que sea Admin
    if (userRole !== 'Admin' && userRole !== 'admin' && userRole !== 'administrador') {
      return res.status(403).json({ 
        success: false,
        error: 'Solo los administradores pueden usar este endpoint'
      });
    }

    // Validación de datos
    if (!newPassword) {
      return res.status(400).json({ 
        success: false,
        error: 'Nueva contraseña es requerida'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false,
        error: 'La contraseña debe tener al menos 8 caracteres'
      });
    }

    // Buscar usuario por email o userId
    let usuario;
    if (userId) {
      usuario = await Usuario.findByPk(userId);
    } else if (email) {
      usuario = await Usuario.findOne({ 
        where: { email: email.trim().toLowerCase() } 
      });
    } else {
      return res.status(400).json({ 
        success: false,
        error: 'Email o userId es requerido'
      });
    }

    if (!usuario) {
      return res.status(404).json({ 
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Validar que el rol sea Doctor o Admin
    if (!['Doctor', 'Admin'].includes(usuario.rol)) {
      return res.status(403).json({ 
        success: false,
        error: 'Solo se pueden cambiar contraseñas de doctores y administradores'
      });
    }

    // Validar que la nueva contraseña sea diferente a la actual
    const isSamePassword = await bcrypt.compare(newPassword, usuario.password_hash);
    if (isSamePassword) {
      return res.status(400).json({ 
        success: false,
        error: 'La nueva contraseña debe ser diferente a la actual'
      });
    }

    // Hashear nueva contraseña
    logger.info('Admin cambiando contraseña de usuario', { 
      targetUserId: usuario.id_usuario,
      targetEmail: usuario.email,
      changedBy: authenticatedUserId 
    });
    
    const password_hash = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña
    await usuario.update({ 
      password_hash: password_hash,
      fecha_actualizacion: new Date()
    });

    // Invalidar todos los refresh tokens del usuario (forzar re-login)
    try {
      const RefreshTokenService = (await import('../services/refreshTokenService.js')).default;
      await RefreshTokenService.revokeAllUserTokens(usuario.id_usuario);
      logger.info('Refresh tokens invalidados después de cambio de contraseña por admin', {
        userId: usuario.id_usuario
      });
    } catch (tokenError) {
      logger.warn('Error invalidando refresh tokens (no crítico)', {
        error: tokenError.message
      });
    }

    // Enviar notificación por email (en background)
    setImmediate(async () => {
      try {
        const emailService = (await import('../services/emailService.js')).default;
        await emailService.sendPasswordChangedNotification(
          usuario.email,
          new Date().toLocaleString('es-MX'),
          req.ip || 'Admin'
        );
      } catch (emailError) {
        logger.warn('Error enviando notificación de cambio (no crítico)', {
          error: emailError.message
        });
      }
    });
    
    logger.info('Contraseña cambiada exitosamente por admin', { 
      targetUserId: usuario.id_usuario,
      targetEmail: usuario.email,
      changedBy: authenticatedUserId
    });

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente',
      usuario: {
        id_usuario: usuario.id_usuario,
        email: usuario.email,
        rol: usuario.rol
      }
    });

  } catch (error) {
    logger.error('Error al cambiar contraseña (admin)', {
      error: error.message,
      stack: error.stack,
      email: req.body.email,
      userId: req.body.userId
    });
    res.status(500).json({ 
      success: false,
      error: 'Error al cambiar contraseña',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Endpoint legacy: updatePassword (DEPRECATED - mantener para compatibilidad)
 * Mantenido para compatibilidad pero marcado como deprecated
 * PUT /api/auth/update-password
 * 
 * NOTA: Este endpoint ahora redirige a adminChangePassword si el usuario es Admin autenticado
 */
export const updatePassword = async (req, res) => {
  // Si el usuario está autenticado y es Admin, usar adminChangePassword
  if (req.user && (req.user.rol === 'Admin' || req.user.rol === 'admin' || req.user.rol === 'administrador')) {
    logger.info('⚠️ Endpoint updatePassword usado por Admin, redirigiendo a adminChangePassword', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Llamar a adminChangePassword con los mismos parámetros
    return adminChangePassword(req, res);
  }

  logger.warn('⚠️ Endpoint updatePassword usado (DEPRECATED). Usar changePassword en su lugar.', {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  return res.status(410).json({
    success: false,
    error: 'Endpoint deprecated',
    message: 'Este endpoint ha sido deshabilitado por razones de seguridad. Por favor, usa PUT /api/auth/change-password que requiere autenticación y validación de contraseña actual.',
    newEndpoint: '/api/auth/change-password',
    migrationGuide: {
      old: 'PUT /api/auth/update-password con { email, newPassword }',
      new: 'PUT /api/auth/change-password con { currentPassword, newPassword } (requiere autenticación JWT)'
    }
  });
};