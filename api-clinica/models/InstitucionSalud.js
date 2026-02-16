import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const InstitucionSalud = sequelize.define('InstitucionSalud', {
  id_institucion_salud: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  orden: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    comment: 'Orden de aparición en listas (menor = primero)'
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
  tableName: 'instituciones_salud',
  timestamps: false,
  hooks: {
    beforeCreate: (inst) => {
      if (!inst.created_at) inst.created_at = new Date();
    },
    beforeUpdate: (inst) => {
      inst.updated_at = new Date();
    }
  }
});

export default InstitucionSalud;
