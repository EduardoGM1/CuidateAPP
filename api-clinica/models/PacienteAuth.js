import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

// Modelo principal de dispositivos autorizados
const PacienteAuth = sequelize.define('PacienteAuth', {
  id_auth: {
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
    }
  },
  device_id: {
    type: DataTypes.STRING(128),
    allowNull: false,
    comment: 'ID único del dispositivo (SHA-256)'
  },
  device_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Nombre del dispositivo'
  },
  device_type: {
    type: DataTypes.ENUM('mobile', 'tablet', 'web'),
    allowNull: false,
    defaultValue: 'mobile'
  },
  is_primary_device: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  failed_attempts: {
    type: DataTypes.SMALLINT.UNSIGNED,
    allowNull: false,
    defaultValue: 0
  },
  locked_until: {
    type: DataTypes.DATE,
    allowNull: true
  },
  last_activity: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'paciente_auth',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['id_paciente', 'device_id'],
      name: 'uk_paciente_device'
    },
    {
      fields: ['device_id'],
      name: 'idx_device_id'
    },
    {
      fields: ['locked_until'],
      name: 'idx_locked_until'
    }
  ]
});

// Modelo para autenticación PIN
const PacienteAuthPIN = sequelize.define('PacienteAuthPIN', {
  id_pin_auth: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  id_auth: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'paciente_auth',
      key: 'id_auth'
    }
  },
  pin_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Hash bcrypt del PIN'
  },
  pin_salt: {
    type: DataTypes.STRING(32),
    allowNull: false,
    comment: 'Salt adicional para PIN'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Expiración del PIN'
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'paciente_auth_pin',
  timestamps: false
});

// Modelo para autenticación biométrica (simplificado - RSA nativo)
const PacienteAuthBiometric = sequelize.define('PacienteAuthBiometric', {
  id_biometric_auth: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  id_auth: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'paciente_auth',
      key: 'id_auth'
    }
  },
  credential_id: {
    type: DataTypes.STRING(128),
    allowNull: false,
    unique: true,
    comment: 'ID único de credencial (UUID del dispositivo)'
  },
  public_key: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Clave pública RSA en formato PEM'
  },
  biometric_type: {
    type: DataTypes.ENUM('fingerprint', 'face', 'iris'),
    allowNull: false,
    comment: 'Tipo de biometría del dispositivo'
  },
  last_used: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Última vez que se usó esta credencial'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'paciente_auth_biometric',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['credential_id'],
      name: 'uk_credential_id'
    },
    {
      fields: ['id_auth'],
      name: 'idx_id_auth'
    }
  ]
});

// Modelo para log de auditoría
const PacienteAuthLog = sequelize.define('PacienteAuthLog', {
  id_log: {
    type: DataTypes.BIGINT,
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
    }
  },
  id_auth: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'paciente_auth',
      key: 'id_auth'
    }
  },
  auth_method: {
    type: DataTypes.ENUM('pin', 'biometric', 'fallback'),
    allowNull: false
  },
  auth_result: {
    type: DataTypes.ENUM('success', 'failed', 'blocked', 'expired'),
    allowNull: false
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'IPv4 o IPv6'
  },
  user_agent: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  location_data: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Datos de geolocalización'
  },
  risk_score: {
    type: DataTypes.TINYINT.UNSIGNED,
    allowNull: true,
    comment: '0-100 score de riesgo'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'paciente_auth_log',
  timestamps: false,
  indexes: [
    {
      fields: ['id_paciente', 'created_at'],
      name: 'idx_paciente_date'
    },
    {
      fields: ['auth_result', 'created_at'],
      name: 'idx_auth_result'
    }
  ]
});

export { PacienteAuth, PacienteAuthPIN, PacienteAuthBiometric, PacienteAuthLog };
export default PacienteAuth;