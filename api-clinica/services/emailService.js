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
   * Enviar email de invitación para confirmar cuenta y crear contraseña (Doctor/Admin).
   * @param {string} to - Email del destinatario
   * @param {string} nombre - Nombre para el saludo
   * @param {string} rol - Rol (Doctor, Admin)
   * @param {string} confirmUrl - URL completa para confirmar cuenta (confirmar-cuenta?token=xxx)
   */
  async sendInviteConfirmEmail(to, nombre, rol, confirmUrl) {
    try {
      const subject = 'Confirma tu cuenta - Clínica';
      const html = this.getInviteConfirmEmailTemplate(nombre, rol, confirmUrl);
      const text = `Te han invitado a unirte a la plataforma de la clínica como ${rol}. Confirma tu cuenta y crea tu contraseña en: ${confirmUrl}`;

      if (process.env.NODE_ENV === 'development') {
        logger.info('📧 [EMAIL] Enviando email de invitación a confirmar cuenta', {
          to,
          subject,
          confirmUrl: confirmUrl.substring(0, 50) + '...',
        });
        console.log('\n📧 ============================================');
        console.log('EMAIL DE INVITACIÓN (CONFIRMAR CUENTA)');
        console.log('============================================');
        console.log(`Para: ${to}`);
        console.log(`Asunto: ${subject}`);
        console.log(`URL: ${confirmUrl}`);
        console.log('============================================\n');
      }

      if (resend) {
        const { data, error } = await resend.emails.send({
          from: EMAIL_FROM,
          to: Array.isArray(to) ? to : [to],
          subject,
          html,
          text,
        });
        if (error) {
          logger.error('❌ [EMAIL] Error Resend (invite)', { error: error.message, to });
          throw new Error(`Error enviando email: ${error.message}`);
        }
        logger.info('📧 [EMAIL] Email de invitación enviado (Resend)', { to, emailId: data?.id });
        return { success: true, message: 'Email enviado exitosamente', emailId: data?.id };
      }

      if (smtpTransporter) {
        const from = process.env.EMAIL_FROM || SMTP_USER;
        const info = await smtpTransporter.sendMail({
          from: from.includes('@') ? from : `"Clínica" <${SMTP_USER}>`,
          to: Array.isArray(to) ? to.join(', ') : to,
          subject,
          html,
          text,
        });
        logger.info('📧 [EMAIL] Email de invitación enviado (SMTP)', { to, messageId: info.messageId });
        return { success: true, message: 'Email enviado exitosamente', messageId: info.messageId };
      }

      const errorMsg = 'No hay proveedor de email. Configure RESEND_API_KEY o SMTP en .env';
      logger.error(`❌ [EMAIL] ${errorMsg}`);
      throw new Error(errorMsg);
    } catch (error) {
      logger.error('❌ [EMAIL] Error enviando email de invitación', {
        error: error.message,
        to,
      });
      throw error;
    }
  }

  getInviteConfirmEmailTemplate(nombre, rol, confirmUrl) {
    const rolLabel = rol === 'Doctor' ? 'doctor' : rol === 'Admin' ? 'administrador' : rol;
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
          .warning { background-color: #e8f5e9; border-left: 4px solid #4CAF50; padding: 10px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Confirma tu cuenta</h1>
          </div>
          <div class="content">
            <p>Hola${nombre ? ` ${nombre}` : ''},</p>
            <p>Te han registrado como <strong>${rolLabel}</strong> en la plataforma de la clínica. Para activar tu cuenta, debes crear tu contraseña haciendo clic en el siguiente enlace:</p>
            <div style="text-align: center;">
              <a href="${confirmUrl}" class="button">Confirmar cuenta y crear contraseña</a>
            </div>
            <p>O copia y pega este enlace en tu navegador:</p>
            <p style="word-break: break-all; color: #4CAF50;">${confirmUrl}</p>
            <div class="warning">
              <strong>Importante:</strong>
              <ul>
                <li>Este enlace expira en 24 horas</li>
                <li>Solo tú debes usar este enlace para crear tu contraseña</li>
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

  /**
   * Enviar email de bienvenida (tras registro o creación de usuario)
   */
  async sendWelcomeEmail(to, nombre, rol = 'Paciente') {
    return this._sendGeneric('Bienvenido a CuídateApp', `Bienvenido${nombre ? ` ${nombre}` : ''}. Tu cuenta (${rol}) ha sido creada.`, to, 'bienvenida', { nombre, rol });
  }

  /**
   * Cuenta reactivada por administración (mismo canal que bienvenida / _sendGeneric).
   * @param {string} to
   * @param {{ nombre?: string, rol?: string }} [datos]
   */
  async sendAccountReactivatedEmail(to, datos = {}) {
    const { nombre = '', rol = 'Usuario' } = datos;
    const greet = nombre ? ` ${nombre}` : '';
    const subject = 'Tu cuenta ha sido reactivada - CuídateApp';
    const text = `Hola${greet},

Tu cuenta en CuídateApp (rol: ${rol}) ha sido reactivada. Ya puedes volver a iniciar sesión con tu correo y contraseña habituales.

Si no esperabas este mensaje, contacta al administrador de la clínica.`;
    return this._sendGeneric(subject, text, to, 'cuenta_reactivada', datos);
  }

  /**
   * Notificación de nuevo mensaje en el chat
   */
  async sendNewMessageNotification(to, datos = {}) {
    const { remitenteNombre = 'Alguien', previewTexto = '', enlaceApp = '' } = datos;
    const subject = 'Nuevo mensaje en CuídateApp';
    const text = `${remitenteNombre} te envió un mensaje.${previewTexto ? ` "${previewTexto.substring(0, 80)}${previewTexto.length > 80 ? '...' : ''}"` : ''}${enlaceApp ? ` Ver: ${enlaceApp}` : ''}`;
    return this._sendGeneric(subject, text, to, 'nuevo_mensaje', datos);
  }

  /**
   * Notificación de nuevo paciente registrado (para admin/doctor)
   */
  async sendPatientRegisteredNotification(to, datos = {}) {
    const { pacienteNombre = 'Un paciente', id_paciente } = datos;
    const subject = 'Nuevo paciente registrado - CuídateApp';
    const text = `Se ha registrado un nuevo paciente: ${pacienteNombre}.${id_paciente ? ` ID: ${id_paciente}` : ''}`;
    return this._sendGeneric(subject, text, to, 'nuevo_paciente', datos);
  }

  /**
   * Confirmación de cita (agendada o reprogramada)
   */
  async sendCitaConfirmationEmail(to, datos = {}) {
    const { fecha, hora, doctorNombre, motivo, reprogramada } = datos;
    const subject = reprogramada ? 'Cita reprogramada - CuídateApp' : 'Cita agendada - CuídateApp';
    const text = `Tu cita${reprogramada ? ' ha sido reprogramada' : ''} para el ${fecha || 'día indicado'} a las ${hora || 'hora indicada'}.${doctorNombre ? ` Doctor: ${doctorNombre}.` : ''}${motivo ? ` Motivo: ${motivo}` : ''}`;
    return this._sendGeneric(subject, text, to, 'cita_confirmacion', datos);
  }

  /**
   * Recordatorio de cita próxima
   */
  async sendCitaReminderEmail(to, datos = {}) {
    const { fecha, hora, doctorNombre, motivo, lugar } = datos;
    const subject = 'Recordatorio de cita - CuídateApp';
    const text = `Tienes una cita el ${fecha || 'próximo'} a las ${hora || ''}.${doctorNombre ? ` Doctor: ${doctorNombre}.` : ''}${lugar ? ` Lugar: ${lugar}.` : ''}${motivo ? ` Motivo: ${motivo}` : ''}`;
    return this._sendGeneric(subject, text, to, 'cita_recordatorio', datos);
  }

  /**
   * Alerta de signos vitales (para doctor/admin; opcional por privacidad)
   */
  async sendSignosVitalesAlertEmail(to, datos = {}) {
    const { pacienteNombre = 'Paciente', tipo, severidad, mensaje } = datos;
    const subject = `Alerta de signos vitales (${severidad || 'alerta'}) - CuídateApp`;
    const text = `${pacienteNombre}: ${mensaje || tipo || 'Signos vitales fuera del rango normal.'}`;
    return this._sendGeneric(subject, text, to, 'alerta_signos', datos);
  }

  /**
   * Notificación de nuevo registro de signos vitales (para doctores asignados al paciente)
   * Se envía en cada registro, no solo cuando hay alerta.
   */
  async sendSignosVitalesRegistroEmail(to, datos = {}) {
    const { pacienteNombre = 'Paciente', fechaMedicion, registradoPor } = datos;
    const fecha = fechaMedicion ? new Date(fechaMedicion).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : 'recientemente';
    const subject = 'Nuevo registro de signos vitales - CuídateApp';
    const text = `${pacienteNombre} registró nuevos signos vitales el ${fecha}.${registradoPor ? ` Registrado por: ${registradoPor}.` : ''} Puedes revisarlos en la ficha del paciente.`;
    return this._sendGeneric(subject, text, to, 'registro_signos_vitales', datos);
  }

  /**
   * Envío genérico (Resend o SMTP); no lanza si falla (para notificaciones no críticas).
   */
  /**
   * Nuevo ticket de soporte (doctor → admins). Envío por email a cada administrador.
   */
  async sendTicketNuevoAdmins(adminEmails, datos = {}) {
    const { id_ticket, asunto, doctorEmail } = datos;
    const subject = `[Soporte #${id_ticket}] ${asunto || 'Nuevo ticket'}`;
    const text = `Un doctor ha abierto un ticket de soporte.\n\nDoctor: ${doctorEmail || '—'}\nAsunto: ${asunto}\nID ticket: ${id_ticket}\n\nRevisa la bandeja en la web: Administración → Tickets de soporte.`;
    const list = Array.isArray(adminEmails) ? adminEmails : [];
    for (const to of list) {
      await this._sendGeneric(subject, text, to, 'ticket_nuevo_admin', datos);
    }
    return { sent: list.length };
  }

  /**
   * Respuesta de un administrador en el hilo del ticket (notifica al doctor creador).
   */
  async sendTicketRespuestaDoctor(to, datos = {}) {
    const { id_ticket, asunto, preview } = datos;
    const subject = `[Soporte #${id_ticket}] Respuesta del equipo`;
    const text = `Hay una nueva respuesta en tu ticket "${asunto || ''}".\n\n${preview || ''}\n\nConsulta el hilo completo en la web: Soporte → Mis tickets.`;
    return this._sendGeneric(subject, text, to, 'ticket_respuesta_doctor', datos);
  }

  async _sendGeneric(subject, text, to, tipo, datos = {}) {
    if (!to || typeof to !== 'string' || !to.includes('@')) {
      logger.warn(`[EMAIL] _sendGeneric: destino inválido (${tipo})`, { to: to ? '***' : null });
      return { success: false, message: 'Email destino inválido' };
    }
    if (!resend && !smtpTransporter) {
      logger.warn('⚠️ [EMAIL] Sin proveedor de email, no se envía notificación', { tipo });
      return { success: false, message: 'Email no configurado (no crítico)' };
    }
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;"><h2>${subject}</h2><p>${text.replace(/\n/g, '</p><p>')}</p><p style="color:#666;font-size:12px;">CuídateApp - Notificación automática</p></div>`;
    try {
      if (resend) {
        const { data, error } = await resend.emails.send({
          from: EMAIL_FROM,
          to: [to],
          subject,
          html,
          text
        });
        if (error) {
          logger.error('❌ [EMAIL]', { tipo, error: error.message, to: to.substring(0, 3) + '***' });
          return { success: false, message: error.message };
        }
        logger.info('📧 [EMAIL] Enviado', { tipo, to: to.substring(0, 3) + '***', emailId: data?.id });
        return { success: true, emailId: data?.id };
      }
      const from = process.env.EMAIL_FROM || SMTP_USER;
      const info = await smtpTransporter.sendMail({
        from: from.includes('@') ? from : `"CuídateApp" <${SMTP_USER}>`,
        to,
        subject,
        html,
        text
      });
      logger.info('📧 [EMAIL] Enviado (SMTP)', { tipo, to: to.substring(0, 3) + '***', messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('❌ [EMAIL] Error enviando', { tipo, error: error.message, to: to.substring(0, 3) + '***' });
      return { success: false, message: error.message };
    }
  }
}

export default new EmailService();

