import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Comorbilidad = sequelize.define('Comorbilidad', {
  id_comorbilidad: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  nombre_comorbilidad: {
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
  tableName: 'comorbilidades',
  timestamps: false
});

export default Comorbilidad;