/**
 * Script rápido para actualizar credenciales de usuarios Admin y Doctor
 */

import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import { Usuario } from '../models/associations.js';
import UnifiedAuthService from '../services/unifiedAuthService.js';
import logger from '../utils/logger.js';

async function fixCredentials() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida');

    // Admin
    const admin = await Usuario.findOne({ where: { email: 'admin@clinica.com' } });
    if (admin) {
      logger.info(`📧 Actualizando credenciales para Admin (ID: ${admin.id_usuario})`);
      
      // Obtener credenciales existentes
      const existingCreds = await UnifiedAuthService.getUserCredentials('Admin', admin.id_usuario);
      
      // Desactivar todas las credenciales existentes
      if (existingCreds.length > 0) {
        const AuthCredential = (await import('../models/AuthCredential.js')).default;
        for (const cred of existingCreds) {
          if (cred.id_credential) {
            await AuthCredential.update(
              { activo: false },
              { where: { id_credential: cred.id_credential } }
            );
          }
        }
      }
      
      // Crear nueva credencial
      await UnifiedAuthService.setupCredential('Admin', admin.id_usuario, 'password', 'Admin123!', { isPrimary: true });
      logger.info('✅ Credencial Admin actualizada');
      logger.info('   📧 Email: admin@clinica.com');
      logger.info('   🔐 Password: Admin123!');
    } else {
      logger.warn('⚠️ Usuario Admin no encontrado');
    }

    // Doctor
    const doctor = await Usuario.findOne({ where: { email: 'doctor@clinica.com' } });
    if (doctor) {
      logger.info(`📧 Actualizando credenciales para Doctor (ID: ${doctor.id_usuario})`);
      
      // Obtener credenciales existentes
      const existingCreds = await UnifiedAuthService.getUserCredentials('Doctor', doctor.id_usuario);
      
      // Desactivar todas las credenciales existentes
      if (existingCreds.length > 0) {
        const AuthCredential = (await import('../models/AuthCredential.js')).default;
        for (const cred of existingCreds) {
          if (cred.id_credential) {
            await AuthCredential.update(
              { activo: false },
              { where: { id_credential: cred.id_credential } }
            );
          }
        }
      }
      
      // Crear nueva credencial
      await UnifiedAuthService.setupCredential('Doctor', doctor.id_usuario, 'password', 'Doctor123!', { isPrimary: true });
      logger.info('✅ Credencial Doctor actualizada');
      logger.info('   📧 Email: doctor@clinica.com');
      logger.info('   🔐 Password: Doctor123!');
    } else {
      logger.warn('⚠️ Usuario Doctor no encontrado');
    }

    logger.info('\n✅ Credenciales actualizadas correctamente');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error:', error);
    process.exit(1);
  }
}

fixCredentials();

