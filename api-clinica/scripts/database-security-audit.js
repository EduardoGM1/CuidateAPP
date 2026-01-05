#!/usr/bin/env node

import sequelize from '../config/db.js';
import fs from 'fs';

console.log('🗄️ Iniciando Auditoría de Seguridad de Base de Datos...\n');

const auditResults = {
  timestamp: new Date().toISOString(),
  databaseConfig: [],
  schemaAnalysis: [],
  encryptionAnalysis: [],
  permissionsAnalysis: [],
  recommendations: []
};

// 1. Verificar configuración de conexión a BD
console.log('🔌 Verificando configuración de conexión...');
const dbConfig = sequelize.config;
const connectionAudit = {
  component: 'Database Connection',
  tests: []
};

// Verificar SSL/TLS
connectionAudit.tests.push({
  test: 'SSL Connection',
  status: dbConfig.dialectOptions?.ssl ? 'enabled' : 'disabled',
  severity: !dbConfig.dialectOptions?.ssl ? 'high' : 'none',
  recommendation: !dbConfig.dialectOptions?.ssl ? 'Enable SSL for database connections' : 'OK'
});

// Verificar configuración de pool
connectionAudit.tests.push({
  test: 'Connection Pool Configuration',
  status: dbConfig.pool ? 'configured' : 'default',
  details: dbConfig.pool || 'Using default pool settings',
  recommendation: 'OK'
});

auditResults.databaseConfig.push(connectionAudit);

// 2. Análisis de esquema de base de datos
console.log('📊 Analizando esquema de base de datos...');

async function analyzeSchema() {
  try {
    await sequelize.authenticate();
    
    // Obtener información de tablas
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME, TABLE_COMMENT, ENGINE, TABLE_COLLATION
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
    `);
    
    const schemaAudit = {
      component: 'Database Schema',
      totalTables: tables.length,
      tables: [],
      sensitiveDataTables: []
    };
    
    // Identificar tablas con datos sensibles
    const sensitiveTablePatterns = [
      'pacientes', 'usuarios', 'doctores', 'diagnosticos', 
      'signos_vitales', 'mensaje_chat'
    ];
    
    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      const isSensitive = sensitiveTablePatterns.some(pattern => 
        tableName.toLowerCase().includes(pattern)
      );
      
      // Obtener columnas de la tabla
      const [columns] = await sequelize.query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${tableName}'
      `);
      
      const tableAnalysis = {
        name: tableName,
        sensitive: isSensitive,
        columns: columns.length,
        sensitiveColumns: [],
        hasEncryption: false,
        hasIndexes: false
      };
      
      // Identificar columnas sensibles
      const sensitiveColumnPatterns = [
        'password', 'email', 'curp', 'telefono', 'numero_celular',
        'direccion', 'nombre', 'apellido', 'diagnostico', 'observaciones'
      ];
      
      columns.forEach(column => {
        const isSensitiveColumn = sensitiveColumnPatterns.some(pattern =>
          column.COLUMN_NAME.toLowerCase().includes(pattern)
        );
        
        if (isSensitiveColumn) {
          tableAnalysis.sensitiveColumns.push({
            name: column.COLUMN_NAME,
            type: column.DATA_TYPE,
            nullable: column.IS_NULLABLE === 'YES',
            encrypted: column.DATA_TYPE.includes('VARBINARY') || 
                     column.COLUMN_NAME.includes('hash')
          });
        }
      });
      
      // Verificar índices
      const [indexes] = await sequelize.query(`
        SHOW INDEX FROM ${tableName}
      `);
      tableAnalysis.hasIndexes = indexes.length > 1; // Más que solo PRIMARY
      
      schemaAudit.tables.push(tableAnalysis);
      
      if (isSensitive) {
        schemaAudit.sensitiveDataTables.push(tableAnalysis);
      }
    }
    
    auditResults.schemaAnalysis.push(schemaAudit);
    
    // 3. Análisis de encriptación
    console.log('🔐 Analizando encriptación de datos...');
    const encryptionAudit = {
      component: 'Data Encryption',
      tests: []
    };
    
    // Verificar passwords hasheados
    const [passwordColumns] = await sequelize.query(`
      SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND (COLUMN_NAME LIKE '%password%' OR COLUMN_NAME LIKE '%hash%')
    `);
    
    passwordColumns.forEach(col => {
      encryptionAudit.tests.push({
        test: `Password Encryption - ${col.TABLE_NAME}.${col.COLUMN_NAME}`,
        status: col.CHARACTER_MAXIMUM_LENGTH >= 60 ? 'properly_hashed' : 'weak_hashing',
        details: `Length: ${col.CHARACTER_MAXIMUM_LENGTH}, Type: ${col.DATA_TYPE}`,
        recommendation: col.CHARACTER_MAXIMUM_LENGTH >= 60 ? 'OK' : 'Use stronger hashing (bcrypt recommended)'
      });
    });
    
    auditResults.encryptionAnalysis.push(encryptionAudit);
    
    // 4. Análisis de permisos (simulado para MySQL)
    console.log('👥 Analizando permisos de base de datos...');
    const permissionsAudit = {
      component: 'Database Permissions',
      tests: []
    };
    
    // Verificar usuario actual y sus privilegios
    const [currentUser] = await sequelize.query('SELECT USER() as current_user');
    const [privileges] = await sequelize.query('SHOW GRANTS');
    
    permissionsAudit.tests.push({
      test: 'Current Database User',
      status: 'identified',
      details: currentUser[0].current_user,
      recommendation: 'Verify this user has minimal required privileges'
    });
    
    permissionsAudit.tests.push({
      test: 'User Privileges',
      status: 'identified',
      details: privileges.map(p => Object.values(p)[0]).join('; '),
      recommendation: 'Review and minimize database privileges'
    });
    
    auditResults.permissionsAnalysis.push(permissionsAudit);
    
  } catch (error) {
    auditResults.schemaAnalysis.push({
      component: 'Database Schema Analysis',
      error: error.message,
      status: 'failed',
      recommendation: 'Check database connection and permissions'
    });
  } finally {
    await sequelize.close();
  }
}

