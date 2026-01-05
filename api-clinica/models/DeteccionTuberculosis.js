import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const DeteccionTuberculosis = sequelize.define('DeteccionTuberculosis', {
  id_deteccion_tb: {
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
  fecha_deteccion: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Fecha de detección de tuberculosis'
  },
  aplicacion_encuesta: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Aplicación de ENCUESTA de Tuberculosis (1=SI, 0=NO)'
  },
  baciloscopia_realizada: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Se realizó baciloscopia (1=SI, 0=NO)'
  },
  baciloscopia_resultado: {
    type: DataTypes.ENUM('positivo', 'negativo', 'pendiente', 'no_aplicable'),
    allowNull: true,
    defaultValue: null,
    comment: '⑬ En caso de Baciloscopia anote el resultado'
  },
  ingreso_tratamiento: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '¿Ingresó a tratamiento? (1=SI, 0=NO)'
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
  tableName: 'deteccion_tuberculosis',
  timestamps: false,
  indexes: [
    { fields: ['id_paciente'], name: 'idx_paciente' },
    { fields: ['id_cita'], name: 'idx_cita' },
    { fields: ['fecha_deteccion'], name: 'idx_fecha_deteccion' },
    { fields: ['baciloscopia_resultado'], name: 'idx_baciloscopia_resultado' },
    { fields: ['id_paciente', 'fecha_deteccion'], name: 'idx_paciente_fecha' }
  ]
});

export default DeteccionTuberculosis;

