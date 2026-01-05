import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Vacuna = sequelize.define('Vacuna', {
  id_vacuna: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  nombre_vacuna: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null
  },
  tipo: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: null,
    comment: 'Tipo de vacuna (ej: COVID-19, Influenza, etc.)'
  }
}, {
  tableName: 'vacunas',
  timestamps: false
});

export default Vacuna;


