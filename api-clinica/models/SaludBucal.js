import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const SaludBucal = sequelize.define('SaludBucal', {
  id_salud_bucal: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  id_paciente: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'pacientes',
      key: 'id_paciente'
    }
  },
  id_cita: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    references: {
      model: 'citas',
      key: 'id_cita'
    }
  },
  fecha_registro: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Fecha del registro de salud bucal'
  },
  presenta_enfermedades_odontologicas: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '⑫ ¿Presenta enfermedades odontológicas? (1=SI, 0=NO)'
  },
  recibio_tratamiento_odontologico: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '¿Recibió tratamiento odontológico? (1=SI, 0=NO)'
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'salud_bucal',
  timestamps: false,
  indexes: [
    { fields: ['id_paciente'], name: 'idx_paciente' },
    { fields: ['id_cita'], name: 'idx_cita' },
    { fields: ['fecha_registro'], name: 'idx_fecha_registro' },
    { fields: ['id_paciente', 'fecha_registro'], name: 'idx_paciente_fecha' }
  ]
});

export default SaludBucal;

