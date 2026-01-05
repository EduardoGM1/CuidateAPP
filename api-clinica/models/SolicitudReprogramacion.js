import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const SolicitudReprogramacion = sequelize.define('SolicitudReprogramacion', {
  id_solicitud: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  id_cita: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  id_paciente: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  motivo: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  fecha_solicitada: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    defaultValue: null
  },
  estado: {
    type: DataTypes.ENUM('pendiente', 'aprobada', 'rechazada', 'cancelada'),
    allowNull: false,
    defaultValue: 'pendiente'
  },
  respuesta_doctor: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null
  },
  fecha_respuesta: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'solicitudes_reprogramacion',
  timestamps: false
});

export default SolicitudReprogramacion;

