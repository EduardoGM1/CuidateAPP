/**
 * Servicio de Email para recuperación de cuentas (y notificaciones).
 *
 * Soporta dos opciones gratuitas (usa la primera disponible):
 * 1. Resend (recomendado): 100 emails/día, 3000/mes gratis. Solo RESEND_API_KEY.
 * 2. SMTP (fallback): Nodemailer con Gmail, Brevo, etc. SMTP_HOST, SMTP_USER, SMTP_PASS.
 *
 * @see docs/EMAIL-RECUPERACION-CUENTAS.md
 */

import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

let smtpTransporter = null;
if (!resend && SMTP_HOST && SMTP_USER && SMTP_PASS) {
  smtpTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

const hasEmailProvider = !!resend || !!smtpTransporter;
if (!hasEmailProvider && process.env.NODE_ENV === 'production') {
  logger.warn('⚠️ [EMAIL] No hay proveedor configurado (RESEND_API_KEY o SMTP). Configure uno para recuperación de contraseña.');
}

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

      if (resend) {
        const { data, error } = await resend.emails.send({
          from: EMAIL_FROM,
          to: Array.isArray(to) ? to : [to],
          subject,
          html,
          text
        });
        if (error) {
          logger.error('❌ [EMAIL] Error Resend', { error: error.message, to });
          throw new Error(`Error enviando email: ${error.message}`);
        }
        logger.info('📧 [EMAIL] Email de recuperación enviado (Resend)', { to, emailId: data?.id });
        return { success: true, message: 'Email enviado exitosamente', emailId: data?.id };
      }

      if (smtpTransporter) {
        const from = process.env.EMAIL_FROM || SMTP_USER;
        const info = await smtpTransporter.sendMail({
          from: from.includes('@') ? from : `"Clínica" <${SMTP_USER}>`,
          to: Array.isArray(to) ? to.join(', ') : to,
          subject,
          html,
          text
        });
        logger.info('📧 [EMAIL] Email de recuperación enviado (SMTP)', { to, messageId: info.messageId });
        return { success: true, message: 'Email enviado exitosamente', messageId: info.messageId };
      }

      const errorMsg = 'No hay proveedor de email. Configure RESEND_API_KEY o SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS) en .env';
      logger.error(`❌ [EMAIL] ${errorMsg}`);
      throw new Error(errorMsg);

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

      if (!resend && !smtpTransporter) {
        logger.warn('⚠️ [EMAIL] Sin proveedor de email, no se envía notificación');
        return { success: false, message: 'Email no configurado (no crítico)' };
      }

      if (resend) {
        const { data, error } = await resend.emails.send({
          from: EMAIL_FROM,
          to: Array.isArray(to) ? to : [to],
          subject,
          html,
          text
        });
        if (error) {
          logger.error('❌ [EMAIL] Error notificación Resend', { error: error.message, to });
          return { success: false, message: 'Error enviando notificación (no crítico)' };
        }
        logger.info('📧 [EMAIL] Notificación de cambio de contraseña enviada (Resend)', { to, emailId: data?.id });
        return { success: true, message: 'Email enviado exitosamente', emailId: data?.id };
      }

      const from = process.env.EMAIL_FROM || SMTP_USER;
      const info = await smtpTransporter.sendMail({
        from: from.includes('@') ? from : `"Clínica" <${SMTP_USER}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html,
        text
      });
      logger.info('📧 [EMAIL] Notificación de cambio de contraseña enviada (SMTP)', { to, messageId: info.messageId });
      return { success: true, message: 'Email enviado exitosamente', messageId: info.messageId };

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

