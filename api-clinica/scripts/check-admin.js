import sequelize from '../config/db.js';
import { Usuario } from '../models/associations.js';
import bcrypt from 'bcrypt';

async function checkOrCreateAdmin() {
  try {
    // Buscar administradores existentes (rol es 'Admin' según el modelo)
    const admins = await Usuario.findAll({
      where: { rol: 'Admin' },
      attributes: ['id_usuario', 'email', 'rol', 'activo']
    });
    
    console.log('\n📋 Administradores existentes:');
    if (admins.length > 0) {
      admins.forEach(a => {
        console.log(`   • ${a.email} (ID: ${a.id_usuario}, Activo: ${a.activo})`);
      });
      console.log('\n🔐 Contraseña: Admin123!');
    } else {
      console.log('   ⚠️ No hay administradores. Creando uno nuevo...');
      
      const passwordHash = await bcrypt.hash('Admin123!', 10);
      const admin = await Usuario.create({
        email: 'admin@clinica.com',
        password_hash: passwordHash,
        rol: 'Admin',
        activo: true
      });
      
      console.log(`   ✅ Administrador creado: admin@clinica.com`);
      console.log(`   🔐 Contraseña: Admin123!`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkOrCreateAdmin();
