import sequelize from '../config/db.js';
import { Usuario, Doctor, Modulo } from '../models/associations.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

async function createTestData() {
  try {
    console.log('🌱 Creando datos de prueba...');

    // Sincronizar modelos
    await sequelize.sync({ alter: true });

    // 1. Crear Módulos
    // DESHABILITADO: Los módulos deben crearse manualmente desde la interfaz de gestión
    // console.log('📋 Creando módulos...');
    // const [modulo1] = await Modulo.findOrCreate({
    //   where: { id_modulo: 1 },
    //   defaults: { nombre_modulo: 'Medicina General' }
    // });
    // const [modulo2] = await Modulo.findOrCreate({
    //   where: { id_modulo: 2 },
    //   defaults: { nombre_modulo: 'Cardiología' }
    // });
    // console.log('✅ Módulos creados');
    console.log('📋 Módulos: Se deben crear manualmente desde la interfaz de gestión');
    const modulo1 = null;
    const modulo2 = null;

    // 2. Crear Administrador
    console.log('👤 Creando administrador...');
    const adminPassword = 'admin123';
    const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
    const [adminUser] = await Usuario.findOrCreate({
      where: { email: 'admin@clinica.com' },
      defaults: {
        password_hash: hashedAdminPassword,
        rol: 'Admin',
        activo: true
      }
    });
    console.log('✅ Administrador creado: admin@clinica.com');

    // 3. Crear Doctor
    console.log('👨‍⚕️ Creando doctor...');
    const doctorPassword = 'doctor123';
    const hashedDoctorPassword = await bcrypt.hash(doctorPassword, 10);
    const [doctorUser] = await Usuario.findOrCreate({
      where: { email: 'doctor@clinica.com' },
      defaults: {
        password_hash: hashedDoctorPassword,
        rol: 'Doctor',
        activo: true
      }
    });

    await Doctor.findOrCreate({
      where: { id_usuario: doctorUser.id_usuario },
      defaults: {
        id_usuario: doctorUser.id_usuario,
        nombre: 'Dr. Juan',
        apellido_paterno: 'Pérez',
        apellido_materno: 'García',
        telefono: '555-1234-5678',
        institucion_hospitalaria: 'Hospital Central',
        grado_estudio: 'Medicina General',
        anos_servicio: 10,
        id_modulo: modulo1.id_modulo,
        activo: true
      }
    });
    console.log('✅ Doctor creado: Dr. Juan Pérez');

    console.log('\n🎉 DATOS DE PRUEBA CREADOS EXITOSAMENTE');
    console.log('=====================================');
    console.log('👤 ADMINISTRADOR:');
    console.log('   Email: admin@clinica.com');
    console.log('   Password: admin123');
    console.log('\n👨‍⚕️ DOCTOR:');
    console.log('   Email: doctor@clinica.com');
    console.log('   Password: doctor123');
    console.log('   Nombre: Dr. Juan Pérez García');
    console.log('=====================================');

  } catch (error) {
    console.error('❌ Error al crear datos de prueba:', error);
  } finally {
    await sequelize.close();
  }
}

createTestData();
