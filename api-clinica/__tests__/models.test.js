import { DataTypes } from 'sequelize';

// Mock de Sequelize
const mockSequelize = {
  define: jest.fn(),
  authenticate: jest.fn(),
  sync: jest.fn()
};

jest.mock('../config/db.js', () => mockSequelize);

describe('Models', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Usuario Model', () => {
    it('should define Usuario model with correct attributes', async () => {
      const { default: Usuario } = await import('../models/Usuario.js');

      expect(mockSequelize.define).toHaveBeenCalledWith('Usuario', 
        expect.objectContaining({
          id_usuario: expect.objectContaining({
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
          }),
          email: expect.objectContaining({
            type: DataTypes.STRING(150),
            allowNull: false,
            unique: true
          }),
          password_hash: expect.objectContaining({
            type: DataTypes.STRING(255),
            allowNull: false
          }),
          rol: expect.objectContaining({
            type: DataTypes.ENUM('Paciente', 'Doctor', 'Admin'),
            allowNull: false,
            defaultValue: 'Paciente'
          })
        }),
        expect.objectContaining({
          tableName: 'usuarios',
          timestamps: false
        })
      );
    });
  });

  describe('Paciente Model', () => {
    it('should define Paciente model with correct attributes', async () => {
      const { default: Paciente } = await import('../models/Paciente.js');

      expect(mockSequelize.define).toHaveBeenCalledWith('Paciente',
        expect.objectContaining({
          id_paciente: expect.objectContaining({
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
          }),
          nombre: expect.objectContaining({
            type: DataTypes.STRING(100),
            allowNull: false
          }),
          apellido_paterno: expect.objectContaining({
            type: DataTypes.STRING(100),
            allowNull: false
          }),
          fecha_nacimiento: expect.objectContaining({
            type: DataTypes.DATEONLY,
            allowNull: false
          }),
          curp: expect.objectContaining({
            type: DataTypes.STRING(18),
            unique: true
          })
        }),
        expect.objectContaining({
          tableName: 'pacientes',
          timestamps: false
        })
      );
    });
  });

  describe('Doctor Model', () => {
    it('should define Doctor model with correct attributes', async () => {
      const { default: Doctor } = await import('../models/Doctor.js');

      expect(mockSequelize.define).toHaveBeenCalledWith('Doctor',
        expect.objectContaining({
          id_doctor: expect.objectContaining({
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
          }),
          nombre: expect.objectContaining({
            type: DataTypes.STRING(100),
            allowNull: false
          }),
          apellido_paterno: expect.objectContaining({
            type: DataTypes.STRING(100),
            allowNull: false
          }),
          anos_servicio: expect.objectContaining({
            type: DataTypes.SMALLINT.UNSIGNED
          })
        }),
        expect.objectContaining({
          tableName: 'doctores',
          timestamps: false
        })
      );
    });
  });

  describe('Cita Model', () => {
    it('should define Cita model with correct attributes', async () => {
      const { default: Cita } = await import('../models/Cita.js');

      expect(mockSequelize.define).toHaveBeenCalledWith('Cita',
        expect.objectContaining({
          id_cita: expect.objectContaining({
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
          }),
          id_paciente: expect.objectContaining({
            type: DataTypes.INTEGER,
            allowNull: false
          }),
          fecha_cita: expect.objectContaining({
            type: DataTypes.DATE,
            allowNull: false
          }),
          asistencia: expect.objectContaining({
            type: DataTypes.BOOLEAN
          }),
          es_primera_consulta: expect.objectContaining({
            type: DataTypes.BOOLEAN,
            defaultValue: false
          })
        }),
        expect.objectContaining({
          tableName: 'citas_medicas',
          timestamps: false
        })
      );
    });
  });
});