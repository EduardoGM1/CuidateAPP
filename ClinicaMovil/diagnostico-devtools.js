/**
 * Script de diagnóstico para React Native DevTools
 * Ejecutar: node diagnostico-devtools.js
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 DIAGNÓSTICO DE REACT NATIVE DEVTOOLS\n');
console.log('='.repeat(80));

// 1. Verificar versiones
console.log('\n📦 1. VERSIONES INSTALADAS:');
console.log('-'.repeat(80));

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
console.log(`   React Native: ${packageJson.dependencies['react-native']}`);
console.log(`   React: ${packageJson.dependencies['react']}`);
console.log(`   Metro Config: ${packageJson.dependencies['@react-native/metro-config']}`);

// 2. Verificar configuración de New Architecture
console.log('\n🏗️  2. CONFIGURACIÓN DE ARQUITECTURA:');
console.log('-'.repeat(80));

const gradlePropsPath = path.join(__dirname, 'android', 'gradle.properties');
if (fs.existsSync(gradlePropsPath)) {
  const gradleProps = fs.readFileSync(gradlePropsPath, 'utf8');
  const newArchEnabled = gradleProps.includes('newArchEnabled=true');
  const hermesEnabled = gradleProps.includes('hermesEnabled=true');
  
  console.log(`   New Architecture: ${newArchEnabled ? '✅ HABILITADA' : '❌ DESHABILITADA'}`);
  console.log(`   Hermes: ${hermesEnabled ? '✅ HABILITADO' : '❌ DESHABILITADO'}`);
  
  if (newArchEnabled) {
    console.log('\n   ⚠️  PROBLEMA DETECTADO:');
    console.log('   La New Architecture (bridgeless) tiene problemas conocidos con DevTools');
    console.log('   Esto causa errores de timeout en la conexión del debugger');
  }
} else {
  console.log('   ❌ No se encontró gradle.properties');
}

// 3. Verificar filtros de errores en App.tsx
console.log('\n🔇 3. FILTROS DE ERRORES:');
console.log('-'.repeat(80));

const appTsxPath = path.join(__dirname, 'App.tsx');
if (fs.existsSync(appTsxPath)) {
  const appTsx = fs.readFileSync(appTsxPath, 'utf8');
  const hasErrorFilter = appTsx.includes('HeadersTimeoutError') || appTsx.includes('Failed to open debugger');
  
  if (hasErrorFilter) {
    console.log('   ⚠️  PROBLEMA DETECTADO:');
    console.log('   App.tsx está silenciando errores de DevTools');
    console.log('   Esto puede ocultar el problema real');
    console.log('\n   Código encontrado:');
    const lines = appTsx.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('HeadersTimeoutError') || line.includes('Failed to open debugger')) {
        console.log(`   Línea ${index + 1}: ${line.trim()}`);
      }
    });
  } else {
    console.log('   ✅ No se encontraron filtros de errores');
  }
} else {
  console.log('   ❌ No se encontró App.tsx');
}

// 4. Verificar configuración de Metro
console.log('\n⚙️  4. CONFIGURACIÓN DE METRO:');
console.log('-'.repeat(80));

const metroConfigPath = path.join(__dirname, 'metro.config.js');
if (fs.existsSync(metroConfigPath)) {
  const metroConfig = fs.readFileSync(metroConfigPath, 'utf8');
  console.log('   ✅ metro.config.js encontrado');
  
  // Verificar si hay configuración personalizada para DevTools
  if (metroConfig.includes('devTools') || metroConfig.includes('inspector')) {
    console.log('   ✅ Configuración personalizada encontrada');
  } else {
    console.log('   ℹ️  Usando configuración por defecto');
  }
} else {
  console.log('   ❌ No se encontró metro.config.js');
}

// 5. Problemas conocidos
console.log('\n⚠️  5. PROBLEMAS CONOCIDOS:');
console.log('-'.repeat(80));

const reactNativeVersion = packageJson.dependencies['react-native'];
const reactVersion = packageJson.dependencies['react'];

console.log(`   Versión React Native: ${reactNativeVersion}`);
console.log(`   Versión React: ${reactVersion}`);

const problems = [];

// React Native 0.82+ con React 19 tiene problemas
if (reactNativeVersion >= '0.82.0' && reactVersion >= '19.0.0') {
  problems.push({
    severity: 'HIGH',
    issue: 'React Native 0.82+ con React 19 puede tener incompatibilidades con DevTools',
    solution: 'Considerar downgrade a React 18 o esperar actualizaciones'
  });
}

// New Architecture + DevTools
if (fs.existsSync(gradlePropsPath)) {
  const gradleProps = fs.readFileSync(gradlePropsPath, 'utf8');
  if (gradleProps.includes('newArchEnabled=true')) {
    problems.push({
      severity: 'HIGH',
      issue: 'New Architecture (bridgeless) tiene problemas conocidos con DevTools',
      solution: 'Deshabilitar New Architecture o usar alternativas (React DevTools standalone)'
    });
  }
}

if (problems.length === 0) {
  console.log('   ✅ No se detectaron problemas conocidos');
} else {
  problems.forEach((problem, index) => {
    console.log(`\n   ${index + 1}. [${problem.severity}] ${problem.issue}`);
    console.log(`      💡 Solución: ${problem.solution}`);
  });
}

// 6. Soluciones recomendadas
console.log('\n💡 6. SOLUCIONES RECOMENDADAS:');
console.log('-'.repeat(80));
console.log('   1. Usar React DevTools standalone (recomendado para New Architecture)');
console.log('      → npm install -g react-devtools');
console.log('      → react-devtools');
console.log('');
console.log('   2. Deshabilitar New Architecture temporalmente');
console.log('      → En android/gradle.properties: newArchEnabled=false');
console.log('      → Recompilar la app');
console.log('');
console.log('   3. Usar Chrome DevTools (más compatible)');
console.log('      → En el menú de desarrollo: "Debug"');
console.log('      → Abre Chrome: http://localhost:8081/debugger-ui');
console.log('');
console.log('   4. Verificar que el puerto 8081 esté libre');
console.log('      → netstat -ano | findstr :8081');

console.log('\n' + '='.repeat(80));
console.log('✅ Diagnóstico completado\n');




