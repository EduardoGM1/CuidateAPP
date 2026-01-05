#!/usr/bin/env node

import https from 'https';
import tls from 'tls';
import fs from 'fs';
import { execSync } from 'child_process';

console.log('🖥️ Iniciando Auditoría de Configuración del Servidor...\n');

const auditResults = {
  timestamp: new Date().toISOString(),
  serverConfig: [],
  tlsConfig: [],
  environmentConfig: [],
  recommendations: []
};

// 1. Verificar configuración de TLS/SSL
console.log('🔐 Verificando configuración TLS/SSL...');
const tlsAudit = {
  component: 'TLS/SSL Configuration',
  tests: []
};

// Verificar versiones TLS soportadas
const tlsVersions = ['TLSv1', 'TLSv1.1', 'TLSv1.2', 'TLSv1.3'];
tlsVersions.forEach(version => {
  try {
    const context = tls.createSecureContext({
      secureProtocol: version + '_method'
    });
    tlsAudit.tests.push({
      test: `${version} Support`,
      status: version === 'TLSv1.2' || version === 'TLSv1.3' ? 'secure' : 'insecure',
      recommendation: version === 'TLSv1' || version === 'TLSv1.1' ? 'Disable old TLS versions' : 'OK'
    });
  } catch (error) {
    tlsAudit.tests.push({
      test: `${version} Support`,
      status: 'disabled',
      recommendation: 'Good - old version disabled'
    });
  }
});

auditResults.tlsConfig.push(tlsAudit);

// 2. Verificar configuración de variables de entorno
console.log('⚙️ Verificando variables de entorno...');
const envAudit = {
  component: 'Environment Variables',
  tests: []
};

const criticalEnvVars = [
  { name: 'NODE_ENV', secure: ['production'], current: process.env.NODE_ENV },
  { name: 'JWT_SECRET', minLength: 32, current: process.env.JWT_SECRET },
  { name: 'DB_PASSWORD', required: true, current: process.env.DB_PASSWORD ? '***' : undefined },
  { name: 'ALLOWED_ORIGINS', required: true, current: process.env.ALLOWED_ORIGINS }
];

criticalEnvVars.forEach(envVar => {
  const test = { variable: envVar.name };
  
  if (!envVar.current) {
    test.status = 'missing';
    test.severity = 'high';
    test.recommendation = `Set ${envVar.name} environment variable`;
  } else if (envVar.minLength && envVar.current.length < envVar.minLength) {
    test.status = 'weak';
    test.severity = 'medium';
    test.recommendation = `${envVar.name} should be at least ${envVar.minLength} characters`;
  } else if (envVar.secure && !envVar.secure.includes(envVar.current)) {
    test.status = 'insecure';
    test.severity = 'medium';
    test.recommendation = `${envVar.name} should be one of: ${envVar.secure.join(', ')}`;
  } else {
    test.status = 'secure';
    test.severity = 'none';
    test.recommendation = 'OK';
  }
  
  envAudit.tests.push(test);
});

auditResults.environmentConfig.push(envAudit);

// 3. Verificar configuración del servidor Express
console.log('🌐 Verificando configuración Express...');
if (fs.existsSync('index.js')) {
  const serverContent = fs.readFileSync('index.js', 'utf8');
  
  const serverAudit = {
    component: 'Express Server Configuration',
    tests: []
  };
  
  const securityChecks = [
    { name: 'Helmet Security Headers', pattern: /helmet\(/g, required: true },
    { name: 'CORS Configuration', pattern: /cors\(/g, required: true },
    { name: 'Rate Limiting', pattern: /rateLimit|generalRateLimit/g, required: true },
    { name: 'Body Parser Limits', pattern: /limit:\s*['"`]\d+[kmg]?b['"`]/g, required: true },
    { name: 'HTTPS Redirect', pattern: /https|secure:\s*true/g, required: false },
    { name: 'Session Security', pattern: /httpOnly:\s*true|secure:\s*true/g, required: false }
  ];
  
  securityChecks.forEach(check => {
    const found = check.pattern.test(serverContent);
    serverAudit.tests.push({
      test: check.name,
      status: found ? 'implemented' : 'missing',
      severity: check.required && !found ? 'high' : 'low',
      recommendation: found ? 'OK' : `Implement ${check.name}`
    });
  });
  
  auditResults.serverConfig.push(serverAudit);
}

// 4. Verificar configuración de firewall (Windows)
console.log('🛡️ Verificando configuración de firewall...');
try {
  const firewallStatus = execSync('netsh advfirewall show allprofiles state', { encoding: 'utf8' });
  const firewallAudit = {
    component: 'Windows Firewall',
    status: firewallStatus.includes('ON') ? 'enabled' : 'disabled',
    recommendation: firewallStatus.includes('ON') ? 'OK' : 'Enable Windows Firewall'
  };
  auditResults.serverConfig.push(firewallAudit);
} catch (error) {
  auditResults.serverConfig.push({
    component: 'Firewall Check',
    status: 'error',
    error: 'Could not check firewall status',
    recommendation: 'Manually verify firewall configuration'
  });
}

// 5. Generar recomendaciones generales
const highSeverityIssues = [
  ...auditResults.environmentConfig.flatMap(c => c.tests?.filter(t => t.severity === 'high') || []),
  ...auditResults.serverConfig.filter(c => c.severity === 'high'),
  ...auditResults.tlsConfig.flatMap(c => c.tests?.filter(t => t.status === 'insecure') || [])
];

if (highSeverityIssues.length > 0) {
  auditResults.recommendations.push({
    priority: 'high',
    category: 'Critical Security Issues',
    count: highSeverityIssues.length,
    action: 'Address immediately before production deployment'
  });
}

// 6. Generar reporte
const reportPath = `logs/server-config-audit-${Date.now()}.json`;
fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2));

console.log('\n📊 Resumen de Auditoría del Servidor:');
console.log(`Configuraciones TLS verificadas: ${auditResults.tlsConfig.length}`);
console.log(`Variables de entorno verificadas: ${auditResults.environmentConfig[0]?.tests?.length || 0}`);
console.log(`Configuraciones del servidor verificadas: ${auditResults.serverConfig.length}`);
console.log(`Problemas críticos encontrados: ${highSeverityIssues.length}`);
console.log(`Reporte guardado en: ${reportPath}`);

if (highSeverityIssues.length === 0) {
  console.log('\n✅ Configuración del servidor segura.');
} else {
  console.log('\n⚠️ Se encontraron problemas de configuración críticos.');
  process.exit(1);
}