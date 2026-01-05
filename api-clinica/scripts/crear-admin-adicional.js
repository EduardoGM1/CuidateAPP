/**
 * Script para crear un administrador adicional
 * Útil para probar WebSockets con múltiples usuarios
 * 
 * Ejecutar: node scripts/crear-admin-adicional.js
 */

import dotenv from 'dotenv';
dotenv.config();
import sequelize from '../config/db.js';
import { Usuario, AuthCredential } from '../models/associations.js';
import bcrypt from 'bcrypt';
import logger from '../utils/logger.js';

async function crearAdminAdicional() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conectado a la base de datos\n');

    // Datos del nuevo administrador
    const email = 'admin2@clinica.com';
    const password = 'admin123';
    const passwordHash = await bcrypt.hash(password, 10);

    // Verificar si el email ya existe
    const usuarioExistente = await Usuario.findOne({
      where: { email }
    });

    if (usuarioExistente) {
      logger.warn(`⚠️  El email ${email} ya existe.`);
      logger.info('   Usando el usuario existente...\n');
      
      // Verificar si tiene credencial
      const credencialExistente = await AuthCredential.findOne({
        where: {
          user_type: 'Admin',
          user_id: usuarioExistente.id_usuario,
          auth_method: 'password',
          activo: true
        }
      });

      if (credencialExistente) {
        logger.info('✅ El usuario ya tiene credencial activa');
        logger.info('\n═══════════════════════════════════════════════════════════════');
        logger.info('📋 CREDENCIALES DEL ADMINISTRADOR');
        logger.info('═══════════════════════════════════════════════════════════════\n');
        logger.info('👤 ADMINISTRADOR #2:');
        logger.info(`   Email: ${email}`);
        logger.info(`   Contraseña: ${password}`);
        logger.info(`   ID Usuario: ${usuarioExistente.id_usuario}\n`);
        logger.info('═══════════════════════════════════════════════════════════════\n');
        return;
      } else {
        // Crear credencial para el usuario existente
        await AuthCredential.create({
          user_type: 'Admin',
          user_id: usuarioExistente.id_usuario,
          auth_method: 'password',
          credential_value: passwordHash,
          is_primary: true,
          activo: true,
          created_at: new Date(),
          updated_at: new Date()
        });
        logger.info('✅ Credencial creada para el usuario existente');
      }
    } else {
      // Crear nuevo usuario
      const usuario = await Usuario.create({
        email,
        password_hash: passwordHash,
        rol: 'Admin',
        activo: true,
        fecha_creacion: new Date()
      });

      logger.info(`✅ Usuario creado (ID: ${usuario.id_usuario})`);

      // Crear credencial en auth_credentials
      await AuthCredential.create({
        user_type: 'Admin',
        user_id: usuario.id_usuario,
        auth_method: 'password',
        credential_value: passwordHash,
        is_primary: true,
        activo: true,
        created_at: new Date(),
        updated_at: new Date()
      });

      logger.info('✅ Credencial creada en auth_credentials');
    }

    // Obtener el usuario final (puede ser el nuevo o el existente)
    const usuarioFinal = await Usuario.findOne({
      where: { email }
    });

    logger.info('\n═══════════════════════════════════════════════════════════════');
    logger.info('📋 CREDENCIALES DEL ADMINISTRADOR');
    logger.info('═══════════════════════════════════════════════════════════════\n');
    logger.info('👤 ADMINISTRADOR #2:');
    logger.info(`   Email: ${email}`);
    logger.info(`   Contraseña: ${password}`);
    logger.info(`   ID Usuario: ${usuarioFinal.id_usuario}\n`);
    logger.info('═══════════════════════════════════════════════════════════════\n');
    logger.info('💡 Puedes usar estas credenciales para probar WebSockets');
    logger.info('   desde múltiples dispositivos o sesiones simultáneas.\n');

  } catch (error) {
    logger.error('❌ Error creando administrador adicional:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

crearAdminAdicional();


