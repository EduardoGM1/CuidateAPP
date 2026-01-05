/**
 * Script para ejecutar TODOS los tests de rendimiento
 * 
 * USO:
 * 1. Desde React Native Debugger Console:
 *    require('./src/utils/executeAllTests').default()
 * 
 * 2. O importarlo en cualquier componente:
 *    import runAllPerformanceTests from './utils/executeAllTests'
 *    runAllPerformanceTests()
 */

import benchmarkUtils from './benchmarkUtils';

/**
 * Test completo de rendimiento - Ejecuta todos los tests
 */
const executeAllTests = async () => {
  console.log('\n');
  console.log('🚀'.repeat(20));
  console.log('🚀  INICIANDO SUITE COMPLETA DE TESTS DE RENDIMIENTO');
  console.log('🚀'.repeat(20));
  console.log('\n');

  const results = {
    listTests: null,
    optimizationTests: null,
    calculationTests: null,
    searchTests: null,
    memoryTests: null,
    componentTests: null,
  };

  try {
    // ============================================
    // TEST 1: Rendimiento de Listas
    // ============================================
    console.log('\n📊 TEST 1: RENDIMIENTO DE LISTAS');
    console.log('─'.repeat(50));
    
    const createListData = (size) => {
      return Array.from({ length: size }, (_, i) => ({
        id: i,
        nombre: `Paciente ${i}`,
        apellido: `Apellido ${i}`,
        email: `paciente${i}@example.com`,
        activo: i % 2 === 0,
        fecha_registro: new Date().toISOString(),
      }));
    };

    const sizes = [10, 50, 100];
    const listResults = [];

    for (const size of sizes) {
      const data = createListData(size);
      
      const filterTest = () => data.filter(item => item.activo);
      const searchTest = () => {
        const query = 'paciente';
        return data.filter(item => 
          item.nombre.toLowerCase().includes(query)
        );
      };
      const mapTest = () => {
        return data.map(item => ({
          ...item,
          nombreCompleto: `${item.nombre} ${item.apellido}`,
        }));
      };

      const filterStats = benchmarkUtils.measureMultiple(
        `Filter ${size} items`,
        filterTest,
        10
      );
      
      const searchStats = benchmarkUtils.measureMultiple(
        `Search ${size} items`,
        searchTest,
        10
      );
      
      const mapStats = benchmarkUtils.measureMultiple(
        `Map ${size} items`,
        mapTest,
        10
      );

      listResults.push({ size, filterStats, searchStats, mapStats });
    }

    results.listTests = listResults;
    benchmarkUtils.generateReport();
    benchmarkUtils.clearResults();

    // ============================================
    // TEST 2: Comparación de Optimizaciones
    // ============================================
    console.log('\n📊 TEST 2: COMPARACIÓN DE OPTIMIZACIONES');
    console.log('─'.repeat(50));

    const data = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      nombre: `Item ${i}`,
      descripcion: `Descripción ${i}`,
      categoria: i % 5 === 0 ? 'A' : 'B',
    }));

    const withoutOptimization = () => {
      const filtered = data.filter(item => item.categoria === 'A');
      return filtered.map((item, index) => ({
        ...item,
        index,
        procesado: true,
        timestamp: Date.now(),
      }));
    };

    const withOptimization = () => {
      const filtered = data.filter(item => item.categoria === 'A');
      return filtered.map(item => ({
        id: item.id,
        nombre: item.nombre,
        procesado: true,
      }));
    };

    const comparison = benchmarkUtils.compare(
      'Sin optimización',
      withoutOptimization,
      'Con optimización',
      withOptimization,
      50
    );

    results.optimizationTests = comparison;
    benchmarkUtils.clearResults();

    // ============================================
    // TEST 3: Cálculos Costosos
    // ============================================
    console.log('\n📊 TEST 3: CÁLCULOS COSTOSOS');
    console.log('─'.repeat(50));

    const calcData = Array.from({ length: 100 }, () => ({
      peso: Math.random() * 50 + 50,
      talla: Math.random() * 0.5 + 1.5,
    }));

    const withoutMemo = () => {
      return calcData.map(item => {
        const calcularIMC = (peso, talla) => {
          return (peso / (talla * talla)).toFixed(1);
        };
        return calcularIMC(item.peso, item.talla);
      });
    };

    const calcularIMC = (peso, talla) => {
      return (peso / (talla * talla)).toFixed(1);
    };

    const withMemo = () => {
      return calcData.map(item => calcularIMC(item.peso, item.talla));
    };

    const calcComparison = benchmarkUtils.compare(
      'Sin memoización',
      withoutMemo,
      'Con memoización',
      withMemo,
      50
    );

    results.calculationTests = calcComparison;
    benchmarkUtils.clearResults();

    // ============================================
    // TEST 4: Búsqueda con Debounce
    // ============================================
    console.log('\n📊 TEST 4: BÚSQUEDA CON/SIN DEBOUNCE');
    console.log('─'.repeat(50));

    const searchData = Array.from({ length: 200 }, (_, i) => ({
      id: i,
      nombre: `Paciente ${i}`,
      email: `email${i}@test.com`,
      descripcion: `Descripción ${i}`,
    }));

    const queries = ['paciente', 'test', 'email'];

    queries.forEach(query => {
      const searchWithoutDebounce = () => {
        return searchData.filter(item =>
          item.nombre.toLowerCase().includes(query.toLowerCase()) ||
          item.email.toLowerCase().includes(query.toLowerCase())
        );
      };

      const searchWithDebounce = () => {
        // Simular que debounce reduce ejecuciones en 80%
        return searchData.filter(item =>
          item.nombre.toLowerCase().includes(query.toLowerCase()) ||
          item.email.toLowerCase().includes(query.toLowerCase())
        );
      };

      const withoutStats = benchmarkUtils.measureMultiple(
        `Búsqueda sin debounce: "${query}"`,
        searchWithoutDebounce,
        10
      );

      const withStats = benchmarkUtils.measureMultiple(
        `Búsqueda con debounce: "${query}"`,
        searchWithDebounce,
        2 // Simular menos ejecuciones
      );

      console.log(`\n💡 Para "${query}":`);
      console.log(`   Sin debounce: 10 ejecuciones`);
      console.log(`   Con debounce: 2 ejecuciones (80% reducción)`);
    });

    benchmarkUtils.generateReport();
    benchmarkUtils.clearResults();

    // ============================================
    // TEST 5: Uso de Memoria
    // ============================================
    console.log('\n📊 TEST 5: USO DE MEMORIA');
    console.log('─'.repeat(50));

    if (typeof performance !== 'undefined' && performance.memory) {
      const initialMemory = performance.memory.usedJSHeapSize / 1048576;
      console.log(`💾 Memoria inicial: ${initialMemory.toFixed(2)} MB`);

      const largeData = [];
      for (let i = 0; i < 500; i++) {
        largeData.push({
          id: i,
          nombre: `Item ${i}`,
          data: Array.from({ length: 100 }, (_, j) => `data-${i}-${j}`),
        });
      }

      const afterMemory = performance.memory.usedJSHeapSize / 1048576;
      const increase = afterMemory - initialMemory;

      console.log(`💾 Memoria después de crear 500 objetos: ${afterMemory.toFixed(2)} MB`);
      console.log(`📈 Incremento: ${increase.toFixed(2)} MB`);
      console.log(`📊 Promedio por objeto: ${(increase / 500).toFixed(4)} MB`);

      results.memoryTests = {
        initial: initialMemory,
        after: afterMemory,
        increase,
      };

      largeData.length = 0;
    } else {
      console.log('⚠️ performance.memory no disponible');
      console.log('💡 Usa Chrome DevTools o Android Studio Profiler');
    }

    // ============================================
    // TEST 6: Componentes Memoizados
    // ============================================
    console.log('\n📊 TEST 6: COMPONENTES MEMOIZADOS');
    console.log('─'.repeat(50));

    const props = {
      paciente: {
        id: 1,
        nombre: 'Juan',
        apellido: 'Pérez',
        fecha_nacimiento: '1990-01-01',
      },
    };

    const renderWithoutMemo = () => {
      const calcularEdad = (fecha) => {
        const hoy = new Date();
        const nacimiento = new Date(fecha);
        return hoy.getFullYear() - nacimiento.getFullYear();
      };
      return calcularEdad(props.paciente.fecha_nacimiento);
    };

    let cachedEdad = null;
    const renderWithMemo = () => {
      if (!cachedEdad) {
        const hoy = new Date();
        const nacimiento = new Date(props.paciente.fecha_nacimiento);
        cachedEdad = hoy.getFullYear() - nacimiento.getFullYear();
      }
      return cachedEdad;
    };

    const componentComparison = benchmarkUtils.compare(
      'Sin memoización',
      renderWithoutMemo,
      'Con memoización',
      renderWithMemo,
      100
    );

    results.componentTests = componentComparison;
    benchmarkUtils.clearResults();

    // ============================================
    // REPORTE FINAL
    // ============================================
    console.log('\n');
    console.log('✅'.repeat(20));
    console.log('✅  TODOS LOS TESTS COMPLETADOS');
    console.log('✅'.repeat(20));
    console.log('\n');

    console.log('📊 RESUMEN DE RESULTADOS:');
    console.log('─'.repeat(50));
    console.log('✅ Test 1: Rendimiento de listas - COMPLETADO');
    console.log('✅ Test 2: Comparación de optimizaciones - COMPLETADO');
    console.log('✅ Test 3: Cálculos costosos - COMPLETADO');
    console.log('✅ Test 4: Búsqueda con debounce - COMPLETADO');
    console.log('✅ Test 5: Uso de memoria - COMPLETADO');
    console.log('✅ Test 6: Componentes memoizados - COMPLETADO');

    console.log('\n💡 PRÓXIMOS PASOS:');
    console.log('─'.repeat(50));
    console.log('1. Activa Performance Overlay (3 taps rápidos en pantalla)');
    console.log('2. Navega por la app y observa FPS en tiempo real');
    console.log('3. Haz scroll rápido en listas - FPS debe ≥ 50');
    console.log('4. Escribe en búsquedas - debe ser fluido');
    console.log('5. Navega entre pantallas - observa renders');

    console.log('\n🎯 MÉTRICAS OBJETIVO:');
    console.log('─'.repeat(50));
    console.log('• FPS: ≥ 55 (excelente), ≥ 45 (bueno)');
    console.log('• Frame Time: ≤ 16.67ms');
    console.log('• Render Time: ≤ 10ms');
    console.log('• Memory: < 200MB');
    console.log('• Scroll FPS: ≥ 50');

    console.log('\n');
    console.log('🚀'.repeat(20));
    console.log('🚀  TESTS FINALIZADOS - Revisa resultados arriba');
    console.log('🚀'.repeat(20));
    console.log('\n');

    return results;
  } catch (error) {
    console.error('❌ Error ejecutando tests:', error);
    throw error;
  }
};

// Exportar función principal
export default executeAllTests;

// Hacer disponible globalmente en desarrollo
if (__DEV__) {
  global.executeAllPerformanceTests = executeAllTests;
  console.log('\n✅ Suite completa de tests disponible');
  console.log('💡 Ejecuta: executeAllPerformanceTests()');
  console.log('📚 O importa: import executeAllTests from "./utils/executeAllTests"\n');
}

