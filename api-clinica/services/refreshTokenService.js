import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import sequelize from '../config/db.js';
import logger from '../utils/logger.js';

/**
 * Servicio de Refresh Tokens
 * 
 * Mejores prácticas implementadas:
 * - Refresh tokens almacenados en base de datos (revocables)
 * - Access tokens cortos (1 hora)
 * - Refresh tokens largos (7 días)
 * - Hash de refresh tokens antes de almacenar
 * - Rotación de refresh tokens
 * - Revocación de tokens
 * - Limpieza automática de tokens expirados
 */
class RefreshTokenService {
  /**
   * Crea un par de tokens (access + refresh)
   * @param {Object} payload - Payload para el token (id, email, rol)
   * @returns {Object} - { accessToken, refreshToken, expiresIn }
   */
  static async generateTokenPair(payload) {
    const accessTokenExpiresIn = process.env.ACCESS_TOKEN_EXPIRES_IN || '1h';
    const refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
    
    // Access token (corto)
    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: accessTokenExpiresIn }
    );
    
    // Refresh token (largo) - con jti (JWT ID) único
    const jti = crypto.randomBytes(16).toString('hex');
    const refreshTokenPayload = {
      ...payload,
      type: 'refresh',
      jti: jti
    };
    
    const refreshToken = jwt.sign(
      refreshTokenPayload,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: refreshTokenExpiresIn }
    );
    
    // Hashear refresh token antes de almacenar
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');
    
    // Calcular fecha de expiración
    const expiresAt = new Date();
    const days = parseInt(refreshTokenExpiresIn) || 7;
    expiresAt.setDate(expiresAt.getDate() + days);
    
    // Almacenar refresh token en base de datos
    await this.storeRefreshToken({
      userId: payload.id,
      userType: payload.rol || 'Usuario',
      tokenHash: refreshTokenHash,
      jti: jti,
      expiresAt: expiresAt,
      userAgent: null, // Se puede pasar desde req
      ipAddress: null  // Se puede pasar desde req
    });
    
    return {
      accessToken,
      refreshToken,
      expiresIn: accessTokenExpiresIn,
      refreshTokenExpiresIn: refreshTokenExpiresIn
    };
  }

  /**
   * Almacena un refresh token en la base de datos
   * @param {Object} tokenData - Datos del token
   */
  static async storeRefreshToken(tokenData) {
    try {
      const query = `
        INSERT INTO refresh_tokens (
          user_id,
          user_type,
          token_hash,
          jti,
          expires_at,
          user_agent,
          ip_address,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      
      await sequelize.query(query, {
        replacements: [
          tokenData.userId,
          tokenData.userType,
          tokenData.tokenHash,
          tokenData.jti,
          tokenData.expiresAt,
          tokenData.userAgent,
          tokenData.ipAddress
        ]
      });
      
      logger.debug('Refresh token almacenado', {
        userId: tokenData.userId,
        jti: tokenData.jti.substring(0, 8) + '...'
      });
    } catch (error) {
      logger.error('Error almacenando refresh token', {
        error: error.message,
        userId: tokenData.userId
      });
      throw error;
    }
  }

  /**
   * Verifica y renueva un refresh token
   * @param {string} refreshToken - Refresh token a verificar
   * @returns {Object} - Nuevo par de tokens
   */
  static async refreshAccessToken(refreshToken) {
    try {
      // Verificar firma del token
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
      );
      
      if (decoded.type !== 'refresh') {
        throw new Error('Token inválido: no es un refresh token');
      }
      
      // Verificar que el token existe en la base de datos y no está revocado
      const tokenHash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');
      
      const tokenRecord = await this.getRefreshToken(tokenHash, decoded.jti);
      
      if (!tokenRecord) {
        throw new Error('Refresh token no encontrado o revocado');
      }
      
      if (new Date() > new Date(tokenRecord.expires_at)) {
        throw new Error('Refresh token expirado');
      }
      
      // Revocar el token usado (rotación)
      await this.revokeRefreshToken(tokenHash, decoded.jti);
      
      // Generar nuevo par de tokens
      const newPayload = {
        id: decoded.id,
        email: decoded.email,
        rol: decoded.rol
      };
      
      return await this.generateTokenPair(newPayload);
    } catch (error) {
      logger.warn('Error renovando refresh token', {
        error: error.message
      });
      throw new Error('Refresh token inválido o expirado');
    }
  }

  /**
   * Obtiene un refresh token de la base de datos
   * @param {string} tokenHash - Hash del token
   * @param {string} jti - JWT ID
   * @returns {Object|null} - Token record o null
   */
  static async getRefreshToken(tokenHash, jti) {
    try {
      const query = `
        SELECT * FROM refresh_tokens
        WHERE token_hash = ? AND jti = ? AND revoked = FALSE
        LIMIT 1
      `;
      
      const [results] = await sequelize.query(query, {
        replacements: [tokenHash, jti]
      });
      
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      logger.error('Error obteniendo refresh token', {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Revoca un refresh token
   * @param {string} tokenHash - Hash del token
   * @param {string} jti - JWT ID
   */
  static async revokeRefreshToken(tokenHash, jti) {
    try {
      const query = `
        UPDATE refresh_tokens
        SET revoked = TRUE, revoked_at = NOW()
        WHERE token_hash = ? AND jti = ? AND revoked = FALSE
      `;
      
      await sequelize.query(query, {
        replacements: [tokenHash, jti]
      });
      
      logger.debug('Refresh token revocado', {
        jti: jti?.substring(0, 8) + '...'
      });
    } catch (error) {
      logger.error('Error revocando refresh token', {
        error: error.message
      });
    }
  }

  /**
   * Revoca todos los refresh tokens de un usuario
   * @param {number} userId - ID del usuario
   * @param {string} userType - Tipo de usuario
   */
  static async revokeAllUserTokens(userId, userType) {
    try {
      const query = `
        UPDATE refresh_tokens
        SET revoked = TRUE, revoked_at = NOW()
        WHERE user_id = ? AND user_type = ? AND revoked = FALSE
      `;
      
      await sequelize.query(query, {
        replacements: [userId, userType]
      });
      
      logger.info('Todos los refresh tokens revocados', {
        userId,
        userType
      });
    } catch (error) {
      logger.error('Error revocando todos los tokens', {
        error: error.message,
        userId
      });
    }
  }

  /**
   * Limpia tokens expirados de la base de datos
   */
  static async cleanupExpiredTokens() {
    try {
      const query = `
        DELETE FROM refresh_tokens
        WHERE expires_at < NOW() OR revoked = TRUE
      `;
      
      const [result] = await sequelize.query(query);
      
      logger.info('Tokens expirados limpiados', {
        deleted: result.affectedRows || 0
      });
    } catch (error) {
      logger.error('Error limpiando tokens expirados', {
        error: error.message
      });
    }
  }
}

export default RefreshTokenService;

