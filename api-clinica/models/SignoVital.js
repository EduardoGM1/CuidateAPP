import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { applyEncryptionHooks, ENCRYPTED_FIELDS_SIGNO_VITAL } from '../middlewares/encryptionHooks.js';

const SignoVital = sequelize.define('SignoVital', {
  id_signo: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  id_paciente: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  id_cita: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null
  },
  fecha_medicion: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW
  },
  peso_kg: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: true,
    defaultValue: null
  },
  talla_m: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: true,
    defaultValue: null
  },
  imc: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: true,
    defaultValue: null
  },
  medida_cintura_cm: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: true,
    defaultValue: null
  },
  presion_sistolica: {
    type: DataTypes.TEXT, // Cambiar a TEXT para almacenar datos encriptados
    allowNull: true,
    defaultValue: null,
    comment: 'Presión sistólica encriptada con AES-256-GCM (NOM-004-SSA3-2012, HIPAA)'
  },
  presion_diastolica: {
    type: DataTypes.TEXT, // Cambiar a TEXT para almacenar datos encriptados
    allowNull: true,
    defaultValue: null,
    comment: 'Presión diastólica encriptada con AES-256-GCM (NOM-004-SSA3-2012, HIPAA)'
  },
  glucosa_mg_dl: {
    type: DataTypes.TEXT, // Cambiar a TEXT para almacenar datos encriptados
    allowNull: true,
    defaultValue: null,
    comment: 'Glucosa encriptada con AES-256-GCM (NOM-004-SSA3-2012, HIPAA)'
  },
  colesterol_mg_dl: {
    type: DataTypes.TEXT, // Cambiar a TEXT para almacenar datos encriptados
    allowNull: true,
    defaultValue: null,
    comment: 'Colesterol Total (mg/dl) encriptado con AES-256-GCM - Campo obligatorio para criterios de acreditación (NOM-004-SSA3-2012, HIPAA)'
  },
  colesterol_ldl: {
    type: DataTypes.TEXT, // Cambiar a TEXT para almacenar datos encriptados
    allowNull: true,
    defaultValue: null,
    comment: 'Colesterol LDL (mg/dl) encriptado con AES-256-GCM - Solo para pacientes con diagnóstico de Hipercolesterolemia (NOM-004-SSA3-2012, HIPAA)'
  },
  colesterol_hdl: {
    type: DataTypes.TEXT, // Cambiar a TEXT para almacenar datos encriptados
    allowNull: true,
    defaultValue: null,
    comment: 'Colesterol HDL (mg/dl) encriptado con AES-256-GCM - Solo para pacientes con diagnóstico de Hipercolesterolemia (NOM-004-SSA3-2012, HIPAA)'
  },
  trigliceridos_mg_dl: {
    type: DataTypes.TEXT, // Cambiar a TEXT para almacenar datos encriptados
    allowNull: true,
    defaultValue: null,
    comment: 'Triglicéridos encriptados con AES-256-GCM (NOM-004-SSA3-2012, HIPAA)'
  },
  hba1c_porcentaje: {
    type: DataTypes.TEXT, // Cambiar a TEXT para almacenar datos encriptados
    allowNull: true,
    defaultValue: null,
    comment: '*HbA1c (%) encriptado con AES-256-GCM - Campo obligatorio para criterios de acreditación. Rangos: 20-59 años <7%, 60+ años <8% (NOM-004-SSA3-2012, HIPAA)'
  },
  edad_paciente_en_medicion: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    comment: 'Edad del paciente al momento de la medición (para clasificar rangos de HbA1c: 20-59 años vs 60+ años)'
  },
  registrado_por: {
    type: DataTypes.ENUM('paciente', 'doctor'),
    allowNull: false
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
    comment: 'Observaciones encriptadas con AES-256-GCM (NOM-004-SSA3-2012, HIPAA)'
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'signos_vitales',
  timestamps: false
});

// Aplicar hooks de encriptación para campos sensibles
applyEncryptionHooks(SignoVital, ENCRYPTED_FIELDS_SIGNO_VITAL);

export default SignoVital;