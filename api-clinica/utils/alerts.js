import nodemailer from 'nodemailer';
import logger from './logger.js';

// Configurar transporter de email
const createTransporter = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    logger.warn('SMTP configuration missing - email alerts disabled');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const transporter = createTransporter();

// Enviar alerta de seguridad
export const sendSecurityAlert = async (type, details) => {
  if (!transporter || !process.env.ALERT_EMAIL) return;

  const subject = `🚨 Security Alert - ${type}`;
  const html = `
    <h2>Security Alert Detected</h2>
    <p><strong>Alert Type:</strong> ${type}</p>
    <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
    <p><strong>Server:</strong> ${process.env.NODE_ENV || 'unknown'}</p>
    
    <h3>Details:</h3>
    <pre>${JSON.stringify(details, null, 2)}</pre>
    
    <p><em>This is an automated alert from the Medical API Security System.</em></p>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.ALERT_EMAIL,
      subject,
      html
    });
    
    logger.info('Security alert sent successfully', { type, recipient: process.env.ALERT_EMAIL });
  } catch (error) {
    logger.error('Failed to send security alert', { error: error.message, type });
  }
};

// Enviar alerta de sistema
export const sendSystemAlert = async (type, message, severity = 'medium') => {
  if (!transporter || !process.env.ALERT_EMAIL) return;

  const severityColors = {
    low: '#28a745',
    medium: '#ffc107', 
    high: '#dc3545',
    critical: '#6f42c1'
  };

  const subject = `${severity === 'critical' ? '🔥' : '⚠️'} System Alert - ${type}`;
  const html = `
    <div style="border-left: 4px solid ${severityColors[severity]}; padding-left: 20px;">
      <h2>System Alert</h2>
      <p><strong>Alert Type:</strong> ${type}</p>
      <p><strong>Severity:</strong> <span style="color: ${severityColors[severity]}; font-weight: bold;">${severity.toUpperCase()}</span></p>
      <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      <p><strong>Server:</strong> ${process.env.NODE_ENV || 'unknown'}</p>
      
      <h3>Message:</h3>
      <p>${message}</p>
      
      <p><em>This is an automated alert from the Medical API System.</em></p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.ALERT_EMAIL,
      subject,
      html
    });
    
    logger.info('System alert sent successfully', { type, severity });
  } catch (error) {
    logger.error('Failed to send system alert', { error: error.message, type });
  }
};

// Enviar reporte diario
export const sendDailyReport = async (metrics) => {
  if (!transporter || !process.env.ALERT_EMAIL) return;

  const html = `
    <h2>📊 Daily System Report</h2>
    <p><strong>Date:</strong> ${new Date().toDateString()}</p>
    
    <h3>Request Metrics</h3>
    <ul>
      <li>Total Requests: ${metrics.requests.total}</li>
      <li>Success Rate: ${Math.round((metrics.requests.success / metrics.requests.total) * 100)}%</li>
      <li>Error Rate: ${Math.round((metrics.requests.errors / metrics.requests.total) * 100)}%</li>
    </ul>
    
    <h3>Performance Metrics</h3>
    <ul>
      <li>Average Response Time: ${Math.round(metrics.performance.avgResponseTime)}ms</li>
      <li>Slow Queries: ${metrics.performance.slowQueries}</li>
      <li>Memory Usage: ${Math.round(metrics.performance.memoryUsage / 1024 / 1024)}MB</li>
    </ul>
    
    <h3>Security Metrics</h3>
    <ul>
      <li>Blocked Requests: ${metrics.security.blockedRequests}</li>
      <li>Failed Logins: ${metrics.security.failedLogins}</li>
      <li>Suspicious Activity: ${metrics.security.suspiciousActivity}</li>
    </ul>
    
    <p><em>Generated automatically by Medical API Monitoring System</em></p>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.ALERT_EMAIL,
      subject: '📊 Daily System Report - Medical API',
      html
    });
    
    logger.info('Daily report sent successfully');
  } catch (error) {
    logger.error('Failed to send daily report', { error: error.message });
  }
};