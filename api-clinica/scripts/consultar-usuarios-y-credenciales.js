import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcryptjs';

async function consultarUsuariosYCredenciales() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida\n');

    logger.info('📊 CONSULTA DE USUARIOS Y CREDENCIALES');
    logger.info('='.repeat(80));

    // 1. Contar usuarios por tipo
    const [usuarios] = await sequelize.query(
      `SELECT COUNT(*) as total FROM usuarios WHERE activo = 1`
    );
    const totalUsuarios = usuarios[0].total;

    const [pacientes] = await sequelize.query(
      `SELECT COUNT(*) as total FROM pacientes WHERE activo = 1`
    );
    const totalPacientes = pacientes[0].total;

    const [doctores] = await sequelize.query(
      `SELECT COUNT(*) as total FROM doctores WHERE activo = 1`
    );
    const totalDoctores = doctores[0].total;

    logger.info('\n📈 RESUMEN DE USUARIOS:');
    logger.info(`   👥 Usuarios (Admin/Doctor): ${totalUsuarios}`);
    logger.info(`   🏥 Pacientes: ${totalPacientes}`);
    logger.info(`   👨‍⚕️ Doctores: ${totalDoctores}`);
    logger.info(`   📊 TOTAL: ${totalUsuarios + totalPacientes}\n`);

    // 2. Obtener todos los usuarios Admin/Doctor con sus credenciales
    logger.info('👥 USUARIOS (ADMIN/DOCTOR):');
    logger.info('='.repeat(80));
    
    const [usersList] = await sequelize.query(
      `SELECT u.id_usuario, u.email, u.rol, u.activo, u.fecha_creacion
       FROM usuarios u
       WHERE u.activo = 1
       ORDER BY u.rol, u.id_usuario`
    );

    for (const user of usersList) {
      logger.info(`\n📧 ${user.email}`);
      logger.info(`   ID: ${user.id_usuario}`);
      logger.info(`   Rol: ${user.rol}`);
      logger.info(`   Fecha Creación: ${user.fecha_creacion}`);

      // Buscar credenciales de este usuario
      const [credenciales] = await sequelize.query(
        `SELECT * FROM auth_credentials 
         WHERE user_type = ? 
         AND user_id = ? 
         AND activo = 1
         ORDER BY is_primary DESC, created_at DESC`,
        {
          replacements: [user.rol, user.id_usuario]
        }
      );

      if (credenciales.length === 0) {
        logger.info(`   ⚠️  No tiene credenciales configuradas`);
      } else {
        logger.info(`   🔐 Credenciales (${credenciales.length}):`);
        credenciales.forEach((cred, idx) => {
          logger.info(`      ${idx + 1}. Método: ${cred.auth_method}`);
          logger.info(`         Primary: ${cred.is_primary ? 'Sí' : 'No'}`);
          logger.info(`         Device ID: ${cred.device_id || 'N/A'}`);
          logger.info(`         Creado: ${cred.created_at}`);
          
          if (cred.auth_method === 'password') {
            logger.info(`         🔑 Password: (hasheado, no se puede mostrar)`);
          }
        });
      }
    }

    // 3. Obtener todos los pacientes con sus credenciales PIN
    logger.info('\n\n🏥 PACIENTES CON CREDENCIALES PIN:');
    logger.info('='.repeat(80));
    
    const [pacientesList] = await sequelize.query(
      `SELECT p.id_paciente, p.nombre, p.apellido_paterno, p.apellido_materno, 
              p.curp, p.numero_celular, p.activo, p.fecha_registro
       FROM pacientes p
       WHERE p.activo = 1
       ORDER BY p.id_paciente`
    );

    if (pacientesList.length === 0) {
      logger.info('   ℹ️  No hay pacientes activos en la base de datos');
    } else {
      for (const paciente of pacientesList) {
        const nombreCompleto = `${paciente.nombre} ${paciente.apellido_paterno || ''} ${paciente.apellido_materno || ''}`.trim();
        logger.info(`\n👤 ${nombreCompleto}`);
        logger.info(`   ID: ${paciente.id_paciente}`);
        logger.info(`   CURP: ${paciente.curp}`);
        logger.info(`   Teléfono: ${paciente.numero_celular}`);
        logger.info(`   Fecha Registro: ${paciente.fecha_registro}`);

        // Buscar credenciales PIN de este paciente
        const [credencialesPIN] = await sequelize.query(
          `SELECT * FROM auth_credentials 
           WHERE user_type = 'Paciente' 
           AND user_id = ? 
           AND auth_method = 'pin'
           AND activo = 1
           ORDER BY is_primary DESC, created_at DESC`,
          {
            replacements: [paciente.id_paciente]
          }
        );

        if (credencialesPIN.length === 0) {
          logger.info(`   ⚠️  No tiene PIN configurado`);
        } else {
          logger.info(`   🔐 Credenciales PIN (${credencialesPIN.length}):`);
          
          // Intentar encontrar el PIN (solo para pruebas - esto es complejo porque está hasheado)
          // Por ahora, solo mostramos la información de la credencial
          for (const cred of credencialesPIN) {
            logger.info(`      📱 Device ID: ${cred.device_id || 'N/A'}`);
            logger.info(`      ⭐ Primary: ${cred.is_primary ? 'Sí' : 'No'}`);
            logger.info(`      📅 Creado: ${cred.created_at}`);
            logger.info(`      🔑 PIN: (hasheado - no se puede mostrar directamente)`);
            logger.info(`      💡 Para login: usar id_paciente=${paciente.id_paciente} y el PIN original`);
          }
        }

        // También buscar otras credenciales (biometric, password)
        const [otrasCredenciales] = await sequelize.query(
          `SELECT * FROM auth_credentials 
           WHERE user_type = 'Paciente' 
           AND user_id = ? 
           AND auth_method != 'pin'
           AND activo = 1`,
          {
            replacements: [paciente.id_paciente]
          }
        );

        if (otrasCredenciales.length > 0) {
          logger.info(`   🔐 Otras credenciales:`);
          otrasCredenciales.forEach(cred => {
            logger.info(`      - ${cred.auth_method}: Device ID ${cred.device_id || 'N/A'}`);
          });
        }
      }
    }

    // 4. Resumen de credenciales PIN
    logger.info('\n\n📊 RESUMEN DE CREDENCIALES PIN:');
    logger.info('='.repeat(80));
    
    const [resumenPIN] = await sequelize.query(
      `SELECT 
        COUNT(*) as total_pins,
        COUNT(DISTINCT user_id) as pacientes_con_pin
       FROM auth_credentials 
       WHERE user_type = 'Paciente' 
       AND auth_method = 'pin' 
       AND activo = 1`
    );

    logger.info(`   Total de PINs configurados: ${resumenPIN[0].total_pins}`);
    logger.info(`   Pacientes con PIN: ${resumenPIN[0].pacientes_con_pin}`);
    logger.info(`   Pacientes sin PIN: ${totalPacientes - resumenPIN[0].pacientes_con_pin}`);

    // 5. Mostrar información para login
    logger.info('\n\n🔑 INFORMACIÓN PARA LOGIN:');
    logger.info('='.repeat(80));
    logger.info('Para probar login con PIN, necesitas:');
    logger.info('   1. id_paciente (ID del paciente)');
    logger.info('   2. pin (4 dígitos que se configuraron)');
    logger.info('   3. device_id (Device ID usado al crear el PIN)');
    logger.info('\n💡 NOTA: Los PINs están hasheados en la base de datos.');
    logger.info('   Debes usar el PIN original que se configuró al crear el paciente.');
    logger.info('   Si no lo recuerdas, necesitarás configurar uno nuevo.');

  } catch (error) {
    logger.error('❌ Error consultando usuarios y credenciales:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

consultarUsuariosYCredenciales()
  .then(() => {
    logger.info('\n✅ Consulta completada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('\n❌ Error fatal:', error);
    console.error('Error detallado:', error);
    process.exit(1);
  });



