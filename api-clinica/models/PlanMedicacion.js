import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { applyEncryptionHooks, ENCRYPTED_FIELDS_PLAN_MEDICACION } from '../middlewares/encryptionHooks.js';

const PlanMedicacion = sequelize.define('PlanMedicacion', {
  id_plan: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  id_paciente: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  id_doctor: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null
  },
  id_cita: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null
  },
  fecha_inicio: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    defaultValue: null
  },
  fecha_fin: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    defaultValue: null
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
    comment: 'Observaciones del plan de medicación encriptadas con AES-256-GCM (NOM-004-SSA3-2012, HIPAA)'
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'planes_medicacion',
  timestamps: false
});

// Aplicar hooks de encriptación para campos sensibles
applyEncryptionHooks(PlanMedicacion, ENCRYPTED_FIELDS_PLAN_MEDICACION);

export default PlanMedicacion;