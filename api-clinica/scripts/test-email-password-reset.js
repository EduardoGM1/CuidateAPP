/**
 * Script de prueba para verificar el envío de email de recuperación de contraseña
 * 
 * Este script prueba el flujo completo de recuperación de contraseña:
 * 1. Simula la creación de un token de recuperación
 * 2. Envía el email usando el servicio real
 * 
 * Uso:
 *   node scripts/test-email-password-reset.js <email-destino>
 * 
 * Ejemplo:
 *   node scripts/test-email-password-reset.js doctor@ejemplo.com
 */

import dotenv from 'dotenv';
dotenv.config();

import emailService from '../services/emailService.js';
import logger from '../utils/logger.js';

// Obtener email de destino desde argumentos
const emailDestino = process.argv[2];

if (!emailDestino) {
  console.error('\n❌ ERROR: Debes proporcionar un email de destino');
  console.error('   Uso: node scripts/test-email-password-reset.js <email-destino>\n');
  process.exit(1);
}

console.log('\n📧 ============================================');
console.log('PRUEBA DE EMAIL DE RECUPERACIÓN DE CONTRASEÑA');
console.log('============================================\n');

console.log(`📬 Email destino: ${emailDestino}\n`);

// Generar token de prueba
import crypto from 'crypto';
const resetToken = crypto.randomBytes(32).toString('hex');

// Construir URL de recuperación
const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

console.log('🔑 Token generado (primeros 30 caracteres):', resetToken.substring(0, 30) + '...');
console.log(`🔗 URL de recuperación: ${resetUrl}\n`);

// Probar envío de email
async function probarEnvio() {
  try {
    console.log('📤 Enviando email de recuperación de contraseña...\n');

    const result = await emailService.sendPasswordResetEmail(
      emailDestino,
      resetToken,
      resetUrl
    );

    console.log('✅ Email enviado exitosamente!\n');
    console.log('📧 Detalles:');
    console.log(`   Email ID: ${result.emailId || 'N/A'}`);
    console.log(`   Mensaje: ${result.message}\n`);

    console.log('💡 Próximos pasos:');
    console.log('   1. Revisa tu bandeja de entrada (y spam)');
    console.log('   2. Verifica que recibiste el email con el enlace');
    console.log('   3. El enlace expirará en 1 hora\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ ERROR al enviar email:');
    console.error(`   ${error.message}\n`);

    if (error.message?.includes('invalid_from_address')) {
      console.error('💡 SOLUCIÓN:');
      console.error('   El email "from" no está verificado en Resend.');
      console.error('   Verifica tu dominio o usa el email de prueba de Resend.');
      console.error('   Configura EMAIL_FROM en .env\n');
    } else if (error.message?.includes('invalid_api_key')) {
      console.error('💡 SOLUCIÓN:');
      console.error('   La API key de Resend no es válida.');
      console.error('   Verifica RESEND_API_KEY en .env\n');
    }

    process.exit(1);
  }
}

probarEnvio();

