import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { applyEncryptionHooks, ENCRYPTED_FIELDS_DIAGNOSTICO } from '../middlewares/encryptionHooks.js';

const Diagnostico = sequelize.define('Diagnostico', {
  id_diagnostico: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  id_cita: {
    type: DataTypes.INTEGER,
    allowNull: true, // ✅ Corregido: id_cita es opcional
    defaultValue: null
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
    comment: 'Descripción del diagnóstico encriptada con AES-256-GCM (NOM-004-SSA3-2012, HIPAA §164.514)'
  },
  fecha_registro: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'diagnosticos',
  timestamps: false
});

// Aplicar hooks de encriptación para campos sensibles
applyEncryptionHooks(Diagnostico, ENCRYPTED_FIELDS_DIAGNOSTICO);

export default Diagnostico;