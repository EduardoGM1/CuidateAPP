import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const MedicamentoToma = sequelize.define('MedicamentoToma', {
  id_toma: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  id_plan_medicacion: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'planes_medicacion',
      key: 'id_plan'
    }
  },
  id_plan_detalle: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    references: {
      model: 'plan_detalle',
      key: 'id_detalle'
    }
  },
  fecha_toma: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  hora_toma: {
    type: DataTypes.TIME,
    allowNull: true,
    defaultValue: null
  },
  confirmado_por: {
    type: DataTypes.ENUM('Paciente', 'Doctor', 'Familiar'),
    allowNull: false,
    defaultValue: 'Paciente'
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'medicamento_toma',
  timestamps: false
});

export default MedicamentoToma;


