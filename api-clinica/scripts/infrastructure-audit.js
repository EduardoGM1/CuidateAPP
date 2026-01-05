#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🏗️ Iniciando Auditoría Completa de Infraestructura...\n');

const auditSuite = {
  timestamp: new Date().toISOString(),
  audits: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0
  },
  overallScore: 0,
  recommendations: []
};

// Lista de auditorías a ejecutar
const audits = [
  {
    name: 'Server Configuration Audit',
    script: 'scripts/server-config-audit.js',
    description: 'Verifica configuración del servidor, TLS, variables de entorno'
  },
  {
    name: 'Database Security Audit',
    script: 'scripts/database-security-audit.js',
    description: 'Analiza esquema de BD, encriptación, permisos'
  },
  {
    name: 'SSL/TLS Configuration Audit',
    script: 'scripts/ssl-tls-audit.js',
    description: 'Verifica configuración SSL/TLS y certificados'
  },
  {
    name: 'Security Code Analysis',
    script: 'scripts/security-analysis.js',
    description: 'Analiza código fuente para características de seguridad'
  }
];

console.log(`📋 Ejecutando ${audits.length} auditorías de infraestructura...\n`);

// Ejecutar cada auditoría
for (const audit of audits) {
  console.log(`🔍 Ejecutando: ${audit.name}`);
  console.log(`📝 ${audit.description}\n`);
  
  const auditResult = {
    name: audit.name,
    script: audit.script,
    startTime: new Date().toISOString(),
    status: 'running'
  };
  
  try {
    const output = execSync(`node ${audit.script}`, { 
      encoding: 'utf8',
      timeout: 30000 // 30 segundos timeout
    });
    
    auditResult.status = 'passed';
    auditResult.output = output;
    auditResult.exitCode = 0;
    auditSuite.summary.passed++;
    
    console.log('✅ Completado exitosamente\n');
    
  } catch (error) {
    auditResult.status = error.status === 1 ? 'warning' : 'failed';
    auditResult.output = error.stdout || error.message;
    auditResult.error = error.stderr;
    auditResult.exitCode = error.status;
    
    if (error.status === 1) {
      auditSuite.summary.warnings++;
      console.log('⚠️ Completado con advertencias\n');
    } else {
      auditSuite.summary.failed++;
      console.log('❌ Falló la ejecución\n');
    }
  }
  
  auditResult.endTime = new Date().toISOString();
  auditResult.duration = new Date(auditResult.endTime) - new Date(auditResult.startTime);
  auditSuite.audits.push(auditResult);
  auditSuite.summary.total++;
}

// Calcular score general
auditSuite.overallScore = Math.round(
  ((auditSuite.summary.passed * 100) + (auditSuite.summary.warnings * 70)) / 
  (auditSuite.summary.total * 100) * 100
);

// Generar recomendaciones basadas en resultados
if (auditSuite.summary.failed > 0) {
  auditSuite.recommendations.push({
    priority: 'critical',
    category: 'Failed Audits',
    message: `${auditSuite.summary.failed} auditorías fallaron`,
    action: 'Revisar logs de error y corregir problemas críticos'
  });
}

if (auditSuite.summary.warnings > 0) {
  auditSuite.recommendations.push({
    priority: 'high',
    category: 'Security Warnings',
    message: `${auditSuite.summary.warnings} auditorías con advertencias`,
    action: 'Revisar recomendaciones de seguridad y implementar mejoras'
  });
}

// Recomendaciones específicas para infraestructura
auditSuite.recommendations.push({
  priority: 'medium',
  category: 'Infrastructure Hardening',
  recommendations: [
    'Configurar HTTPS con certificados válidos',
    'Implementar WAF (Web Application Firewall)',
    'Configurar monitoreo de infraestructura',
    'Establecer backups automáticos de BD',
    'Implementar rotación de logs',
    'Configurar alertas de seguridad'
  ]
});

// Generar reporte consolidado
const reportPath = `logs/infrastructure-audit-${Date.now()}.json`;
fs.writeFileSync(reportPath, JSON.stringify(auditSuite, null, 2));

// Generar reporte resumido
const summaryReport = {
  timestamp: auditSuite.timestamp,
  overallScore: auditSuite.overallScore,
  summary: auditSuite.summary,
  auditResults: auditSuite.audits.map(a => ({
    name: a.name,
    status: a.status,
    duration: `${Math.round(a.duration / 1000)}s`
  })),
  topRecommendations: auditSuite.recommendations.slice(0, 3)
};

const summaryPath = `logs/infrastructure-summary-${Date.now()}.json`;
fs.writeFileSync(summaryPath, JSON.stringify(summaryReport, null, 2));

// Mostrar resultados
console.log('🏁 AUDITORÍA COMPLETA DE INFRAESTRUCTURA FINALIZADA\n');
console.log('📊 RESUMEN EJECUTIVO:');
console.log('═'.repeat(50));
console.log(`📈 Score General de Seguridad: ${auditSuite.overallScore}/100`);
console.log(`✅ Auditorías Exitosas: ${auditSuite.summary.passed}/${auditSuite.summary.total}`);
console.log(`⚠️ Auditorías con Advertencias: ${auditSuite.summary.warnings}/${auditSuite.summary.total}`);
console.log(`❌ Auditorías Fallidas: ${auditSuite.summary.failed}/${auditSuite.summary.total}`);
console.log('═'.repeat(50));

console.log('\n📋 RESULTADOS POR AUDITORÍA:');
auditSuite.audits.forEach(audit => {
  const statusIcon = audit.status === 'passed' ? '✅' : 
                    audit.status === 'warning' ? '⚠️' : '❌';
  console.log(`${statusIcon} ${audit.name}: ${audit.status.toUpperCase()}`);
});

console.log(`\n📄 Reportes generados:`);
console.log(`   Completo: ${reportPath}`);
console.log(`   Resumen:  ${summaryPath}`);

// Determinar estado final
if (auditSuite.overallScore >= 90) {
  console.log('\n🏆 EXCELENTE: Infraestructura altamente segura');
} else if (auditSuite.overallScore >= 75) {
  console.log('\n✅ BUENO: Infraestructura segura con mejoras menores');
} else if (auditSuite.overallScore >= 60) {
  console.log('\n⚠️ ACEPTABLE: Requiere mejoras de seguridad');
} else {
  console.log('\n❌ CRÍTICO: Problemas graves de seguridad');
  process.exit(1);
}