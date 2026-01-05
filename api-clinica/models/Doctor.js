import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Doctor = sequelize.define('Doctor', {
  id_doctor: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    unique: true
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  apellido_paterno: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  apellido_materno: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: null
  },
  telefono: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: null
  },
  institucion_hospitalaria: {
    type: DataTypes.STRING(150),
    allowNull: true,
    defaultValue: null
  },
  grado_estudio: {
    type: DataTypes.STRING(120),
    allowNull: true,
    defaultValue: null
  },
  anos_servicio: {
    type: DataTypes.SMALLINT.UNSIGNED,
    allowNull: true,
    defaultValue: null
  },
  id_modulo: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null
  },
  fecha_registro: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true
  }
}, {
  tableName: 'doctores',
  timestamps: false
});

export default Doctor;