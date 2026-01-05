import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const MensajeChat = sequelize.define('MensajeChat', {
  id_mensaje: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  id_paciente: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  id_doctor: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null
  },
  remitente: {
    type: DataTypes.ENUM('Paciente', 'Doctor', 'Sistema'),
    allowNull: false
  },
  mensaje_texto: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null
  },
  mensaje_audio_url: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: null
  },
  mensaje_audio_duracion: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null
  },
  mensaje_audio_transcripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null
  },
  leido: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false
  },
  fecha_envio: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'mensajes_chat',
  timestamps: false
});

export default MensajeChat;