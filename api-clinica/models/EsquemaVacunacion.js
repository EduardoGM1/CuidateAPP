import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { applyEncryptionHooks, ENCRYPTED_FIELDS_ESQUEMA_VACUNACION } from '../middlewares/encryptionHooks.js';

const EsquemaVacunacion = sequelize.define('EsquemaVacunacion', {
  id_esquema: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  id_paciente: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  vacuna: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  fecha_aplicacion: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  lote: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: null
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
    comment: 'Observaciones del esquema de vacunación encriptadas con AES-256-GCM (NOM-004-SSA3-2012, HIPAA)'
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'esquema_vacunacion',
  timestamps: false
});

// Aplicar hooks de encriptación para campos sensibles
applyEncryptionHooks(EsquemaVacunacion, ENCRYPTED_FIELDS_ESQUEMA_VACUNACION);

export default EsquemaVacunacion;