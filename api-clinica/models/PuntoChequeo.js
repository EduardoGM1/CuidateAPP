import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const PuntoChequeo = sequelize.define('PuntoChequeo', {
  id_chequeo: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  id_cita: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null
  },
  id_paciente: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  asistencia: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false
  },
  motivo_no_asistencia: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: null
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null
  },
  fecha_registro: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'puntos_chequeo',
  timestamps: false
});

export default PuntoChequeo;