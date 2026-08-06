import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Op } from 'sequelize';
import { Usuario, PasswordResetToken } from '../models/associations.js';
import sequelize from '../config/db.js';
import { SecurityValidator } from '../middlewares/securityValidator.js';
import MassAssignmentProtection from '../middlewares/massAssignmentProtection.js';
import logger from '../utils/logger.js';
import emailService from '../services/emailService.js';
import { AUTH_ACCOUNT_DISABLED_MESSAGE } from '../utils/constants.js';
import { isValidEmailFormat } from '../utils/emailValidation.js';

const PASSWORD_MAX_LENGTH = 20;

export const register = async (req, res) => {
  try {
    logger.info('Register request received', { 
      email: req.body.email,
      rolSolicitado: req.body.rol 
    });
    const { email, password, rol: rolSolicitado } = req.body;
    
    // Validación adicional de datos recibidos
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Datos faltantes',
        details: {
          email_received: !!email,
          password_received: !!password,
        }
      });
    }

    // Registro público: solo Paciente. Roles privilegiados → POST /api/auth/usuarios (Admin).
    const rolNormalizado = String(rolSolicitado || 'Paciente').trim();
    if (rolNormalizado && !/^paciente$/i.test(rolNormalizado)) {
      return res.status(403).json({
        success: false,
        error: 'No autorizado',
        message: 'El registro público solo permite rol Paciente. Un Admin debe crear Doctor/Admin vía POST /api/auth/usuarios.',
      });
    }
    const rol = 'Paciente';
    
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
      rol
    });

    setImmediate(() => {
      const nombre = (email && email.split('@')[0]) ? email.split('@')[0] : 'Usuario';
      emailService.sendWelcomeEmail(usuario.email, nombre, usuario.rol).catch(() => {});
    });

    // Generar par de tokens (access + refresh)
    const RefreshTokenService = (await import('../services/refreshTokenService.js')).default;
    const tokenPair = await RefreshTokenService.generateTokenPair({
      id: usuario.id_usuario,
      email: usuario.email,
      rol: usuario.rol
    }, usuario.rol); // Pasar rol como userType para usar tiempos correctos según rol

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

function normalizeRolUsuarioFilter(rol) {
  const r = (rol || '').toString().trim().toLowerCase();
  if (r === 'admin') return 'Admin';
  if (r === 'doctor') return 'Doctor';
  if (r === 'paciente') return 'Paciente';
  return null;
}

function validatePrivilegedPasswordStrength(password, rol = 'Admin') {
  const p = String(password || '');
  if (!/[A-Z]/.test(p)) return `Para cuentas ${rol}, la contraseña debe incluir al menos una letra mayúscula`;
  if (!/\d/.test(p)) return `Para cuentas ${rol}, la contraseña debe incluir al menos un número`;
  if (!/[^A-Za-z0-9]/.test(p)) return `Para cuentas ${rol}, la contraseña debe incluir al menos un símbolo`;
  return null;
}

