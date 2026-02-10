import fs from 'fs';
import https from 'https';
import logger from '../utils/logger.js';

// Configuración SSL para producción - MEJORADO: Mejor manejo de errores y validación
export const createSSLServer = (app, port) => {
  // En producción, HTTPS es obligatorio
  if (process.env.NODE_ENV === 'production') {
    // Verificar si hay certificados configurados
    const hasSSLConfig = process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH;
    
    if (!hasSSLConfig) {
      logger.error('⚠️ PRODUCCIÓN: Certificados SSL no configurados. Configure SSL_KEY_PATH y SSL_CERT_PATH');
      logger.warn('⚠️ El servidor iniciará en HTTP, pero forceHTTPS redirigirá a HTTPS');
      logger.warn('⚠️ RECOMENDACIÓN: Use un proxy reverso (nginx/Apache) con SSL o configure certificados directamente');
      return null;
    }

    try {
      const sslOptions = {
        key: fs.readFileSync(process.env.SSL_KEY_PATH),
        cert: fs.readFileSync(process.env.SSL_CERT_PATH),
        ca: process.env.SSL_CA_PATH ? fs.readFileSync(process.env.SSL_CA_PATH) : undefined,
        // Configuraciones de seguridad SSL mejoradas
        secureProtocol: 'TLSv1_2_method',
        minVersion: 'TLSv1.2',
        maxVersion: 'TLSv1.3',
        ciphers: [
          'ECDHE-RSA-AES256-GCM-SHA384',
          'ECDHE-RSA-AES128-GCM-SHA256',
          'ECDHE-RSA-AES256-SHA384',
          'ECDHE-RSA-AES128-SHA256',
          '!aNULL',
          '!eNULL',
          '!EXPORT',
          '!DES',
          '!RC4',
          '!MD5',
          '!PSK',
          '!SRP',
          '!CAMELLIA'
        ].join(':'),
        honorCipherOrder: true,
        requestCert: false,
        rejectUnauthorized: false
      };

      const httpsServer = https.createServer(sslOptions, app);
      
      httpsServer.listen(port || 443, '0.0.0.0', () => {
        logger.info(`✅ HTTPS Server running on https://0.0.0.0:${port || 443}`);
        logger.info(`🔒 SSL/TLS configured with secure protocols`);
      });
      
      return httpsServer;
      
    } catch (error) {
      logger.error('❌ Failed to configure HTTPS server:', error);
      logger.warn('⚠️ El servidor iniciará en HTTP. Configure certificados SSL o use un proxy reverso');
      return null;
    }
  }
  
  // En desarrollo, retornar null (usar HTTP)
  return null;
};

// Middleware para forzar HTTPS en producción cuando SSL está disponible.
// Si FORCE_HTTPS=false o se accede por IP sin certificado, no redirigir (evita 301 que rompe login por HTTP).
export const forceHTTPS = (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  // Permitir desactivar redirección cuando se usa solo IP o aún no hay SSL (ej. VPS sin dominio)
  if (process.env.FORCE_HTTPS === 'false' || process.env.FORCE_HTTPS === '0') {
    return next();
  }
  const isSecure = req.secure ||
                   req.get('x-forwarded-proto') === 'https' ||
                   req.get('x-forwarded-ssl') === 'on';
  if (!isSecure) {
    logger.warn('Intento de acceso HTTP en producción, redirigiendo a HTTPS', {
      ip: req.ip,
      host: req.get('host'),
      url: req.url
    });
    return res.redirect(301, `https://${req.get('host')}${req.url}`);
  }
  next();
};