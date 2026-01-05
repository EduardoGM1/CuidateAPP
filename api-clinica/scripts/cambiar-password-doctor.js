/**
 * Script para cambiar la contraseña de un doctor
 * 
 * Ejecutar: node scripts/cambiar-password-doctor.js
 */

import dotenv from 'dotenv';
dotenv.config();
import sequelize from '../config/db.js';
import { Usuario } from '../models/associations.js';
import bcrypt from 'bcrypt';
import logger from '../utils/logger.js';

async function cambiarPasswordDoctor() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conectado a la base de datos');

    const email = 'doctor@petalmail.com';
    const nuevaPassword = 'doctor123';

    // Buscar el usuario
    const usuario = await Usuario.findOne({
      where: {
        email: email.toLowerCase().trim()
      }
    });

    if (!usuario) {
      logger.error(`❌ Usuario con email "${email}" no encontrado`);
      process.exit(1);
    }

    logger.info(`✅ Usuario encontrado:`, {
      id_usuario: usuario.id_usuario,
      email: usuario.email,
      rol: usuario.rol
    });

    // Verificar que sea un doctor
    if (usuario.rol !== 'Doctor') {
      logger.warn(`⚠️  El usuario con email "${email}" tiene rol "${usuario.rol}", no "Doctor"`);
      logger.info('   Continuando con el cambio de contraseña de todas formas...');
    }

    // Hashear la nueva contraseña
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(nuevaPassword, saltRounds);

    logger.info('🔐 Hasheando nueva contraseña...');

    // Actualizar la contraseña
    await usuario.update({
      password_hash: passwordHash
    });

    logger.info('✅ Contraseña actualizada exitosamente');
    logger.info(`   Email: ${email}`);
    logger.info(`   Nueva contraseña: ${nuevaPassword}`);
    logger.info(`   Password hash actualizado`);

  } catch (error) {
    logger.error('❌ Error cambiando contraseña:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    logger.info('🔌 Conexión cerrada');
  }
}

cambiarPasswordDoctor();

