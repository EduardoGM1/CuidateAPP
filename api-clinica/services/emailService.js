/**
 * Servicio de Email
 * 
 * Este servicio maneja el envío de emails para la aplicación usando Resend.
 * En desarrollo, también loguea los emails para facilitar pruebas.
 */

import { Resend } from 'resend';
import logger from '../utils/logger.js';

// Inicializar Resend
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';

// Validar que la API key esté configurada
if (!RESEND_API_KEY && process.env.NODE_ENV === 'production') {
  logger.error('❌ RESEND_API_KEY no está configurada. El envío de emails no funcionará en producción.');
}

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

class EmailService {
  /**
   * Enviar email de recuperación de contraseña
   * @param {string} to - Email del destinatario
   * @param {string} resetToken - Token de recuperación
   * @param {string} resetUrl - URL completa para resetear contraseña
   */
  async sendPasswordResetEmail(to, resetToken, resetUrl) {
    try {
      const subject = 'Recuperación de Contraseña - Clínica';
      const html = this.getPasswordResetEmailTemplate(resetUrl);
      const text = `Para recuperar tu contraseña, visita: ${resetUrl}`;

      // En desarrollo, loguear antes de enviar
      if (process.env.NODE_ENV === 'development') {
        logger.info('📧 [EMAIL] Enviando email de recuperación de contraseña', {
          to,
          subject,
          resetUrl,
          resetToken: resetToken.substring(0, 20) + '...'
        });
        
        // Mostrar en consola para facilitar pruebas
        console.log('\n📧 ============================================');
        console.log('EMAIL DE RECUPERACIÓN DE CONTRASEÑA');
        console.log('============================================');
        console.log(`Para: ${to}`);
        console.log(`Asunto: ${subject}`);
        console.log(`URL de recuperación: ${resetUrl}`);
        console.log(`Token: ${resetToken.substring(0, 30)}...`);
        console.log('============================================\n');
      }

      // Verificar que Resend esté configurado
      if (!resend) {
        const errorMsg = 'Resend no está configurado. Configure RESEND_API_KEY en .env';
        logger.error(`❌ [EMAIL] ${errorMsg}`);
        throw new Error(errorMsg);
      }

      // Enviar email con Resend (el campo 'to' debe ser un array)
      const { data, error } = await resend.emails.send({
        from: EMAIL_FROM,
        to: Array.isArray(to) ? to : [to], // Resend espera un array
        subject,
        html,
        text
      });

      if (error) {
        logger.error('❌ [EMAIL] Error enviando email con Resend', {
          error: error.message,
          errorCode: error.name,
          to
        });
        throw new Error(`Error enviando email: ${error.message}`);
      }

      logger.info('📧 [EMAIL] Email de recuperación de contraseña enviado exitosamente', {
        to,
        emailId: data?.id
      });
      return { success: true, message: 'Email enviado exitosamente', emailId: data?.id };

    } catch (error) {
      logger.error('❌ [EMAIL] Error enviando email de recuperación', {
        error: error.message,
        to
      });
      throw error;
    }
  }

  /**
   * Template HTML para email de recuperación de contraseña
   */
  getPasswordResetEmailTemplate(resetUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Recuperación de Contraseña</h1>
          </div>
          <div class="content">
            <p>Hemos recibido una solicitud para recuperar tu contraseña.</p>
            <p>Haz clic en el siguiente botón para restablecer tu contraseña:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
            </div>
            <p>O copia y pega este enlace en tu navegador:</p>
            <p style="word-break: break-all; color: #4CAF50;">${resetUrl}</p>
            <div class="warning">
              <strong>⚠️ Importante:</strong>
              <ul>
                <li>Este enlace expirará en 1 hora</li>
                <li>Si no solicitaste este cambio, ignora este email</li>
                <li>Nunca compartas este enlace con nadie</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>Este es un email automático, por favor no respondas.</p>
            <p>&copy; ${new Date().getFullYear()} Clínica - Todos los derechos reservados</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Enviar notificación de cambio de contraseña exitoso
   */
  async sendPasswordChangedNotification(to, changedAt, ipAddress) {
    try {
      const subject = 'Contraseña Cambiada - Clínica';
      const html = this.getPasswordChangedEmailTemplate(changedAt, ipAddress);
      const text = `Tu contraseña fue cambiada exitosamente el ${changedAt}. Si no fuiste tú, contacta al administrador inmediatamente.`;

      // En desarrollo, loguear antes de enviar
      if (process.env.NODE_ENV === 'development') {
        logger.info('📧 [EMAIL] Enviando notificación de cambio de contraseña', {
          to,
          changedAt,
          ipAddress
        });
      }

      // Verificar que Resend esté configurado
      if (!resend) {
        logger.warn('⚠️ [EMAIL] Resend no configurado, no se enviará notificación');
        return { success: false, message: 'Resend no configurado (no crítico)' };
      }

      // Enviar email con Resend (el campo 'to' debe ser un array)
      const { data, error } = await resend.emails.send({
        from: EMAIL_FROM,
        to: Array.isArray(to) ? to : [to], // Resend espera un array
        subject,
        html,
        text
      });

      if (error) {
        logger.error('❌ [EMAIL] Error enviando notificación con Resend', {
          error: error.message,
          errorCode: error.name,
          to
        });
        // No lanzar error, es solo una notificación
        return { success: false, message: 'Error enviando notificación (no crítico)' };
      }

      logger.info('📧 [EMAIL] Notificación de cambio de contraseña enviada exitosamente', {
        to,
        emailId: data?.id
      });
      return { success: true, message: 'Email enviado exitosamente', emailId: data?.id };

    } catch (error) {
      logger.error('❌ [EMAIL] Error enviando notificación de cambio de contraseña', {
        error: error.message,
        to
      });
      // No lanzar error, es solo una notificación
    }
  }

  getPasswordChangedEmailTemplate(changedAt, ipAddress) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .info { background-color: #e3f2fd; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Contraseña Cambiada</h1>
          </div>
          <div class="content">
            <p>Tu contraseña fue cambiada exitosamente.</p>
            <div class="info">
              <p><strong>Fecha y hora:</strong> ${changedAt}</p>
              <p><strong>Dirección IP:</strong> ${ipAddress || 'No disponible'}</p>
            </div>
            <p>Si no realizaste este cambio, contacta al administrador inmediatamente.</p>
          </div>
          <div class="footer">
            <p>Este es un email automático, por favor no respondas.</p>
            <p>&copy; ${new Date().getFullYear()} Clínica - Todos los derechos reservados</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

export default new EmailService();