// Listar usuarios para vincular con perfiles (legacy - mantiene compatibilidad)
// Query opcional: estado=activos|inactivos|todos, search=email parcial, rol=Admin|Doctor|Paciente, modulo=id (cuentas doctor en ese módulo)
export const getUsuarios = async (req, res) => {
  try {
    const { Usuario, Doctor, Paciente } = await import('../models/associations.js');

    const estadoParam = req.query.estado;
    const estadoRaw = (
      estadoParam != null && String(estadoParam).trim() !== ''
        ? String(estadoParam)
        : req.query.includeInactive === 'true'
          ? 'todos'
          : 'activos'
    )
      .toString()
      .toLowerCase();
    const estado = ['activos', 'inactivos', 'todos'].includes(estadoRaw) ? estadoRaw : 'activos';

    const searchRaw = (req.query.search || '').trim().slice(0, 100);
    const safeSearch = searchRaw.replace(/[%_]/g, '');

    const rolNormalized = normalizeRolUsuarioFilter(req.query.rol);
    const moduloStr = req.query.modulo;
    const moduloId =
      moduloStr !== undefined && moduloStr !== '' && moduloStr != null
        ? parseInt(String(moduloStr), 10)
        : NaN;

    const whereClause = {};
    if (estado === 'inactivos') {
      whereClause.activo = false;
    } else if (estado === 'activos') {
      whereClause.activo = true;
    }

    if (safeSearch) {
      whereClause.email = { [Op.iLike]: `%${safeSearch}%` };
    }
    if (rolNormalized) {
      whereClause.rol = rolNormalized;
    }

    if (!Number.isNaN(moduloId) && moduloId > 0) {
      const docs = await Doctor.findAll({
        attributes: ['id_usuario'],
        where: { id_modulo: moduloId },
        raw: true,
      });
      const userIdsInMod = [...new Set(docs.map((d) => d.id_usuario).filter(Boolean))];
      if (userIdsInMod.length === 0) {
        return res.json({
          todos_usuarios: [],
          usuarios_sin_perfil: [],
          total: 0,
          sin_perfil_count: 0,
        });
      }
      whereClause.id_usuario = { [Op.in]: userIdsInMod };
    }

    const usuarios = await Usuario.findAll({
      attributes: ['id_usuario', 'email', 'rol', 'activo', 'fecha_creacion', 'ultimo_login'],
      where: whereClause,
      include: [
        {
          model: Doctor,
          required: false,
          attributes: ['id_doctor', 'nombre', 'apellido_paterno'],
        },
        {
          model: Paciente,
          required: false,
          attributes: ['id_paciente', 'activo', 'fecha_baja', 'motivo_baja'],
        },
      ],
      order: [['fecha_creacion', 'DESC']],
    });

    const usuariosConEstado = usuarios.map((usuario) => {
      const pac = usuario.Paciente;
      const pacientePerfil =
        usuario.rol === 'Paciente' && pac
          ? {
              id_paciente: pac.id_paciente,
              activo: pac.activo,
              fecha_baja: pac.fecha_baja,
              motivo_baja: pac.motivo_baja,
            }
          : null;

      return {
        id_usuario: usuario.id_usuario,
        email: usuario.email,
        rol: usuario.rol,
        activo: usuario.activo,
        fecha_creacion: usuario.fecha_creacion,
        ultimo_login: usuario.ultimo_login,
        tiene_perfil:
          usuario.rol === 'Doctor'
            ? !!usuario.Doctor
            : usuario.rol === 'Paciente'
              ? !!pac
              : true,
        perfil_completo: usuario.Doctor
          ? {
              nombre: usuario.Doctor.nombre,
              apellido: usuario.Doctor.apellido_paterno,
            }
          : null,
        paciente_perfil: pacientePerfil,
      };
    });
    
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
 * Body: { email, rol [, password ] } o { email, rol, invite: true } (sin contraseña; se envía correo para confirmar y crear contraseña)
 */
export const createUsuario = async (req, res) => {
  try {
    const { email, password, rol, invite } = req.body;
    const isInvite = invite === true || invite === 'true';

    if (!email || !rol) {
      return res.status(400).json({
        success: false,
        error: 'Email y rol son requeridos',
      });
    }

    if (!['Paciente', 'Doctor', 'Admin'].includes(rol)) {
      return res.status(400).json({
        success: false,
        error: 'Rol inválido. Debe ser: Paciente, Doctor o Admin',
      });
    }

    if (!isValidEmailFormat(email)) {
      return res.status(400).json({
        success: false,
        error: 'Formato de email inválido',
      });
    }

    if (!isInvite) {
      if (!password) {
        return res.status(400).json({
          success: false,
          error: 'La contraseña es requerida cuando no se usa invitación',
        });
      }
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'La contraseña debe tener al menos 8 caracteres',
        });
      }
      if (password.length > PASSWORD_MAX_LENGTH) {
        return res.status(400).json({
          success: false,
          error: `La contraseña no debe exceder ${PASSWORD_MAX_LENGTH} caracteres`,
        });
      }
      if (rol === 'Admin' || rol === 'Doctor') {
        const privilegedPwdError = validatePrivilegedPasswordStrength(password, rol);
        if (privilegedPwdError) {
          return res.status(400).json({
            success: false,
            error: privilegedPwdError,
          });
        }
      }
    }

    const emailNormalized = email.trim().toLowerCase();
    logger.info(`Creando usuario: ${emailNormalized}, rol: ${rol}, invite: ${isInvite}`);

    const usuarioExistente = await Usuario.findOne({ where: { email: emailNormalized } });
    if (usuarioExistente) {
      return res.status(409).json({
        success: false,
        error: 'El email ya está registrado',
      });
    }

    let password_hash;
    if (isInvite) {
      const randomSecret = crypto.randomBytes(32).toString('hex');
      password_hash = await bcrypt.hash(randomSecret, 10);
    } else {
      password_hash = await bcrypt.hash(password, 10);
    }

    const nuevoUsuario = await Usuario.create({
      email: emailNormalized,
      password_hash,
      rol,
    });

    if (isInvite) {
      const token = crypto.randomBytes(32).toString('hex');
      const fechaExpiracion = new Date();
      fechaExpiracion.setHours(fechaExpiracion.getHours() + 24);

      await PasswordResetToken.update(
        { usado: true },
        {
          where: {
            id_usuario: nuevoUsuario.id_usuario,
            usado: false,
            fecha_expiracion: { [Op.gt]: new Date() },
          },
        }
      );

      await PasswordResetToken.create({
        id_usuario: nuevoUsuario.id_usuario,
        token,
        fecha_expiracion: fechaExpiracion,
        ip_address: req.ip || req.connection?.remoteAddress,
        user_agent: req.get('User-Agent'),
      });

      const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
      const confirmUrl = `${baseUrl}/confirmar-cuenta?token=${token}`;
      const nombre = (nuevoUsuario.email && nuevoUsuario.email.split('@')[0]) ? nuevoUsuario.email.split('@')[0] : 'Usuario';

      setImmediate(async () => {
        try {
          await emailService.sendInviteConfirmEmail(nuevoUsuario.email, nombre, nuevoUsuario.rol, confirmUrl);
        } catch (emailErr) {
          logger.error('Error enviando email de invitación (no crítico)', {
            error: emailErr.message,
            userId: nuevoUsuario.id_usuario,
          });
        }
      });

      logger.info(`Usuario creado por invitación: ${nuevoUsuario.email} (ID: ${nuevoUsuario.id_usuario}), email enviado`);
      return res.status(201).json({
        success: true,
        message: 'Usuario creado. Se envió un correo para que confirme su cuenta y cree su contraseña.',
        usuario: {
          id_usuario: nuevoUsuario.id_usuario,
          email: nuevoUsuario.email,
          rol: nuevoUsuario.rol,
          activo: nuevoUsuario.activo,
          fecha_creacion: nuevoUsuario.fecha_creacion,
        },
      });
    }

    setImmediate(() => {
      const nombre = (nuevoUsuario.email && nuevoUsuario.email.split('@')[0]) ? nuevoUsuario.email.split('@')[0] : 'Usuario';
      emailService.sendWelcomeEmail(nuevoUsuario.email, nombre, nuevoUsuario.rol).catch(() => {});
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
        fecha_creacion: nuevoUsuario.fecha_creacion,
      },
    });
  } catch (error) {
    logger.error('Error creando usuario', error);
    res.status(500).json({
      success: false,
      error: error.message,
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
      if (!isValidEmailFormat(email)) {
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
      if (password.length < 8) {
        return res.status(400).json({ 
          success: false,
          error: 'La contraseña debe tener al menos 8 caracteres' 
        });
      }
      if (password.length > PASSWORD_MAX_LENGTH) {
        return res.status(400).json({
          success: false,
          error: `La contraseña no debe exceder ${PASSWORD_MAX_LENGTH} caracteres`,
        });
      }
      const targetRol = rol || usuario.rol;
      if (targetRol === 'Admin' || targetRol === 'Doctor') {
        const privilegedPwdError = validatePrivilegedPasswordStrength(password, targetRol);
        if (privilegedPwdError) {
          return res.status(400).json({
            success: false,
            error: privilegedPwdError,
          });
        }
      }
      dataToUpdate.password_hash = await bcrypt.hash(password, 10);
    }

    const mustCascadeDeactivate = activo === false && usuario.activo !== false;
    const mustCascadeReactivate = activo === true && usuario.activo === false;

    if (mustCascadeDeactivate) {
      const t = await sequelize.transaction();
      try {
        const { cascadeDeactivateLinkedProfiles } = await import('../services/usuarioDeactivateRules.js');
        await cascadeDeactivateLinkedProfiles(usuario.id_usuario, usuario.rol, t);
        await usuario.update(dataToUpdate, { transaction: t });
        await t.commit();
      } catch (txErr) {
        await t.rollback();
        throw txErr;
      }
    } else if (mustCascadeReactivate) {
      const t = await sequelize.transaction();
      try {
        const { cascadeReactivateLinkedProfiles } = await import('../services/usuarioDeactivateRules.js');
        await cascadeReactivateLinkedProfiles(usuario.id_usuario, usuario.rol, t);
        await usuario.update(dataToUpdate, { transaction: t });
        await t.commit();
      } catch (txErr) {
        await t.rollback();
        throw txErr;
      }
    } else {
      await usuario.update(dataToUpdate);
    }

    if (mustCascadeReactivate) {
      try {
        await usuario.reload({ attributes: ['email', 'rol', 'activo'] });
        const nombre =
          usuario.email && usuario.email.includes('@')
            ? usuario.email.split('@')[0]
            : 'Usuario';
        await emailService.sendAccountReactivatedEmail(usuario.email, {
          nombre,
          rol: usuario.rol || 'Usuario',
        });
      } catch (mailErr) {
        logger.warn('Reactivación: no se pudo enviar email al usuario (no crítico)', {
          userId: id,
          error: mailErr?.message,
        });
      }
    }
    
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
 * Desactivar usuario (solo Admin). Baja lógica: activo = false (no borra la fila).
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
    
    logger.info(`Desactivando usuario ID ${id}`);
    
    const usuario = await Usuario.findByPk(id);
    
    if (!usuario) {
      return res.status(404).json({ 
        success: false,
        error: 'Usuario no encontrado' 
      });
    }
    
    const t = await sequelize.transaction();
    try {
      const { cascadeDeactivateLinkedProfiles } = await import('../services/usuarioDeactivateRules.js');
      await cascadeDeactivateLinkedProfiles(usuario.id_usuario, usuario.rol, t);
      await usuario.update({ activo: false }, { transaction: t });
      await t.commit();
    } catch (txErr) {
      await t.rollback();
      throw txErr;
    }
    
    logger.info(`Usuario ${usuario.email} desactivado exitosamente`);
    
    return res.json({
      success: true,
      message: 'Usuario desactivado exitosamente'
    });
  } catch (error) {
    logger.error('Error desactivando usuario', error);
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

    const emailNorm = email.trim().toLowerCase();
    const usuarioPorEmail = await Usuario.findOne({
      where: { email: emailNorm },
    });

    if (!usuarioPorEmail) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas',
      });
    }

    if (!usuarioPorEmail.activo) {
      return res.status(403).json({
        success: false,
        error: AUTH_ACCOUNT_DISABLED_MESSAGE,
        code: 'ACCOUNT_DISABLED',
      });
    }

    const usuario = usuarioPorEmail;

    // Validar rol
    if (!['Doctor', 'Admin'].includes(usuario.rol)) {
      return res.status(403).json({
        success: false,
        error: 'Este endpoint es solo para Doctores y Administradores'
      });
    }

    // 1) Intentar sistema unificado (auth_credentials); 2) Fallback a usuarios.password_hash
    const UnifiedAuthService = (await import('../services/unifiedAuthService.js')).default;
    let passwordValid = false;

    try {
      await UnifiedAuthService.authenticate(
        usuario.rol,
        usuario.id_usuario,
        { method: 'password', credential: password }
      );
      passwordValid = true;
    } catch (authError) {
      logger.debug('Auth unificado falló, intentando password_hash', { email, error: authError.message });
      if (usuario.password_hash) {
        try {
          passwordValid = await bcrypt.compare(password, usuario.password_hash);
        } catch (_) {
          passwordValid = false;
        }
      } else {
        passwordValid = false;
      }
    }

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    try {
      // Actualizar último login
      await usuario.update({ ultimo_login: new Date() });

      // Si es Doctor, obtener perfil (id + nombre para UI de bienvenida)
      let id_doctor = null;
      let doctorProfile = {};
      if (usuario.rol === 'Doctor') {
        const { Doctor } = await import('../models/associations.js');
        const doctor = await Doctor.findOne({
          where: { id_usuario: usuario.id_usuario },
          attributes: ['id_doctor', 'nombre', 'apellido_paterno', 'apellido_materno']
        });
        if (doctor) {
          id_doctor = doctor.id_doctor;
          const d = doctor.toJSON ? doctor.toJSON() : doctor;
          doctorProfile = {
            nombre: d.nombre ?? null,
            apellido_paterno: d.apellido_paterno ?? null,
            apellido_materno: d.apellido_materno ?? null,
          };
        }
      }

      // Generar refresh token usando el nuevo servicio con tiempos según rol
      const RefreshTokenService = (await import('../services/refreshTokenService.js')).default;
      const tokenPair = await RefreshTokenService.generateTokenPair({
        id: usuario.id_usuario,
        email: usuario.email,
        rol: usuario.rol
      }, usuario.rol);

      res.json({
        success: true,
        message: 'Login exitoso',
        token: tokenPair.accessToken,
        refresh_token: tokenPair.refreshToken,
        expires_in: tokenPair.expiresIn,
        refresh_token_expires_in: tokenPair.refreshTokenExpiresIn,
        usuario: {
          id: usuario.id_usuario,
          id_usuario: usuario.id_usuario,
          email: usuario.email,
          rol: usuario.rol,
          ...(id_doctor && { id_doctor }),
          ...doctorProfile
        }
      });
    } catch (err) {
      logger.error('Error generando token en login', { error: err.message, stack: err.stack });
      const message = process.env.NODE_ENV === 'development' ? err.message : 'Error en el servidor';
      return res.status(500).json({ success: false, error: message });
    }

  } catch (error) {
    logger.error('Error en login', { error: error.message, stack: error.stack });
    const message = process.env.NODE_ENV === 'development' ? error.message : 'Error en el servidor';
    res.status(500).json({
      success: false,
      error: message
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
    if (newPassword.length > PASSWORD_MAX_LENGTH) {
      return res.status(400).json({
        success: false,
        error: `La nueva contraseña no debe exceder ${PASSWORD_MAX_LENGTH} caracteres`,
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
    if (newPassword.length > PASSWORD_MAX_LENGTH) {
      return res.status(400).json({
        success: false,
        error: `La contraseña no debe exceder ${PASSWORD_MAX_LENGTH} caracteres`,
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
    if (newPassword.length > PASSWORD_MAX_LENGTH) {
      return res.status(400).json({
        success: false,
        error: `La contraseña no debe exceder ${PASSWORD_MAX_LENGTH} caracteres`,
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