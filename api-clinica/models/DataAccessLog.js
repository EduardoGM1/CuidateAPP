import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const DataAccessLog = sequelize.define(
  'DataAccessLog',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Usuario que accedió (Doctor/Admin)',
    },
    rol: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    accion: {
      type: DataTypes.STRING(64),
      allowNull: false,
      comment: 'Ej. READ_PACIENTE_FICHA',
    },
    recurso_tipo: {
      type: DataTypes.STRING(64),
      allowNull: false,
      comment: 'Ej. paciente',
    },
    id_recurso: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Ej. id_paciente',
    },
    ip_address: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
  },
  {
    tableName: 'data_access_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    underscored: true,
  }
);

export default DataAccessLog;
