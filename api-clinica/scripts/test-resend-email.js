/**
 * Script de prueba para verificar el envío de emails con Resend
 * 
 * Uso:
 *   node scripts/test-resend-email.js <email-destino>
 * 
 * Ejemplo:
 *   node scripts/test-resend-email.js tu-email@ejemplo.com
 */

import dotenv from 'dotenv';
dotenv.config();

import { Resend } from 'resend';
import logger from '../utils/logger.js';

// Obtener email de destino desde argumentos o usar uno por defecto
const emailDestino = process.argv[2] || process.env.TEST_EMAIL || 'test@example.com';

// Verificar configuración
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';

console.log('\n📧 ============================================');
console.log('PRUEBA DE ENVÍO DE EMAIL CON RESEND');
console.log('============================================\n');

// Verificar API Key
if (!RESEND_API_KEY) {
  console.error('❌ ERROR: RESEND_API_KEY no está configurada en .env');
  console.error('   Por favor, configura RESEND_API_KEY en tu archivo .env');
  console.error('   Obtén tu API key en: https://resend.com/api-keys\n');
  process.exit(1);
}

console.log('✅ Configuración encontrada:');
console.log(`   API Key: ${RESEND_API_KEY.substring(0, 10)}...${RESEND_API_KEY.substring(RESEND_API_KEY.length - 4)}`);
console.log(`   Email From: ${EMAIL_FROM}`);
console.log(`   Email Destino: ${emailDestino}\n`);

// Inicializar Resend
const resend = new Resend(RESEND_API_KEY);

// Función para probar envío de email
async function probarEnvioEmail() {
  try {
    console.log('📤 Enviando email de prueba...\n');

    const subject = 'Prueba de Email - Clínica';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { padding: 20px; background-color: #f9f9f9; border-radius: 0 0 5px 5px; }
          .success { background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .info { background-color: #e3f2fd; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Email de Prueba</h1>
          </div>
          <div class="content">
            <div class="success">
              <strong>🎉 ¡Email enviado exitosamente!</strong>
              <p>Si estás viendo este email, significa que Resend está funcionando correctamente.</p>
            </div>
            <div class="info">
              <h3>📋 Información de la Prueba:</h3>
              <ul>
                <li><strong>Fecha y hora:</strong> ${new Date().toLocaleString('es-MX')}</li>
                <li><strong>Servicio:</strong> Resend</li>
                <li><strong>Estado:</strong> ✅ Funcionando</li>
              </ul>
            </div>
            <p>Este es un email de prueba para verificar que el servicio de envío de emails está configurado correctamente.</p>
          </div>
          <div class="footer">
            <p>Este es un email automático de prueba.</p>
            <p>&copy; ${new Date().getFullYear()} Clínica - Sistema de Pruebas</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `Email de prueba - Clínica\n\nSi estás viendo este email, significa que Resend está funcionando correctamente.\n\nFecha: ${new Date().toLocaleString('es-MX')}`;

    // Enviar email
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [emailDestino], // Resend espera un array
      subject,
      html,
      text
    });

    if (error) {
      console.error('❌ ERROR al enviar email:');
      console.error(`   Código: ${error.name || 'Unknown'}`);
      console.error(`   Mensaje: ${error.message}`);
      
      // Errores comunes y soluciones
      if (error.message?.includes('invalid_from_address')) {
        console.error('\n💡 SOLUCIÓN:');
        console.error('   El email "from" no está verificado en Resend.');
        console.error('   Verifica tu dominio o usa el email de prueba de Resend.');
        console.error('   Más info: https://resend.com/docs/dashboard/domains/introduction\n');
      } else if (error.message?.includes('invalid_api_key')) {
        console.error('\n💡 SOLUCIÓN:');
        console.error('   La API key de Resend no es válida.');
        console.error('   Verifica tu API key en: https://resend.com/api-keys\n');
      } else if (error.message?.includes('rate_limit')) {
        console.error('\n💡 SOLUCIÓN:');
        console.error('   Has excedido el límite de envíos.');
        console.error('   Espera unos minutos o actualiza tu plan en Resend.\n');
      }
      
      process.exit(1);
    }

    // Éxito
    console.log('✅ Email enviado exitosamente!\n');
    console.log('📧 Detalles del envío:');
    console.log(`   Email ID: ${data?.id || 'N/A'}`);
    console.log(`   Destinatario: ${emailDestino}`);
    console.log(`   Asunto: ${subject}`);
    console.log(`   Fecha: ${new Date().toLocaleString('es-MX')}\n`);
    
    console.log('💡 Próximos pasos:');
    console.log('   1. Revisa tu bandeja de entrada (y spam)');
    console.log('   2. Verifica que recibiste el email');
    console.log('   3. Si no lo recibes, verifica la configuración de Resend\n');

    // Log estructurado
    logger.info('✅ Prueba de email exitosa', {
      emailId: data?.id,
      to: emailDestino,
      from: EMAIL_FROM
    });

    process.exit(0);

  } catch (error) {
    console.error('❌ ERROR inesperado:');
    console.error(`   ${error.message}`);
    console.error(`   Stack: ${error.stack}\n`);
    
    logger.error('Error en prueba de email', {
      error: error.message,
      stack: error.stack
    });

    process.exit(1);
  }
}

// Función para verificar configuración de Resend
async function verificarConfiguracion() {
  try {
    console.log('🔍 Verificando configuración de Resend...\n');

    // Intentar obtener información de la API key (si Resend lo permite)
    // Nota: Resend no tiene un endpoint directo para verificar API key
    // Así que verificamos intentando enviar un email

    console.log('✅ Configuración básica verificada');
    console.log('   La API key será validada al enviar el email\n');

  } catch (error) {
    console.error('❌ Error verificando configuración:', error.message);
    process.exit(1);
  }
}

// Ejecutar pruebas
async function main() {
  await verificarConfiguracion();
  await probarEnvioEmail();
}

main().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});

