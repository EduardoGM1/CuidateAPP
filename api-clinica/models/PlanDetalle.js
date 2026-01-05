import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { applyEncryptionHooks, ENCRYPTED_FIELDS_PLAN_DETALLE } from '../middlewares/encryptionHooks.js';

const PlanDetalle = sequelize.define('PlanDetalle', {
  id_detalle: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  id_plan: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  id_medicamento: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  dosis: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: null
  },
  frecuencia: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: null
  },
  horario: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: null,
    comment: 'Horario único (mantener para compatibilidad hacia atrás)'
  },
  horarios: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null,
    comment: 'Array de horarios en formato JSON: ["HH:MM", "HH:MM"]'
  },
  via_administracion: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: null
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
    comment: 'Observaciones del detalle del plan encriptadas con AES-256-GCM (NOM-004-SSA3-2012, HIPAA)'
  }
}, {
  tableName: 'plan_detalle',
  timestamps: false
});

// Aplicar hooks de encriptación para campos sensibles
applyEncryptionHooks(PlanDetalle, ENCRYPTED_FIELDS_PLAN_DETALLE);

export default PlanDetalle;