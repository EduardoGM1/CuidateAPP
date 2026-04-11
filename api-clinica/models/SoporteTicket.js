import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const SoporteTicket = sequelize.define(
  'SoporteTicket',
  {
    id_ticket: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_usuario_creador: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'id_usuario del doctor que abre el ticket',
    },
    asunto: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    categoria: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'otro',
    },
    prioridad: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'media',
    },
    estado: {
      type: DataTypes.STRING(24),
      allowNull: false,
      defaultValue: 'abierto',
    },
  },
  {
    tableName: 'soporte_tickets',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
  }
);

export default SoporteTicket;
