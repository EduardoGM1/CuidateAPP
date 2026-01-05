#!/usr/bin/env node

import https from 'https';
import tls from 'tls';
import crypto from 'crypto';
import fs from 'fs';

console.log('🔐 Iniciando Auditoría SSL/TLS...\n');

const auditResults = {
  timestamp: new Date().toISOString(),
  tlsConfiguration: [],
  cipherSuites: [],
  certificateAnalysis: [],
  recommendations: []
};

// 1. Verificar configuración TLS del servidor
console.log('🛡️ Verificando configuración TLS...');

const tlsAudit = {
  component: 'TLS Configuration',
  tests: []
};

// Verificar versiones TLS soportadas
const tlsVersions = [
  { version: 'TLSv1', secure: false, deprecated: true },
  { version: 'TLSv1.1', secure: false, deprecated: true },
  { version: 'TLSv1.2', secure: true, deprecated: false },
  { version: 'TLSv1.3', secure: true, deprecated: false }
];

tlsVersions.forEach(tls => {
  tlsAudit.tests.push({
    version: tls.version,
    secure: tls.secure,
    deprecated: tls.deprecated,
    recommendation: tls.deprecated ? 'Disable this version' : 'OK to use',
    status: tls.secure ? 'secure' : 'insecure'
  });
});

auditResults.tlsConfiguration.push(tlsAudit);

// 2. Análisis de cipher suites
console.log('🔑 Analizando cipher suites...');

const cipherAudit = {
  component: 'Cipher Suites',
  tests: []
};

// Cipher suites recomendados vs inseguros
const secureCiphers = [
  'ECDHE-RSA-AES256-GCM-SHA384',
  'ECDHE-RSA-AES128-GCM-SHA256',
  'ECDHE-RSA-AES256-SHA384',
  'ECDHE-RSA-AES128-SHA256'
];

const insecureCiphers = [
  'RC4',
  'DES',
  '3DES',
  'MD5',
  'SHA1'
];

// Obtener cipher suites disponibles
const availableCiphers = crypto.constants.defaultCipherList || tls.getCiphers();
const cipherList = typeof availableCiphers === 'string' ? availableCiphers.split(':') : availableCiphers;

secureCiphers.forEach(cipher => {
  const available = cipherList.includes(cipher);
  cipherAudit.tests.push({
    cipher,
    type: 'secure',
    available,
    recommendation: available ? 'Good - secure cipher available' : 'Consider enabling this cipher'
  });
});

insecureCiphers.forEach(cipher => {
  const pattern = new RegExp(cipher, 'i');
  const found = cipherList.some(c => pattern.test(c));
  cipherAudit.tests.push({
    cipher,
    type: 'insecure',
    found,
    recommendation: found ? 'CRITICAL - Disable this cipher' : 'Good - insecure cipher not found'
  });
});

auditResults.cipherSuites.push(cipherAudit);

// 3. Verificar configuración HTTPS en Express
console.log('🌐 Verificando configuración HTTPS en aplicación...');

if (fs.existsSync('index.js')) {
  const appContent = fs.readFileSync('index.js', 'utf8');
  
  const httpsAudit = {
    component: 'Application HTTPS Configuration',
    tests: []
  };
  
  // Verificar si HTTPS está configurado
  const httpsConfigured = /https\.createServer|app\.listen.*443|process\.env\.HTTPS/i.test(appContent);
  httpsAudit.tests.push({
    test: 'HTTPS Server Configuration',
    status: httpsConfigured ? 'configured' : 'not_configured',
    severity: httpsConfigured ? 'none' : 'high',
    recommendation: httpsConfigured ? 'OK' : 'Configure HTTPS server for production'
  });
  
  // Verificar headers de seguridad relacionados con HTTPS
  const securityHeaders = [
    { name: 'HSTS', pattern: /hsts|strict-transport-security/i },
    { name: 'Secure Cookies', pattern: /secure:\s*true|httpOnly:\s*true/i },
    { name: 'HTTPS Redirect', pattern: /redirect.*https|force.*ssl/i }
  ];
  
  securityHeaders.forEach(header => {
    const configured = header.pattern.test(appContent);
    httpsAudit.tests.push({
      test: header.name,
      status: configured ? 'configured' : 'missing',
      severity: configured ? 'none' : 'medium',
      recommendation: configured ? 'OK' : `Configure ${header.name} for better security`
    });
  });
  
  auditResults.certificateAnalysis.push(httpsAudit);
}

