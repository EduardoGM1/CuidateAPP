import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { applyEncryptionHooks, ENCRYPTED_FIELDS_PACIENTE_COMORBILIDAD } from '../middlewares/encryptionHooks.js';

const PacienteComorbilidad = sequelize.define('PacienteComorbilidad', {
  id_paciente: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false
  },
  id_comorbilidad: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false
  },
  fecha_deteccion: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    defaultValue: null
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
    comment: 'Observaciones de la comorbilidad encriptadas con AES-256-GCM (NOM-004-SSA3-2012, HIPAA)'
  },
  anos_padecimiento: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    comment: 'Años que el paciente ha tenido esta comorbilidad'
  },
  // Diagnóstico Basal (instrucción ①)
  es_diagnostico_basal: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '① Indica si es el diagnóstico basal (inicial) del paciente'
  },
  es_agregado_posterior: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Indica si el diagnóstico fue agregado después del diagnóstico basal'
  },
  año_diagnostico: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    comment: 'Año en que se diagnosticó la comorbilidad (YYYY). Rango válido: 1900 - año actual'
  },
  // Tratamiento (instrucciones ② y ③)
  recibe_tratamiento_no_farmacologico: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '② Indica si el paciente recibe tratamiento no farmacológico (dieta, ejercicio, cambios de estilo de vida)'
  },
  recibe_tratamiento_farmacologico: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '③ Indica si el paciente recibe tratamiento farmacológico. Debe sincronizarse con PlanMedicacion activo'
  }
}, {
  tableName: 'paciente_comorbilidad',
  timestamps: false
});

// Aplicar hooks de encriptación para campos sensibles
applyEncryptionHooks(PacienteComorbilidad, ENCRYPTED_FIELDS_PACIENTE_COMORBILIDAD);

export default PacienteComorbilidad;