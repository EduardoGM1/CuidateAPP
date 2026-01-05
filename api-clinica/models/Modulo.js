import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Modulo = sequelize.define('Modulo', {
  id_modulo: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  nombre_modulo: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null
  }
}, {
  tableName: 'modulos',
  timestamps: false,
  hooks: {
    beforeCreate: (modulo) => {
      if (!modulo.created_at) {
        modulo.created_at = new Date();
      }
    },
    beforeUpdate: (modulo) => {
      modulo.updated_at = new Date();
    }
  }
});

export default Modulo;