/**
 * Script para crear credencial de autenticación para el administrador
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import sequelize from '../config/db.js';
import { Usuario } from '../models/associations.js';
import AuthCredential from '../models/AuthCredential.js';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function crearCredencialAdmin() {
  try {
    console.log('🔍 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión establecida\n');

    // 1. Buscar usuario administrador
    console.log('1️⃣ Buscando usuario administrador...');
    const adminUsuario = await Usuario.findOne({
      where: { email: 'admin@clinica.com', rol: 'Admin' }
    });

    if (!adminUsuario) {
      console.log('❌ Usuario administrador NO encontrado');
      console.log('   Ejecuta primero el script crear-50-pacientes-prueba-estadisticas.js');
      process.exit(1);
    }

    console.log('✅ Usuario administrador encontrado');
    console.log(`   ID: ${adminUsuario.id_usuario}`);
    console.log(`   Email: ${adminUsuario.email}`);
    console.log(`   Rol: ${adminUsuario.rol}\n`);

    // 2. Verificar si ya existe credencial
    console.log('2️⃣ Verificando credencial existente...');
    const credencialExistente = await AuthCredential.findOne({
      where: {
        user_type: 'Admin',
        user_id: adminUsuario.id_usuario,
        auth_method: 'password',
        activo: true
      }
    });

    if (credencialExistente) {
      console.log('⚠️  Ya existe una credencial activa para el administrador');
      console.log(`   ID credencial: ${credencialExistente.id_credential}`);
      console.log(`   Método: ${credencialExistente.auth_method}`);
      console.log(`   Activa: ${credencialExistente.activo}`);
      
      // Verificar si el password coincide
      const passwordTest = 'Admin123!';
      const isValid = await bcrypt.compare(passwordTest, credencialExistente.credential_value);
      console.log(`   Password válido: ${isValid ? '✅ SÍ' : '❌ NO'}`);
      
      if (isValid) {
        console.log('\n✅ La credencial ya existe y el password es correcto');
        console.log('   No es necesario crear una nueva credencial\n');
        await sequelize.close();
        process.exit(0);
      } else {
        console.log('   ⚠️  El password no coincide. Actualizando...');
        const newPasswordHash = await bcrypt.hash(passwordTest, 10);
        await credencialExistente.update({
          credential_value: newPasswordHash,
          last_used: null,
          failed_attempts: 0,
          locked_until: null
        });
        console.log('   ✅ Password actualizado en credencial existente\n');
        await sequelize.close();
        process.exit(0);
      }
    }

    // 3. Crear nueva credencial
    console.log('3️⃣ Creando credencial de autenticación...');
    const password = 'Admin123!';
    const passwordHash = await bcrypt.hash(password, 10);
    
    const nuevaCredencial = await AuthCredential.create({
      user_type: 'Admin',
      user_id: adminUsuario.id_usuario,
      auth_method: 'password',
      credential_value: passwordHash,
      device_id: `admin-device-${adminUsuario.id_usuario}`,
      device_name: 'Dispositivo Principal',
      device_type: 'mobile',
      is_primary: true,
      activo: true,
      failed_attempts: 0,
      created_at: new Date()
    });

    console.log('✅ Credencial creada exitosamente');
    console.log(`   ID credencial: ${nuevaCredencial.id_credential}`);
    console.log(`   Método: ${nuevaCredencial.auth_method}`);
    console.log(`   Es primaria: ${nuevaCredencial.is_primary}`);
    console.log(`   Activa: ${nuevaCredencial.activo}\n`);

    // 4. Verificar que funciona
    console.log('4️⃣ Verificando credencial...');
    const testPassword = 'Admin123!';
    const isValid = await bcrypt.compare(testPassword, nuevaCredencial.credential_value);
    console.log(`   Password válido: ${isValid ? '✅ SÍ' : '❌ NO'}\n`);

    if (isValid) {
      console.log('✅ Credencial configurada correctamente');
      console.log('   El administrador ahora puede iniciar sesión desde la app móvil\n');
    } else {
      console.log('❌ Error: La credencial no funciona correctamente\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

crearCredencialAdmin()
  .then(() => {
    console.log('✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en script:', error);
    process.exit(1);
  });
