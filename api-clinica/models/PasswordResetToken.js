import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import logger from '../utils/logger.js';

const PasswordResetToken = sequelize.define('PasswordResetToken', {
  id_token: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: 'ID único del token'
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID del usuario que solicita recuperación',
    references: {
      model: 'usuarios',
      key: 'id_usuario'
    },
    onDelete: 'CASCADE'
  },
  token: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    comment: 'Token único de recuperación'
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Fecha de creación del token'
  },
  fecha_expiracion: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Fecha de expiración del token (1 hora después de creación)'
  },
  usado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Indica si el token ya fue usado'
  },
  fecha_uso: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Fecha en que se usó el token'
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'IP desde donde se solicitó el reset'
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'User agent del navegador'
  }
}, {
  tableName: 'password_reset_tokens',
  timestamps: false,
  indexes: [
    {
      fields: ['token'],
      name: 'idx_token'
    },
    {
      fields: ['id_usuario'],
      name: 'idx_usuario'
    },
    {
      fields: ['fecha_expiracion'],
      name: 'idx_expiracion'
    },
    {
      fields: ['usado', 'fecha_expiracion'],
      name: 'idx_usado_expiracion'
    }
  ]
});

// Método para verificar si el token es válido
PasswordResetToken.prototype.isValid = function() {
  const now = new Date();
  return !this.usado && this.fecha_expiracion > now;
};

// Método para marcar como usado
PasswordResetToken.prototype.markAsUsed = async function() {
  this.usado = true;
  this.fecha_uso = new Date();
  await this.save();
};

export default PasswordResetToken;

