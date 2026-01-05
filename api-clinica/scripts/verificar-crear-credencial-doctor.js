import sequelize from '../config/db.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { Usuario, Doctor, AuthCredential } from '../models/associations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Script para verificar y crear credenciales de autenticación para el doctor
 */
async function verificarYCrearCredencialDoctor() {
  try {
    console.log('🔍 Verificando credenciales del doctor...\n');
    await sequelize.authenticate();
    
    // Buscar el doctor
    const doctorUsuario = await Usuario.findOne({
      where: { email: 'doctor@clinica.com' },
      include: [{ model: Doctor }]
    });
    
    if (!doctorUsuario) {
      console.log('❌ No se encontró el usuario doctor');
      process.exit(1);
    }
    
    console.log(`✅ Usuario encontrado:`);
    console.log(`   ID: ${doctorUsuario.id_usuario}`);
    console.log(`   Email: ${doctorUsuario.email}`);
    console.log(`   Rol: ${doctorUsuario.rol}`);
    console.log(`   Password Hash: ${doctorUsuario.password_hash ? 'Existe' : 'No existe'}\n`);
    
    // Verificar si tiene credencial en auth_credentials
    const credencial = await AuthCredential.findOne({
      where: {
        user_type: 'Doctor',
        user_id: doctorUsuario.id_usuario,
        auth_method: 'password',
        is_primary: true
      }
    });
    
    if (credencial) {
      console.log('✅ Credencial encontrada en auth_credentials:');
      console.log(`   ID Credencial: ${credencial.id_credential}`);
      console.log(`   Método: ${credencial.auth_method}`);
      console.log(`   Activa: ${credencial.activo}`);
      console.log(`   Primaria: ${credencial.is_primary}\n`);
    } else {
      console.log('⚠️  No se encontró credencial en auth_credentials');
      console.log('🔧 Creando credencial desde password_hash...\n');
      
      // Crear credencial desde password_hash
      if (!doctorUsuario.password_hash) {
        console.log('❌ El usuario no tiene password_hash');
        process.exit(1);
      }
      
      // La contraseña ya está hasheada, solo necesitamos copiarla
      const nuevaCredencial = await AuthCredential.create({
        user_type: 'Doctor',
        user_id: doctorUsuario.id_usuario,
        auth_method: 'password',
        credential_value: doctorUsuario.password_hash,
        credential_salt: null, // bcrypt incluye el salt en el hash
        is_primary: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      console.log('✅ Credencial creada exitosamente:');
      console.log(`   ID Credencial: ${nuevaCredencial.id_credential}`);
      console.log(`   Método: ${nuevaCredencial.auth_method}`);
      console.log(`   Primaria: ${nuevaCredencial.is_primary}\n`);
    }
    
    // Verificar que la contraseña funciona
    console.log('🧪 Verificando que la contraseña funciona...');
    const passwordCorrecta = 'Doctor123!';
    const passwordHash = credencial?.credential_value || doctorUsuario.password_hash;
    const esValida = await bcrypt.compare(passwordCorrecta, passwordHash);
    
    if (esValida) {
      console.log('✅ La contraseña "Doctor123!" es válida\n');
    } else {
      console.log('❌ La contraseña "Doctor123!" NO es válida');
      console.log('   Esto puede indicar que el password_hash no corresponde a "Doctor123!"\n');
    }
    
    console.log('✅ Verificación completada\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

verificarYCrearCredencialDoctor();

