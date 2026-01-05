/**
 * Script para actualizar password_hash en la tabla usuarios
 * (El mobile login usa password_hash, no auth_credentials)
 */

import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import { Usuario } from '../models/associations.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcryptjs';

async function fixPasswordHash() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida');

    // Admin
    const admin = await Usuario.findOne({ where: { email: 'admin@clinica.com' } });
    if (admin) {
      const hashedPassword = await bcrypt.hash('Admin123!', 10);
      await admin.update({ password_hash: hashedPassword });
      logger.info('✅ Password hash Admin actualizado');
      logger.info('   📧 Email: admin@clinica.com');
      logger.info('   🔐 Password: Admin123!');
    } else {
      logger.warn('⚠️ Usuario Admin no encontrado');
    }

    // Doctor
    const doctor = await Usuario.findOne({ where: { email: 'doctor@clinica.com' } });
    if (doctor) {
      const hashedPassword = await bcrypt.hash('Doctor123!', 10);
      await doctor.update({ password_hash: hashedPassword });
      logger.info('✅ Password hash Doctor actualizado');
      logger.info('   📧 Email: doctor@clinica.com');
      logger.info('   🔐 Password: Doctor123!');
    } else {
      logger.warn('⚠️ Usuario Doctor no encontrado');
    }

    logger.info('\n✅ Password hashes actualizados correctamente');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error:', error);
    process.exit(1);
  }
}

fixPasswordHash();

