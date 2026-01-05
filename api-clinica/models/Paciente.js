import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { applyEncryptionHooks, ENCRYPTED_FIELDS_PACIENTE } from '../middlewares/encryptionHooks.js';

const Paciente = sequelize.define('Paciente', {
  id_paciente: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  apellido_paterno: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  apellido_materno: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: null
  },
  fecha_nacimiento: {
    type: DataTypes.TEXT, // Cambiar a TEXT para almacenar datos encriptados
    allowNull: false,
    comment: 'Fecha de nacimiento encriptada con AES-256-GCM (LFPDPPP, HIPAA §164.514)'
  },
  curp: {
    type: DataTypes.TEXT, // Cambiar a TEXT para almacenar datos encriptados (más largos)
    allowNull: true,
    defaultValue: null,
    unique: false, // Deshabilitar unique constraint ya que valores encriptados son únicos
    comment: 'CURP encriptado con AES-256-GCM'
  },
  institucion_salud: {
    type: DataTypes.ENUM('IMSS', 'Bienestar', 'ISSSTE', 'Particular', 'Otro', 'SEMAR', 'INSABI', 'PEMEX', 'SEDENA', 'Secretaría de Salud', 'Ninguna'),
    allowNull: true,
    defaultValue: null
  },
  sexo: {
    type: DataTypes.ENUM('Hombre', 'Mujer'),
    allowNull: true,
    defaultValue: null
  },
  direccion: {
    type: DataTypes.TEXT, // Cambiar a TEXT para almacenar datos encriptados
    allowNull: true,
    defaultValue: null,
    comment: 'Dirección encriptada con AES-256-GCM'
  },
  estado: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  localidad: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: null
  },
  numero_celular: {
    type: DataTypes.TEXT, // Cambiar a TEXT para almacenar datos encriptados
    allowNull: true,
    defaultValue: null,
    comment: 'Número de celular encriptado con AES-256-GCM'
  },
  fecha_registro: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW
  },
  id_modulo: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true
  },
  fecha_baja: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    defaultValue: null,
    comment: '⑭ Fecha en que el paciente fue dado de baja del GAM. Debe ser >= fecha_registro'
  },
  motivo_baja: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
    comment: 'Motivo de la baja del paciente del GAM'
  },
  numero_gam: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    comment: 'Número de integrante en el GAM (para fórmulas y reportes). Debe ser único por módulo'
  }
}, {
  tableName: 'pacientes',
  timestamps: false
});

// Aplicar hooks de encriptación para campos sensibles
applyEncryptionHooks(Paciente, ENCRYPTED_FIELDS_PACIENTE);

export default Paciente;