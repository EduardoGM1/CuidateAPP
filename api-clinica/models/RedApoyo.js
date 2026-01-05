import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { applyEncryptionHooks, ENCRYPTED_FIELDS_RED_APOYO } from '../middlewares/encryptionHooks.js';

const RedApoyo = sequelize.define('RedApoyo', {
  id_red_apoyo: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  id_paciente: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  nombre_contacto: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  numero_celular: {
    type: DataTypes.TEXT, // Cambiar a TEXT para almacenar datos encriptados
    allowNull: true,
    defaultValue: null,
    comment: 'Número de celular encriptado con AES-256-GCM (LFPDPPP, HIPAA §164.514)'
  },
  email: {
    type: DataTypes.TEXT, // Cambiar a TEXT para almacenar datos encriptados
    allowNull: true,
    defaultValue: null,
    comment: 'Email encriptado con AES-256-GCM (LFPDPPP)'
  },
  direccion: {
    type: DataTypes.TEXT, // Cambiar a TEXT para almacenar datos encriptados
    allowNull: true,
    defaultValue: null,
    comment: 'Dirección encriptada con AES-256-GCM (LFPDPPP, HIPAA §164.514)'
  },
  localidad: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: null
  },
  parentesco: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: null
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'red_apoyo',
  timestamps: false
});

// Aplicar hooks de encriptación para campos sensibles
applyEncryptionHooks(RedApoyo, ENCRYPTED_FIELDS_RED_APOYO);

export default RedApoyo;