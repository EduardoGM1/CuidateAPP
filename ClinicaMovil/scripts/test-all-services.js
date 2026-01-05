/**
 * Script principal para ejecutar todas las pruebas de servicios
 * Ejecuta: pruebas de estructura y pruebas de integración
 */

import runAllTests from './test-api-services.js';
import runIntegrationTests from './test-api-integration.js';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  section: (msg) => {
    console.log('\n');
    console.log(`${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}${msg}${colors.reset}`);
    console.log(`${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log('\n');
  },
};

async function runAllServiceTests() {
  log.section('🚀 INICIANDO PRUEBAS COMPLETAS DE SERVICIOS API');
  
  let allPassed = true;
  
  // Fase 1: Pruebas de estructura
  log.section('📋 FASE 1: PRUEBAS DE ESTRUCTURA');
  try {
    const structureTestsPassed = await runAllTests();
    if (!structureTestsPassed) {
      allPassed = false;
    }
  } catch (error) {
    log.error(`Error en pruebas de estructura: ${error.message}`);
    allPassed = false;
  }
  
  // Fase 2: Pruebas de integración
  log.section('🔗 FASE 2: PRUEBAS DE INTEGRACIÓN');
  try {
    const integrationTestsPassed = await runIntegrationTests();
    if (!integrationTestsPassed) {
      allPassed = false;
    }
  } catch (error) {
    log.error(`Error en pruebas de integración: ${error.message}`);
    allPassed = false;
  }
  
  // Resumen final
  log.section('📊 RESUMEN FINAL');
  
  if (allPassed) {
    log.success('¡TODAS LAS PRUEBAS PASARON EXITOSAMENTE!');
    console.log('\n');
    console.log('Los servicios están funcionando correctamente:');
    console.log('  ✅ Configuración de API correcta');
    console.log('  ✅ Servicios disponibles y funcionando');
    console.log('  ✅ Envíos y respuestas funcionan correctamente');
    console.log('  ✅ Manejo de errores implementado');
    console.log('\n');
    return true;
  } else {
    log.error('ALGUNAS PRUEBAS FALLARON');
    console.log('\n');
    console.log('Revisa los detalles arriba para identificar los problemas.');
    console.log('\n');
    return false;
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllServiceTests().catch(error => {
    console.error('Error ejecutando pruebas:', error);
    process.exit(1);
  });
}

export default runAllServiceTests;



