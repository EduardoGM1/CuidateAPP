import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const SistemaAuditoria = sequelize.define('SistemaAuditoria', {
  id_auditoria: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    references: {
      model: 'usuarios',
      key: 'id_usuario'
    }
  },
  tipo_accion: {
    type: DataTypes.ENUM(
      'cita_estado_actualizado',
      'cita_reprogramada',
      'paciente_creado',
      'paciente_modificado',
      'doctor_creado',
      'doctor_modificado',
      'asignacion_paciente',
      'configuracion_cambiada',
      'sistema_automatico',
      'login_exitoso',
      'login_fallido',
      'acceso_sospechoso',
      'error_sistema',
      'error_critico'
    ),
    allowNull: false
  },
  entidad_afectada: {
    type: DataTypes.ENUM('cita', 'paciente', 'doctor', 'sistema', 'configuracion', 'acceso', 'error'),
    allowNull: false
  },
  id_entidad: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  datos_anteriores: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null
  },
  datos_nuevos: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true,
    defaultValue: null
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null
  },
  severidad: {
    type: DataTypes.ENUM('info', 'warning', 'error', 'critical'),
    allowNull: false,
    defaultValue: 'info'
  },
  stack_trace: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null
  }
}, {
  tableName: 'sistema_auditoria',
  timestamps: false,
  indexes: [
    {
      fields: ['tipo_accion'],
      name: 'idx_tipo_accion'
    },
    {
      fields: ['entidad_afectada', 'id_entidad'],
      name: 'idx_entidad'
    },
    {
      fields: ['fecha_creacion'],
      name: 'idx_fecha'
    },
    {
      fields: ['id_usuario'],
      name: 'idx_usuario'
    },
    {
      fields: ['severidad'],
      name: 'idx_severidad'
    },
    {
      fields: ['ip_address'],
      name: 'idx_ip_address'
    },
    {
      fields: ['fecha_creacion', 'severidad'],
      name: 'idx_fecha_severidad'
    }
  ]
});

export default SistemaAuditoria;

