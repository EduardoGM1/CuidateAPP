import sequelize from '../config/db.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { Usuario, AuthCredential } from '../models/associations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function crearCredencialAdmin() {
  try {
    console.log('🔍 Verificando credenciales del administrador...\n');
    await sequelize.authenticate();
    
    // Buscar el admin
    const adminUsuario = await Usuario.findOne({
      where: { email: 'admin@clinica.com' }
    });
    
    if (!adminUsuario) {
      console.log('❌ No se encontró el usuario administrador');
      process.exit(1);
    }
    
    console.log(`✅ Usuario encontrado:`);
    console.log(`   ID: ${adminUsuario.id_usuario}`);
    console.log(`   Email: ${adminUsuario.email}`);
    console.log(`   Rol: ${adminUsuario.rol}\n`);
    
    // Verificar si tiene credencial en auth_credentials
    const credencial = await AuthCredential.findOne({
      where: {
        user_type: 'Admin',
        user_id: adminUsuario.id_usuario,
        auth_method: 'password',
        is_primary: true
      }
    });
    
    if (credencial) {
      console.log('✅ Credencial encontrada en auth_credentials');
      console.log(`   ID Credencial: ${credencial.id_credential}\n`);
    } else {
      console.log('⚠️  No se encontró credencial en auth_credentials');
      console.log('🔧 Creando credencial desde password_hash...\n');
      
      if (!adminUsuario.password_hash) {
        console.log('❌ El usuario no tiene password_hash');
        process.exit(1);
      }
      
      // Crear credencial desde password_hash
      const nuevaCredencial = await AuthCredential.create({
        user_type: 'Admin',
        user_id: adminUsuario.id_usuario,
        auth_method: 'password',
        credential_value: adminUsuario.password_hash,
        credential_salt: null,
        is_primary: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      console.log('✅ Credencial creada exitosamente:');
      console.log(`   ID Credencial: ${nuevaCredencial.id_credential}\n`);
    }
    
    // Verificar que la contraseña funciona
    console.log('🧪 Verificando que la contraseña funciona...');
    const passwordCorrecta = 'Admin123!';
    const passwordHash = credencial?.credential_value || adminUsuario.password_hash;
    const esValida = await bcrypt.compare(passwordCorrecta, passwordHash);
    
    if (esValida) {
      console.log('✅ La contraseña "Admin123!" es válida\n');
    } else {
      console.log('❌ La contraseña "Admin123!" NO es válida\n');
    }
    
    console.log('✅ Verificación completada\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

crearCredencialAdmin();

