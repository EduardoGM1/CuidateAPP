/**
 * Script para configurar DevTools automáticamente
 * Opciones:
 * - standalone: Configurar para React DevTools standalone (recomendado)
 * - chrome: Configurar para Chrome DevTools
 * - disable-new-arch: Deshabilitar New Architecture para compatibilidad
 */

const fs = require('fs');
const path = require('path');

const option = process.argv[2] || 'standalone';

console.log('\n🔧 CONFIGURANDO DEVTOOLS\n');
console.log('='.repeat(80));

if (option === 'standalone') {
  console.log('✅ Configuración recomendada: React DevTools Standalone\n');
  console.log('Esta opción NO requiere cambios en el código.\n');
  console.log('Para usar:');
  console.log('  1. npm install -g react-devtools');
  console.log('  2. react-devtools (en terminal separada)');
  console.log('  3. npm start (en otra terminal)');
  console.log('  4. npm run android');
  
} else if (option === 'chrome') {
  console.log('✅ Configurando para Chrome DevTools\n');
  
  // Modificar App.tsx para mejor debugging en desarrollo
  const appTsxPath = path.join(__dirname, 'App.tsx');
  let appTsx = fs.readFileSync(appTsxPath, 'utf8');
  
  // Reemplazar el filtro de errores para que solo silencie en producción
  const oldFilter = /if \(__DEV__\) \{[\s\S]*?originalError\.apply\(console, args\);[\s\S]*?\}/;
  const newFilter = `if (__DEV__) {
  const originalError = console.error;
  console.error = (...args) => {
    const message = args[0]?.toString() || '';
    // SOLO silenciar en producción o si el error es realmente no crítico
    const isNonCriticalDebuggerError = (
      message.includes('Failed to open debugger') &&
      message.includes('React Native Bridgeless')
    );
    
    // En desarrollo, mostrar todos los errores excepto los realmente no críticos
    if (process.env.NODE_ENV !== 'production' && !isNonCriticalDebuggerError) {
      originalError.apply(console, args);
    } else if (process.env.NODE_ENV === 'production') {
      // En producción, silenciar errores de debugger
      if (!message.includes('Failed to open debugger')) {
        originalError.apply(console, args);
      }
    }
  };
}`;
  
  if (oldFilter.test(appTsx)) {
    appTsx = appTsx.replace(oldFilter, newFilter);
    fs.writeFileSync(appTsxPath, appTsx);
    console.log('✅ App.tsx actualizado para mejor debugging');
  } else {
    console.log('ℹ️  App.tsx ya tiene la configuración correcta');
  }
  
  console.log('\nPara usar Chrome DevTools:');
  console.log('  1. Ejecuta la app: npm run android');
  console.log('  2. En la app: Agita dispositivo → "Debug"');
  console.log('  3. Abre: http://localhost:8081/debugger-ui');
  
} else if (option === 'disable-new-arch') {
  console.log('⚠️  Deshabilitando New Architecture\n');
  console.log('ADVERTENCIA: Esto requiere recompilar completamente la app\n');
  
  const gradlePropsPath = path.join(__dirname, 'android', 'gradle.properties');
  let gradleProps = fs.readFileSync(gradlePropsPath, 'utf8');
  
  if (gradleProps.includes('newArchEnabled=true')) {
    gradleProps = gradleProps.replace('newArchEnabled=true', 'newArchEnabled=false');
    fs.writeFileSync(gradlePropsPath, gradleProps);
    console.log('✅ New Architecture deshabilitada en gradle.properties');
    console.log('\nIMPORTANTE: Ahora debes:');
    console.log('  1. cd android');
    console.log('  2. ./gradlew clean');
    console.log('  3. cd ..');
    console.log('  4. npm run android');
  } else {
    console.log('ℹ️  New Architecture ya está deshabilitada');
  }
  
} else {
  console.log('❌ Opción no válida');
  console.log('\nOpciones disponibles:');
  console.log('  node configurar-devtools.js standalone    (Recomendado - no requiere cambios)');
  console.log('  node configurar-devtools.js chrome        (Configurar para Chrome DevTools)');
  console.log('  node configurar-devtools.js disable-new-arch (Deshabilitar New Architecture)');
  process.exit(1);
}

console.log('\n' + '='.repeat(80));
console.log('✅ Configuración completada\n');




