import sequelize from '../config/db.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { Usuario } from '../models/associations.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Lista de contraseñas débiles conocidas que deben ser actualizadas
 */
const WEAK_PASSWORDS = [
  'Doctor123!',
  'Admin123!',
  'doctor123',
  'admin123',
  'Doctor123',
  'Admin123',
  'password',
  '123456',
  '12345678',
  'qwerty',
  'abc123'
];

/**
 * Genera una contraseña segura aleatoria
 */
function generateSecurePassword(length = 16) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  // Asegurar al menos un carácter de cada tipo
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Completar el resto
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Mezclar los caracteres
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Verifica si una contraseña es débil comparándola con la lista de contraseñas débiles
 */
async function isWeakPassword(passwordHash, weakPasswords) {
  for (const weakPassword of weakPasswords) {
    try {
      const match = await bcrypt.compare(weakPassword, passwordHash);
      if (match) {
        return { isWeak: true, weakPassword };
      }
    } catch (error) {
      // Si hay error al comparar, continuar con la siguiente
      continue;
    }
  }
  return { isWeak: false };
}

/**
 * Actualiza la contraseña de un usuario
 */
async function updateUserPassword(userId, newPassword) {
  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  await Usuario.update(
    { password_hash: newPasswordHash },
    { where: { id_usuario: userId } }
  );
  return newPasswordHash;
}

/**
 * Función principal
 */
async function verificarYActualizarContrasenasDebiles() {
  try {
    console.log('🔍 Verificando usuarios con contraseñas débiles...\n');
    await sequelize.authenticate();
    
    // Obtener todos los usuarios activos
    const usuarios = await Usuario.findAll({
      where: { activo: true },
      attributes: ['id_usuario', 'email', 'rol', 'password_hash']
    });
    
    console.log(`📊 Total de usuarios activos: ${usuarios.length}\n`);
    
    const usuariosDebiles = [];
    
    // Verificar cada usuario
    for (const usuario of usuarios) {
      const result = await isWeakPassword(usuario.password_hash, WEAK_PASSWORDS);
      if (result.isWeak) {
        usuariosDebiles.push({
          ...usuario.toJSON(),
          weakPassword: result.weakPassword
        });
      }
    }
    
    if (usuariosDebiles.length === 0) {
      console.log('✅ No se encontraron usuarios con contraseñas débiles conocidas.\n');
      return;
    }
    
    console.log(`⚠️  Se encontraron ${usuariosDebiles.length} usuario(s) con contraseñas débiles:\n`);
    usuariosDebiles.forEach((u, index) => {
      console.log(`   ${index + 1}. ${u.email} (${u.rol})`);
      console.log(`      Contraseña débil detectada: ${u.weakPassword}\n`);
    });
    
    // Verificar específicamente el usuario doctor mencionado
    const doctorUser = usuariosDebiles.find(u => 
      u.email.toLowerCase() === 'doctor@clinica.com' || 
      u.email.toLowerCase() === 'Doctor@clinica.com'
    );
    
    if (doctorUser) {
      console.log('🔴 USUARIO DOCTOR CON CONTRASEÑA DÉBIL DETECTADO\n');
      console.log(`   Email: ${doctorUser.email}`);
      console.log(`   Rol: ${doctorUser.rol}`);
      console.log(`   Contraseña actual: ${doctorUser.weakPassword}\n`);
      
      // Generar nueva contraseña segura
      const nuevaPassword = generateSecurePassword(16);
      console.log('🔐 Generando nueva contraseña segura...');
      console.log(`   Nueva contraseña: ${nuevaPassword}\n`);
      
      // Actualizar contraseña
      console.log('🔄 Actualizando contraseña del doctor...');
      await updateUserPassword(doctorUser.id_usuario, nuevaPassword);
      console.log('✅ Contraseña actualizada exitosamente\n');
      
      console.log('📝 CREDENCIALES ACTUALIZADAS:');
      console.log(`   Email: ${doctorUser.email}`);
      console.log(`   Nueva Password: ${nuevaPassword}\n`);
      console.log('⚠️  IMPORTANTE: Guarda esta contraseña de forma segura.\n');
      
      logger.warn('Contraseña débil actualizada', {
        userId: doctorUser.id_usuario,
        email: doctorUser.email,
        oldPassword: doctorUser.weakPassword,
        action: 'password_updated'
      });
    } else {
      console.log('ℹ️  El usuario doctor no fue encontrado con contraseña débil.\n');
    }
    
    // Preguntar si desea actualizar otros usuarios
    if (usuariosDebiles.length > (doctorUser ? 1 : 0)) {
      console.log('📋 Otros usuarios con contraseñas débiles:');
      usuariosDebiles
        .filter(u => u.email.toLowerCase() !== 'doctor@clinica.com' && u.email.toLowerCase() !== 'Doctor@clinica.com')
        .forEach((u, index) => {
          console.log(`   ${index + 1}. ${u.email} (${u.rol}) - ${u.weakPassword}`);
        });
      console.log('\n💡 Para actualizar otros usuarios, ejecuta este script nuevamente o actualiza manualmente.\n');
    }
    
    console.log('✅ Verificación completada\n');
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
    logger.error('Error en verificarYActualizarContrasenasDebiles', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Ejecutar
verificarYActualizarContrasenasDebiles()
  .then(() => {
    console.log('✅ Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });

