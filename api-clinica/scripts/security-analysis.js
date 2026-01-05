#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

console.log('🔍 Análisis de Seguridad del Código...\n');

const securityAnalysis = {
  timestamp: new Date().toISOString(),
  codeAnalysis: [],
  securityFeatures: [],
  recommendations: []
};

// 1. Análisis de middlewares de seguridad
console.log('🛡️ Analizando middlewares de seguridad...');
const middlewareFiles = [
  'middlewares/auth.js',
  'middlewares/sanitization.js',
  'middlewares/rateLimiting.js',
  'middlewares/csrfProtection.js',
  'middlewares/securityMonitoring.js'
];

middlewareFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    
    // Verificar características de seguridad
    const features = [];
    if (content.includes('jwt')) features.push('JWT Authentication');
    if (content.includes('bcrypt')) features.push('Password Hashing');
    if (content.includes('rateLimit')) features.push('Rate Limiting');
    if (content.includes('sanitize')) features.push('Input Sanitization');
    if (content.includes('csrf')) features.push('CSRF Protection');
    
    securityAnalysis.securityFeatures.push({
      file,
      features,
      status: 'implemented'
    });
  }
});

// 2. Análisis de configuración de seguridad
console.log('⚙️ Analizando configuración...');
if (fs.existsSync('index.js')) {
  const indexContent = fs.readFileSync('index.js', 'utf8');
  
  const securityConfigs = [];
  if (indexContent.includes('helmet')) securityConfigs.push('Helmet Security Headers');
  if (indexContent.includes('cors')) securityConfigs.push('CORS Configuration');
  if (indexContent.includes('morgan')) securityConfigs.push('Request Logging');
  if (indexContent.includes('express.json({ limit:')) securityConfigs.push('Payload Size Limiting');
  
  securityAnalysis.codeAnalysis.push({
    component: 'Main Server',
    securityConfigs,
    score: Math.round((securityConfigs.length / 6) * 100)
  });
}

// 3. Análisis de modelos y validaciones
console.log('📊 Analizando modelos y validaciones...');
const modelFiles = fs.readdirSync('models').filter(f => f.endsWith('.js'));
const validationFiles = fs.readdirSync('middlewares').filter(f => f.includes('security') || f.includes('validation'));

securityAnalysis.codeAnalysis.push({
  component: 'Data Models',
  count: modelFiles.length,
  validations: validationFiles.length,
  ratio: validationFiles.length / modelFiles.length
});

// 4. Análisis de endpoints protegidos
console.log('🔐 Analizando protección de endpoints...');
const routeFiles = fs.readdirSync('routes').filter(f => f.endsWith('.js'));
let protectedEndpoints = 0;
let totalEndpoints = 0;

routeFiles.forEach(file => {
  const content = fs.readFileSync(`routes/${file}`, 'utf8');
  const endpoints = (content.match(/router\.(get|post|put|delete)/g) || []).length;
  const protectedCount = (content.match(/authenticateToken|authorizeRoles/g) || []).length;
  
  totalEndpoints += endpoints;
  protectedEndpoints += protectedCount;
});

securityAnalysis.codeAnalysis.push({
  component: 'API Endpoints',
  total: totalEndpoints,
  protected: protectedEndpoints,
  protectionRate: Math.round((protectedEndpoints / totalEndpoints) * 100)
});

// 5. Generar score de seguridad
const securityScore = Math.round(
  (securityAnalysis.securityFeatures.length * 15) +
  (protectedEndpoints / totalEndpoints * 40) +
  (securityAnalysis.securityFeatures.filter(f => f.features.length > 0).length * 10)
);

// 6. Generar reporte
const reportPath = `logs/security-analysis-${Date.now()}.json`;
fs.writeFileSync(reportPath, JSON.stringify({
  ...securityAnalysis,
  securityScore: Math.min(securityScore, 100),
  summary: {
    middlewares: securityAnalysis.securityFeatures.length,
    endpoints: totalEndpoints,
    protectedEndpoints,
    protectionRate: Math.round((protectedEndpoints / totalEndpoints) * 100)
  }
}, null, 2));

console.log('\n📊 Resumen del Análisis:');
console.log(`Middlewares de seguridad: ${securityAnalysis.securityFeatures.length}`);
console.log(`Endpoints totales: ${totalEndpoints}`);
console.log(`Endpoints protegidos: ${protectedEndpoints} (${Math.round((protectedEndpoints / totalEndpoints) * 100)}%)`);
console.log(`Score de seguridad: ${Math.min(securityScore, 100)}/100`);
console.log(`Reporte guardado en: ${reportPath}`);

if (securityScore >= 80) {
  console.log('\n✅ Excelente nivel de seguridad implementado.');
} else if (securityScore >= 60) {
  console.log('\n⚠️ Nivel de seguridad bueno, pero mejorable.');
} else {
  console.log('\n❌ Nivel de seguridad insuficiente. Revisar implementación.');
}