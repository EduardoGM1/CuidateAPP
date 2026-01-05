#!/usr/bin/env node

import axios from 'axios';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const testResults = [];

console.log('🎯 Iniciando Tests de Penetración...\n');

// 1. Test de SQL Injection
const sqlInjectionTests = [
  "' OR '1'='1",
  "'; DROP TABLE usuarios; --",
  "1' UNION SELECT * FROM usuarios --"
];

console.log('💉 Testing SQL Injection...');
for (const payload of sqlInjectionTests) {
  try {
    const response = await axios.get(`${BASE_URL}/api/pacientes/${payload}`, {
      timeout: 5000,
      validateStatus: () => true
    });
    
    testResults.push({
      test: 'SQL Injection',
      payload,
      status: response.status,
      vulnerable: response.status === 200 && response.data.length > 0
    });
  } catch (error) {
    testResults.push({
      test: 'SQL Injection',
      payload,
      status: 'error',
      vulnerable: false
    });
  }
}

// 2. Test de XSS
const xssPayloads = [
  "<script>alert('XSS')</script>",
  "javascript:alert('XSS')",
  "<img src=x onerror=alert('XSS')>"
];

console.log('🔗 Testing XSS...');
for (const payload of xssPayloads) {
  try {
    const response = await axios.post(`${BASE_URL}/api/pacientes`, {
      nombre: payload,
      apellido_paterno: 'Test',
      fecha_nacimiento: '1990-01-01'
    }, {
      timeout: 5000,
      validateStatus: () => true
    });
    
    testResults.push({
      test: 'XSS',
      payload,
      status: response.status,
      vulnerable: response.data && response.data.includes(payload)
    });
  } catch (error) {
    testResults.push({
      test: 'XSS',
      payload,
      status: 'blocked',
      vulnerable: false
    });
  }
}

// 3. Test de Rate Limiting
console.log('⚡ Testing Rate Limiting...');
const requests = [];
for (let i = 0; i < 20; i++) {
  requests.push(
    axios.get(`${BASE_URL}/api/pacientes`, {
      timeout: 1000,
      validateStatus: () => true
    }).catch(() => ({ status: 'timeout' }))
  );
}

const rateLimitResults = await Promise.all(requests);
const rateLimited = rateLimitResults.some(r => r.status === 429);

testResults.push({
  test: 'Rate Limiting',
  payload: '20 requests in burst',
  status: rateLimited ? 'protected' : 'vulnerable',
  vulnerable: !rateLimited
});

// 4. Test de Headers de Seguridad
console.log('🛡️ Testing Security Headers...');
try {
  const response = await axios.get(`${BASE_URL}/`);
  const headers = response.headers;
  
  const securityHeaders = [
    'x-content-type-options',
    'x-frame-options',
    'x-xss-protection',
    'strict-transport-security'
  ];
  
  securityHeaders.forEach(header => {
    testResults.push({
      test: 'Security Headers',
      payload: header,
      status: headers[header] ? 'present' : 'missing',
      vulnerable: !headers[header]
    });
  });
} catch (error) {
  console.log('Error testing headers:', error.message);
}

// 5. Generar reporte
const vulnerabilities = testResults.filter(r => r.vulnerable);
const reportPath = `logs/penetration-test-${Date.now()}.json`;

fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  summary: {
    total_tests: testResults.length,
    vulnerabilities_found: vulnerabilities.length,
    security_score: Math.round((1 - vulnerabilities.length / testResults.length) * 100)
  },
  results: testResults,
  vulnerabilities
}, null, 2));

console.log('\n📊 Resumen de Penetration Testing:');
console.log(`Tests ejecutados: ${testResults.length}`);
console.log(`Vulnerabilidades encontradas: ${vulnerabilities.length}`);
console.log(`Score de seguridad: ${Math.round((1 - vulnerabilities.length / testResults.length) * 100)}%`);
console.log(`Reporte guardado en: ${reportPath}`);

if (vulnerabilities.length > 0) {
  console.log('\n⚠️ Vulnerabilidades críticas encontradas:');
  vulnerabilities.forEach(v => {
    console.log(`- ${v.test}: ${v.payload}`);
  });
}