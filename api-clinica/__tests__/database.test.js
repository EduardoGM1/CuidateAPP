import sequelize from '../config/db.js';
import { Usuario, Paciente, Doctor } from '../models/associations.js';

describe('🗄️ DATABASE TESTS', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('📊 CONEXIÓN Y MODELOS', () => {
    test('Debe conectar a la base de datos', async () => {
      try {
        await sequelize.authenticate();
        console.log('✅ Conexión a base de datos exitosa');
        expect(true).toBe(true);
      } catch (error) {
        console.error('❌ Error de conexión:', error.message);
        throw error;
      }
    });

    test('Debe crear usuario en base de datos', async () => {
      const userData = {
        email: 'test@database.com',
        password_hash: '$2b$10$hashedpassword',
        rol: 'Admin'
      };

      const usuario = await Usuario.create(userData);
      console.log('✅ Usuario creado:', usuario.toJSON());

      expect(usuario.id_usuario).toBeDefined();
      expect(usuario.email).toBe('test@database.com');
      expect(usuario.rol).toBe('Admin');
    });

    test('Debe crear doctor en base de datos', async () => {
      const doctorData = {
        nombre: 'Test',
        apellido_paterno: 'Doctor',
        telefono: '5551234567',
        institucion_hospitalaria: 'Hospital Test'
      };

      const doctor = await Doctor.create(doctorData);
      console.log('✅ Doctor creado:', doctor.toJSON());

      expect(doctor.id_doctor).toBeDefined();
      expect(doctor.nombre).toBe('Test');
      expect(doctor.apellido_paterno).toBe('Doctor');
    });

    test('Debe crear paciente en base de datos', async () => {
      const pacienteData = {
        nombre: 'Test',
        apellido_paterno: 'Paciente',
        fecha_nacimiento: '1990-01-01',
        sexo: 'Hombre'
      };

      const paciente = await Paciente.create(pacienteData);
      console.log('✅ Paciente creado:', paciente.toJSON());

      expect(paciente.id_paciente).toBeDefined();
      expect(paciente.nombre).toBe('Test');
      expect(paciente.sexo).toBe('Hombre');
    });
  });

  describe('🔗 RELACIONES', () => {
    test('Debe crear relación usuario-doctor', async () => {
      const usuario = await Usuario.create({
        email: 'doctor.relation@test.com',
        password_hash: '$2b$10$hashedpassword',
        rol: 'Doctor'
      });

      const doctor = await Doctor.create({
        id_usuario: usuario.id_usuario,
        nombre: 'Relación',
        apellido_paterno: 'Test'
      });

      console.log('✅ Relación usuario-doctor creada');
      console.log('Usuario ID:', usuario.id_usuario);
      console.log('Doctor ID:', doctor.id_doctor);

      expect(doctor.id_usuario).toBe(usuario.id_usuario);
    });

    test('Debe crear relación usuario-paciente', async () => {
      const usuario = await Usuario.create({
        email: 'paciente.relation@test.com',
        password_hash: '$2b$10$hashedpassword',
        rol: 'Paciente'
      });

      const paciente = await Paciente.create({
        id_usuario: usuario.id_usuario,
        nombre: 'Relación',
        apellido_paterno: 'Paciente',
        fecha_nacimiento: '1985-05-15'
      });

      console.log('✅ Relación usuario-paciente creada');
      console.log('Usuario ID:', usuario.id_usuario);
      console.log('Paciente ID:', paciente.id_paciente);

      expect(paciente.id_usuario).toBe(usuario.id_usuario);
    });
  });

  describe('📈 ESTADÍSTICAS DE BASE DE DATOS', () => {
    test('Debe mostrar conteos de registros', async () => {
      const usuarios = await Usuario.count();
      const doctores = await Doctor.count();
      const pacientes = await Paciente.count();

      console.log('\n📊 ESTADÍSTICAS DE BASE DE DATOS:');
      console.log(`👥 Usuarios: ${usuarios}`);
      console.log(`👨⚕️ Doctores: ${doctores}`);
      console.log(`🏥 Pacientes: ${pacientes}`);

      expect(usuarios).toBeGreaterThan(0);
      expect(doctores).toBeGreaterThan(0);
      expect(pacientes).toBeGreaterThan(0);
    });
  });
});