import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Usuario = sequelize.define('Usuario', {
  id_usuario: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  rol: {
    type: DataTypes.ENUM('Paciente', 'Doctor', 'Admin'),
    allowNull: false,
    defaultValue: 'Paciente'
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  ultimo_login: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  device_tokens: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null
  }
}, {
  tableName: 'usuarios',
  timestamps: false
});

export default Usuario;