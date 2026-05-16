import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const ConsentimientoPrivacidad = sequelize.define(
  'ConsentimientoPrivacidad',
  {
    id_consentimiento: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    id_paciente: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    id_doctor: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    rol: {
      type: DataTypes.ENUM('Paciente', 'Doctor'),
      allowNull: false,
    },
    version_aviso: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    acepto_aviso_terminos: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    acepto_datos_salud: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    canal: {
      type: DataTypes.ENUM('web', 'mobile'),
      allowNull: false,
      defaultValue: 'web',
    },
    user_agent: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    revocado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    revocado_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'consentimientos_privacidad',
    timestamps: false,
    indexes: [
      { fields: ['id_paciente', 'version_aviso', 'revocado', 'created_at'] },
      { fields: ['id_doctor', 'version_aviso', 'revocado', 'created_at'] },
    ],
  }
);

export default ConsentimientoPrivacidad;
