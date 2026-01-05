import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

/**
 * Modelo unificado para todas las credenciales de autenticación
 * Reemplaza: PacienteAuth, PacienteAuthPIN, PacienteAuthBiometric
 * Soporta: password, pin, biometric, totp (futuro)
 */
const AuthCredential = sequelize.define('AuthCredential', {
  id_credential: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  user_type: {
    type: DataTypes.ENUM('Usuario', 'Paciente', 'Doctor', 'Admin'),
    allowNull: false,
    comment: 'Tipo de usuario: Usuario para sistema antiguo, Paciente/Doctor/Admin para nuevo'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID del usuario según user_type'
  },
  auth_method: {
    type: DataTypes.ENUM('password', 'pin', 'biometric', 'totp'),
    allowNull: false,
    comment: 'Método de autenticación'
  },
  credential_value: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Hash de password/pin, public key para biometric, secret para totp'
  },
  credential_salt: {
    type: DataTypes.STRING(64),
    allowNull: true,
    comment: 'Salt adicional (usado para PIN legacy, puede ser NULL para bcrypt que incluye salt)'
  },
  device_id: {
    type: DataTypes.STRING(128),
    allowNull: true,
    comment: 'ID único del dispositivo (para PIN/biometric)'
  },
  device_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Nombre descriptivo del dispositivo'
  },
  device_type: {
    type: DataTypes.ENUM('mobile', 'tablet', 'web', 'desktop'),
    allowNull: true,
    comment: 'Tipo de dispositivo'
  },
  credential_metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Datos adicionales: {biometric_type, last_challenge, etc.}'
  },
  is_primary: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Si es la credencial principal del usuario'
  },
  failed_attempts: {
    type: DataTypes.SMALLINT.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
    comment: 'Intentos fallidos de autenticación'
  },
  locked_until: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Fecha hasta la cual está bloqueada la cuenta'
  },
  last_used: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Última vez que se usó esta credencial'
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Fecha de expiración de la credencial (si aplica)'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: true,
    onUpdate: DataTypes.NOW
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Si la credencial está activa'
  }
}, {
  tableName: 'auth_credentials',
  timestamps: false, // Usamos created_at/updated_at manuales
  indexes: [
    {
      unique: false,
      fields: ['user_type', 'user_id', 'auth_method'],
      name: 'idx_user_lookup',
      comment: 'Búsqueda rápida por usuario y método'
    },
    {
      unique: false,
      fields: ['device_id', 'activo'],
      name: 'idx_device_lookup',
      comment: 'Búsqueda por dispositivo'
    },
    // Nota: No podemos indexar TEXT directamente, se hará búsqueda por hash en la lógica
    {
      unique: false,
      fields: ['locked_until'],
      name: 'idx_locked_until',
      comment: 'Búsqueda de cuentas bloqueadas'
    },
    {
      unique: false,
      fields: ['user_type', 'user_id', 'is_primary'],
      name: 'idx_primary_credential',
      comment: 'Búsqueda de credencial primaria'
    }
  ]
});

export default AuthCredential;

