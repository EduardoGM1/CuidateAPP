import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { applyEncryptionHooks, ENCRYPTED_FIELDS_CITA } from '../middlewares/encryptionHooks.js';

const Cita = sequelize.define('Cita', {
  id_cita: {
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
  fecha_cita: {
    type: DataTypes.DATE,
    allowNull: false
  },
  estado: {
    type: DataTypes.ENUM('pendiente', 'atendida', 'no_asistida', 'reprogramada', 'cancelada'),
    allowNull: true,
    defaultValue: 'pendiente'
  },
  asistencia: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: null
  },
  fecha_reprogramada: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    defaultValue: null
  },
  motivo_reprogramacion: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null
  },
  solicitado_por: {
    type: DataTypes.ENUM('paciente', 'doctor', 'admin'),
    allowNull: true,
    defaultValue: null
  },
  fecha_solicitud_reprogramacion: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null
  },
  motivo: {
    type: DataTypes.TEXT, // Cambiar a TEXT para almacenar datos encriptados
    allowNull: true,
    defaultValue: null,
    comment: 'Motivo de la cita encriptado con AES-256-GCM (NOM-004-SSA3-2012, HIPAA)'
  },
  es_primera_consulta: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
    comment: 'Observaciones de la cita encriptadas con AES-256-GCM (NOM-004-SSA3-2012, HIPAA)'
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'citas',
  timestamps: false
});

// Aplicar hooks de encriptación para campos sensibles
applyEncryptionHooks(Cita, ENCRYPTED_FIELDS_CITA);

export default Cita;