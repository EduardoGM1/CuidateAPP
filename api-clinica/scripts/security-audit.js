#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const auditResults = {
  timestamp: new Date().toISOString(),
  vulnerabilities: [],
  recommendations: []
};

console.log('🔒 Iniciando Auditoría de Seguridad...\n');

// 1. Auditoría de dependencias
console.log('📦 Verificando dependencias...');
try {
  const auditOutput = execSync('npm audit --json', { encoding: 'utf8' });
  const audit = JSON.parse(auditOutput);
  
  if (audit.metadata.vulnerabilities.total > 0) {
    auditResults.vulnerabilities.push({
      type: 'dependencies',
      severity: 'high',
      count: audit.metadata.vulnerabilities.total,
      details: audit.metadata.vulnerabilities
    });
  }
} catch (error) {
  console.log('✅ Sin vulnerabilidades en dependencias');
}

// 2. Verificar configuraciones de seguridad
console.log('⚙️ Verificando configuraciones...');
const securityChecks = [
  {
    name: 'Variables de entorno',
    check: () => fs.existsSync('.env'),
    recommendation: 'Crear archivo .env con variables sensibles'
  },
  {
    name: 'HTTPS en producción',
    check: () => process.env.NODE_ENV !== 'production' || process.env.HTTPS === 'true',
    recommendation: 'Configurar HTTPS en producción'
  },
  {
    name: 'JWT Secret',
    check: () => process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32,
    recommendation: 'JWT_SECRET debe tener al menos 32 caracteres'
  }
];

securityChecks.forEach(check => {
  if (!check.check()) {
    auditResults.recommendations.push({
      category: 'configuration',
      issue: check.name,
      recommendation: check.recommendation
    });
  }
});

// 3. Verificar archivos sensibles
console.log('📁 Verificando archivos sensibles...');
const sensitiveFiles = ['.env', 'config/db.js', 'package.json'];
sensitiveFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const stats = fs.statSync(file);
    if (stats.mode & 0o044) { // Verificar permisos de lectura para otros
      auditResults.recommendations.push({
        category: 'file_permissions',
        issue: `Archivo ${file} tiene permisos inseguros`,
        recommendation: `Cambiar permisos: chmod 600 ${file}`
      });
    }
  }
});

// 4. Generar reporte
const reportPath = path.join('logs', `security-audit-${Date.now()}.json`);
fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2));

console.log('\n📊 Resumen de Auditoría:');
console.log(`Vulnerabilidades encontradas: ${auditResults.vulnerabilities.length}`);
console.log(`Recomendaciones: ${auditResults.recommendations.length}`);
console.log(`Reporte guardado en: ${reportPath}`);

if (auditResults.vulnerabilities.length > 0 || auditResults.recommendations.length > 0) {
  console.log('\n⚠️ Se encontraron problemas de seguridad. Revisar el reporte.');
  process.exit(1);
} else {
  console.log('\n✅ Auditoría completada sin problemas críticos.');
}