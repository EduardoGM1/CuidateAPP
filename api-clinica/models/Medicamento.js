import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Medicamento = sequelize.define('Medicamento', {
  id_medicamento: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  nombre_medicamento: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null
  }
}, {
  tableName: 'medicamentos',
  timestamps: false
});

export default Medicamento;