// Ejecutar análisis
await analyzeSchema();

// 5. Generar recomendaciones
const criticalIssues = [
  ...auditResults.databaseConfig.flatMap(c => c.tests?.filter(t => t.severity === 'high') || []),
  ...auditResults.encryptionAnalysis.flatMap(c => c.tests?.filter(t => t.status === 'weak_hashing') || [])
];

if (criticalIssues.length > 0) {
  auditResults.recommendations.push({
    priority: 'high',
    category: 'Database Security Issues',
    count: criticalIssues.length,
    issues: criticalIssues.map(i => i.test)
  });
}

// Recomendaciones para datos sensibles
const sensitiveTablesCount = auditResults.schemaAnalysis[0]?.sensitiveDataTables?.length || 0;
if (sensitiveTablesCount > 0) {
  auditResults.recommendations.push({
    priority: 'medium',
    category: 'Sensitive Data Protection',
    message: `Found ${sensitiveTablesCount} tables with sensitive data`,
    recommendation: 'Consider implementing field-level encryption for PII data'
  });
}

// 6. Generar reporte
const reportPath = `logs/database-security-audit-${Date.now()}.json`;
fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2));

console.log('\n📊 Resumen de Auditoría de Base de Datos:');
console.log(`Tablas analizadas: ${auditResults.schemaAnalysis[0]?.totalTables || 0}`);
console.log(`Tablas con datos sensibles: ${auditResults.schemaAnalysis[0]?.sensitiveDataTables?.length || 0}`);
console.log(`Problemas críticos: ${criticalIssues.length}`);
console.log(`Reporte guardado en: ${reportPath}`);

if (criticalIssues.length === 0) {
  console.log('\n✅ Configuración de base de datos segura.');
} else {
  console.log('\n⚠️ Se encontraron problemas críticos de seguridad en la base de datos.');
}