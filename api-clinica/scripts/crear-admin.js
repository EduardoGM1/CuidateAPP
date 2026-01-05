import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import { Usuario } from '../models/associations.js';
import UnifiedAuthService from '../services/unifiedAuthService.js';
import logger from '../utils/logger.js';

async function crearAdmin() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida\n');

    logger.info('👤 CREANDO USUARIO ADMINISTRADOR');
    logger.info('='.repeat(80));

    // Credenciales por defecto (puedes cambiarlas)
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@clinica.com';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';
    const ADMIN_NOMBRE = process.env.ADMIN_NOMBRE || 'Administrador';
    const ADMIN_APELLIDO = process.env.ADMIN_APELLIDO || 'Sistema';

    logger.info(`\n📧 Email: ${ADMIN_EMAIL}`);
    logger.info(`🔐 Password: ${ADMIN_PASSWORD}\n`);

    // Verificar si ya existe
    const usuarioExistente = await Usuario.findOne({
      where: { email: ADMIN_EMAIL }
    });

    if (usuarioExistente) {
      logger.warn(`⚠️  Usuario con email ${ADMIN_EMAIL} ya existe`);
      
      // Verificar si es Admin
      if (usuarioExistente.rol === 'Admin') {
        logger.info('✅ El usuario ya es Administrador');
        
        // Verificar si tiene credencial de autenticación
        const credentials = await UnifiedAuthService.getUserCredentials(
          'Admin',
          usuarioExistente.id_usuario
        );

        if (credentials.length === 0) {
          logger.info('⚠️  No tiene credencial de autenticación, creando...');
          await UnifiedAuthService.setupCredential(
            'Admin',
            usuarioExistente.id_usuario,
            'password',
            ADMIN_PASSWORD,
            { isPrimary: true }
          );
          logger.info('✅ Credencial creada exitosamente');
        } else {
          logger.info('✅ Ya tiene credencial de autenticación');
        }

        logger.info('\n' + '='.repeat(80));
        logger.info('📋 CREDENCIALES DE ACCESO');
        logger.info('='.repeat(80));
        logger.info(`📧 Email: ${ADMIN_EMAIL}`);
        logger.info(`🔐 Password: ${ADMIN_PASSWORD}`);
        logger.info(`👤 Rol: Admin`);
        logger.info(`🆔 ID Usuario: ${usuarioExistente.id_usuario}`);
        logger.info('='.repeat(80));
        
        await sequelize.close();
        return;
      } else {
        // Actualizar rol a Admin
        await usuarioExistente.update({ rol: 'Admin' });
        logger.info('✅ Rol actualizado a Admin');
      }
    } else {
      // Crear nuevo usuario Admin
      const usuario = await Usuario.create({
        email: ADMIN_EMAIL,
        password_hash: '', // Se creará con UnifiedAuthService
        rol: 'Admin',
        activo: true
      });

      logger.info(`✅ Usuario Admin creado (ID: ${usuario.id_usuario})`);

      // Crear credencial de autenticación
      await UnifiedAuthService.setupCredential(
        'Admin',
        usuario.id_usuario,
        'password',
        ADMIN_PASSWORD,
        { isPrimary: true }
      );

      logger.info('✅ Credencial de autenticación creada');
    }

    // Obtener usuario final
    const adminUsuario = await Usuario.findOne({
      where: { email: ADMIN_EMAIL, rol: 'Admin' }
    });

    logger.info('\n' + '='.repeat(80));
    logger.info('✅ USUARIO ADMINISTRADOR LISTO');
    logger.info('='.repeat(80));
    logger.info('📋 CREDENCIALES DE ACCESO:');
    logger.info('='.repeat(80));
    logger.info(`📧 Email: ${ADMIN_EMAIL}`);
    logger.info(`🔐 Password: ${ADMIN_PASSWORD}`);
    logger.info(`👤 Rol: Admin`);
    logger.info(`🆔 ID Usuario: ${adminUsuario.id_usuario}`);
    logger.info('='.repeat(80));
    logger.info('\n💡 Puedes usar estas credenciales para iniciar sesión en el sistema');
    logger.info('   Endpoint: POST /api/auth/login');
    logger.info('   Body: { "email": "' + ADMIN_EMAIL + '", "password": "' + ADMIN_PASSWORD + '" }');
    logger.info('='.repeat(80));

  } catch (error) {
    logger.error('❌ Error creando admin:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Ejecutar si se llama directamente
const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` ||
                     process.argv[1]?.replace(/\\/g, '/').endsWith('crear-admin.js');

if (isMainModule || process.argv[1]?.includes('crear-admin')) {
  crearAdmin()
    .then(() => {
      logger.info('\n✅ Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('\n❌ Error fatal:', error);
      console.error('Error detallado:', error);
      process.exit(1);
    });
}

export default crearAdmin;



