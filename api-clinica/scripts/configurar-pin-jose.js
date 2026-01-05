import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import { Paciente } from '../models/associations.js';
import UnifiedAuthService from '../services/unifiedAuthService.js';
import logger from '../utils/logger.js';

async function configurarPINJose() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida\n');

    logger.info('🔐 CONFIGURANDO PIN PARA JOSÉ GARCÍA DÍAZ');
    logger.info('='.repeat(80));

    // ID del paciente José
    const pacienteId = 4;
    
    // PIN a configurar (puedes cambiarlo)
    // Usando un PIN seguro que no esté en la lista de débiles
    const nuevoPIN = '5678'; // Cambiar si quieres otro PIN
    const deviceId = 'device_1762199764141_moqzmakja'; // Device ID existente

    // Verificar que el paciente existe
    const paciente = await Paciente.findByPk(pacienteId);
    if (!paciente) {
      logger.error(`❌ Paciente con ID ${pacienteId} no encontrado`);
      process.exit(1);
    }

    logger.info(`\n👤 Paciente encontrado:`);
    logger.info(`   Nombre: ${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno}`);
    logger.info(`   ID: ${paciente.id_paciente}`);
    logger.info(`   CURP: ${paciente.curp}`);
    logger.info(`   Activo: ${paciente.activo ? 'Sí' : 'No'}`);

    if (!paciente.activo) {
      logger.error('❌ El paciente está inactivo. No se puede configurar PIN.');
      process.exit(1);
    }

    // Verificar si ya tiene un PIN configurado
    const credencialesExistentes = await UnifiedAuthService.getUserCredentials('Paciente', pacienteId);
    const pinExistente = credencialesExistentes.find(c => c.method === 'pin');

    if (pinExistente) {
      logger.info(`\n⚠️  El paciente ya tiene un PIN configurado:`);
      logger.info(`   Device ID: ${pinExistente.device_id}`);
      logger.info(`   Primary: ${pinExistente.is_primary ? 'Sí' : 'No'}`);
      logger.info(`   Creado: ${pinExistente.created_at}`);
      
      logger.info(`\n🔄 Actualizando PIN existente...`);
      
      // Eliminar credencial antigua
      // Nota: Necesitamos el ID de la credencial para eliminarla
      // Por ahora, crearemos una nueva y marcarla como primaria
    }

    // Validar formato de PIN
    if (!/^\d{4}$/.test(nuevoPIN)) {
      logger.error('❌ El PIN debe tener exactamente 4 dígitos');
      process.exit(1);
    }

    // Validar PINs débiles
    const weakPINs = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321'];
    if (weakPINs.includes(nuevoPIN)) {
      logger.warn(`⚠️  ADVERTENCIA: El PIN "${nuevoPIN}" es considerado débil, pero se configurará de todas formas para pruebas.`);
    }

    logger.info(`\n📝 Configurando PIN:`);
    logger.info(`   PIN: ${nuevoPIN}`);
    logger.info(`   Device ID: ${deviceId}`);
    logger.info(`   Primary: Sí`);

    // Configurar el PIN usando el servicio unificado
    try {
      const result = await UnifiedAuthService.setupCredential(
        'Paciente',
        pacienteId,
        'pin',
        nuevoPIN,
        {
          deviceId: deviceId,
          deviceName: `${paciente.nombre} ${paciente.apellido_paterno} - Mobile`,
          deviceType: 'mobile',
          isPrimary: true
        }
      );

      logger.info(`\n✅ PIN configurado exitosamente!`);
      logger.info(`   Credential ID: ${result.credential.id}`);
      logger.info(`   Método: ${result.credential.method}`);
      logger.info(`   Primary: ${result.credential.is_primary ? 'Sí' : 'No'}`);
      logger.info(`   Device ID: ${result.credential.device_id}`);

      logger.info(`\n📋 CREDENCIALES PARA LOGIN:`);
      logger.info('='.repeat(80));
      logger.info(`   ID Paciente: ${pacienteId}`);
      logger.info(`   PIN: ${nuevoPIN}`);
      logger.info(`   Device ID: ${deviceId}`);
      logger.info(`\n🔗 Endpoint: POST /api/auth-unified/login-paciente`);
      logger.info(`📦 Body:`);
      logger.info(`{`);
      logger.info(`  "id_paciente": ${pacienteId},`);
      logger.info(`  "pin": "${nuevoPIN}",`);
      logger.info(`  "device_id": "${deviceId}"`);
      logger.info(`}`);
      logger.info('='.repeat(80));

    } catch (error) {
      logger.error('❌ Error configurando PIN:', error);
      
      if (error.message.includes('ya está en uso') || error.message.includes('duplicado')) {
        logger.error('💡 Este PIN ya está en uso por otro paciente.');
        logger.error('   Por favor, elige un PIN diferente.');
      } else if (error.message.includes('no encontrado')) {
        logger.error('💡 El paciente no se encontró o está inactivo.');
      } else {
        logger.error('💡 Error desconocido. Revisa los logs para más detalles.');
      }
      
      throw error;
    }

  } catch (error) {
    logger.error('❌ Error fatal:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

configurarPINJose()
  .then(() => {
    logger.info('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('\n❌ Error fatal:', error);
    console.error('Error detallado:', error);
    process.exit(1);
  });

