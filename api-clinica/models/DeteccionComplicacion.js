import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const DeteccionComplicacion = sequelize.define('DeteccionComplicacion', {
  id_deteccion: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  id_paciente: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'pacientes',
      key: 'id_paciente'
    },
    comment: 'ID del paciente (obligatorio)'
  },
  id_comorbilidad: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    references: {
      model: 'comorbilidades',
      key: 'id_comorbilidad'
    },
    comment: 'ID de la comorbilidad relacionada (opcional)'
  },
  id_cita: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    references: {
      model: 'citas',
      key: 'id_cita'
    },
    comment: 'ID de la cita médica asociada (opcional)'
  },
  id_doctor: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    references: {
      model: 'doctores',
      key: 'id_doctor'
    },
    comment: 'ID del doctor que detectó la complicación (opcional)'
  },
  
  // Exámenes realizados
  exploracion_pies: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Indica si se realizó exploración de pies'
  },
  exploracion_fondo_ojo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Indica si se realizó exploración de fondo de ojo'
  },
  
  // Auto-monitoreo
  realiza_auto_monitoreo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Indica si el paciente realiza auto-monitoreo'
  },
  
  // Microalbuminuria (instrucción ⑥)
  microalbuminuria_realizada: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '⑥ Indica si se realizó examen de microalbuminuria (1=SI, 0=NO)'
  },
  microalbuminuria_resultado: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: null,
    comment: 'Resultado del examen de microalbuminuria (mg/L o mg/g de creatinina). Valores normales <30 mg/g'
  },
  auto_monitoreo_glucosa: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Indica si realiza auto-monitoreo de glucosa'
  },
  auto_monitoreo_presion: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Indica si realiza auto-monitoreo de presión arterial'
  },
  
  // Clasificación
  tipo_complicacion: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: null,
    comment: 'Tipo de complicación detectada (ej: Retinopatía, Neuropatía, Nefropatía)'
  },
  
  // Fechas
  fecha_deteccion: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Fecha en que se detectó la complicación (obligatorio)'
  },
  fecha_diagnostico: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    defaultValue: null,
    comment: 'Fecha de diagnóstico formal (puede ser diferente a fecha_deteccion)'
  },
  
  // Metadatos
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
    comment: 'Observaciones adicionales sobre la detección'
  },
  registrado_por: {
    type: DataTypes.ENUM('doctor', 'paciente'),
    allowNull: false,
    defaultValue: 'doctor',
    comment: 'Quién registró la detección'
  },
  // Referencia (instrucción ⑪)
  fue_referido: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '⑪ Indica si el paciente fue referido a otro nivel de atención (1=SI, 0=NO)'
  },
  referencia_observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
    comment: 'Detalles de la referencia (especialidad, institución, motivo)'
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
    comment: 'Fecha y hora de creación del registro'
  }
}, {
  tableName: 'deteccion_complicaciones',
  timestamps: false,
  indexes: [
    { fields: ['id_paciente'], name: 'idx_paciente' },
    { fields: ['id_comorbilidad'], name: 'idx_comorbilidad' },
    { fields: ['id_cita'], name: 'idx_cita' },
    { fields: ['fecha_deteccion'], name: 'idx_fecha_deteccion' },
    { fields: ['id_paciente', 'fecha_deteccion'], name: 'idx_paciente_fecha' }
  ]
});

export default DeteccionComplicacion;