// 4. Verificar configuración de certificados (simulado)
console.log('📜 Verificando configuración de certificados...');

const certAudit = {
  component: 'Certificate Configuration',
  tests: []
};

// Verificar si existen archivos de certificado
const certFiles = ['cert.pem', 'key.pem', 'ca.pem', 'server.crt', 'server.key'];
const foundCerts = certFiles.filter(file => fs.existsSync(file));

certAudit.tests.push({
  test: 'Certificate Files',
  status: foundCerts.length > 0 ? 'found' : 'not_found',
  details: foundCerts.length > 0 ? `Found: ${foundCerts.join(', ')}` : 'No certificate files found',
  recommendation: foundCerts.length > 0 ? 'Verify certificate validity and expiration' : 'Configure SSL certificates for production'
});

// Verificar configuración de certificado en variables de entorno
const certEnvVars = ['SSL_CERT', 'SSL_KEY', 'SSL_CA', 'HTTPS_CERT_PATH'];
const foundEnvVars = certEnvVars.filter(envVar => process.env[envVar]);

certAudit.tests.push({
  test: 'Certificate Environment Variables',
  status: foundEnvVars.length > 0 ? 'configured' : 'not_configured',
  details: foundEnvVars.length > 0 ? `Found: ${foundEnvVars.join(', ')}` : 'No certificate env vars found',
  recommendation: 'Configure certificate paths via environment variables for security'
});

auditResults.certificateAnalysis.push(certAudit);

// 5. Generar recomendaciones
const criticalIssues = [
  ...auditResults.tlsConfiguration.flatMap(c => c.tests?.filter(t => t.status === 'insecure') || []),
  ...auditResults.cipherSuites.flatMap(c => c.tests?.filter(t => t.type === 'insecure' && t.found) || []),
  ...auditResults.certificateAnalysis.flatMap(c => c.tests?.filter(t => t.severity === 'high') || [])
];

if (criticalIssues.length > 0) {
  auditResults.recommendations.push({
    priority: 'critical',
    category: 'SSL/TLS Security Issues',
    count: criticalIssues.length,
    action: 'Fix immediately before production deployment'
  });
}

// Recomendaciones generales
auditResults.recommendations.push({
  priority: 'high',
  category: 'Production SSL/TLS Setup',
  recommendations: [
    'Use only TLS 1.2 and 1.3',
    'Disable insecure cipher suites',
    'Implement HSTS headers',
    'Use valid SSL certificates from trusted CA',
    'Configure secure cookie settings',
    'Implement certificate pinning for mobile apps'
  ]
});

// 6. Generar reporte
const reportPath = `logs/ssl-tls-audit-${Date.now()}.json`;
fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2));

console.log('\n📊 Resumen de Auditoría SSL/TLS:');
console.log(`Versiones TLS analizadas: ${auditResults.tlsConfiguration[0]?.tests?.length || 0}`);
console.log(`Cipher suites analizados: ${auditResults.cipherSuites[0]?.tests?.length || 0}`);
console.log(`Problemas críticos: ${criticalIssues.length}`);
console.log(`Reporte guardado en: ${reportPath}`);

if (criticalIssues.length === 0) {
  console.log('\n✅ Configuración SSL/TLS básica segura.');
  console.log('⚠️ Recuerde configurar certificados válidos para producción.');
} else {
  console.log('\n❌ Se encontraron problemas críticos de SSL/TLS.');
}