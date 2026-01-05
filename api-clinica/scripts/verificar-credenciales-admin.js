import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import logger from '../utils/logger.js';

async function verificarCredenciales() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida\n');

    // Verificar usuario
    const [usuarios] = await sequelize.query(
      `SELECT * FROM usuarios WHERE email = 'admin@clinica.com'`
    );

    if (usuarios.length === 0) {
      logger.error('❌ Usuario admin no encontrado');
      return;
    }

    const usuario = usuarios[0];
    logger.info('📋 Usuario encontrado:');
    logger.info(`   ID: ${usuario.id_usuario}`);
    logger.info(`   Email: ${usuario.email}`);
    logger.info(`   Rol: ${usuario.rol}`);
    logger.info(`   Activo: ${usuario.activo}`);
    logger.info(`   Password Hash: ${usuario.password_hash ? 'EXISTE (legacy)' : 'NO EXISTE (unificado)'}\n`);

    // Verificar credenciales en auth_credentials
    const [credenciales] = await sequelize.query(
      `SELECT * FROM auth_credentials 
       WHERE user_type = 'Admin' 
       AND user_id = ${usuario.id_usuario} 
       AND auth_method = 'password'`
    );

    if (credenciales.length === 0) {
      logger.error('❌ Credencial de autenticación NO encontrada en auth_credentials');
      logger.info('   Esto significa que el usuario fue creado pero no se configuró la credencial');
      return;
    }

    const credencial = credenciales[0];
    logger.info('✅ Credencial encontrada:');
    logger.info(`   ID Credencial: ${credencial.id_credential}`);
    logger.info(`   User Type: ${credencial.user_type}`);
    logger.info(`   User ID: ${credencial.user_id}`);
    logger.info(`   Auth Method: ${credencial.auth_method}`);
    logger.info(`   Device ID: ${credencial.device_id || 'NULL'}`);
    logger.info(`   Is Primary: ${credencial.is_primary}`);
    logger.info(`   Activo: ${credencial.activo}`);
    logger.info(`   Failed Attempts: ${credencial.failed_attempts}`);
    logger.info(`   Credential Value (hash): ${credencial.credential_value ? 'EXISTE' : 'NO EXISTE'}`);
    logger.info(`   Credential Value length: ${credencial.credential_value?.length || 0} caracteres\n`);

    // Verificar si hay múltiples credenciales
    const [todasCredenciales] = await sequelize.query(
      `SELECT * FROM auth_credentials WHERE user_type = 'Admin' AND user_id = ${usuario.id_usuario}`
    );

    logger.info(`📊 Total de credenciales para este usuario: ${todasCredenciales.length}`);
    todasCredenciales.forEach((cred, idx) => {
      logger.info(`   ${idx + 1}. Método: ${cred.auth_method}, Activo: ${cred.activo}, Primary: ${cred.is_primary}`);
    });

  } catch (error) {
    logger.error('❌ Error verificando credenciales:', error);
  } finally {
    await sequelize.close();
  }
}

verificarCredenciales()
  .then(() => {
    logger.info('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('\n❌ Error fatal:', error);
    process.exit(1);
  });



