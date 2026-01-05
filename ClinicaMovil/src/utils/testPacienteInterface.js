/**
 * Utilidad para Testing Manual de la Interfaz de Paciente
 * 
 * Ejecutar en consola de React Native para verificar funcionalidades
 */

import ttsService from '../services/ttsService';
import hapticService from '../services/hapticService';
import audioFeedbackService from '../services/audioFeedbackService';
import Logger from '../services/logger';

/**
 * Suite completa de tests manuales
 */
export const executeAllTests = async () => {
  console.log('\n');
  console.log('🧪'.repeat(30));
  console.log('🧪  INICIANDO TESTS DE INTERFAZ DE PACIENTE');
  console.log('🧪'.repeat(30));
  console.log('\n');

  const results = {
    services: { passed: 0, failed: 0, errors: [] },
    navigation: { passed: 0, failed: 0, errors: [] },
    components: { passed: 0, failed: 0, errors: [] },
  };

  try {
    // TEST 1: Servicios Base
    console.log('\n📊 TEST 1: SERVICIOS BASE');
    console.log('─'.repeat(50));

    // Test TTS
    try {
      console.log('🔊 Probando TTS Service...');
      await ttsService.initialize();
      await ttsService.speak('Prueba de texto a voz');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar a que termine
      await ttsService.stop();
      console.log('   ✅ TTS Service: OK');
      results.services.passed++;
    } catch (error) {
      console.log('   ❌ TTS Service: ERROR', error.message);
      results.services.failed++;
      results.services.errors.push(`TTS: ${error.message}`);
    }

    // Test Haptic
    try {
      console.log('📳 Probando Haptic Service...');
      hapticService.light();
      await new Promise(resolve => setTimeout(resolve, 100));
      hapticService.medium();
      await new Promise(resolve => setTimeout(resolve, 100));
      hapticService.heavy();
      console.log('   ✅ Haptic Service: OK');
      results.services.passed++;
    } catch (error) {
      console.log('   ❌ Haptic Service: ERROR', error.message);
      results.services.failed++;
      results.services.errors.push(`Haptic: ${error.message}`);
    }

    // Test Audio Feedback
    try {
      console.log('🔊 Probando Audio Feedback Service...');
      audioFeedbackService.playSuccess();
      await new Promise(resolve => setTimeout(resolve, 500));
      audioFeedbackService.playTap();
      console.log('   ✅ Audio Feedback Service: OK');
      results.services.passed++;
    } catch (error) {
      console.log('   ❌ Audio Feedback Service: ERROR', error.message);
      results.services.failed++;
      results.services.errors.push(`Audio: ${error.message}`);
    }

    // TEST 2: Verificación de componentes
    console.log('\n📊 TEST 2: COMPONENTES');
    console.log('─'.repeat(50));

    try {
      const BigIconButton = require('../components/paciente/BigIconButton').default;
      const ValueCard = require('../components/paciente/ValueCard').default;
      const MedicationCard = require('../components/paciente/MedicationCard').default;
      const SimpleForm = require('../components/paciente/SimpleForm').default;

      if (BigIconButton) {
        console.log('   ✅ BigIconButton: Exportado correctamente');
        results.components.passed++;
      }
      if (ValueCard) {
        console.log('   ✅ ValueCard: Exportado correctamente');
        results.components.passed++;
      }
      if (MedicationCard) {
        console.log('   ✅ MedicationCard: Exportado correctamente');
        results.components.passed++;
      }
      if (SimpleForm) {
        console.log('   ✅ SimpleForm: Exportado correctamente');
        results.components.passed++;
      }
    } catch (error) {
      console.log('   ❌ Error cargando componentes:', error.message);
      results.components.failed++;
    }

    // TEST 3: Verificación de pantallas
    console.log('\n📊 TEST 3: PANTALLAS');
    console.log('─'.repeat(50));

    try {
      const InicioPaciente = require('../screens/paciente/InicioPaciente').default;
      const RegistrarSignosVitales = require('../screens/paciente/RegistrarSignosVitales').default;

      if (InicioPaciente) {
        console.log('   ✅ InicioPaciente: Exportado correctamente');
        results.components.passed++;
      }
      if (RegistrarSignosVitales) {
        console.log('   ✅ RegistrarSignosVitales: Exportado correctamente');
        results.components.passed++;
      }
    } catch (error) {
      console.log('   ❌ Error cargando pantallas:', error.message);
      results.components.failed++;
    }

    // TEST 4: Verificación de navegación
    console.log('\n📊 TEST 4: NAVEGACIÓN');
    console.log('─'.repeat(50));

    try {
      const NavegacionPaciente = require('../navigation/NavegacionPaciente').default;
      if (NavegacionPaciente) {
        console.log('   ✅ NavegacionPaciente: Exportado correctamente');
        results.navigation.passed++;
      }
    } catch (error) {
      console.log('   ❌ Error cargando navegación:', error.message);
      results.navigation.failed++;
    }

    // TEST 5: Verificación de hooks
    console.log('\n📊 TEST 5: HOOKS');
    console.log('─'.repeat(50));

    try {
      const useTTS = require('../hooks/useTTS').default;
      const usePacienteData = require('../hooks/usePacienteData').default;

      if (useTTS) {
        console.log('   ✅ useTTS: Exportado correctamente');
        results.components.passed++;
      }
      if (usePacienteData) {
        console.log('   ✅ usePacienteData: Exportado correctamente');
        results.components.passed++;
      }
    } catch (error) {
      console.log('   ❌ Error cargando hooks:', error.message);
      results.components.failed++;
    }

    // REPORTE FINAL
    console.log('\n');
    console.log('📊'.repeat(30));
    console.log('📊  REPORTE FINAL DE TESTS');
    console.log('📊'.repeat(30));
    console.log('\n');

    const totalPassed = results.services.passed + results.navigation.passed + results.components.passed;
    const totalFailed = results.services.failed + results.navigation.failed + results.components.failed;

    console.log('✅ Servicios Base:');
    console.log(`   Pasados: ${results.services.passed}`);
    console.log(`   Fallidos: ${results.services.failed}`);
    if (results.services.errors.length > 0) {
      console.log(`   Errores: ${results.services.errors.join(', ')}`);
    }

    console.log('\n✅ Componentes y Pantallas:');
    console.log(`   Pasados: ${results.components.passed}`);
    console.log(`   Fallidos: ${results.components.failed}`);

    console.log('\n✅ Navegación:');
    console.log(`   Pasados: ${results.navigation.passed}`);
    console.log(`   Fallidos: ${results.navigation.failed}`);

    console.log('\n📈 RESUMEN:');
    console.log(`   Total Pasados: ${totalPassed}`);
    console.log(`   Total Fallidos: ${totalFailed}`);
    console.log(`   Tasa de Éxito: ${totalPassed > 0 ? ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1) : 0}%`);

    if (totalFailed === 0) {
      console.log('\n✅'.repeat(20));
      console.log('✅  TODOS LOS TESTS PASARON');
      console.log('✅'.repeat(20));
    } else {
      console.log('\n⚠️'.repeat(20));
      console.log('⚠️  ALGUNOS TESTS FALLARON - Revisa errores arriba');
      console.log('⚠️'.repeat(20));
    }

    console.log('\n');
    console.log('💡 PRÓXIMOS PASOS:');
    console.log('─'.repeat(50));
    console.log('1. Verifica que la app compile sin errores');
    console.log('2. Abre la app como paciente y prueba la navegación');
    console.log('3. Verifica que TTS funcione al presionar botones');
    console.log('4. Prueba el formulario de signos vitales paso a paso');
    console.log('5. Verifica feedback háptico en todas las interacciones');
    console.log('\n');

    return results;

  } catch (error) {
    console.error('❌ Error ejecutando tests:', error);
    throw error;
  }
};

// Exportar función para uso global
if (__DEV__) {
  global.testPacienteInterface = executeAllTests;
  console.log('\n✅ Suite de tests disponible');
  console.log('💡 Ejecuta: testPacienteInterface()\n');
}

export default executeAllTests;




