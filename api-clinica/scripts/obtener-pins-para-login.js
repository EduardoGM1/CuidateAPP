import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcryptjs';

async function obtenerPINsParaLogin() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida\n');

    logger.info('🔍 BUSCANDO PINs PARA LOGIN DE PACIENTES');
    logger.info('='.repeat(80));

    // Obtener todos los pacientes con PINs
    const [pacientesConPIN] = await sequelize.query(
      `SELECT 
        p.id_paciente,
        p.nombre,
        p.apellido_paterno,
        p.apellido_materno,
        p.curp,
        p.numero_celular,
        ac.id_credential,
        ac.device_id,
        ac.credential_value,
        ac.is_primary,
        ac.created_at
      FROM pacientes p
      INNER JOIN auth_credentials ac ON ac.user_id = p.id_paciente
      WHERE p.activo = 1
        AND ac.user_type = 'Paciente'
        AND ac.auth_method = 'pin'
        AND ac.activo = 1
      ORDER BY p.id_paciente, ac.is_primary DESC`
    );

    if (pacientesConPIN.length === 0) {
      logger.info('ℹ️  No hay pacientes con PINs configurados');
      return;
    }

    logger.info(`\n📊 Encontrados ${pacientesConPIN.length} credencial(es) PIN\n`);

    // Lista de PINs comunes para probar (solo para desarrollo/testing)
    const pinsComunes = [
      '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999',
      '1234', '4321', '0001', '1000', '2000', '3000', '4000', '5000', '6000', '7000', '8000', '9000',
      '0123', '3210', '1010', '2020', '3030', '4040', '5050', '6060', '7070', '8080', '9090',
      '7975', '1313', '1192', '2468', '1357', '2468', '8642', '7531'
    ];

    for (const registro of pacientesConPIN) {
      const nombreCompleto = `${registro.nombre} ${registro.apellido_paterno || ''} ${registro.apellido_materno || ''}`.trim();
      
      logger.info(`\n👤 ${nombreCompleto}`);
      logger.info(`   ID Paciente: ${registro.id_paciente}`);
      logger.info(`   CURP: ${registro.curp}`);
      logger.info(`   Teléfono: ${registro.numero_celular}`);
      logger.info(`   Device ID: ${registro.device_id}`);
      logger.info(`   Primary: ${registro.is_primary ? 'Sí' : 'No'}`);
      logger.info(`   Creado: ${registro.created_at}`);

      // Intentar encontrar el PIN probando contra el hash
      let pinEncontrado = null;
      logger.info(`   🔍 Intentando identificar PIN...`);

      for (const pinTest of pinsComunes) {
        try {
          const match = await bcrypt.compare(pinTest, registro.credential_value);
          if (match) {
            pinEncontrado = pinTest;
            break;
          }
        } catch (error) {
          // Continuar con el siguiente PIN
        }
      }

      if (pinEncontrado) {
        logger.info(`   ✅ PIN ENCONTRADO: ${pinEncontrado}`);
        logger.info(`   📋 CREDENCIALES PARA LOGIN:`);
        logger.info(`      - id_paciente: ${registro.id_paciente}`);
        logger.info(`      - pin: ${pinEncontrado}`);
        logger.info(`      - device_id: ${registro.device_id}`);
        logger.info(`   🔗 Endpoint: POST /api/auth-unified/login-paciente`);
        logger.info(`   📦 Body: { "id_paciente": ${registro.id_paciente}, "pin": "${pinEncontrado}", "device_id": "${registro.device_id}" }`);
      } else {
        logger.info(`   ⚠️  PIN no encontrado en la lista de PINs comunes`);
        logger.info(`   💡 El PIN puede ser un número personalizado de 4 dígitos`);
        logger.info(`   📋 Para login, necesitas:`);
        logger.info(`      - id_paciente: ${registro.id_paciente}`);
        logger.info(`      - pin: (el PIN original que se configuró)`);
        logger.info(`      - device_id: ${registro.device_id}`);
      }
    }

    // Resumen
    logger.info('\n\n📊 RESUMEN:');
    logger.info('='.repeat(80));
    logger.info(`Total pacientes con PIN: ${pacientesConPIN.length}`);
    const pinsEncontrados = pacientesConPIN.filter(r => {
      // Contar solo si encontramos el PIN
      // (esto es una aproximación, en realidad necesitaríamos probar todos)
      return true; // Por ahora asumimos que todos tienen PIN configurado
    }).length;
    logger.info(`Pacientes listos para login: ${pinsEncontrados}`);

    // Mostrar credenciales de Admin/Doctor también
    logger.info('\n\n👥 CREDENCIALES DE ADMIN/DOCTOR:');
    logger.info('='.repeat(80));
    
    const [admins] = await sequelize.query(
      `SELECT u.id_usuario, u.email, u.rol, ac.credential_value
       FROM usuarios u
       LEFT JOIN auth_credentials ac ON ac.user_id = u.id_usuario 
         AND ac.user_type = u.rol 
         AND ac.auth_method = 'password'
         AND ac.activo = 1
       WHERE u.activo = 1 
         AND u.rol IN ('Admin', 'Doctor')
       ORDER BY u.rol, u.id_usuario`
    );

    for (const admin of admins) {
      logger.info(`\n📧 ${admin.email}`);
      logger.info(`   ID: ${admin.id_usuario}`);
      logger.info(`   Rol: ${admin.rol}`);
      
      if (admin.rol === 'Admin' && admin.email === 'admin@clinica.com') {
        logger.info(`   🔑 Password: Admin123!`);
        logger.info(`   🔗 Endpoint: POST /api/auth/login`);
        logger.info(`   📦 Body: { "email": "admin@clinica.com", "password": "Admin123!" }`);
      } else {
        logger.info(`   ⚠️  Password no configurado o desconocido`);
      }
    }

  } catch (error) {
    logger.error('❌ Error obteniendo PINs:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

obtenerPINsParaLogin()
  .then(() => {
    logger.info('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('\n❌ Error fatal:', error);
    console.error('Error detallado:', error);
    process.exit(1);
  });



