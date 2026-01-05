/**
 * Script para crear credenciales de password en auth_credentials
 * para usuarios que solo tienen password_hash en la tabla usuarios
 * 
 * Ejecutar: node scripts/crear-credenciales-password.js
 */

import dotenv from 'dotenv';
dotenv.config();
import sequelize from '../config/db.js';
import { Usuario, AuthCredential } from '../models/associations.js';
import logger from '../utils/logger.js';

async function crearCredencialesPassword() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conectado a la base de datos');

    // Buscar usuarios Doctor y Admin que no tengan credencial en auth_credentials
    const usuarios = await Usuario.findAll({
      where: {
        rol: ['Doctor', 'Admin'],
        activo: true
      }
    });

    logger.info(`\n📋 Encontrados ${usuarios.length} usuarios (Doctor/Admin)\n`);

    for (const usuario of usuarios) {
      // Verificar si ya tiene credencial en auth_credentials
      const credencialExistente = await AuthCredential.findOne({
        where: {
          user_type: usuario.rol,
          user_id: usuario.id_usuario,
          auth_method: 'password',
          activo: true
        }
      });

      if (credencialExistente) {
        logger.info(`✅ ${usuario.rol} (${usuario.email}) ya tiene credencial de password`);
        continue;
      }

      // Crear credencial en auth_credentials usando el password_hash del usuario
      const nuevaCredencial = await AuthCredential.create({
        user_type: usuario.rol,
        user_id: usuario.id_usuario,
        auth_method: 'password',
        credential_value: usuario.password_hash, // Usar el hash existente
        is_primary: true,
        activo: true,
        created_at: new Date(),
        updated_at: new Date()
      });

      logger.info(`✅ Credencial creada para ${usuario.rol}:`);
      logger.info(`   Email: ${usuario.email}`);
      logger.info(`   ID Usuario: ${usuario.id_usuario}`);
      logger.info(`   ID Credencial: ${nuevaCredencial.id_credential}`);
    }

    logger.info('\n✅ Proceso completado exitosamente');

  } catch (error) {
    logger.error('❌ Error creando credenciales:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    logger.info('🔌 Conexión cerrada');
  }
}

crearCredencialesPassword();

