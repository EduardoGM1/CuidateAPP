/**
 * Script para corregir las credenciales del doctor de prueba
 * Crea la credencial en AuthCredential para que el login funcione
 */

import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import bcrypt from 'bcryptjs';
import {
  Usuario,
  Doctor,
  AuthCredential
} from '../models/associations.js';
import logger from '../utils/logger.js';

const DOCTOR_EMAIL = 'doctor.prueba@clinica.com';
const DOCTOR_PASSWORD = 'Doctor123!';

async function corregirCredencialesDoctor() {
  const transaction = await sequelize.transaction();
  
  try {
    logger.info('🔧 CORRIGIENDO CREDENCIALES DEL DOCTOR DE PRUEBA');
    logger.info('='.repeat(80));

    // 1. Buscar el usuario
    const usuario = await Usuario.findOne({
      where: { email: DOCTOR_EMAIL },
      include: [{
        model: Doctor,
        as: 'Doctor'
      }],
      transaction
    });

    if (!usuario) {
      throw new Error(`Usuario con email ${DOCTOR_EMAIL} no encontrado`);
    }

    logger.info(`✅ Usuario encontrado: ${usuario.email} (ID: ${usuario.id_usuario})`);
    logger.info(`   Rol: ${usuario.rol}`);
    logger.info(`   Activo: ${usuario.activo}`);

    if (!usuario.Doctor) {
      throw new Error('El usuario no tiene un perfil de Doctor asociado');
    }

    logger.info(`✅ Doctor encontrado: ${usuario.Doctor.nombre} ${usuario.Doctor.apellido_paterno} (ID: ${usuario.Doctor.id_doctor})`);

    // 2. Verificar si ya existe una credencial de password
    const credencialExistente = await AuthCredential.findOne({
      where: {
        user_type: 'Doctor',
        user_id: usuario.id_usuario,
        auth_method: 'password',
        activo: true
      },
      transaction
    });

    if (credencialExistente) {
      logger.info('⚠️  Ya existe una credencial de password. Actualizándola...');
      
      // Actualizar la credencial existente
      const hashedPassword = await bcrypt.hash(DOCTOR_PASSWORD, 10);
      await credencialExistente.update({
        credential_value: hashedPassword,
        is_primary: true,
        activo: true,
        failed_attempts: 0,
        locked_until: null,
        updated_at: new Date()
      }, { transaction });

      logger.info('✅ Credencial actualizada exitosamente');
    } else {
      logger.info('📝 Creando nueva credencial de password...');
      
      // Crear nueva credencial
      const hashedPassword = await bcrypt.hash(DOCTOR_PASSWORD, 10);
      await AuthCredential.create({
        user_type: 'Doctor',
        user_id: usuario.id_usuario,
        auth_method: 'password',
        credential_value: hashedPassword,
        is_primary: true,
        activo: true,
        failed_attempts: 0,
        created_at: new Date(),
        updated_at: new Date()
      }, { transaction });

      logger.info('✅ Credencial creada exitosamente');
    }

    // 3. Verificar que la contraseña funciona
    logger.info('\n🔍 Verificando que la contraseña funciona...');
    const credencialVerificada = await AuthCredential.findOne({
      where: {
        user_type: 'Doctor',
        user_id: usuario.id_usuario,
        auth_method: 'password',
        activo: true
      },
      transaction
    });

    if (credencialVerificada) {
      const isValid = await bcrypt.compare(DOCTOR_PASSWORD, credencialVerificada.credential_value);
      if (isValid) {
        logger.info('✅ Verificación exitosa: La contraseña funciona correctamente');
      } else {
        throw new Error('❌ ERROR: La contraseña no coincide después de crear la credencial');
      }
    }

    await transaction.commit();

    logger.info('\n' + '='.repeat(80));
    logger.info('✅ CREDENCIALES CORREGIDAS EXITOSAMENTE');
    logger.info('='.repeat(80));
    logger.info(`\n📋 RESUMEN:`);
    logger.info(`   👨‍⚕️ Doctor: ${usuario.Doctor.nombre} ${usuario.Doctor.apellido_paterno}`);
    logger.info(`   📧 Email: ${DOCTOR_EMAIL}`);
    logger.info(`   🔑 Password: ${DOCTOR_PASSWORD}`);
    logger.info(`\n💡 Ahora puedes iniciar sesión con estas credenciales`);

  } catch (error) {
    await transaction.rollback();
    logger.error('❌ ERROR CORRIGIENDO CREDENCIALES:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar script
corregirCredencialesDoctor()
  .then(() => {
    logger.info('\n✅ Script ejecutado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Error ejecutando script:', error);
    process.exit(1);
  });

