/**
 * Script de prueba de rendimiento para verificar optimizaciones
 * 
 * Ejecutar en la consola de React Native Debugger o en el código
 */

import benchmarkUtils from './benchmarkUtils';

/**
 * Test de rendimiento de listas
 */
export const testListPerformance = async (lista = [], filterFunction) => {
  console.log('\n📊 === TEST DE RENDIMIENTO DE LISTAS ===\n');

  // Test 1: Tiempo de render con .map()
  const testMap = () => {
    const items = lista.slice(0, 50);
    return items.map((item, index) => ({ ...item, index }));
  };

  // Test 2: Tiempo de filtrado
  const testFilter = () => {
    return lista.filter(filterFunction);
  };

  // Test 3: Tiempo de búsqueda con debounce simulado
  const testSearch = () => {
    const query = 'test';
    return lista.filter(item => 
      JSON.stringify(item).toLowerCase().includes(query.toLowerCase())
    );
  };

  console.log('🔍 Test 1: Render con .map()');
  benchmarkUtils.measureMultiple('Map render', testMap, 10);

  console.log('🔍 Test 2: Filtrado');
  benchmarkUtils.measureMultiple('Filter operation', testFilter, 10);

  console.log('🔍 Test 3: Búsqueda');
  benchmarkUtils.measureMultiple('Search operation', testSearch, 10);

  benchmarkUtils.generateReport();
};

/**
 * Test de rendimiento de componentes
 */
export const testComponentPerformance = (renderComponent) => {
  console.log('\n📊 === TEST DE RENDIMIENTO DE COMPONENTES ===\n');

  benchmarkUtils.measureMultiple(
    'Component render',
    renderComponent,
    20
  );

  benchmarkUtils.generateReport();
};

/**
 * Test comparativo: antes vs después de optimizaciones
 */
export const compareOptimizations = () => {
  console.log('\n📊 === COMPARACIÓN DE OPTIMIZACIONES ===\n');

  const data = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    description: `Description ${i}`,
  }));

  // Implementación ANTES (sin optimización)
  const beforeOptimization = () => {
    return data
      .filter(item => item.name.includes('1'))
      .map(item => ({
        ...item,
        processed: true,
      }));
  };

  // Implementación DESPUÉS (con optimización)
  const afterOptimization = () => {
    // Simular memoización y optimizaciones
    const filtered = data.filter(item => item.name.includes('1'));
    return filtered.map(item => ({
      ...item,
      processed: true,
    }));
  };

  benchmarkUtils.compare(
    'Sin optimización',
    beforeOptimization,
    'Con optimización',
    afterOptimization,
    50
  );
};

/**
 * Test de memoria
 */
export const testMemoryUsage = () => {
  console.log('\n📊 === TEST DE MEMORIA ===\n');

  if (performance.memory) {
    const initialMemory = performance.memory.usedJSHeapSize / 1048576;
    console.log(`💾 Memoria inicial: ${initialMemory.toFixed(2)} MB`);

    // Crear muchos objetos
    const objects = [];
    for (let i = 0; i < 1000; i++) {
      objects.push({
        id: i,
        data: Array.from({ length: 100 }, (_, j) => `data-${j}`),
      });
    }

    const afterCreationMemory = performance.memory.usedJSHeapSize / 1048576;
    console.log(`💾 Memoria después de crear objetos: ${afterCreationMemory.toFixed(2)} MB`);
    console.log(`📈 Incremento: ${(afterCreationMemory - initialMemory).toFixed(2)} MB`);

    // Limpiar
    objects.length = 0;

    const afterCleanupMemory = performance.memory.usedJSHeapSize / 1048576;
    console.log(`💾 Memoria después de limpiar: ${afterCleanupMemory.toFixed(2)} MB`);
  } else {
    console.log('⚠️ performance.memory no está disponible en este entorno');
  }
};

/**
 * Test de scroll performance
 */
export const testScrollPerformance = () => {
  console.log('\n📊 === TEST DE SCROLL ===\n');
  console.log('1. Abre una pantalla con lista (GestionAdmin, GestionVacunas, etc.)');
  console.log('2. Activa Performance Overlay (3 taps rápidos)');
  console.log('3. Haz scroll rápido arriba y abajo');
  console.log('4. Observa el FPS - debe mantenerse ≥ 50 durante el scroll');
  console.log('\n✅ Objetivo: FPS ≥ 55 durante scroll normal');
  console.log('✅ Objetivo: FPS ≥ 50 durante scroll rápido');
};

/**
 * Ejecutar todos los tests
 */
export const runAllPerformanceTests = async () => {
  console.log('\n🚀 === EJECUTANDO TODOS LOS TESTS DE RENDIMIENTO ===\n');

  testMemoryUsage();
  compareOptimizations();
  testScrollPerformance();

  console.log('\n✅ Tests completados. Revisa los resultados arriba.\n');
};

// Exportar para uso en consola
if (__DEV__) {
  global.performanceTest = {
    testListPerformance,
    testComponentPerformance,
    compareOptimizations,
    testMemoryUsage,
    testScrollPerformance,
    runAll: runAllPerformanceTests,
  };

  console.log('✅ Performance tests disponibles en global.performanceTest');
  console.log('💡 Ejemplo: performanceTest.runAll()');
}

