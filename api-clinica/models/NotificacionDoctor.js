import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const NotificacionDoctor = sequelize.define('NotificacionDoctor', {
  id_notificacion: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  id_doctor: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'doctores',
      key: 'id_doctor'
    }
  },
  id_paciente: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
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
  id_mensaje: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    references: {
      model: 'mensajes_chat',
      key: 'id_mensaje'
    }
  },
  tipo: {
    type: DataTypes.ENUM(
      'cita_actualizada',
      'cita_reprogramada',
      'cita_cancelada',
      'nuevo_mensaje',
      'alerta_signos_vitales',
      'paciente_registro_signos',
      'solicitud_reprogramacion'
    ),
    allowNull: false
  },
  titulo: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  mensaje: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  datos_adicionales: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null
  },
  estado: {
    type: DataTypes.ENUM('enviada', 'leida', 'archivada'),
    allowNull: false,
    defaultValue: 'enviada'
  },
  fecha_envio: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  fecha_lectura: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null
  }
}, {
  tableName: 'notificaciones_doctor',
  timestamps: false,
  indexes: [
    {
      fields: ['id_doctor', 'estado'],
      name: 'idx_doctor_estado'
    },
    {
      fields: ['id_doctor', 'fecha_envio'],
      name: 'idx_doctor_fecha'
    },
    {
      fields: ['tipo'],
      name: 'idx_tipo'
    },
    {
      fields: ['id_paciente'],
      name: 'idx_paciente'
    },
    {
      fields: ['id_cita'],
      name: 'idx_cita'
    }
  ]
});

export default NotificacionDoctor;

