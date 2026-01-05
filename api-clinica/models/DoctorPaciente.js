import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const DoctorPaciente = sequelize.define('DoctorPaciente', {
  id_doctor: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false
  },
  id_paciente: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false
  },
  fecha_asignacion: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    defaultValue: null
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null
  }
}, {
  tableName: 'doctor_paciente',
  timestamps: false
});

export default DoctorPaciente;