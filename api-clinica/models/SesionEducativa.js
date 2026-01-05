import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const SesionEducativa = sequelize.define('SesionEducativa', {
  id_sesion: {
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
  fecha_sesion: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Fecha de la sesión educativa'
  },
  asistio: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Asistió a sesión educativa (1=SI, 0=NO)'
  },
  tipo_sesion: {
    type: DataTypes.ENUM(
      'nutricional',
      'actividad_fisica',
      'medico_preventiva',
      'trabajo_social',
      'psicologica',
      'odontologica'
    ),
    allowNull: false,
    comment: 'Tipo de intervención educativa'
  },
  numero_intervenciones: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'N° de intervenciones en el mes por integrante'
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
  tableName: 'sesiones_educativas',
  timestamps: false,
  indexes: [
    { fields: ['id_paciente'], name: 'idx_paciente' },
    { fields: ['id_cita'], name: 'idx_cita' },
    { fields: ['fecha_sesion'], name: 'idx_fecha_sesion' },
    { fields: ['tipo_sesion'], name: 'idx_tipo_sesion' },
    { fields: ['id_paciente', 'fecha_sesion'], name: 'idx_paciente_fecha' }
  ]
});

export default SesionEducativa;

