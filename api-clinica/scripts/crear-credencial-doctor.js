/**
 * Script para crear credencial de autenticación para el doctor
 */

import dotenv from 'dotenv';
import sequelize from '../config/db.js';
import { Usuario, Doctor } from '../models/associations.js';
import AuthCredential from '../models/AuthCredential.js';
import bcrypt from 'bcrypt';

dotenv.config();

const DOCTOR_EMAIL = 'Doctor@clinica.com';
const DOCTOR_PASSWORD = 'Doctor123!';

async function crearCredencialDoctor() {
  try {
    console.log('\n🔧 Creando credencial para doctor...\n');
    
    // Buscar usuario
    const usuario = await Usuario.findOne({
      where: { email: DOCTOR_EMAIL }
    });

    if (!usuario) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log('✅ Usuario encontrado:', usuario.id_usuario);

    // Verificar si ya existe credencial
    const credencialExistente = await AuthCredential.findOne({
      where: {
        user_type: 'Doctor',
        user_id: usuario.id_usuario,
        auth_method: 'password',
        activo: true
      }
    });

    if (credencialExistente) {
      console.log('⚠️  Credencial ya existe. Verificando contraseña...');
      
      // Verificar que la contraseña funcione
      const passwordValida = await bcrypt.compare(DOCTOR_PASSWORD, credencialExistente.credential_value);
      if (passwordValida) {
        console.log('✅ Credencial válida y contraseña correcta');
        return;
      } else {
        console.log('⚠️  Contraseña no coincide. Actualizando...');
        const nuevoHash = await bcrypt.hash(DOCTOR_PASSWORD, 10);
        await credencialExistente.update({
          credential_value: nuevoHash
        });
        console.log('✅ Credencial actualizada');
        return;
      }
    }

    // Crear nueva credencial
    console.log('📝 Creando nueva credencial...');
    
    // Usar password_hash del usuario si existe, sino crear uno nuevo
    let passwordHash = usuario.password_hash;
    if (!passwordHash) {
      passwordHash = await bcrypt.hash(DOCTOR_PASSWORD, 10);
      await usuario.update({ password_hash: passwordHash });
      console.log('✅ Password hash creado en usuario');
    } else {
      // Verificar que el hash actual funcione
      const passwordValida = await bcrypt.compare(DOCTOR_PASSWORD, passwordHash);
      if (!passwordValida) {
        console.log('⚠️  Password hash no coincide. Actualizando...');
        passwordHash = await bcrypt.hash(DOCTOR_PASSWORD, 10);
        await usuario.update({ password_hash: passwordHash });
      }
    }

    const credencial = await AuthCredential.create({
      user_type: 'Doctor',
      user_id: usuario.id_usuario,
      auth_method: 'password',
      credential_value: passwordHash,
      is_primary: true,
      activo: true,
      created_at: new Date()
    });

    console.log('✅ Credencial creada:', credencial.id_credential);
    console.log('\n✅ PROCESO COMPLETADO\n');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    await sequelize.close();
    process.exit(1);
  }
}

crearCredencialDoctor();
