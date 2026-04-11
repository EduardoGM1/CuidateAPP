import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const SoporteTicketMensaje = sequelize.define(
  'SoporteTicketMensaje',
  {
    id_mensaje: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_ticket: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_usuario_autor: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    cuerpo: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: 'soporte_ticket_mensajes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    underscored: true,
  }
);

export default SoporteTicketMensaje;
